#!/usr/bin/env python3
"""
NorthStar Auth — Pi Zero 2 W Firmware
Display : Waveshare 1.3" LCD HAT  (240×240, ST7789, SPI)
Input   : HAT joystick UP/DOWN/PRESS  +  KEY1=OK  KEY2=BACK  KEY3=HOME
Serial  : /dev/ttyGS0  (USB CDC ACM — libcomposite composite gadget)
HID     : /dev/hidg0   (USB HID keyboard — same composite gadget)
"""

import json
import os
import threading
import time
from dataclasses import dataclass, field
from enum import Enum, auto
from pathlib import Path

import RPi.GPIO as GPIO
import spidev
from PIL import Image, ImageDraw, ImageFont

# ── Hardware pins (BCM) ────────────────────────────────────────────────────────

LCD_RST, LCD_DC, LCD_BL = 27, 25, 24
KEY1, KEY2, KEY3             = 21, 20, 16   # OK, BACK, HOME
JOY_UP, JOY_DOWN, JOY_PRESS = 6, 19, 13

SERIAL_PORT = "/dev/ttyGS0"
BAUD_RATE   = 9600
VAULT_PATH  = Path.home() / ".northstar" / "vault.json"

W, H        = 240, 240
DEBOUNCE_MS = 220

# ── Layout ────────────────────────────────────────────────────────────────────
HDR_H = 48
ROW_H = 48
ROWS  = 4

# ── Palette — Tailwind zinc/green values from companion app ───────────────────
ZINC_950  = (  9,   9,  11)
ZINC_900  = ( 24,  24,  27)
ZINC_800  = ( 39,  39,  42)
ZINC_700  = ( 63,  63,  70)
ZINC_600  = ( 82,  82,  91)
ZINC_500  = (113, 113, 122)
ZINC_400  = (161, 161, 170)
ZINC_100  = (244, 244, 245)
GREEN_500 = ( 34, 197,  94)
GREEN_400 = ( 74, 222, 128)
GREEN_BG  = ( 20,  40,  28)
LCD_BG    = ( 18,  35,  22)
RED_400   = (248, 113, 113)
RED_BG    = ( 55,  18,  18)

# ── ST7789 display driver (direct spidev) ─────────────────────────────────────

class Display:
    def __init__(self):
        self._spi = spidev.SpiDev()
        self._spi.open(0, 0)
        self._spi.max_speed_hz = 40_000_000
        self._spi.mode = 0b11

        GPIO.output(LCD_BL, GPIO.HIGH)
        self._reset()
        self._init_regs()

    def _reset(self):
        GPIO.output(LCD_RST, GPIO.LOW);  time.sleep(0.02)
        GPIO.output(LCD_RST, GPIO.HIGH); time.sleep(0.12)

    def _cmd(self, c):
        GPIO.output(LCD_DC, GPIO.LOW)
        self._spi.writebytes([c])

    def _data(self, d):
        GPIO.output(LCD_DC, GPIO.HIGH)
        if isinstance(d, int):
            self._spi.writebytes([d])
        else:
            # send in chunks to avoid spidev 4096-byte limit
            d = list(d)
            for i in range(0, len(d), 4096):
                self._spi.writebytes(d[i:i+4096])

    def _init_regs(self):
        # ST7789 init sequence — matches Waveshare 1.3" LCD HAT
        self._cmd(0x36); self._data(0x70)          # MADCTL: MY MX MV — portrait
        self._cmd(0x3A); self._data(0x05)          # COLMOD: 16-bit RGB565
        self._cmd(0xB2); self._data([0x0C,0x0C,0x00,0x33,0x33])
        self._cmd(0xB7); self._data(0x35)
        self._cmd(0xBB); self._data(0x19)
        self._cmd(0xC0); self._data(0x2C)
        self._cmd(0xC2); self._data(0x01)
        self._cmd(0xC3); self._data(0x12)
        self._cmd(0xC4); self._data(0x20)
        self._cmd(0xC6); self._data(0x0F)
        self._cmd(0xD0); self._data([0xA4, 0xA1])
        self._cmd(0xE0); self._data([0xD0,0x04,0x0D,0x11,0x13,0x2B,0x3F,0x54,0x4C,0x18,0x0D,0x0B,0x1F,0x23])
        self._cmd(0xE1); self._data([0xD0,0x04,0x0C,0x11,0x13,0x2C,0x3F,0x44,0x51,0x2F,0x1F,0x1F,0x20,0x23])
        self._cmd(0x21)                             # display inversion ON
        self._cmd(0x11); time.sleep(0.12)           # sleep out
        self._cmd(0x29)                             # display on

    def show(self, img: Image.Image):
        # convert to RGB565 and blast over SPI
        self._cmd(0x2A); self._data([0x00,0x00,0x00,0xEF])   # col 0..239
        self._cmd(0x2B); self._data([0x00,0x00,0x00,0xEF])   # row 0..239
        self._cmd(0x2C)
        GPIO.output(LCD_DC, GPIO.HIGH)
        raw = img.convert("RGB").tobytes()  # 3 bytes per pixel
        buf = bytearray(W * H * 2)
        for i in range(W * H):
            r, g, b = raw[i*3], raw[i*3+1], raw[i*3+2]
            c = ((r & 0xF8) << 8) | ((g & 0xFC) << 3) | (b >> 3)
            buf[i*2]   = (c >> 8) & 0xFF
            buf[i*2+1] = c & 0xFF
        for i in range(0, len(buf), 4096):
            self._spi.writebytes(buf[i:i+4096])

