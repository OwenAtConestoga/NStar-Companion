# Arduino Integration — Physical Device Communication

## Overview

This document covers what it would actually take to wire the NorthStar Companion app to a
physical Arduino board with 3 buttons (Select, Add, Push), perform real AES-256-GCM
encryption in the browser, and transmit the encrypted payload back to the device.

The companion app runs in the browser as a Next.js app. The bridge between browser and
hardware is the **Web Serial API** — a modern browser API that lets web pages communicate
directly with USB serial devices, including Arduinos. No Node.js backend, no drivers, no
Electron wrapper required.

> **Browser support:** Web Serial API is supported in Chrome and Edge only (not Firefox or Safari).
> It requires either HTTPS or `localhost`. The existing `npm run dev` setup satisfies this.

---

## Architecture

```
┌─────────────────────────────────────────────────────┐
│              NorthStar Companion (Browser)           │
│                                                      │
│  Web Crypto API          Web Serial API              │
│  (AES-256-GCM encrypt)   (read/write USB serial)     │
└────────────────────┬────────────────────────────────-┘
                     │ USB (Serial CDC / 9600 baud)
┌────────────────────▼─────────────────────────────────┐
│              Arduino Board                            │
│                                                      │
│  Button 1: SELECT   Button 2: ADD   Button 3: PUSH   │
│                                                      │
│  → Sends button events as JSON over serial           │
│  ← Receives encrypted credential payload             │
│  → Stores to EEPROM / external flash (W25Qxx)        │
└──────────────────────────────────────────────────────┘
```

The app listens for button events from the Arduino. Button presses trigger UI state changes
in the companion app (navigate accounts, open the Add form, or initiate sync). When the
user initiates a push, the app encrypts the credential data and streams it back to the
device over the same serial connection.

---

## The 3-Button Protocol

Each button press causes the Arduino to write a short JSON string to the serial port,
terminated with a newline (`\n`). The companion app parses incoming lines and dispatches
actions accordingly.

| Button | Serial message sent | App action |
|--------|--------------------|--------------------|
| SELECT | `{"btn":"SELECT"}` | Cycle to next credential in the vault list |
| ADD | `{"btn":"ADD"}` | Open the Add New Credential modal |
| PUSH | `{"btn":"PUSH"}` | Trigger the Secure Sync flow (encrypt + send all staged credentials) |

### Arduino sketch (button logic)

```cpp
const int BTN_SELECT = 2;
const int BTN_ADD    = 3;
const int BTN_PUSH   = 4;

void setup() {
  Serial.begin(9600);
  pinMode(BTN_SELECT, INPUT_PULLUP);
  pinMode(BTN_ADD,    INPUT_PULLUP);
  pinMode(BTN_PUSH,   INPUT_PULLUP);
}

void loop() {
  if (digitalRead(BTN_SELECT) == LOW) {
    Serial.println("{\"btn\":\"SELECT\"}");
    delay(200); // debounce
  }
  if (digitalRead(BTN_ADD) == LOW) {
    Serial.println("{\"btn\":\"ADD\"}");
    delay(200);
  }
  if (digitalRead(BTN_PUSH) == LOW) {
    Serial.println("{\"btn\":\"PUSH\"}");
    delay(200);
  }
}
```

`INPUT_PULLUP` means the pin reads HIGH at rest and LOW when the button connects it to
ground — the standard wiring for tactile buttons with no external pull-down resistors.

---

## Key Exchange — Pairing the Device

AES-256-GCM requires both sides to share the same 256-bit key. For a real device this key
must be:

1. Generated **on the hardware** (so it never originates in software)
2. Transmitted to the companion app **once** during an initial pairing ceremony
3. Stored on the device in flash memory (not EEPROM — EEPROM on the Uno has ~100K write
   cycles and will wear out)

### Pairing flow

```
[First boot]
Arduino  →  generates 32 random bytes from analogRead noise or hardware RNG
Arduino  →  stores key in external flash (W25Qxx)
Arduino  →  sends: {"event":"PAIR","key":"<base64-encoded 32 bytes>"}

Companion app  →  receives key, imports it into Web Crypto key store
Companion app  →  stores key in sessionStorage (cleared on tab close)
Companion app  →  sends: {"cmd":"PAIR_ACK"}

[Subsequent connections]
Arduino  →  sends: {"event":"READY"}
Companion app  →  user must re-enter or the key must be re-sent
```

On the Uno R3 specifically, `analogRead()` on a floating pin produces low-entropy noise — not
cryptographically strong. The STM32F4 (the target hardware in the project charter) has a
dedicated hardware RNG peripheral that produces cryptographically secure random bytes, which
is the right choice for key generation.

---

## Encryption — Web Crypto API

The browser's built-in `crypto.subtle` API provides hardware-accelerated AES-256-GCM with
no external libraries. This runs entirely client-side; the key never leaves the browser tab.

