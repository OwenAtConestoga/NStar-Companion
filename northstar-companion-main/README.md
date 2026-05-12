# NorthStar Companion

**A local-first, hardware-paired password manager companion app.**

NorthStar Auth is a hardware password vault — credentials are managed in a browser-based companion app, encrypted with your master password, and synced to a physical USB device. The device acts as a USB HID keyboard and types your passwords directly into any computer, no software required on the target machine.

> **Stack:** Next.js 15 · Tailwind CSS v4 · TypeScript · Web Crypto API · Web Serial API
> **Hardware:** Raspberry Pi Zero 2 W · Waveshare 1.3" LCD HAT (240×240, SPI)

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
│              Raspberry Pi Zero 2 W                   │
│                                                      │
│  Waveshare 1.3" LCD HAT (240×240, SPI)               │
│  Joystick + 3 keys  ·  16GB microSD storage          │
│                                                      │
│  Plug into any computer → navigate menu → SELECT     │
│  → device types password via USB HID (OTG)           │
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
- **Raspberry Pi Zero 2 W** with Waveshare 1.3" LCD HAT for full HID functionality via USB OTG

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

## Hardware Setup (Raspberry Pi Zero 2 W)

### Components

| Item | Details |
|---|---|
| MCU | Raspberry Pi Zero 2 W (quad-core ARM Cortex-A53, 512MB RAM) |
| Display | Waveshare 1.3" LCD HAT — 240×240 px, ST7789 driver, SPI |
| Input | Waveshare HAT built-in: joystick (UP/DOWN/LEFT/RIGHT/PRESS) + 3 keys |
| Storage | 16GB microSD card |
| Power | Official Pi Zero power supply |
| Connectivity | OTG USB (USB HID gadget mode), WiFi, Bluetooth |
| Case | Pi Zero case with heatsink |

### Display & Button Wiring

The Waveshare 1.3" LCD HAT mounts directly onto the Pi Zero 2 W's 40-pin GPIO header — no individual wiring required.

**LCD HAT GPIO mapping (for reference):**

| Signal | GPIO (BCM) |
|---|---|
| LCD MOSI (DIN) | GPIO 10 |
| LCD SCLK (CLK) | GPIO 11 |
| LCD CS | GPIO 8 |
| LCD DC | GPIO 25 |
| LCD RST | GPIO 27 |
| LCD Backlight | GPIO 24 |
| Key 1 | GPIO 21 |
| Key 2 | GPIO 20 |
| Key 3 | GPIO 16 |
| Joystick UP | GPIO 6 |
| Joystick DOWN | GPIO 19 |
| Joystick LEFT | GPIO 5 |
| Joystick RIGHT | GPIO 26 |
| Joystick PRESS | GPIO 13 |

### Flashing the Device

1. Flash Raspberry Pi OS Lite (64-bit) to the 16GB microSD using Raspberry Pi Imager
2. Enable SSH and configure your WiFi in Imager's advanced settings
3. Enable SPI in `raspi-config` → Interface Options → SPI
4. Enable USB OTG gadget mode by adding `dtoverlay=dwc2` to `/boot/config.txt` and `dwc2,g_hid` to `/etc/modules`
5. Install the NorthStar firmware script and configure it to run on boot

> **First sync required:** After booting, the device shows "Pair via app". Open the companion app, connect via USB, and sync your credentials. After that, the device boots straight to the menu — no app needed.

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
| Device storage | Plaintext on microSD — physical access control (biometric auth planned) |
| Sync transport | USB serial cable (physical layer); passwords travel over the cable during sync |
| Browser support | Chrome / Edge only (Web Serial API + Web Crypto API) |

**What the browser knows:** encrypted blob in `localStorage`. Without the master password, it is unreadable.
**What the device knows:** plaintext credentials on microSD. Physical possession of the device is the security boundary (biometric gate planned for a future revision).

---

## Device Storage Layout

Credentials are stored as a JSON file on the microSD (e.g. `/home/pi/vault.json`), synced from the companion app over USB serial.

```json
{
  "credentials": [
    { "svc": "GitHub", "pwd": "mypassword" },
    { "svc": "Gmail",  "pwd": "hunter2"    }
  ]
}
```

Max entries: limited by microSD capacity (effectively unlimited at ~16GB).

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

## Current Hardware

| Component | Part |
|---|---|
| MCU | Raspberry Pi Zero 2 W (quad-core ARM Cortex-A53 @ 1GHz, 512MB RAM) |
| Display | Waveshare 1.3" LCD HAT — 240×240 px, ST7789, SPI |
| Input | Built-in joystick (4-way + press) + 3 tactile keys |
| Storage | 16GB microSD |
| Power | Official Raspberry Pi Zero power supply |
| Connectivity | USB OTG (HID gadget), WiFi 802.11 b/g/n, Bluetooth 4.2 |
| Enclosure | Pi Zero case with heatsink |

---

## Tech Stack

| | |
|---|---|
| Framework | Next.js 15 (App Router) |
| Styling | Tailwind CSS v4 |
| Language | TypeScript |
| Crypto | Web Crypto API (PBKDF2, AES-256-GCM) — browser-native, no libraries |
| Hardware comms | Web Serial API — browser-native, no Node.js backend |
| Firmware | Python (`python-evdev`, `st7789`, `RPi.GPIO`) running on Raspberry Pi OS Lite |
| Backend | None |
| Database | None |
