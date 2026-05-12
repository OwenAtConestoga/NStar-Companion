# NorthStar Companion

**A local-first, hardware-paired password manager companion app.**

NorthStar Auth is a hardware password vault — credentials are managed in a browser-based companion app, encrypted with your master password, and synced to a physical USB device. The device acts as a USB HID keyboard and types your passwords directly into any computer, no software required on the target machine.

> **Stack:** Next.js 15 · Tailwind CSS v4 · TypeScript · Web Crypto API · Web Serial API
> **Hardware:** Arduino Leonardo (or Pro Micro) — ATmega32U4, native USB HID

---

## How It Works

```
┌─────────────────────────────────────────────────────┐
│            NorthStar Companion (Browser)             │
│                                                      │
│  AES-256-GCM vault      Web Serial API               │
│  PBKDF2 master key  ←→  USB sync to device           │
└────────────────────────┬────────────────────────────-┘
                         │ USB (9600 baud serial during sync)
┌────────────────────────▼─────────────────────────────┐
│              Arduino Leonardo / Pro Micro             │
│                                                      │
│  LCD 16×2  ·  4 nav buttons  ·  EEPROM storage       │
│                                                      │
│  Plug into any computer → navigate menu → SELECT     │
│  → device types password via USB HID keyboard        │
└──────────────────────────────────────────────────────┘
```

**No cloud. No server. No database. Passwords are encrypted at rest on your machine and stored on the physical device. The device types them anywhere without any app.**

---

## Features

- **Encrypted local vault** — master password → PBKDF2 (100k iterations) → AES-256-GCM. Stored in `localStorage`, nothing sent anywhere.
- **Lock / unlock screen** — vault is locked on load, stays locked until master password is entered. Session lock button in the header.
- **Credential management** — add, edit, delete accounts with service name, username, password (confirm), and icon. Confirm-delete guard on all deletions.
- **USB device sync** — connect an Arduino Leonardo via the browser's Web Serial API. Sync credentials to device EEPROM over a chunked serial protocol with ACK handshake.
- **HID password typing** — once synced, unplug the device and use it on any computer. Navigate the LCD menu, press SELECT, click into a password field — the device types the password via USB HID keyboard with a 3-second countdown.
- **Device panel** — on wide screens, a right-side panel shows the device LCD mockup, connection status, EEPROM slot usage, and hardware specs.
- **Two firmware versions** — one for Elegoo Uno R3 (companion-app clipboard mode) and one for Arduino Leonardo (standalone HID typing).

---

## Prerequisites

- **Node.js 18+** and **npm**
- **Chrome or Edge** (Web Serial API required — Firefox and Safari not supported)
- **Arduino Leonardo** or **Pro Micro** for full HID functionality (Elegoo Uno R3 works for companion-app clipboard mode only)

---

## Install & Run

```bash
# Clone
git clone https://github.com/mattydev22/northstar-companion.git
cd northstar-companion

# Install dependencies
npm install

# Start development server
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) in **Chrome or Edge**.

> The Web Serial API requires either HTTPS or `localhost`. The dev server satisfies this automatically.

---

## First-Time Setup

1. Navigate to `/vault`
2. You will be prompted to **create a master password** — this encrypts your vault. It is never stored or transmitted.
3. Add credentials using the **+ Add New** button
4. To sync to a device, click **CONNECT** in the top bar and select your Arduino from the port picker

---

## App Routes

| Route | Description |
|---|---|
| `/` | Landing / welcome screen |
| `/vault` | Main vault dashboard — credential management and device sync |
| `/faq` | FAQ and documentation |

---

## Project Structure

```
northstar-companion/
├── src/
│   ├── app/
│   │   ├── page.tsx                       # Landing screen
│   │   ├── vault/page.tsx                 # Vault page — credential state owner
│   │   ├── faq/page.tsx                   # FAQ
│   │   └── layout.tsx                     # Root layout (dark bg, mono font)
│   │
│   ├── components/
│   │   ├── auth/
│   │   │   └── UnlockScreen.tsx           # Master password create / unlock screen
│   │   ├── vault/
│   │   │   ├── CredentialList.tsx         # Scrollable list with banner header
│   │   │   ├── CredentialCard.tsx         # Single row with inline confirm-delete
│   │   │   └── AddCredentialModal.tsx     # Add / edit form with password confirm
│   │   ├── device/
│   │   │   ├── DevicePanel.tsx            # Right panel: LCD mockup, specs, EEPROM bar
│   │   │   ├── TransferModal.tsx          # Sync progress overlay
│   │   │   └── PasswordReadyModal.tsx     # Shown on device SELECT (clipboard mode)
│   │   ├── layout/
│   │   │   ├── TopBar.tsx                 # Logo, device status badge, lock button
│   │   │   ├── Dashboard.tsx              # Two-column layout shell
│   │   │   └── BottomActionBar.tsx        # Sync + Add New, device-gated
│   │   └── ui/
│   │       └── ProgressRing.tsx           # SVG circular progress indicator
│   │
│   ├── hooks/
│   │   ├── useVaultStorage.ts             # Encrypted localStorage vault (PBKDF2 + AES-GCM)
│   │   └── useSerialDevice.ts             # Web Serial API: connect, pair, sync, HID events
│   │
│   └── types/
│       └── credential.ts                  # Credential interface + icon options
│
├── arduino/
│   ├── firmware/
│   │   ├── northstar_hid/
│   │   │   └── northstar_hid.ino          # ★ Main — Arduino Leonardo / Pro Micro (HID)
│   │   └── northstar_device/
│   │       └── northstar_device.ino       # Legacy — Elegoo Uno R3 (no HID)
│   └── diagnostics/
│       ├── lcd_test/
│       │   └── lcd_test.ino               # LCD wiring diagnostic
│       └── i2c_scanner/
│           └── i2c_scanner.ino            # I2C address scanner
│
└── docs/
    └── arduino-integration.md             # Serial protocol and hardware integration notes