### Importing the Arduino-provided key

```ts
async function importKey(base64Key: string): Promise<CryptoKey> {
  const raw = Uint8Array.from(atob(base64Key), (c) => c.charCodeAt(0));
  return crypto.subtle.importKey(
    "raw",
    raw,
    { name: "AES-GCM", length: 256 },
    false,        // not extractable — can't be read back out of the key store
    ["encrypt"]
  );
}
```

### Encrypting a credential

Each credential is serialized to JSON, encrypted individually, then base64-encoded for
serial transport.

```ts
interface EncryptedCredential {
  iv: string;       // base64, 12 bytes
  tag: string;      // base64, 16 bytes (GCM auth tag, appended by subtle.encrypt)
  data: string;     // base64, ciphertext
}

async function encryptCredential(
  credential: { serviceName: string; username: string; icon: string },
  key: CryptoKey
): Promise<EncryptedCredential> {
  const iv = crypto.getRandomValues(new Uint8Array(12)); // fresh IV per credential

  const plaintext = new TextEncoder().encode(JSON.stringify(credential));

  // subtle.encrypt with AES-GCM returns ciphertext + 16-byte auth tag concatenated
  const cipherBuffer = await crypto.subtle.encrypt(
    { name: "AES-GCM", iv, tagLength: 128 },
    key,
    plaintext
  );

  const cipherBytes = new Uint8Array(cipherBuffer);
  const ciphertext = cipherBytes.slice(0, -16);
  const authTag    = cipherBytes.slice(-16);

  return {
    iv:   btoa(String.fromCharCode(...iv)),
    tag:  btoa(String.fromCharCode(...authTag)),
    data: btoa(String.fromCharCode(...ciphertext)),
  };
}
```

> **Why a fresh IV per credential?**
> AES-GCM is catastrophically broken if you ever reuse the same (key, IV) pair. Generating a
> random 12-byte IV for every encrypt call is the correct pattern.

### Full push payload

```ts
async function buildPushPayload(credentials: Credential[], key: CryptoKey) {
  const encrypted = await Promise.all(
    credentials.map((c) => encryptCredential(c, key))
  );
  return JSON.stringify({ cmd: "STORE", count: encrypted.length, credentials: encrypted });
}
```

---

## Web Serial API — Connecting to the Arduino

### Opening the connection

```ts
let port: SerialPort | null = null;
let reader: ReadableStreamDefaultReader<string> | null = null;
let writer: WritableStreamDefaultWriter<string> | null = null;

async function connectToDevice() {
  // Prompts the browser's native device picker — must be triggered by a user gesture
  port = await navigator.serial.requestPort();
  await port.open({ baudRate: 9600 });

  const textDecoder = new TextDecoderStream();
  port.readable!.pipeTo(textDecoder.writable);
  reader = textDecoder.readable.getReader();

  const textEncoder = new TextEncoderStream();
  textEncoder.readable.pipeTo(port.writable!);
  writer = textEncoder.writable.getWriter();

  listenForButtonEvents();
}
```

### Listening for button events

```ts
async function listenForButtonEvents() {
  let buffer = "";
  while (true) {
    const { value, done } = await reader!.read();
    if (done) break;
    buffer += value;

    // Parse complete newline-terminated JSON messages
    const lines = buffer.split("\n");
    buffer = lines.pop() ?? ""; // keep any partial line

    for (const line of lines) {
      try {
        const msg = JSON.parse(line.trim());
        handleDeviceMessage(msg);
      } catch {
        // ignore malformed lines
      }
    }
  }
}

function handleDeviceMessage(msg: { btn?: string; event?: string; key?: string }) {
  if (msg.btn === "SELECT") {
    // advance selected credential in UI
  }
  if (msg.btn === "ADD") {
    // open AddCredentialModal
  }
  if (msg.btn === "PUSH") {
    // trigger the encrypt + send flow
  }
  if (msg.event === "PAIR" && msg.key) {
    // import AES key from device
  }
}
```

### Sending the encrypted payload

The Arduino's serial receive buffer is only **64 bytes**. A full encrypted payload for 8
credentials could be several kilobytes. It must be chunked.

```ts
const CHUNK_SIZE = 48; // bytes, safe for Arduino serial buffer

async function sendPayload(payload: string) {
  // Signal start of transmission
  await writer!.write(`{"cmd":"BEGIN","len":${payload.length}}\n`);
  await waitForAck();

  // Send payload in chunks
  for (let i = 0; i < payload.length; i += CHUNK_SIZE) {
    const chunk = payload.slice(i, i + CHUNK_SIZE);
    await writer!.write(chunk);
    await waitForAck(); // Arduino ACKs each chunk before the next is sent
  }

  // Signal end of transmission
  await writer!.write(`\n{"cmd":"END"}\n`);
}

function waitForAck(): Promise<void> {
  return new Promise((resolve) => {
    // Simplified — in practice, hook into the reader loop above
    setTimeout(resolve, 20);
  });
}
```