# ── Font cache ────────────────────────────────────────────────────────────────

_fnt_cache: dict = {}

def fnt(size: int, bold: bool = False) -> ImageFont.FreeTypeFont:
    key = (size, bold)
    if key not in _fnt_cache:
        suffix = "-Bold" if bold else ""
        candidates = [
            f"/usr/share/fonts/truetype/dejavu/DejaVuSansMono{suffix}.ttf",
            f"/usr/share/fonts/truetype/dejavu/DejaVuSans{suffix}.ttf",
            "/usr/share/fonts/truetype/freefont/FreeMono.ttf",
        ]
        for path in candidates:
            if os.path.exists(path):
                try:
                    _fnt_cache[key] = ImageFont.truetype(path, size)
                    break
                except OSError:
                    pass
        else:
            _fnt_cache[key] = ImageFont.load_default()
    return _fnt_cache[key]

# ── State machine ─────────────────────────────────────────────────────────────

class S(Enum):
    PAIRING     = auto()
    HOME        = auto()
    ACCOUNTS    = auto()
    DETAIL      = auto()
    TYPING      = auto()
    SENT        = auto()
    REMOVE_CFM  = auto()
    DEL_ALL_CFM = auto()
    SETTINGS    = auto()
    INFO        = auto()
    RECEIVING   = auto()
    SYNC_DONE   = auto()

HOME_ITEMS     = ["// accounts", "// settings", "// delete all"]
SETTINGS_ITEMS = ["// device info"]

@dataclass
class App:
    state:      S    = S.PAIRING
    cursor:     int  = 0
    detail_idx: int  = 0      # which account is open — cursor means field (0=email,1=pwd) while in DETAIL
    send_ok:    bool = True   # did the last HID type_text() actually succeed?
    creds:      list = field(default_factory=list)
    recv_len:   int  = 0
    recv_buf:   str  = ""
    sync_n:     int  = 0
    _dbn:       dict = field(default_factory=dict)
    _port:      object = None   # live serial.Serial ref — set by serial_thread

# ── HID keyboard ──────────────────────────────────────────────────────────────

HID_DEV = "/dev/hidg0"

