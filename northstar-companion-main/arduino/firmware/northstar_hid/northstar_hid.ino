/*
 * NorthStar Auth — HID Keyboard Device Firmware
 * Board  : Arduino Leonardo or Pro Micro (ATmega32U4 — native USB HID)
 * Display: LCD1602 parallel — RS=12, E=11, D4=5, D5=4, D6=3, D7=2
 * Buttons: INPUT_PULLUP (LOW = pressed)
 *          UP=6  DOWN=7  BACK=8  SELECT=9
 *
 * HOW IT WORKS:
 *   1. One-time sync: connect to NorthStar Companion app, sync credentials.
 *   2. Unplug. Take the USB anywhere.
 *   3. Plug into any computer (Mac, Windows, Linux).
 *   4. Navigate to an account, press SELECT.
 *   5. Device counts down 3 seconds — click into your password field.
 *   6. Device types the password via USB HID keyboard. No app needed.
 *
 * EEPROM layout:
 *   [0-1]  magic bytes (0xAB 0xCD)
 *   [2]    entry count
 *   [3]    reserved
 *   [4+]   entries, 50 bytes each:
 *            [0]     valid flag (0x01)
 *            [1-16]  service name (15 chars + null)
 *            [17-49] password (32 chars + null)
 *   Max 20 entries in 1KB EEPROM.
 *
 * Serial protocol (9600 baud, JSON lines) — used only during sync:
 *   Device -> App : {"event":"PAIR"}
 *   App -> Device : {"cmd":"REQUEST_KEY"}
 *   App -> Device : {"cmd":"PAIR_ACK"}
 *   App -> Device : {"cmd":"BEGIN","count":N,"len":BYTES}
 *   App -> Device : <48-byte chunk>\n  (device ACKs each)
 *   App -> Device : {"cmd":"END"}
 *   Device -> App : {"ack":1}
 *
 * Payload format sent by companion app:
 *   {"credentials":[{"svc":"GitHub","pwd":"mypassword"},...]}`
 */

#include <LiquidCrystal.h>
#include <EEPROM.h>
#include <Keyboard.h>

// ── Display ───────────────────────────────────────────────────────────────────
LiquidCrystal lcd(12, 11, 5, 4, 3, 2);

// ── Buttons ───────────────────────────────────────────────────────────────────
#define BTN_UP      6
#define BTN_DOWN    7
#define BTN_BACK    8
#define BTN_SELECT  9
#define DEBOUNCE_MS 200
unsigned long lastPress[4] = {0, 0, 0, 0};

// ── EEPROM layout ─────────────────────────────────────────────────────────────
#define ADDR_MAGIC   0
#define ADDR_COUNT   2
#define ADDR_ENTRIES 4
#define NAME_LEN    16   // 15 chars + null
#define PWD_LEN     33   // 32 chars + null
#define ENTRY_SIZE  (1 + NAME_LEN + PWD_LEN)  // 50 bytes
#define MAX_ENTRIES 20
#define MAGIC_0     0xAB
#define MAGIC_1     0xCD

// ── State ─────────────────────────────────────────────────────────────────────
enum MenuState {
  S_PAIRING,
  S_HOME,
  S_ACCOUNTS,
  S_ACCOUNT_DETAIL,
  S_ACCOUNTS_REMOVE_CONFIRM,
  S_SETTINGS,
  S_INFO,
  S_USER,
  S_DELETE_ALL_CONFIRM,
  S_RECEIVING,
  S_SYNC_DONE
};
MenuState currentState = S_PAIRING;
int cursor     = 0;
int entryCount = 0;
char entryNames[MAX_ENTRIES][NAME_LEN];
char entryPwds [MAX_ENTRIES][PWD_LEN];

// ── Menus ─────────────────────────────────────────────────────────────────────
const int   HOME_SIZE    = 4;
const char* homeMenu[]   = { "Accounts", "Settings", "User", "Delete All" };
const int   SET_SIZE     = 1;
const char* setMenu[]    = { "Device Info" };

// ── Serial ────────────────────────────────────────────────────────────────────
String inputBuffer   = "";
String payloadBuffer = "";
int    expectedLen   = 0;
bool   receiving     = false;

// ── Forward declarations ───────────────────────────────────────────────────────
void updateDisplay();
void goBack();

// =============================================================================
// EEPROM
// =============================================================================
bool hasValidData() {
  return EEPROM.read(ADDR_MAGIC) == MAGIC_0 && EEPROM.read(ADDR_MAGIC + 1) == MAGIC_1;
}
void markValid() {
  EEPROM.write(ADDR_MAGIC,     MAGIC_0);
  EEPROM.write(ADDR_MAGIC + 1, MAGIC_1);
}