```

---

## Hardware Setup (Arduino Leonardo)

### Wiring

| Component | Pin |
|---|---|
| LCD RS | 12 |
| LCD E | 11 |
| LCD D4 | 5 |
| LCD D5 | 4 |
| LCD D6 | 3 |
| LCD D7 | 2 |
| Button UP | 6 |
| Button DOWN | 7 |
| Button BACK | 8 |
| Button SELECT | 9 |

All buttons use `INPUT_PULLUP` — connect one leg to the pin, other leg to GND.

### Uploading Firmware

1. Open `arduino/northstar_hid/northstar_hid.ino` in the Arduino IDE
2. **Tools → Board → Arduino Leonardo**
3. Select the correct port
4. Upload

> **First sync required:** After uploading, the device shows "Pair via app". Open the companion app, connect via USB, and sync your credentials. After that, the device boots straight to the menu — no app needed.

### Using the Device Standalone

After syncing at least once:

1. Plug the device into **any** computer (Mac, Windows, Linux — no drivers needed)
2. The device boots directly to the account menu
3. Navigate with UP/DOWN to your account → press SELECT
4. **Click into the password field** on screen within 3 seconds
5. The device types your password via USB HID

---

## Security Model

| Layer | Implementation |
|---|---|
| Vault encryption | AES-256-GCM, key derived via PBKDF2 (100,000 iterations, SHA-256) |
| Vault key storage | Never stored — derived from master password at unlock, held in memory only |
| Salt | 16-byte random, stored in `localStorage` alongside the ciphertext (non-secret) |
| IV | 12-byte random, freshly generated on every save |
| Device storage | Plaintext in EEPROM — physical access control (biometric auth planned) |
| Sync transport | USB serial cable (physical layer); passwords travel over the cable during sync |
| Browser support | Chrome / Edge only (Web Serial API + Web Crypto API) |

**What the browser knows:** encrypted blob in `localStorage`. Without the master password, it is unreadable.
**What the device knows:** plaintext credentials in EEPROM. Physical possession of the device is the security boundary (biometric gate planned for a future revision).

---

## Device EEPROM Layout

```
[0-1]  Magic bytes (0xAB 0xCD) — marks a valid/initialised device
[2]    Entry count
[3]    Reserved
[4+]   Entries, 50 bytes each:
         [0]     Valid flag (0x01)
         [1-16]  Service name (15 chars + null)
         [17-49] Password (32 chars + null)

Max: 20 entries in 1KB EEPROM
```

---

## Sync Protocol

Communication uses newline-terminated JSON over 9600-baud serial.

```
App  → Device : {"cmd":"REQUEST_KEY"}       # ask device to re-send PAIR if already booted
Device → App  : {"event":"PAIR"}            # device announces it is ready
App  → Device : {"cmd":"PAIR_ACK"}          # app confirms pairing
App  → Device : {"cmd":"BEGIN","count":N,"len":BYTES}
Device → App  : {"ack":1}
App  → Device : <48-byte JSON chunk>\n      # repeated until full payload sent
Device → App  : {"ack":1}                   # after each chunk
App  → Device : {"cmd":"END"}
Device → App  : {"ack":1}                   # device has written to EEPROM
```

Payload format:
```json
{"credentials":[{"svc":"GitHub","pwd":"mypassword"},{"svc":"Gmail","pwd":"hunter2"}]}
```

---

## Planned Hardware Upgrade

The current prototype uses an Arduino Leonardo. The target final hardware is:

| Component | Part |
|---|---|
| MCU | RP2040-Zero (21×18mm, USB-C, native HID) |
| Display | 0.96" I2C OLED (SSD1306, 128×64) |
| Buttons | 4× 6mm tactile (THT, panel-mount) |
| Storage | AT24C256 I2C EEPROM (32KB — ~640 entries) |
| Enclosure | 3D-printed, credit-card-ish form factor |
| Future MCU | STM32F4 (hardware AES engine for on-device encryption) |

---

## Tech Stack

| | |
|---|---|
| Framework | Next.js 15 (App Router) |
| Styling | Tailwind CSS v4 |
| Language | TypeScript |
| Crypto | Web Crypto API (PBKDF2, AES-256-GCM) — browser-native, no libraries |
| Hardware comms | Web Serial API — browser-native, no Node.js backend |
| Firmware | Arduino C++ (`Keyboard.h`, `LiquidCrystal.h`, `EEPROM.h`) |
| Backend | None |
| Database | None |
