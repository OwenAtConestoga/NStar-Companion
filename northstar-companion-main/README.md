# NorthStar Companion

**A local-first, hardware-paired password manager — no cloud, no server, no trust required.**

NorthStar Auth is a hardware password vault. Credentials are managed in a browser-based companion app, encrypted with your master password, and synced to a physical USB device. The device either types passwords directly via USB HID keyboard (Windows/Linux) or sends a SELECT event so the companion app copies the password to your clipboard (macOS).

> **Stack:** Next.js 15 · Tailwind CSS v4 · TypeScript · Web Crypto API · Web Serial API  
> **Hardware:** Raspberry Pi Zero 2 W · Waveshare 1.3" LCD HAT (240×240, SPI)

---

## How It Works

```
┌──────────────────────────────────────────────────────┐
│            NorthStar Companion (Browser)             │
│                                                      │
│  AES-256-GCM vault      Web Serial API               │
│  PBKDF2 master key  ←→  USB sync to device           │
└────────────────────────┬─────────────────────────────┘
                         │ USB — CDC ACM serial (9600 baud) during sync
                         │ USB — HID keyboard during password entry
┌────────────────────────▼─────────────────────────────┐
│              Raspberry Pi Zero 2 W                   │
│                                                      │
│  Waveshare 1.3" LCD HAT (240×240, SPI)               │
│  Joystick + 3 keys (KEY1=OK  KEY2=Back  KEY3=Home)   │
│  16GB microSD · libcomposite USB gadget (ACM + HID)  │
│                                                      │
│  Navigate menu → SELECT account                      │
│  → types password via USB HID  (Windows/Linux)       │
│  → companion app copies to clipboard  (macOS)        │
└──────────────────────────────────────────────────────┘
```

**No cloud. No server. No database. Passwords are encrypted in the browser and stored on the physical device. Once synced, the device works standalone on any machine.**

---

## Features

- **Encrypted local vault** — master password → PBKDF2 (100k iterations, SHA-256) → AES-256-GCM. Stored in `localStorage`, nothing ever leaves the browser.
- **Lock / unlock screen** — vault stays locked until master password is entered. Session lock button in the header.
- **Credential management** — add, edit, delete accounts with service name, username, password, and icon. Confirm-delete guard on all deletions.
- **USB device sync** — connect via Chrome/Edge Web Serial API. Sync credentials to the device over a chunked serial protocol with per-chunk ACK handshake.
- **HID password typing** — navigate the device menu, select an account, press OK → the device types the password as a USB HID keyboard. Works on Windows and Linux without any drivers or OS approval.
- **macOS clipboard mode** — on macOS (Sequoia+), the device sends a SELECT event over serial; the companion app auto-copies the password and shows a modal. Press ⌘V to paste.
- **Persistent vault** — credentials survive reboots. The device boots straight to the account menu if credentials are saved; PAIRING screen only appears on first use.
- **Device panel** — right-side panel shows LCD mockup, connection status, last sync timestamp, and hardware specs.

---

## Prerequisites

- **Node.js 18+** and **npm**
- **Chrome or Edge** — Web Serial API required (Firefox and Safari not supported)
- **Raspberry Pi Zero 2 W** with Waveshare 1.3" LCD HAT — for sync and HID typing via USB OTG

---

## Install & Run

```bash
git clone https://github.com/OwenAtConestoga/NStar-Companion.git
cd NStar-Companion

npm install
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) in **Chrome or Edge**.

> Web Serial API requires HTTPS or `localhost`. The dev server satisfies this automatically.

---

## First-Time Setup

1. Go to `/vault`
2. Create a **master password** — this is the only key to your vault. Never stored, never transmitted.
3. Add credentials with the **+ Add New** button
4. Plug the Pi's **USB OTG port** (labeled "USB", not "PWR") into your computer
5. Click **CONNECT** in the top bar → select the NorthStar port
6. Click **Initiate Secure Sync** — credentials are sent to the device

After the first sync, the device boots to the HOME menu automatically on every reboot.

---

## Using the Device

1. Plug the device into any computer via the **USB OTG port**
2. Navigate with the **joystick** (up/down) or **KEY1** (OK) to enter menus
3. Select an account → press **KEY1** to send the password
   - **Windows / Linux:** device types the password via USB HID keyboard — make sure cursor is in the target field
   - **macOS:** companion app shows a copy modal — click **COPY** or the password is auto-copied, then paste (⌘V)

**Key layout:**

| Button | Action |
|---|---|
| Joystick UP/DOWN | Navigate |
| Joystick PRESS or KEY1 | OK / Select |
| KEY2 | Back |
| KEY3 | Home (jump to main menu) |

---

## App Routes

| Route | Description |
|---|---|
| `/` | Landing / welcome screen |
| `/vault` | Main vault — credential management and device sync |
| `/faq` | FAQ and documentation |

---

## Project Structure

```
NStar-Companion/
├── src/
│   ├── app/
│   │   ├── page.tsx                       # Landing screen
│   │   ├── vault/page.tsx                 # Vault — credential state and device orchestration
│   │   ├── faq/page.tsx                   # FAQ
│   │   └── layout.tsx                     # Root layout (dark bg, mono font)
│   │
│   ├── components/
│   │   ├── auth/UnlockScreen.tsx          # Master password create / unlock
│   │   ├── vault/
│   │   │   ├── CredentialList.tsx         # Scrollable credential list
│   │   │   ├── CredentialCard.tsx         # Single row with inline confirm-delete
│   │   │   └── AddCredentialModal.tsx     # Add / edit form
│   │   ├── device/
│   │   │   ├── DevicePanel.tsx            # Right panel: LCD mockup, specs, sync status
│   │   │   ├── TransferModal.tsx          # Sync progress overlay
│   │   │   └── PasswordReadyModal.tsx     # Copy modal — shown on device SELECT event
│   │   ├── layout/
│   │   │   ├── TopBar.tsx                 # Logo, device status, lock button
│   │   │   ├── Dashboard.tsx              # Two-column layout shell
│   │   │   └── BottomActionBar.tsx        # Sync + Add New buttons
│   │   └── ui/ProgressRing.tsx            # SVG circular progress indicator
│   │
│   ├── hooks/
│   │   ├── useVaultStorage.ts             # Encrypted localStorage vault (PBKDF2 + AES-GCM)
│   │   └── useSerialDevice.ts             # Web Serial API: connect, pair, sync, HID events
│   │
│   └── types/credential.ts               # Credential interface + icon options
│
└── firmware/
    └── northstar_pi/
        ├── northstar_pi.py                # ★ Main firmware — Python daemon for Pi Zero 2 W
        ├── northstar-gadget.sh            # USB composite gadget setup (ACM + HID)
        ├── setup_usb_gadget.sh            # One-time Pi setup helper
        ├── install.sh                     # SSH deploy script (laptop → Pi)
        └── requirements.txt               # Python dependencies