void saveEntry(int idx, const char* name, const char* pwd) {
  int a = ADDR_ENTRIES + idx * ENTRY_SIZE;
  EEPROM.write(a, 0x01);
  int nlen = strlen(name); if (nlen >= NAME_LEN) nlen = NAME_LEN - 1;
  for (int i = 0; i < nlen; i++) EEPROM.write(a + 1 + i, name[i]);
  EEPROM.write(a + 1 + nlen, 0);
  int plen = strlen(pwd); if (plen >= PWD_LEN) plen = PWD_LEN - 1;
  for (int i = 0; i < plen; i++) EEPROM.write(a + 1 + NAME_LEN + i, pwd[i]);
  EEPROM.write(a + 1 + NAME_LEN + plen, 0);
}

void loadEntries() {
  entryCount = EEPROM.read(ADDR_COUNT);
  if (entryCount > MAX_ENTRIES) entryCount = 0;
  for (int i = 0; i < entryCount; i++) {
    int a = ADDR_ENTRIES + i * ENTRY_SIZE;
    if (EEPROM.read(a) != 0x01) { entryNames[i][0] = 0; entryPwds[i][0] = 0; continue; }
    for (int j = 0; j < NAME_LEN - 1; j++) {
      entryNames[i][j] = (char)EEPROM.read(a + 1 + j);
      if (!entryNames[i][j]) break;
    }
    entryNames[i][NAME_LEN - 1] = 0;
    for (int j = 0; j < PWD_LEN - 1; j++) {
      entryPwds[i][j] = (char)EEPROM.read(a + 1 + NAME_LEN + j);
      if (!entryPwds[i][j]) break;
    }
    entryPwds[i][PWD_LEN - 1] = 0;
  }
}

void clearEntries() {
  EEPROM.write(ADDR_COUNT, 0);
  entryCount = 0;
  cursor     = 0;
}

// =============================================================================
// Serial protocol
// =============================================================================
void sendAck()  { Serial.println(F("{\"ack\":1}")); }
// HID device sends PAIR without a key — passwords live on the device, no crypto needed
void sendPair() { Serial.println(F("{\"event\":\"PAIR\"}")); }

String extractStr(const String& line, const char* field) {
  String n = String('"') + field + F("\":\"");
  int s = line.indexOf(n); if (s == -1) return "";
  s += n.length();
  int e = line.indexOf('"', s);
  return (e == -1) ? "" : line.substring(s, e);
}
int extractInt(const String& line, const char* field) {
  String n = String('"') + field + F("\":");
  int s = line.indexOf(n); if (s == -1) return -1;
  s += n.length(); int e = s;
  while (e < (int)line.length() && isDigit(line[e])) e++;
  return line.substring(s, e).toInt();
}

void extractAndStore() {
  clearEntries();
  int pos = 0;
  while (entryCount < MAX_ENTRIES) {
    int si = payloadBuffer.indexOf(F("\"svc\":\""), pos);
    if (si == -1) break;
    si += 7;
    int se = payloadBuffer.indexOf('"', si);
    if (se == -1) break;
    String name = payloadBuffer.substring(si, se);

    int pi = payloadBuffer.indexOf(F("\"pwd\":\""), se);
    if (pi == -1) break;
    pi += 7;
    int pe = payloadBuffer.indexOf('"', pi);
    if (pe == -1) break;
    String pwd = payloadBuffer.substring(pi, pe);

    name.toCharArray(entryNames[entryCount], NAME_LEN);
    pwd.toCharArray(entryPwds[entryCount],   PWD_LEN);
    saveEntry(entryCount, entryNames[entryCount], entryPwds[entryCount]);
    entryCount++;
    pos = pe + 1;
  }
  EEPROM.write(ADDR_COUNT, (byte)entryCount);
  markValid();
}

void processCommand(const String& line, const String& cmd) {
  if      (cmd == F("REQUEST_KEY")) { sendPair(); }
  else if (cmd == F("PAIR_ACK"))    { currentState = S_HOME; cursor = 0; updateDisplay(); }
  else if (cmd == F("BEGIN")) {
    receiving = true; payloadBuffer = "";
    expectedLen = extractInt(line, "len");
    currentState = S_RECEIVING; sendAck(); updateDisplay();
  }
  else if (cmd == F("END")) {
    receiving = false;
    extractAndStore();
    sendAck();
    currentState = S_SYNC_DONE; updateDisplay();
    delay(2500);
    currentState = S_ACCOUNTS; cursor = 0; updateDisplay();
  }
}

