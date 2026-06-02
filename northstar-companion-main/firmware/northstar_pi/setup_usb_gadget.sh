#!/bin/bash
# NorthStar Auth — USB Gadget Setup for Raspberry Pi Zero 2 W
#
# Configures the Pi's OTG USB port as a CDC ACM serial device.
# On the host laptop it appears as a regular serial port
# (e.g. /dev/tty.usbmodem* on macOS, COM# on Windows).
# The NorthStar companion app picks it up via the Web Serial API.
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

# ── 2. Enable DWC2 USB OTG overlay ────────────────────────────────────────────
if grep -q "dtoverlay=dwc2" "$CONFIG"; then
    echo "[skip] dtoverlay=dwc2 already in $CONFIG"
else
    echo "dtoverlay=dwc2" >> "$CONFIG"
    echo "[ok]   Added dtoverlay=dwc2 to $CONFIG"
fi

# ── 3. Load dwc2 and g_serial on boot ─────────────────────────────────────────
# g_serial creates a CDC ACM serial gadget at /dev/ttyGS0 (device side).
# dwc2 is the USB OTG controller driver required by all USB gadget modules.
for MOD in dwc2 g_serial; do
    if grep -qx "$MOD" /etc/modules 2>/dev/null; then
        echo "[skip] $MOD already in /etc/modules"
    else
        echo "$MOD" >> /etc/modules
        echo "[ok]   Added $MOD to /etc/modules"
    fi
done

# ── 4. Install Python dependencies ────────────────────────────────────────────
echo ""
echo "[info] Installing Python packages..."
# --break-system-packages is needed on Bookworm (PEP 668 enforcement)
pip3 install --quiet pyserial st7789 pillow RPi.GPIO --break-system-packages 2>/dev/null \
    || pip3 install --quiet pyserial st7789 pillow RPi.GPIO
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
After=multi-user.target

[Service]
Type=simple
User=pi
WorkingDirectory=/home/pi/northstar
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
if ! grep -q "^dtparam=spi=on" "$CONFIG"; then
    echo "dtparam=spi=on" >> "$CONFIG"
    echo "[ok]   Enabled SPI in $CONFIG"
else
    echo "[skip] SPI already enabled in $CONFIG"
fi

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
