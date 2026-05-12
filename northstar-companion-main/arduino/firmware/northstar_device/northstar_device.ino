/*
 * NorthStar Auth — Physical Device Firmware
 * Board  : Elegoo Uno R3
 * Display: LCD1602 parallel — RS=12, E=11, D4=5, D5=4, D6=3, D7=2
 * Buttons: INPUT_PULLUP (LOW = pressed)
 *          UP=6  DOWN=7  BACK=8  SELECT=9
 *
 * Menu structure:
 *   HOME  Welcome to NSA!
 *     > Accounts
 *         > [account list from EEPROM]
 *         > Remove All  -> confirm
 *     > Settings
 *         > Device Info
 *         > FAQ
 *     > User
 *     > Delete All  -> confirm
 *
 * Display layout (16 cols x 2 rows):
 *   Row 0: [title — 14 chars][<][>]   < = BACK avail,  > = selection has sub-menu
 *   Row 1: [> or space][item name — 15 chars]
 *
 * Serial protocol (9600 baud, newline-terminated JSON):
 *   Device->App : {"event":"PAIR","key":"<base64 AES-256 key>"}
 *   App->Device : {"cmd":"REQUEST_KEY"}   <- app sends this on connect
 *   App->Device : {"cmd":"PAIR_ACK"}
 *   App->Device : {"cmd":"BEGIN","count":N,"len":BYTES}
 *   App->Device : <48-byte chunk>\n  (repeated, device ACKs each)
 *   App->Device : {"cmd":"END"}
 *   Device->App : {"ack":1}
 */

#include <LiquidCrystal.h>
#include <EEPROM.h>

// ── Display ───────────────────────────────────────────────────────────────────
LiquidCrystal lcd(12, 11, 5, 4, 3, 2);

// ── Buttons ───────────────────────────────────────────────────────────────────
#define BTN_UP     6
#define BTN_DOWN   7
#define BTN_BACK   8
#define BTN_SELECT 9
#define DEBOUNCE_MS 200
unsigned long lastPress[4] = {0,0,0,0};

// ── EEPROM ────────────────────────────────────────────────────────────────────
#define ADDR_MAGIC    0
#define ADDR_KEY      2
#define ADDR_COUNT   34
#define ADDR_ENTRIES 35
#define ENTRY_SIZE   33
#define MAX_ENTRIES  20
#define NAME_LEN     32
#define MAGIC_0     0xAB
#define MAGIC_1     0xCD

// ── Menu states ───────────────────────────────────────────────────────────────
enum MenuState {
  S_PAIRING,
  S_HOME,
  S_ACCOUNTS,
  S_ACCOUNT_DETAIL,
  S_ACCOUNTS_REMOVE_CONFIRM,
  S_SETTINGS,
  S_INFO,
  S_FAQ,
  S_USER,
  S_DELETE_ALL_CONFIRM,
  S_RECEIVING,
  S_SYNC_DONE
};
MenuState currentState = S_PAIRING;
int cursor     = 0;
int entryCount = 0;
char entryNames[MAX_ENTRIES][NAME_LEN];

// ── Static menus ──────────────────────────────────────────────────────────────
const int HOME_SIZE     = 4;
const char* homeMenu[]  = { "Accounts", "Settings", "User", "Delete All" };
const int SET_SIZE      = 2;
const char* setMenu[]   = { "Device Info", "FAQ" };

// ── Serial ────────────────────────────────────────────────────────────────────
String inputBuffer   = "";
String payloadBuffer = "";
int    expectedLen   = 0;
bool   receiving     = false;

// ── AES key ───────────────────────────────────────────────────────────────────
byte aesKey[32];

// ── Forward declarations ──────────────────────────────────────────────────────
void updateDisplay();

// =============================================================================
// Base64
// =============================================================================
const char B64[] =
  "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/";

String base64Encode(byte* d, int len) {
  String o = "";
  o.reserve(((len+2)/3)*4+2);
  for (int i = 0; i < len; i += 3) {
    byte b0=d[i], b1=(i+1<len)?d[i+1]:0, b2=(i+2<len)?d[i+2]:0;
    o+=B64[b0>>2]; o+=B64[((b0&3)<<4)|(b1>>4)];
    o+=(i+1<len)?B64[((b1&15)<<2)|(b2>>6)]:'=';
    o+=(i+2<len)?B64[b2&63]:'=';
  }
  return o;
}