void processLine(String line) {
  line.trim();
  if (!line.length()) return;
  if (line[0] == '{') {
    String cmd = extractStr(line, "cmd");
    if (cmd.length()) { processCommand(line, cmd); return; }
  }
  if (receiving) {
    payloadBuffer += line;
    int pct  = (expectedLen > 0) ? (int)min(95L, (long)payloadBuffer.length() * 100L / expectedLen) : 50;
    int fill = (pct * 10) / 100;
    lcd.setCursor(0, 1);
    lcd.print("[");
    for (int i = 0; i < 10; i++) lcd.print(i < fill ? '#' : '-');
    char pbuf[6]; sprintf(pbuf, "]%3d%%", pct); lcd.print(pbuf);
    sendAck();
  }
}

// =============================================================================
// Display helpers
// =============================================================================
void lcdRow(int row, const char* text) {
  lcd.setCursor(0, row);
  int len = strlen(text);
  for (int i = 0; i < 16; i++) lcd.write(i < len ? (uint8_t)text[i] : ' ');
}
void lcdHeader(const char* title, bool showBack, bool showFwd) {
  lcd.setCursor(0, 0);
  int len = strlen(title);
  for (int i = 0; i < 14; i++) lcd.write(i < len ? (uint8_t)title[i] : ' ');
  lcd.write(showBack ? '<' : ' ');
  lcd.write(showFwd  ? '>' : ' ');
}
void lcdItem(const char* item, bool selected) {
  lcd.setCursor(0, 1);
  lcd.write(selected ? '>' : ' ');
  lcd.write(' ');
  int len = strlen(item);
  for (int i = 0; i < 14; i++) lcd.write(i < len ? (uint8_t)item[i] : ' ');
}

bool selectionHasSub() {
  if (currentState == S_HOME)     return cursor == 0 || cursor == 1;
  if (currentState == S_ACCOUNTS) return cursor < entryCount;
  return false;
}
bool canGoBack() {
  return currentState != S_HOME &&
         currentState != S_PAIRING &&
         currentState != S_RECEIVING &&
         currentState != S_SYNC_DONE;
}

// =============================================================================
// Screen renderers
// =============================================================================
void updateDisplay() {
  lcd.clear();
  bool back = canGoBack();
  bool fwd  = selectionHasSub();

  switch (currentState) {
    case S_PAIRING:
      lcdRow(0, "  N* NorthStar");
      lcdRow(1, "  Pair via app");
      break;

    case S_HOME:
      lcdHeader("NorthStar Auth", false, fwd);
      lcdItem(homeMenu[cursor], true);
      break;

    case S_ACCOUNTS: {
      lcdHeader("Accounts", back, fwd);
      if (entryCount == 0) {
        lcdItem("No accounts yet", true);
      } else {
        const char* label = (cursor < entryCount) ? entryNames[cursor] : "Remove All";
        lcdItem(label, true);
        char pos[7]; sprintf(pos, "%d/%d", cursor + 1, entryCount + 1);
        lcd.setCursor(9, 0); lcd.print(pos);
      }
      break;
    }

    case S_ACCOUNT_DETAIL:
      lcdHeader(entryNames[cursor], back, false);
      if (strlen(entryPwds[cursor]) > 0) {
        lcdItem("SEL: TYPE PASSWD", true);
      } else {
        lcdItem("No password set", false);
      }
      break;

    case S_ACCOUNTS_REMOVE_CONFIRM:
      lcdHeader("Remove All?", back, false);
      lcdRow(1, cursor == 0 ? "> YES    no    " : "  yes   > NO   ");
      break;

    case S_SETTINGS:
      lcdHeader("Settings", back, fwd);
      lcdItem(setMenu[cursor], true);
      break;

    case S_INFO: {
      lcdHeader("Device Info", back, false);
      char buf[17]; sprintf(buf, "HID  %d/%d accts", entryCount, MAX_ENTRIES);
      lcdRow(1, buf);
      break;
    }

    case S_USER:
      lcdHeader("User", back, false);
      lcdRow(1, "  NSA HID v1.0");
      break;

    case S_DELETE_ALL_CONFIRM:
      lcdHeader("Delete All?", back, false);
      lcdRow(1, cursor == 0 ? "> YES    no    " : "  yes   > NO   ");
      break;

    case S_RECEIVING:
      lcdRow(0, "Syncing...");
      lcdRow(1, "[----------]  0%");
      break;

    case S_SYNC_DONE: {
      lcdRow(0, "Sync complete!");
      char buf[17]; sprintf(buf, "  %d acct%s ready", entryCount, entryCount == 1 ? "" : "s");
      lcdRow(1, buf);
      break;
    }
  }
}

// =============================================================================
// Navigation
// =============================================================================
int menuSize() {
  if (currentState == S_HOME)                    return HOME_SIZE;
  if (currentState == S_ACCOUNTS)                return entryCount + 1;
  if (currentState == S_SETTINGS)                return SET_SIZE;
  if (currentState == S_ACCOUNTS_REMOVE_CONFIRM) return 2;
  if (currentState == S_DELETE_ALL_CONFIRM)      return 2;
  return 1;
}