# USB HID keycode table — US QWERTY layout
# Value: (keycode, needs_shift)
_HID_MAP: dict[str, tuple[int, bool]] = {
    'a':(0x04,False),'b':(0x05,False),'c':(0x06,False),'d':(0x07,False),
    'e':(0x08,False),'f':(0x09,False),'g':(0x0A,False),'h':(0x0B,False),
    'i':(0x0C,False),'j':(0x0D,False),'k':(0x0E,False),'l':(0x0F,False),
    'm':(0x10,False),'n':(0x11,False),'o':(0x12,False),'p':(0x13,False),
    'q':(0x14,False),'r':(0x15,False),'s':(0x16,False),'t':(0x17,False),
    'u':(0x18,False),'v':(0x19,False),'w':(0x1A,False),'x':(0x1B,False),
    'y':(0x1C,False),'z':(0x1D,False),
    'A':(0x04,True), 'B':(0x05,True), 'C':(0x06,True), 'D':(0x07,True),
    'E':(0x08,True), 'F':(0x09,True), 'G':(0x0A,True), 'H':(0x0B,True),
    'I':(0x0C,True), 'J':(0x0D,True), 'K':(0x0E,True), 'L':(0x0F,True),
    'M':(0x10,True), 'N':(0x11,True), 'O':(0x12,True), 'P':(0x13,True),
    'Q':(0x14,True), 'R':(0x15,True), 'S':(0x16,True), 'T':(0x17,True),
    'U':(0x18,True), 'V':(0x19,True), 'W':(0x1A,True), 'X':(0x1B,True),
    'Y':(0x1C,True), 'Z':(0x1D,True),
    '1':(0x1E,False),'2':(0x1F,False),'3':(0x20,False),'4':(0x21,False),
    '5':(0x22,False),'6':(0x23,False),'7':(0x24,False),'8':(0x25,False),
    '9':(0x26,False),'0':(0x27,False),
    '!':(0x1E,True), '@':(0x1F,True), '#':(0x20,True), '$':(0x21,True),
    '%':(0x22,True), '^':(0x23,True), '&':(0x24,True), '*':(0x25,True),
    '(':(0x26,True), ')':(0x27,True),
    ' ':(0x2C,False),
    '-':(0x2D,False),'_':(0x2D,True),
    '=':(0x2E,False),'+':(0x2E,True),
    '[':(0x2F,False),'{':(0x2F,True),
    ']':(0x30,False),'}':(0x30,True),
   '\\':(0x31,False),'|':(0x31,True),
    ';':(0x33,False),':':(0x33,True),
   "'":(0x34,False),'"':(0x34,True),
    '`':(0x35,False),'~':(0x35,True),
    ',':(0x36,False),'<':(0x36,True),
    '.':(0x37,False),'>':(0x37,True),
    '/':(0x38,False),'?':(0x38,True),
}

_RELEASE = bytes(8)  # all-zero HID report = no keys pressed

def _hid_press(hid, modifier: int, keycode: int):
    hid.write(bytes([modifier, 0x00, keycode, 0x00, 0x00, 0x00, 0x00, 0x00]))
    hid.flush()
    time.sleep(0.006)
    hid.write(_RELEASE)
    hid.flush()
    time.sleep(0.006)

def _hid_type(hid, text: str):
    for ch in text:
        if ch not in _HID_MAP:
            print(f"[hid] skipping unmapped char: {repr(ch)}")
            continue
        keycode, shift = _HID_MAP[ch]
        _hid_press(hid, 0x02 if shift else 0x00, keycode)

def type_text(text: str) -> bool:
    """Write a single field (email or password) to /dev/hidg0 as USB HID
    keyboard keypresses. Returns True on success, False if HID unavailable."""
    if not os.path.exists(HID_DEV):
        print(f"[hid] {HID_DEV} not found — gadget not ready")
        return False
    try:
        with open(HID_DEV, "wb") as hid:
            _hid_type(hid, text)
        print(f"[hid] typed {len(text)} chars")
        return True
    except OSError as e:
        print(f"[hid] error: {e}")
        return False

# ── Render ────────────────────────────────────────────────────────────────────