// =============================================================================
// Key
// =============================================================================
void generateKey() {
  for (int i=0;i<32;i++){
    byte b=0;
    for(int j=0;j<8;j++){ b=(b<<1)|(analogRead(A0+(j%3))&1); delayMicroseconds(300); }
    b^=(byte)(micros()&0xFF);
    aesKey[i]=b;
  }
}
void saveKey() {
  EEPROM.write(ADDR_MAGIC,   MAGIC_0);
  EEPROM.write(ADDR_MAGIC+1, MAGIC_1);
  for(int i=0;i<32;i++) EEPROM.write(ADDR_KEY+i, aesKey[i]);
}
bool loadKey() {
  if(EEPROM.read(ADDR_MAGIC)!=MAGIC_0||EEPROM.read(ADDR_MAGIC+1)!=MAGIC_1) return false;
  for(int i=0;i<32;i++) aesKey[i]=EEPROM.read(ADDR_KEY+i);
  return true;
}

// =============================================================================
// Entries
// =============================================================================
void saveEntry(int idx, const char* name) {
  int a=ADDR_ENTRIES+idx*ENTRY_SIZE;
  EEPROM.write(a,0x01);
  int len=strlen(name); if(len>=NAME_LEN) len=NAME_LEN-1;
  for(int i=0;i<len;i++) EEPROM.write(a+1+i,name[i]);
  EEPROM.write(a+1+len,0);
}
void loadEntries() {
  entryCount=EEPROM.read(ADDR_COUNT);
  if(entryCount>MAX_ENTRIES) entryCount=0;
  for(int i=0;i<entryCount;i++){
    int a=ADDR_ENTRIES+i*ENTRY_SIZE;
    if(EEPROM.read(a)!=0x01){entryNames[i][0]=0;continue;}
    for(int j=0;j<NAME_LEN-1;j++){
      entryNames[i][j]=(char)EEPROM.read(a+1+j);
      if(entryNames[i][j]==0) break;
    }
    entryNames[i][NAME_LEN-1]=0;
  }
}
void clearEntries() {
  EEPROM.write(ADDR_COUNT,0);
  entryCount=0; cursor=0;
}

// =============================================================================
// Serial protocol
// =============================================================================
void sendAck()  { Serial.println(F("{\"ack\":1}")); }
void sendPair() {
  Serial.print(F("{\"event\":\"PAIR\",\"key\":\""));
  Serial.print(base64Encode(aesKey,32));
  Serial.println(F("\"}"));
}

String extractStr(const String& line, const char* field) {
  String n=String('"')+field+F("\":\"");
  int s=line.indexOf(n); if(s==-1) return "";
  s+=n.length(); int e=line.indexOf('"',s);
  return (e==-1)?"":line.substring(s,e);
}
int extractInt(const String& line, const char* field) {
  String n=String('"')+field+F("\":");
  int s=line.indexOf(n); if(s==-1) return -1;
  s+=n.length(); int e=s;
  while(e<(int)line.length()&&isDigit(line[e])) e++;
  return line.substring(s,e).toInt();
}

void extractAndStore() {
  clearEntries();
  int pos=0;
  while(entryCount<MAX_ENTRIES){
    int s=payloadBuffer.indexOf(F("\"svc\":\""),pos);
    if(s==-1) break; s+=7;
    int e=payloadBuffer.indexOf('"',s); if(e==-1) break;
    String name=payloadBuffer.substring(s,e);
    name.toCharArray(entryNames[entryCount],NAME_LEN);
    saveEntry(entryCount,entryNames[entryCount]);
    entryCount++; pos=e+1;
  }
  EEPROM.write(ADDR_COUNT,(byte)entryCount);
}

void processCommand(const String& line, const String& cmd) {
  if (cmd==F("REQUEST_KEY")) {
    sendPair();
  } else if (cmd==F("PAIR_ACK")) {
    currentState=S_HOME; cursor=0; updateDisplay();
  } else if (cmd==F("BEGIN")) {
    receiving=true; payloadBuffer="";
    expectedLen=extractInt(line,"len");
    currentState=S_RECEIVING; sendAck(); updateDisplay();
  } else if (cmd==F("END")) {
    receiving=false; extractAndStore(); sendAck();
    currentState=S_SYNC_DONE; updateDisplay();
    delay(2500);
    currentState=S_ACCOUNTS; cursor=0; updateDisplay();
  }
}

void processLine(String line) {
  line.trim();
  if(line.length()==0) return;
  if(line[0]=='{'){
    String cmd=extractStr(line,"cmd");
    if(cmd.length()>0){processCommand(line,cmd);return;}
  }
  if(receiving){
    payloadBuffer+=line;
    int pct=(expectedLen>0)?(int)min(95L,(long)payloadBuffer.length()*100L/expectedLen):50;
    // Update just row 1 progress bar in place
    lcd.setCursor(0,1);
    int fill=(pct*10)/100;
    lcd.print("[");
    for(int i=0;i<10;i++) lcd.print(i<fill?'#':'-');
    char pbuf[6]; sprintf(pbuf,"]%3d%%",pct); lcd.print(pbuf);
    sendAck();
  }
}

