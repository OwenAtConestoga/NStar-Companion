#!/bin/bash
# NorthStar Auth — USB Gadget Setup for Raspberry Pi Zero 2 W
#
# Configures the Pi's OTG USB port as a composite CDC ACM (serial) + HID
# (keyboard) gadget. On the host laptop the serial side appears as a regular
# serial port (e.g. /dev/tty.usbmodem* on macOS, COM# on Windows), picked up
# by the companion app via the Web Serial API. The HID side is what lets the
# device type passwords directly into any OS with no drivers.
#
# Run this ONCE on the Pi (requires root):
#   sudo bash setup_usb_gadget.sh
#
# Then REBOOT for the gadget module to load.
# After reboot, plug the OTG micro-USB port into your laptop.

set -euo pipefail

echo "=== NorthStar USB Gadget Setup ==="

# ── 1. Locate boot config ──────────────────────────────────────────────────────
# Raspberry Pi OS Bookworm (2023+): /boot/firmware/config.txt
# Raspberry Pi OS Bullseye and older: /boot/config.txt
if   [ -f /boot/firmware/config.txt ]; then
    CONFIG=/boot/firmware/config.txt
elif [ -f /boot/config.txt ]; then
    CONFIG=/boot/config.txt
else
    echo "ERROR: Cannot find config.txt — is this a Raspberry Pi?"
    exit 1
fi
echo "[info] Boot config: $CONFIG"

# ── 2. Enable DWC2 USB OTG overlay in PERIPHERAL mode ─────────────────────────
# The gadget (ACM+HID) only works if dwc2 is in peripheral mode — "host" mode
# makes the Pi expect a USB device plugged INTO it, the opposite of what we
# need. Replace any existing dtoverlay=dwc2 line (including a stale
# dr_mode=host one) rather than just skipping if some form of it is present.
sed -i '/^dtoverlay=dwc2/d' "$CONFIG"
echo "dtoverlay=dwc2,dr_mode=peripheral" >> "$CONFIG"
echo "[ok]   Set dtoverlay=dwc2,dr_mode=peripheral in $CONFIG"

# ── 3. Install the composite gadget as a boot-time service ───────────────────
# northstar-gadget.sh builds the configfs gadget (acm.usb0 + hid.usb0) that
# creates /dev/ttyGS0 and /dev/hidg0. It must run before the firmware service.
GADGET_SCRIPT_SRC="$(dirname "$0")/northstar-gadget.sh"
if [ -f "$GADGET_SCRIPT_SRC" ]; then
    cp "$GADGET_SCRIPT_SRC" /usr/local/sbin/northstar-gadget.sh
    chmod +x /usr/local/sbin/northstar-gadget.sh
    echo "[ok]   Gadget script installed to /usr/local/sbin/northstar-gadget.sh"
else
    echo "[warn] northstar-gadget.sh not found next to this script."
    echo "       Copy it manually to /usr/local/sbin/northstar-gadget.sh"
fi

cat > /etc/systemd/system/northstar-gadget.service << 'UNIT'
[Unit]
Description=NorthStar USB composite gadget (CDC ACM + HID)
After=local-fs.target
Before=northstar.service

[Service]
Type=oneshot
RemainAfterExit=yes
ExecStart=/usr/local/sbin/northstar-gadget.sh

[Install]
WantedBy=multi-user.target
UNIT

systemctl daemon-reload
systemctl enable northstar-gadget.service
echo "[ok]   systemd service 'northstar-gadget' installed and enabled."

# ── 4. Install Python dependencies ────────────────────────────────────────────
echo ""
echo "[info] Installing Python packages..."
# --break-system-packages is needed on Bookworm (PEP 668 enforcement)
pip3 install --quiet pyserial spidev pillow RPi.GPIO --break-system-packages 2>/dev/null \
    || pip3 install --quiet pyserial spidev pillow RPi.GPIO
echo "[ok]   Python packages installed."

# ── 5. Create vault directory ─────────────────────────────────────────────────
VAULT_DIR="/home/pi/.northstar"
mkdir -p "$VAULT_DIR"
chown pi:pi "$VAULT_DIR"
echo "[ok]   Vault directory: $VAULT_DIR"

# ── 6. Copy firmware to /home/pi/northstar ────────────────────────────────────
DEST="/home/pi/northstar"
mkdir -p "$DEST"
# Copy if script is being run from the firmware directory
if [ -f "$(dirname "$0")/northstar_pi.py" ]; then
    cp "$(dirname "$0")/northstar_pi.py" "$DEST/"
    chown pi:pi "$DEST/northstar_pi.py"
    echo "[ok]   Firmware copied to $DEST/northstar_pi.py"
else
    echo "[warn] northstar_pi.py not found next to this script."
    echo "       Copy it manually to $DEST/northstar_pi.py"
fi

# ── 7. Install and enable systemd service ─────────────────────────────────────
cat > /etc/systemd/system/northstar.service << 'UNIT'
[Unit]
Description=NorthStar Auth Firmware
After=northstar-gadget.service
Requires=northstar-gadget.service

[Service]
Type=simple
User=pi
WorkingDirectory=/home/pi/northstar
Environment=PYTHONUNBUFFERED=1
ExecStart=/usr/bin/python3 /home/pi/northstar/northstar_pi.py
Restart=always
RestartSec=3
StandardOutput=journal
StandardError=journal

[Install]
WantedBy=multi-user.target
UNIT

systemctl daemon-reload
systemctl enable northstar.service
echo "[ok]   systemd service 'northstar' installed and enabled."

# ── 8. Enable SPI (required for LCD HAT) ──────────────────────────────────────
# Comment out any disabled/legacy spi line first so we don't end up with
# a stale "#dtparam=spi=on" sitting alongside the active one.
sed -i '/^#\?dtparam=spi=on/d' "$CONFIG"
echo "dtparam=spi=on" >> "$CONFIG"
echo "[ok]   Enabled SPI in $CONFIG"

echo ""
echo "=== Setup complete ==="
echo ""
echo "Next steps:"
echo "  1. REBOOT the Pi:  sudo reboot"
echo "  2. After reboot, plug the OTG micro-USB port into your laptop."
echo "     (Use the port labeled 'USB', NOT the one labeled 'PWR'.)"
echo "  3. Open the NorthStar Companion app in Chrome/Edge."
echo "  4. Click CONNECT — select the port that appears (ttyGS0 / usbmodem)."
echo "  5. Click SYNC to send your passwords to the device."
echo ""
echo "Service logs (while connected via SSH):"
echo "  journalctl -fu northstar"
echo "  journalctl -u northstar-gadget"