def render(disp: Display, app: App):
    img  = Image.new("RGB", (W, H), ZINC_950)
    draw = ImageDraw.Draw(img)
    s    = app.state

    def hdr(title: str):
        draw.rectangle([0, 0, W, HDR_H - 1], fill=ZINC_900)
        draw.line([0, HDR_H - 1, W, HDR_H - 1], fill=ZINC_800, width=1)
        draw.text((10, 9), "N*", font=fnt(24, bold=True), fill=GREEN_500)
        draw.text((44, 12), title,  font=fnt(21),           fill=ZINC_100)

    def row(slot: int, label: str, sel: bool, warn: bool = False):
        y = HDR_H + slot * ROW_H
        if slot > 0:
            draw.line([12, y, W - 12, y], fill=ZINC_800, width=1)
        if sel:
            draw.rectangle([0, y, W, y + ROW_H - 1], fill=GREEN_BG)
            draw.rectangle([0, y, 3, y + ROW_H - 1], fill=GREEN_500)
            draw.text((12, y + 9), "~", font=fnt(23), fill=GREEN_400)
        draw.text((30, y + 9), label, font=fnt(22), fill=GREEN_400 if sel else ZINC_400)
        if warn:
            # small dot = this account has no email/username set — selecting
            # "email" on it will silently type nothing, so flag it up front
            draw.ellipse([W - 24, y + 20, W - 16, y + 28], fill=ZINC_500)

    def ctr(text: str, y: int, f, color=ZINC_100):
        bbox = draw.textbbox((0, 0), text, font=f)
        draw.text(((W - bbox[2] + bbox[0]) // 2, y), text, font=f, fill=color)

    def mono(text: str, y: int, size: int = 18, color=ZINC_400):
        draw.text((14, y), text, font=fnt(size), fill=color)

    # ── PAIRING ───────────────────────────────────────────────────────────────
    if s == S.PAIRING:
        draw.rectangle([0, 0, W, H], fill=LCD_BG)
        draw.text((10, 11), "N*", font=fnt(26, bold=True), fill=GREEN_400)
        draw.text((50, 16), "NorthStar Auth",  font=fnt(21), fill=GREEN_500)
        draw.line([12, 54, W - 12, 54], fill=ZINC_700, width=1)
        mono("// connect USB",       70,  size=19, color=ZINC_100)
        mono("// cable, then open",  96,  size=18, color=ZINC_400)
        mono("// the companion app", 120, size=18, color=ZINC_400)
        draw.line([12, 150, W - 12, 150], fill=ZINC_700, width=1)
        mono("~ waiting for host_",  168, size=18, color=GREEN_400)
        if int(time.time()) % 2 == 0:
            draw.rectangle([14, 200, W - 14, 204], fill=GREEN_500)

    # ── HOME ──────────────────────────────────────────────────────────────────
    elif s == S.HOME:
        hdr("NorthStar")
        for i, item in enumerate(HOME_ITEMS):
            row(i, item, i == app.cursor)

    # ── ACCOUNTS ──────────────────────────────────────────────────────────────
    elif s == S.ACCOUNTS:
        hdr("// accounts")
        total = len(app.creds) + 1
        if not app.creds:
            ctr("// no accounts yet.",   112, fnt(19), ZINC_400)
            ctr("// sync from the app.", 140, fnt(18), ZINC_600)
        else:
            start = max(0, min(app.cursor, total - ROWS))
            for slot in range(ROWS):
                idx = start + slot
                if idx >= total:
                    break
                if idx < len(app.creds):
                    label = "// " + app.creds[idx]["svc"]
                    warn  = not app.creds[idx].get("usr", "").strip()
                else:
                    label = "// remove all"
                    warn  = False
                row(slot, label, idx == app.cursor, warn)
            if total > ROWS:
                th = max(16, (H - HDR_H) * ROWS // total)
                ty = HDR_H + (H - HDR_H - th) * app.cursor // max(1, total - 1)
                draw.rectangle([W - 4, HDR_H, W - 1, H],      fill=ZINC_900)
                draw.rectangle([W - 4, ty, W - 1, ty + th],   fill=GREEN_500)

    # ── DETAIL ────────────────────────────────────────────────────────────────
    elif s == S.DETAIL:
        cred = app.creds[app.detail_idx]
        email = cred.get("usr", "") or "—"
        if len(email) > 18:
            email = email[:17] + "…"
        hdr(cred["svc"])

        def field_row(label, value, y, sel):
            if sel:
                draw.rectangle([0, y, W, y + 40], fill=GREEN_BG)
                draw.rectangle([0, y, 3, y + 40], fill=GREEN_500)
            mono(label, y + 3,  size=13, color=GREEN_400 if sel else ZINC_500)
            mono(value, y + 18, size=18, color=GREEN_400 if sel else ZINC_100)

        field_row("// email",    email,          56,  app.cursor == 0)
        field_row("// password", "••••••••••",   100, app.cursor == 1)

        draw.line([12, 146, W - 12, 146], fill=ZINC_800, width=1)
        mono("// KEY1 to send",      156, size=17, color=ZINC_400)
        draw.line([12, 184, W - 12, 184], fill=ZINC_800, width=1)
        mono("~ K2=back  K3=home",   194, size=15, color=ZINC_500)

    # ── TYPING ────────────────────────────────────────────────────────────────
    elif s == S.TYPING:
        cred = app.creds[app.detail_idx] if app.detail_idx < len(app.creds) else {}
        draw.rectangle([0, 0, W, H], fill=LCD_BG)
        draw.text((10, 11), "N*", font=fnt(26, bold=True), fill=GREEN_400)
        draw.text((50, 16), "NorthStar Auth", font=fnt(21), fill=GREEN_500)
        draw.line([12, 54, W - 12, 54], fill=ZINC_700, width=1)
        mono("// typing...",          72, size=18, color=GREEN_400)
        mono(cred.get("svc", ""),    100, size=22, color=ZINC_100)
        draw.line([12, 134, W - 12, 134], fill=ZINC_800, width=1)
        mono("~ do not unplug_",     148, size=17, color=ZINC_400)

    # ── SENT ──────────────────────────────────────────────────────────────────
    elif s == S.SENT:
        cred = app.creds[app.detail_idx] if app.detail_idx < len(app.creds) else {}
        field_sent = "email" if app.cursor == 0 else "password"
        ok = app.send_ok
        accent = GREEN_500 if ok else RED_400
        draw.rectangle([0, 0, W, H], fill=LCD_BG if ok else RED_BG)
        draw.text((10, 11), "N*", font=fnt(26, bold=True), fill=GREEN_400 if ok else RED_400)
        draw.text((50, 16), "NorthStar Auth", font=fnt(21), fill=GREEN_500 if ok else RED_400)
        draw.line([12, 54, W - 12, 54], fill=ZINC_700, width=1)
        if ok:
            mono(f"// {field_sent} sent",  78,  size=19, color=GREEN_400)
        else:
            mono(f"// {field_sent} FAILED", 78,  size=19, color=RED_400)
            mono("// gadget not ready?",    102, size=15, color=ZINC_400)
        mono(cred.get("svc", ""),    106 if ok else 126, size=22, color=ZINC_100)
        draw.line([12, 138, W - 12, 138], fill=ZINC_800, width=1)
        ctr("✓" if ok else "✗",      146, fnt(34, bold=True), accent)
        mono("~ returning...",       194, size=16, color=ZINC_400)

    # ── CONFIRM ───────────────────────────────────────────────────────────────
    elif s in (S.REMOVE_CFM, S.DEL_ALL_CFM):
        title   = "// remove all?" if s == S.REMOVE_CFM else "// delete all?"
        yes_sel = (app.cursor == 0)
        hdr(title)
        mono("// cannot be undone.", 60, size=17, color=ZINC_400)
        draw.line([12, 88, W - 12, 88], fill=ZINC_800, width=1)

        def btn(label, x1, x2, y, active):
            is_yes = label == "YES"
            fill   = (RED_BG if is_yes else GREEN_BG) if active else ZINC_900
            tcol   = (RED_400 if is_yes else GREEN_400) if active else ZINC_500
            draw.rectangle([x1, y, x2, y + 54], fill=fill)
            draw.rectangle([x1, y, x2, y + 54], outline=ZINC_700, width=1)
            f = fnt(24, bold=True)
            bb = draw.textbbox((0,0), label, font=f)
            draw.text((x1 + (x2-x1-(bb[2]-bb[0]))//2, y+15), label, font=f, fill=tcol)

        btn("YES", 14, 112, 102, active=yes_sel)
        btn("NO", 128, 226, 102, active=not yes_sel)
        mono("~ K2=back  K3=home", 178, size=15, color=ZINC_500)

    # ── SETTINGS ──────────────────────────────────────────────────────────────
    elif s == S.SETTINGS:
        hdr("// settings")
        for i, item in enumerate(SETTINGS_ITEMS):
            row(i, item, i == app.cursor)

    # ── INFO ──────────────────────────────────────────────────────────────────
    elif s == S.INFO:
        hdr("// device info")
        rows_data = [
            ("accounts",  str(len(app.creds))),
            ("storage",   "microSD"),
            ("firmware",  "v2.0"),
            ("device",    "Pi Zero 2W · 1.3in"),
        ]
        for i, (k, v) in enumerate(rows_data):
            y = HDR_H + 6 + i * 46
            if i > 0:
                draw.line([12, y - 2, W - 12, y - 2], fill=ZINC_800, width=1)
            mono(f"// {k}", y,      size=15, color=ZINC_500)
            mono(v,          y + 17, size=19, color=ZINC_100)

    # ── RECEIVING ─────────────────────────────────────────────────────────────
    elif s == S.RECEIVING:
        draw.rectangle([0, 0, W, H], fill=LCD_BG)
        draw.text((10, 11), "N*", font=fnt(26, bold=True), fill=GREEN_400)
        draw.text((50, 16), "NorthStar Auth", font=fnt(21), fill=GREEN_500)
        draw.line([12, 54, W - 12, 54], fill=ZINC_700, width=1)
        mono("// syncing vault...", 72, size=19, color=GREEN_400)
        pct   = min(95, int(len(app.recv_buf) * 100 / app.recv_len)) if app.recv_len else 0
        bar_w = int((W - 32) * pct / 100)
        draw.rectangle([16, 110, W - 16, 136], fill=ZINC_800)
        if bar_w > 0:
            draw.rectangle([16, 110, 16 + bar_w, 136], fill=GREEN_500)
        mono(f"~ {pct}% complete", 150, size=17, color=ZINC_400)
        mono(f"// {len(app.recv_buf)} / {app.recv_len} bytes", 174, size=16, color=ZINC_500)

    # ── SYNC DONE ─────────────────────────────────────────────────────────────
    elif s == S.SYNC_DONE:
        draw.rectangle([0, 0, W, H], fill=LCD_BG)
        draw.text((10, 11), "N*", font=fnt(26, bold=True), fill=GREEN_400)
        draw.text((50, 16), "NorthStar Auth", font=fnt(21), fill=GREEN_500)
        draw.line([12, 54, W - 12, 54], fill=ZINC_700, width=1)
        mono("// sync complete",  80, size=19, color=GREEN_400)
        draw.line([12, 112, W - 12, 112], fill=ZINC_800, width=1)
        n = app.sync_n
        mono(f"// {n} account{'s' if n!=1 else ''} saved.", 128, size=18, color=ZINC_100)
        mono("~ vault updated_", 156, size=17, color=GREEN_500)

    disp.show(img)

# ── Vault I/O ─────────────────────────────────────────────────────────────────

def load_vault() -> list:
    try:
        return json.loads(VAULT_PATH.read_text()).get("credentials", [])
    except Exception:
        return []

def save_vault(creds: list):
    VAULT_PATH.parent.mkdir(parents=True, exist_ok=True)
    VAULT_PATH.write_text(json.dumps({"credentials": creds}, indent=2))

# ── Serial thread ─────────────────────────────────────────────────────────────

def serial_thread(app: App, dirty: threading.Event):
    import serial as _serial

    def open_port():
        while True:
            try:
                p = _serial.Serial(SERIAL_PORT, BAUD_RATE, timeout=0.1)
                print(f"[serial] opened {SERIAL_PORT}")
                return p
            except _serial.SerialException:
                time.sleep(2)

    def tx(port, msg: str):
        port.write((msg + "\n").encode())
        port.flush()

    def handle(port, raw: str):
        line = raw.strip()
        if not line:
            return
        cmd, msg = None, {}
        if line.startswith("{"):
            try:
                msg = json.loads(line)
                cmd = msg.get("cmd", "")
            except json.JSONDecodeError:
                pass

        if cmd == "REQUEST_KEY":
            tx(port, '{"event":"PAIR"}')
        elif cmd == "PAIR_ACK":
            app.state  = S.HOME
            app.cursor = 0
            dirty.set()
        elif cmd == "BEGIN":
            app.state    = S.RECEIVING
            app.recv_buf = ""
            app.recv_len = msg.get("len", 0)
            tx(port, '{"ack":1}')
            dirty.set()
        elif cmd == "END":
            try:
                creds      = json.loads(app.recv_buf).get("credentials", [])
                app.creds  = creds
                app.sync_n = len(creds)
                save_vault(creds)
                print(f"[serial] saved {len(creds)} credentials")
            except Exception as e:
                print(f"[serial] parse error: {e}")
            tx(port, '{"ack":1}')
            app.state = S.SYNC_DONE
            dirty.set()
            time.sleep(2.5)
            app.state  = S.ACCOUNTS
            app.cursor = 0
            dirty.set()
        elif app.state == S.RECEIVING:
            app.recv_buf += line
            tx(port, '{"ack":1}')
            dirty.set()

    port, buf = None, ""
    while True:
        if port is None:
            port = open_port()
            app._port = port
            buf  = ""
            try:
                tx(port, '{"event":"PAIR"}')
                print("[serial] -> PAIR announced")
            except Exception:
                app._port = None
                port = None
                continue
        try:
            data = port.read(64)
            if data:
                buf += data.decode("utf-8", errors="replace")
                while "\n" in buf:
                    line, buf = buf.split("\n", 1)
                    handle(port, line)
        except Exception as e:
            print(f"[serial] error: {e} -- reopening")
            try: port.close()
            except Exception: pass
            app._port = None
            port = None

# ── GPIO ──────────────────────────────────────────────────────────────────────

def setup_gpio():
    GPIO.setmode(GPIO.BCM)
    GPIO.setwarnings(False)
    for pin in (LCD_RST, LCD_DC, LCD_BL):
        GPIO.setup(pin, GPIO.OUT)
    for pin in (KEY1, KEY2, KEY3, JOY_UP, JOY_DOWN, JOY_PRESS):
        GPIO.setup(pin, GPIO.IN, pull_up_down=GPIO.PUD_UP)

def pressed(pin: int, app: App) -> bool:
    if GPIO.input(pin) == GPIO.LOW:
        now  = time.monotonic() * 1000
        last = app._dbn.get(pin, 0)
        if now - last > DEBOUNCE_MS:
            app._dbn[pin] = now
            return True
    return False

# ── Navigation ────────────────────────────────────────────────────────────────

def menu_len(app: App) -> int:
    if app.state == S.HOME:                         return len(HOME_ITEMS)
    if app.state == S.ACCOUNTS:                     return len(app.creds) + 1
    if app.state == S.SETTINGS:                     return len(SETTINGS_ITEMS)
    if app.state == S.DETAIL:                       return 2  # email, password
    if app.state in (S.REMOVE_CFM, S.DEL_ALL_CFM): return 2
    return 1

def move(app: App, d: int):
    sz = menu_len(app)
    if sz > 1:
        app.cursor = (app.cursor + d) % sz

def select(app: App, dirty: threading.Event):
    s = app.state
    if s == S.HOME:
        if   app.cursor == 0: app.state = S.ACCOUNTS;    app.cursor = 0
        elif app.cursor == 1: app.state = S.SETTINGS;    app.cursor = 0
        elif app.cursor == 2: app.state = S.DEL_ALL_CFM; app.cursor = 1
    elif s == S.ACCOUNTS:
        if not app.creds: return
        if app.cursor < len(app.creds):
            app.detail_idx = app.cursor
            app.state = S.DETAIL
            app.cursor = 0   # land on "email" field first
        else:
            app.state = S.REMOVE_CFM; app.cursor = 1
    elif s == S.DETAIL:
        idx    = app.detail_idx
        cred   = app.creds[idx]
        field  = "email" if app.cursor == 0 else "password"
        app.state = S.TYPING
        def _send_and_type(a, c, i, fld, ev):
            # 1. Notify companion app — pops copy modal on Mac/any platform
            p = a._port
            if p:
                try:
                    p.write(f'{{"event":"SELECT","idx":{i}}}\n'.encode())
                    p.flush()
                    print(f"[serial] -> SELECT idx={i}")
                except Exception as e:
                    print(f"[serial] SELECT send error: {e}")
            # 2. Type only the field the user picked (works on Windows without any approval)
            ok = type_text(c.get("usr", "") if fld == "email" else c["pwd"])
            # 3. Show a confirmation reflecting what actually happened, then return
            a.send_ok = ok
            a.state = S.SENT
            ev.set()
            time.sleep(1.8)
            a.state = S.DETAIL
            ev.set()
        threading.Thread(target=_send_and_type, args=(app, cred, idx, field, dirty), daemon=True).start()
    elif s == S.REMOVE_CFM:
        if app.cursor == 0: app.creds = []; save_vault([]); app.state = S.ACCOUNTS; app.cursor = 0
        else:               go_back(app)
    elif s == S.SETTINGS:
        if app.cursor == 0: app.state = S.INFO
    elif s == S.DEL_ALL_CFM:
        if app.cursor == 0: app.creds = []; save_vault([]); app.state = S.HOME; app.cursor = 0
        else:               app.state = S.HOME; app.cursor = 2

def go_back(app: App):
    s = app.state
    if s in (S.ACCOUNTS, S.SETTINGS, S.DEL_ALL_CFM):    app.state = S.HOME;     app.cursor = 0
    elif s == S.DETAIL:                                   app.state = S.ACCOUNTS; app.cursor = app.detail_idx
    elif s in (S.REMOVE_CFM, S.TYPING):                   app.state = S.ACCOUNTS; app.cursor = 0
    elif s == S.INFO:                                     app.state = S.SETTINGS; app.cursor = 0

def go_home(app: App):
    if app.state not in (S.PAIRING, S.RECEIVING, S.TYPING):
        app.state  = S.HOME
        app.cursor = 0

# ── Main ──────────────────────────────────────────────────────────────────────

def main():
    setup_gpio()
    disp = Display()
    app  = App()
    app.creds = load_vault()
    # If vault already has credentials, skip PAIRING and go straight to HOME.
    # PAIRING is only required on first use (empty vault) or after a factory reset.
    app.state = S.HOME if app.creds else S.PAIRING

    dirty = threading.Event()
    threading.Thread(target=serial_thread, args=(app, dirty), daemon=True).start()

    render(disp, app)
    last_blink = 0.0

    try:
        while True:
            changed = False
            if app.state not in (S.PAIRING, S.TYPING, S.SENT):
                if pressed(JOY_UP,    app): move(app, -1);       changed = True
                if pressed(JOY_DOWN,  app): move(app,  1);       changed = True
                if pressed(JOY_PRESS, app): select(app, dirty);  changed = True
                if pressed(KEY1,      app): select(app, dirty);  changed = True
                if pressed(KEY2,      app): go_back(app);        changed = True
                if pressed(KEY3,      app): go_home(app);        changed = True
            if app.state == S.PAIRING:
                now = time.time()
                if int(now) != int(last_blink):
                    last_blink = now
                    changed = True
            if changed or dirty.is_set():
                dirty.clear()
                render(disp, app)
            time.sleep(0.02)
    except KeyboardInterrupt:
        print("\n[main] shutting down")
    finally:
        GPIO.cleanup()

if __name__ == "__main__":
    main()