// =============================================================================
// Display helpers
// =============================================================================

// Print exactly 16 chars — pad with spaces, never overflow
void lcdRow(int row, const char* text) {
  lcd.setCursor(0,row);
  int len=strlen(text);
  for(int i=0;i<16;i++) lcd.write(i<len?(uint8_t)text[i]:' ');
}

// Row 0 with nav indicators: [title 14 chars][backChar][fwdChar]
void lcdHeader(const char* title, bool showBack, bool showFwd) {
  lcd.setCursor(0,0);
  int len=strlen(title);
  for(int i=0;i<14;i++) lcd.write(i<len?(uint8_t)title[i]:' ');
  lcd.write(showBack?'<':' ');
  lcd.write(showFwd? '>':' ');
}

// Row 1 with cursor: [> or space][space][item name, padded to 14]
void lcdItem(const char* item, bool selected) {
  lcd.setCursor(0,1);
  lcd.write(selected?'>':' ');
  lcd.write(' ');
  int len=strlen(item);
  for(int i=0;i<14;i++) lcd.write(i<len?(uint8_t)item[i]:' ');
}

// Returns whether the currently highlighted item leads to a sub-menu
bool selectionHasSub() {
  if(currentState==S_HOME)     return cursor==0||cursor==1; // Accounts, Settings
  if(currentState==S_ACCOUNTS) return cursor<entryCount;    // individual entries
  return false;
}

bool canGoBack() {
  return currentState!=S_HOME &&
         currentState!=S_PAIRING &&
         currentState!=S_RECEIVING &&
         currentState!=S_SYNC_DONE;
}

// =============================================================================
// Screen renderers
// =============================================================================
void updateDisplay() {
  lcd.clear();
  bool back = canGoBack();
  bool fwd  = selectionHasSub();

  switch(currentState) {

    case S_PAIRING:
      lcdRow(0, "Welcome to NSA!");
      lcdRow(1, "  Pairing...");
      break;

    case S_HOME:
      lcdHeader("Welcome to NSA!", false, fwd);
      lcdItem(homeMenu[cursor], true);
      break;

    case S_ACCOUNTS: {
      lcdHeader("Accounts", back, fwd);
      if(entryCount==0 && cursor==0){
        lcdItem("No accounts", true);
      } else {
        const char* label = (cursor<entryCount) ? entryNames[cursor] : "Remove All";
        lcdItem(label, true);
      }
      // Show position hint in header (overwrite chars 9-13)
      int total = entryCount+1;
      char pos[6]; sprintf(pos,"%d/%d",cursor+1,total);
      lcd.setCursor(9,0); lcd.print(pos);
      break;
    }

    case S_ACCOUNT_DETAIL:
      lcdHeader(entryNames[cursor], back, false);
      lcdItem("COPY PASSWORD", true);
      break;

    case S_ACCOUNTS_REMOVE_CONFIRM:
      lcdHeader("Remove All?", back, false);
      lcdRow(1, cursor==0 ? "> YES    no    " : "  yes   > NO   ");
      break;

    case S_SETTINGS:
      lcdHeader("Settings", back, fwd);
      lcdItem(setMenu[cursor], true);
      break;

    case S_INFO: {
      lcdHeader("Device Info", back, false);
      char buf[17];
      sprintf(buf,"NSA v1.0 (%d accts)", entryCount);
      buf[16]=0;
      lcdRow(1, buf);
      break;
    }

    case S_FAQ:
      lcdHeader("FAQ", back, false);
      lcdRow(1, "  See app /faq");
      break;

    case S_USER:
      lcdHeader("User", back, false);
      lcdRow(1, "  NSA Device");
      break;

    case S_DELETE_ALL_CONFIRM:
      lcdHeader("Delete All?", back, false);
      lcdRow(1, cursor==0 ? "> YES    no    " : "  yes   > NO   ");
      break;

    case S_RECEIVING:
      lcdRow(0, "Receiving...");
      lcdRow(1, "[----------]  0%");
      break;

    case S_SYNC_DONE: {
      lcdRow(0, "Sync Complete!");
      char buf[17];
      sprintf(buf,"  %d acct%s saved", entryCount, entryCount==1?"":"s");
      lcdRow(1, buf);
      break;
    }
  }
}

// =============================================================================
// Navigation logic
// =============================================================================
int menuSize() {
  if(currentState==S_HOME)                        return HOME_SIZE;
  if(currentState==S_ACCOUNTS)                    return entryCount+1; // +Remove All
  if(currentState==S_SETTINGS)                    return SET_SIZE;
  if(currentState==S_ACCOUNTS_REMOVE_CONFIRM)     return 2;
  if(currentState==S_DELETE_ALL_CONFIRM)          return 2;
  return 1;
}