void moveCursor(int dir) {
  int sz = menuSize();
  if (sz <= 1) return;
  cursor = (cursor + dir + sz) % sz;
  updateDisplay();
}

void selectOption() {
  switch (currentState) {

    case S_HOME:
      if      (cursor == 0) { currentState = S_ACCOUNTS;           cursor = 0; }
      else if (cursor == 1) { currentState = S_SETTINGS;           cursor = 0; }
      else if (cursor == 2) { currentState = S_USER; }
      else if (cursor == 3) { currentState = S_DELETE_ALL_CONFIRM; cursor = 1; }
      updateDisplay();
      break;

    case S_ACCOUNTS:
      if (entryCount == 0) break;
      if (cursor < entryCount) { currentState = S_ACCOUNT_DETAIL; }
      else { currentState = S_ACCOUNTS_REMOVE_CONFIRM; cursor = 1; }
      updateDisplay();
      break;

    case S_ACCOUNT_DETAIL: {
      const char* pwd = entryPwds[cursor];
      if (!strlen(pwd)) {
        lcdRow(1, "  No password!  ");
        delay(1500);
        updateDisplay();
        break;
      }
      // Give the user 3 seconds to click into their target field
      lcdHeader(entryNames[cursor], false, false);
      lcdRow(1, "  Click field...");
      delay(1000);
      lcdRow(1, "  Typing in 2...");
      delay(1000);
      lcdRow(1, "  Typing in 1...");
      delay(1000);
      // ── Type via USB HID ───────────────────────────────────────────────────
      Keyboard.print(pwd);
      Keyboard.releaseAll();
      // ──────────────────────────────────────────────────────────────────────
      lcdRow(1, "  Done!         ");
      delay(1200);
      updateDisplay();
      break;
    }

    case S_ACCOUNTS_REMOVE_CONFIRM:
      if (cursor == 0) { clearEntries(); currentState = S_ACCOUNTS; cursor = 0; updateDisplay(); }
      else             { goBack(); }
      break;

    case S_SETTINGS:
      if (cursor == 0) { currentState = S_INFO; }
      updateDisplay();
      break;

    case S_USER:
    case S_INFO:
      break;

    case S_DELETE_ALL_CONFIRM:
      if (cursor == 0) { clearEntries(); currentState = S_HOME; cursor = 0; }
      else             { currentState = S_HOME; cursor = 3; }
      updateDisplay();
      break;

    default: break;
  }
}

void goBack() {
  switch (currentState) {
    case S_ACCOUNTS:
    case S_SETTINGS:
    case S_USER:
    case S_DELETE_ALL_CONFIRM:      currentState = S_HOME;     cursor = 0; break;
    case S_ACCOUNT_DETAIL:
    case S_ACCOUNTS_REMOVE_CONFIRM: currentState = S_ACCOUNTS; cursor = 0; break;
    case S_INFO:                    currentState = S_SETTINGS; cursor = 0; break;
    default: break;
  }
  updateDisplay();
}

// =============================================================================
// Buttons
// =============================================================================
bool btnPressed(int pin, int idx) {
  if (digitalRead(pin) == LOW) {
    unsigned long now = millis();
    if (now - lastPress[idx] > DEBOUNCE_MS) { lastPress[idx] = now; return true; }
  }
  return false;
}

// =============================================================================
// Setup & loop
// =============================================================================
void setup() {
  Serial.begin(9600);
  lcd.begin(16, 2);
  Keyboard.begin();
  for (int i = BTN_UP; i <= BTN_SELECT; i++) pinMode(i, INPUT_PULLUP);

  lcdRow(0, "  N* NorthStar");
  lcdRow(1, "  Starting...");
  delay(1200);

  if (hasValidData()) {
    loadEntries();
    currentState = (entryCount > 0) ? S_HOME : S_PAIRING;
  } else {
    currentState = S_PAIRING;
  }

  updateDisplay();
  delay(300);
  sendPair(); // announce to companion app if connected
}

void loop() {
  while (Serial.available()) {
    char c = Serial.read();
    if (c == '\n')      { processLine(inputBuffer); inputBuffer = ""; }
    else if (c != '\r') {
      inputBuffer += c;
      if (inputBuffer.length() > 200 && !receiving) inputBuffer = "";
    }
  }
  if (btnPressed(BTN_UP,     0)) moveCursor(-1);
  if (btnPressed(BTN_DOWN,   1)) moveCursor(1);
  if (btnPressed(BTN_SELECT, 2)) selectOption();
  if (btnPressed(BTN_BACK,   3)) goBack();
}