---

## Arduino Receive Logic (sketch outline)

```cpp
#include <ArduinoJson.h>   // https://arduinojson.org/

String inputBuffer = "";
bool receiving = false;
String payloadBuffer = "";
int expectedLength = 0;

void loop() {
  handleButtons();

  while (Serial.available()) {
    char c = Serial.read();

    if (c == '\n') {
      processLine(inputBuffer);
      inputBuffer = "";
    } else {
      inputBuffer += c;
    }
  }
}

void processLine(String line) {
  StaticJsonDocument<256> doc;
  DeserializationError err = deserializeJson(doc, line);
  if (err) return;

  const char* cmd = doc["cmd"];

  if (strcmp(cmd, "BEGIN") == 0) {
    receiving = true;
    payloadBuffer = "";
    expectedLength = doc["len"];
    Serial.println("{\"ack\":1}");

  } else if (strcmp(cmd, "END") == 0) {
    receiving = false;
    storeEncryptedPayload(payloadBuffer);
    Serial.println("{\"ack\":1}");

  } else if (receiving) {
    payloadBuffer += line;
    Serial.println("{\"ack\":1}");
  }
}

void storeEncryptedPayload(String payload) {
  // Write to W25Qxx external flash via SPI
  // The payload is already ciphertext — store as-is
  // flashWrite(CREDENTIAL_START_ADDR, payload);
}
```

---

## Where This Code Lives in the Next.js App

All serial and crypto logic belongs in a React hook so it can be shared across components.

```
src/
  hooks/
    useDeviceSerial.ts    ← Web Serial connect/disconnect, button event dispatch
    useVaultCrypto.ts     ← AES-256-GCM key import and encrypt helpers
  components/
    DeviceConnectButton.tsx  ← "Connect Hardware" button (triggers requestPort)
```

The vault page (`src/app/vault/page.tsx`) would call `useDeviceSerial` and wire the
`onButton` callback to the existing state setters (`setIsAddingNew`, `setIsTransferring`, etc.).

A `DeviceConnectButton` component sits in the `TopBar` — clicking it calls
`navigator.serial.requestPort()` (must be inside a click handler to satisfy the browser's
user-gesture requirement). Once connected, the hardware status dot changes from simulated
to live.

---

## Hardware Limitations: Uno R3 vs STM32F4

The prototype uses an Elegoo Uno R3 (as shown in the project charter). For the push flow,
it has meaningful constraints.

| Concern | Arduino Uno R3 | STM32F4 (target) |
|---------|---------------|-----------------|
| USB mode | Serial-over-USB-CDC (not HID) | Native USB HID |
| RAM | 2 KB SRAM | 192 KB SRAM |
| AES hardware | None — must do in software | Dedicated hardware crypto engine |
| Random number generation | Weak (analog noise only) | Hardware RNG peripheral |
| Serial buffer | 64 bytes | Configurable |
| Web Serial compatible | Yes (appears as COM/tty device) | Yes |

The Uno is **sufficient for prototyping** the companion-app-to-device communication
protocol. The serial-over-USB path (Web Serial API on the browser side) works identically
whether you're talking to an Uno or an STM32. You would swap the board out in Phase 2
when implementing the actual AES engine and HID descriptor on the STM32F4.

For on-device AES-256 decryption on the Uno during testing, the
[AESLib](https://github.com/DavyLandman/AESLib) or
[Crypto](https://rweather.github.io/arduinolibs/crypto.html) Arduino libraries can handle
AES-256-CBC in software, though this is slow (~300ms per block on the Uno). The STM32F4's
hardware accelerator does the same operation in microseconds.

---

## Security Considerations

**What this design gets right:**
- Encryption happens in the browser before data crosses USB — a USB sniffer sees only ciphertext
- The AES key originates on hardware and is never stored in JS beyond the browser session
- `crypto.subtle` keys marked `extractable: false` cannot be exfiltrated from the key store
- Fresh IV per credential prevents nonce reuse attacks

**What to watch out for:**
- The pairing key transmission (Arduino → app, plaintext over serial) is the weakest point.
  For the prototype this is acceptable. For the final device, consider a PIN-authenticated
  key display on the OLED that the user must manually confirm matches.
- `sessionStorage` for the imported key clears on tab close but not on navigation within the
  same tab. A stricter design holds the `CryptoKey` object only in a React ref (in-memory,
  GC'd when the component unmounts).
- The Arduino's `delay(200)` debounce is naive. A proper implementation uses interrupt-driven
  button handling with a state machine to avoid missed or doubled presses.