void moveCursor(int dir) {
  int sz=menuSize();
  if(sz<=1) return;
  cursor=(cursor+dir+sz)%sz;
  updateDisplay();
}

void selectOption() {
  switch(currentState) {
    case S_HOME:
      if(cursor==0){ currentState=S_ACCOUNTS;  cursor=0; }
      else if(cursor==1){ currentState=S_SETTINGS; cursor=0; }
      else if(cursor==2){ currentState=S_USER; }
      else if(cursor==3){ currentState=S_DELETE_ALL_CONFIRM; cursor=1; } // default NO
      updateDisplay();
      break;

    case S_ACCOUNTS:
      if(entryCount==0){ break; }
      if(cursor<entryCount){ currentState=S_ACCOUNT_DETAIL; }
      else { currentState=S_ACCOUNTS_REMOVE_CONFIRM; cursor=1; } // default NO
      updateDisplay();
      break;

    case S_ACCOUNT_DETAIL: {
      // Tell companion app to copy this account's password to the clipboard
      Serial.print(F("{\"event\":\"SELECT\",\"idx\":"));
      Serial.print(cursor);
      Serial.println(F("}"));
      // Show brief confirmation on display
      lcdHeader(entryNames[cursor], false, false);
      lcdRow(1, "  Sent! Paste...");
      delay(1500);
      updateDisplay();
      break;
    }

    case S_ACCOUNTS_REMOVE_CONFIRM:
      if(cursor==0){ // YES
        clearEntries();
        currentState=S_ACCOUNTS; cursor=0;
        updateDisplay();
      } else {
        goBack();
      }
      break;

    case S_SETTINGS:
      if(cursor==0){ currentState=S_INFO; }
      else if(cursor==1){ currentState=S_FAQ; }
      updateDisplay();
      break;

    case S_USER:
    case S_INFO:
    case S_FAQ:
      break; // leaf screens — SELECT does nothing

    case S_DELETE_ALL_CONFIRM:
      if(cursor==0){ // YES
        clearEntries();
        currentState=S_HOME; cursor=0;
      } else {
        currentState=S_HOME; cursor=3; // back to Delete All item
      }
      updateDisplay();
      break;

    default:
      break;
  }
}

void goBack() {
  switch(currentState) {
    case S_ACCOUNTS:
    case S_SETTINGS:
    case S_USER:
    case S_DELETE_ALL_CONFIRM:
      currentState=S_HOME; cursor=0; break;

    case S_ACCOUNT_DETAIL:
    case S_ACCOUNTS_REMOVE_CONFIRM:
      currentState=S_ACCOUNTS; cursor=0; break;

    case S_INFO:
    case S_FAQ:
      currentState=S_SETTINGS; cursor=0; break;

    default:
      break;
  }
  updateDisplay();
}

// =============================================================================
// Buttons
// =============================================================================
bool btnPressed(int pin, int idx) {
  if(digitalRead(pin)==LOW){
    unsigned long now=millis();
    if(now-lastPress[idx]>DEBOUNCE_MS){ lastPress[idx]=now; return true; }
  }
  return false;
}

// =============================================================================
// Setup & loop
// =============================================================================
void setup() {
  Serial.begin(9600);
  lcd.begin(16,2);
  for(int i=BTN_UP;i<=BTN_SELECT;i++) pinMode(i,INPUT_PULLUP);
  pinMode(A0,INPUT); pinMode(A1,INPUT); pinMode(A2,INPUT);

  lcdRow(0,"  N* NSA v1.0");
  lcdRow(1,"  Starting...");
  delay(1500);

  if(loadKey()){ loadEntries(); }
  else { generateKey(); saveKey(); clearEntries(); }

  // If data already exists in EEPROM, go straight to the menu —
  // no need to wait for the companion app to pair.
  // If this is a fresh device (no accounts yet), wait in pairing state.
  currentState = (entryCount > 0) ? S_HOME : S_PAIRING;
  updateDisplay();
  delay(300);
  sendPair(); // always announce key so app can pair/sync when connected
}

void loop() {
  while(Serial.available()){
    char c=Serial.read();
    if(c=='\n'){ processLine(inputBuffer); inputBuffer=""; }
    else if(c!='\r'){
      inputBuffer+=c;
      if(inputBuffer.length()>200&&!receiving) inputBuffer="";
    }
  }
  if(btnPressed(BTN_UP,    0)) moveCursor(-1);
  if(btnPressed(BTN_DOWN,  1)) moveCursor(1);
  if(btnPressed(BTN_SELECT,2)) selectOption();
  if(btnPressed(BTN_BACK,  3)) goBack();
}
