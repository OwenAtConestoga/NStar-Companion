#!/bin/bash
# NorthStar Auth — Deploy firmware to Pi Zero 2 W over SSH
#
# Usage:
#   bash install.sh [pi-hostname-or-ip]
#
# Default host is "northstar.local" (works if mDNS/Bonjour is running).
# Example:
#   bash install.sh 192.168.1.42
#   bash install.sh northstar.local
#
# Prerequisites on your laptop:
#   - Pi Zero 2 W is powered on and connected to the same Wi-Fi network
#   - SSH is enabled on the Pi (set up in Raspberry Pi Imager)
#   - The Pi's username is "pi" (default)

set -euo pipefail

PI_HOST="${1:-northstar.local}"
PI_USER="pi"
DEST="/home/$PI_USER/northstar"
SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"

echo "=== NorthStar Install → $PI_USER@$PI_HOST ==="

# Create destination directory
ssh "$PI_USER@$PI_HOST" "mkdir -p $DEST"

# Copy firmware files
echo "Copying firmware..."
scp "$SCRIPT_DIR/northstar_pi.py"       "$PI_USER@$PI_HOST:$DEST/"
scp "$SCRIPT_DIR/requirements.txt"      "$PI_USER@$PI_HOST:$DEST/"
scp "$SCRIPT_DIR/setup_usb_gadget.sh"   "$PI_USER@$PI_HOST:/tmp/"
scp "$SCRIPT_DIR/northstar-gadget.sh"   "$PI_USER@$PI_HOST:/tmp/"

# Run setup script as root
echo "Running setup (sudo required)..."
ssh "$PI_USER@$PI_HOST" "sudo bash /tmp/setup_usb_gadget.sh"

echo ""
echo "=== Done. Reboot the Pi to activate the USB serial gadget. ==="
echo "  ssh $PI_USER@$PI_HOST 'sudo reboot'"