```

---

## Firmware Setup (Raspberry Pi Zero 2 W)

### Hardware

| Item | Details |
|---|---|
| MCU | Raspberry Pi Zero 2 W (quad-core Cortex-A53 @ 1GHz, 512MB RAM) |
| Display | Waveshare 1.3" LCD HAT — 240×240 px, ST7789, SPI |
| Input | Waveshare HAT built-in joystick + 3 tactile keys |
| Storage | microSD (vault at `~/.northstar/vault.json`) |
| USB | OTG port — composite gadget: CDC ACM serial + HID keyboard |

### GPIO Pin Mapping

| Signal | GPIO (BCM) |
|---|---|
| LCD CS | GPIO 8 (CE0) |
| LCD DC | GPIO 25 |
| LCD RST | GPIO 27 |
| LCD Backlight | GPIO 24 |
| KEY1 (OK) | GPIO 21 |
| KEY2 (Back) | GPIO 20 |
| KEY3 (Home) | GPIO 16 |
| Joystick UP | GPIO 6 |
| Joystick DOWN | GPIO 19 |
| Joystick PRESS | GPIO 13 |

### Pi Configuration

**`/boot/firmware/config.txt`** must include:
```
dtparam=spi=on
dtoverlay=dwc2
gpu_mem=16
disable_splash=1
boot_delay=0
```

**`/boot/firmware/cmdline.txt`** must include (on one line):
```
modules-load=dwc2
```

### Deploying the Firmware

```bash
# From the repo root on your laptop:
cd firmware/northstar_pi

# Copy firmware to Pi
scp northstar_pi.py pi@<PI_IP>:/home/pi/northstar_pi.py

# SSH in and install dependencies
ssh pi@<PI_IP>
pip3 install --break-system-packages pyserial spidev pillow RPi.GPIO
sudo apt install -y fonts-dejavu

# Set up the USB composite gadget service (run once)
sudo cp northstar-gadget.sh /usr/local/sbin/northstar-gadget.sh
sudo chmod +x /usr/local/sbin/northstar-gadget.sh
# (create northstar-gadget.service + northstar.service in /etc/systemd/system)
sudo systemctl enable northstar-gadget northstar
sudo reboot
```

After reboot, the device appears as both a CDC ACM serial port and a USB HID keyboard.

---

## Sync Protocol

Communication uses newline-terminated JSON at 9600 baud.

```
App    → Device : {"cmd":"REQUEST_KEY"}             # ask device to re-send PAIR if already booted
Device → App    : {"event":"PAIR"}                  # device is ready
App    → Device : {"cmd":"PAIR_ACK"}                # pairing confirmed
App    → Device : {"cmd":"BEGIN","count":N,"len":L} # start sync
Device → App    : {"ack":1}
App    → Device : <48-byte chunk>\n                 # repeated for full payload
Device → App    : {"ack":1}                         # per-chunk ack
App    → Device : {"cmd":"END"}
Device → App    : {"ack":1}                         # device saved vault to microSD

Device → App    : {"event":"SELECT","idx":N}        # user selected account N on device
```

Payload sent during sync:
```json
{"credentials":[{"svc":"GitHub","pwd":"mypassword"},{"svc":"Gmail","pwd":"hunter2"}]}
```

---

## Security Model

| Layer | Implementation |
|---|---|
| Vault encryption | AES-256-GCM, key derived via PBKDF2 (100,000 iterations, SHA-256) |
| Master key | Never stored — derived at unlock time, held in memory only |
| Salt | 16-byte random, stored in `localStorage` alongside ciphertext |
| IV | 12-byte random, freshly generated on every save |
| Device storage | Plaintext JSON on microSD — physical possession is the security boundary |
| Sync transport | USB serial cable (physical), point-to-point |
| Browser support | Chrome / Edge only (Web Serial API + Web Crypto API) |

---

## Tech Stack

| | |
|---|---|
| Framework | Next.js 15 (App Router) |
| Styling | Tailwind CSS v4 |
| Language | TypeScript |
| Crypto | Web Crypto API — browser-native, no libraries |
| Hardware comms | Web Serial API — browser-native, no backend |
| Firmware | Python 3 (`spidev`, `RPi.GPIO`, `Pillow`, `pyserial`) on Raspberry Pi OS Lite (64-bit) |
| Backend | None |
| Database | None |
