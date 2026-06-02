#!/bin/bash
# NorthStar USB Composite Gadget — CDC ACM serial + HID keyboard
# Installed to /usr/local/sbin/northstar-gadget.sh by setup_usb_gadget.sh
# Runs as a systemd oneshot before the NorthStar firmware service.
set -euo pipefail

modprobe libcomposite

GADGET=/sys/kernel/config/usb_gadget/northstar
mkdir -p "$GADGET" && cd "$GADGET"

echo 0x1d6b > idVendor   # Linux Foundation
echo 0x0104 > idProduct  # Multifunction Composite Gadget
echo 0x0100 > bcdDevice
echo 0x0200 > bcdUSB

mkdir -p strings/0x409
echo "NorthStar"       > strings/0x409/manufacturer
echo "NorthStar Auth"  > strings/0x409/product
echo "ns0000000001"    > strings/0x409/serialnumber

# CDC ACM — serial port (/dev/ttyGS0 on Pi side)
mkdir -p functions/acm.usb0

# HID keyboard — /dev/hidg0 on Pi side
mkdir -p functions/hid.usb0
echo 1 > functions/hid.usb0/protocol     # keyboard
echo 1 > functions/hid.usb0/subclass     # boot interface
echo 8 > functions/hid.usb0/report_length

# Standard boot-class keyboard HID descriptor
printf '\x05\x01\x09\x06\xa1\x01\x05\x07\x19\xe0\x29\xe7\x15\x00\x25\x01\x75\x01\x95\x08\x81\x02\x95\x01\x75\x08\x81\x03\x95\x05\x75\x01\x05\x08\x19\x01\x29\x05\x91\x02\x95\x01\x75\x03\x91\x03\x95\x06\x75\x08\x15\x00\x25\x65\x05\x07\x19\x00\x29\x65\x81\x00\xc0' \
  > functions/hid.usb0/report_desc

mkdir -p configs/c.1
echo 250 > configs/c.1/MaxPower
mkdir -p configs/c.1/strings/0x409
echo "NorthStar CDC+HID" > configs/c.1/strings/0x409/configuration

ln -sf functions/acm.usb0 configs/c.1/
ln -sf functions/hid.usb0 configs/c.1/

UDC=$(ls /sys/class/udc | head -1)
echo "$UDC" > UDC
echo "[gadget] bound to $UDC — /dev/ttyGS0 and /dev/hidg0 ready"
