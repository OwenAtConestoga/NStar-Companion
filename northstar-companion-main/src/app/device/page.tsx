import PageNav from "@/components/layout/PageNav";

const SPECS = [
  { label: "Board",    value: "Arduino Leonardo" },
  { label: "MCU",      value: "ATmega32U4" },
  { label: "Clock",    value: "16 MHz" },
  { label: "USB",      value: "Native HID + CDC Serial" },
  { label: "Storage",  value: "1KB EEPROM (20 accounts)" },
  { label: "Display",  value: "LCD 16×2 parallel" },
  { label: "Buttons",  value: "4× INPUT_PULLUP (UP/DN/BACK/SEL)" },
  { label: "Baud",     value: "9600" },
  { label: "Firmware", value: "northstar_hid.ino" },
];

const WIRING = [
  { component: "LCD RS",       pin: "12" },
  { component: "LCD E",        pin: "11" },
  { component: "LCD D4",       pin: "5"  },
  { component: "LCD D5",       pin: "4"  },
  { component: "LCD D6",       pin: "3"  },
  { component: "LCD D7",       pin: "2"  },
  { component: "Button UP",    pin: "6"  },
  { component: "Button DOWN",  pin: "7"  },
  { component: "Button BACK",  pin: "8"  },
  { component: "Button SEL",   pin: "9"  },
];

const MENU = [
  { state: "S_HOME",                  desc: "Home menu — Accounts / Settings / User / Delete All" },
  { state: "S_ACCOUNTS",             desc: "Scrollable account list" },
  { state: "S_ACCOUNT_DETAIL",       desc: "Account selected — press SEL to type password via HID" },
  { state: "S_SETTINGS",             desc: "Settings sub-menu → Device Info" },
  { state: "S_INFO",                  desc: "Device info: board, account count" },
  { state: "S_USER",                  desc: "User screen — NSA HID v1.0" },
  { state: "S_DELETE_ALL_CONFIRM",    desc: "Confirm wipe all EEPROM credentials" },
  { state: "S_ACCOUNTS_REMOVE_CONFIRM", desc: "Confirm remove all accounts" },
  { state: "S_PAIRING",              desc: "Awaiting first sync from companion app" },
  { state: "S_RECEIVING",            desc: "Sync in progress — shows progress bar" },
  { state: "S_SYNC_DONE",            desc: "Sync complete — returns to accounts" },
];

export default function DevicePage() {
  return (
    <div className="flex flex-col min-h-screen bg-zinc-950 font-mono text-zinc-100">

      <PageNav subtitle="// device" />

      <div className="max-w-xl mx-auto w-full px-6 py-10 flex flex-col gap-8">

        {/* Header */}
        <div>
          <p className="text-green-400 text-xs tracking-widest uppercase mb-1">// Hardware</p>
          <h1 className="text-2xl font-bold">Device Info</h1>
          <p className="text-zinc-500 text-xs mt-1">Arduino Leonardo · ATmega32U4 · NSA HID v1.0</p>
        </div>

        {/* Hardware specs */}
        <div className="bg-zinc-900 border border-zinc-800 rounded-lg p-5 flex flex-col gap-3">
          <p className="text-green-400 text-xs tracking-widest uppercase">// Hardware Specs</p>
          <div className="flex flex-col gap-2">
            {SPECS.map(({ label, value }) => (
              <div key={label} className="flex items-baseline justify-between gap-2">
                <span className="text-zinc-600 text-xs flex-shrink-0">{label}</span>
                <span className="border-b border-dashed border-zinc-800 flex-1" />
                <span className="text-zinc-300 text-xs text-right">{value}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Wiring */}
        <div className="bg-zinc-900 border border-zinc-800 rounded-lg p-5 flex flex-col gap-3">
          <p className="text-green-400 text-xs tracking-widest uppercase">// Wiring</p>
          <p className="text-zinc-600 text-xs">All buttons use INPUT_PULLUP — one leg to pin, other leg to GND.</p>
          <div className="flex flex-col gap-2">
            {WIRING.map(({ component, pin }) => (
              <div key={component} className="flex items-baseline justify-between gap-2">
                <span className="text-zinc-500 text-xs flex-shrink-0">{component}</span>
                <span className="border-b border-dashed border-zinc-800 flex-1" />
                <span className="text-green-400 text-xs font-bold text-right">Pin {pin}</span>
              </div>
            ))}
          </div>
        </div>

        {/* EEPROM layout */}
        <div className="bg-zinc-900 border border-zinc-800 rounded-lg p-5 flex flex-col gap-3">
          <p className="text-green-400 text-xs tracking-widest uppercase">// EEPROM Layout</p>
          <div className="text-zinc-400 text-xs leading-relaxed space-y-1">
            <p><span className="text-green-500">[0–1]</span>  Magic bytes <span className="text-zinc-600">(0xAB 0xCD) — marks valid device</span></p>
            <p><span className="text-green-500">[2]</span>    Entry count</p>
            <p><span className="text-green-500">[3]</span>    Reserved</p>
            <p><span className="text-green-500">[4+]</span>   Entries · 50 bytes each:</p>
            <p className="pl-5"><span className="text-zinc-500">[0]</span>     Valid flag <span className="text-zinc-600">(0x01)</span></p>
            <p className="pl-5"><span className="text-zinc-500">[1–16]</span>  Service name <span className="text-zinc-600">(15 chars + null)</span></p>
            <p className="pl-5"><span className="text-zinc-500">[17–49]</span> Password <span className="text-zinc-600">(32 chars + null)</span></p>
            <p className="text-zinc-600 pt-1">Max 20 entries · 1KB total</p>
          </div>
        </div>

        {/* Sync protocol */}
        <div className="bg-zinc-900 border border-zinc-800 rounded-lg p-5 flex flex-col gap-3">
          <p className="text-green-400 text-xs tracking-widest uppercase">// Sync Protocol</p>
          <p className="text-zinc-600 text-xs">Newline-terminated JSON · 9600 baud serial over USB</p>
          <div className="bg-zinc-950 rounded p-3 text-xs leading-relaxed space-y-1">
            <p><span className="text-zinc-600">App    →</span> <span className="text-green-400">{`{"cmd":"REQUEST_KEY"}`}</span></p>
            <p><span className="text-zinc-600">Device →</span> <span className="text-zinc-300">{`{"event":"PAIR"}`}</span></p>
            <p><span className="text-zinc-600">App    →</span> <span className="text-green-400">{`{"cmd":"PAIR_ACK"}`}</span></p>
            <p><span className="text-zinc-600">App    →</span> <span className="text-green-400">{`{"cmd":"BEGIN","count":N,"len":B}`}</span></p>
            <p><span className="text-zinc-600">Device →</span> <span className="text-zinc-300">{`{"ack":1}`}</span></p>
            <p><span className="text-zinc-600">App    →</span> <span className="text-green-400">{"<48-byte chunk>\\n  (repeat)"}</span></p>
            <p><span className="text-zinc-600">Device →</span> <span className="text-zinc-300">{`{"ack":1}  (per chunk)`}</span></p>
            <p><span className="text-zinc-600">App    →</span> <span className="text-green-400">{`{"cmd":"END"}`}</span></p>
            <p><span className="text-zinc-600">Device →</span> <span className="text-zinc-300">{`{"ack":1}  (EEPROM written)`}</span></p>
          </div>
        </div>

        {/* Firmware menu states */}
        <div className="bg-zinc-900 border border-zinc-800 rounded-lg p-5 flex flex-col gap-3">
          <p className="text-green-400 text-xs tracking-widest uppercase">// Firmware Menu States</p>
          <div className="flex flex-col gap-2">
            {MENU.map(({ state, desc }) => (
              <div key={state} className="flex flex-col">
                <span className="text-green-500 text-xs">{state}</span>
                <span className="text-zinc-500 text-xs ml-2">{desc}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Planned upgrade */}
        <div className="bg-zinc-900 border border-zinc-800 rounded-lg p-5 flex flex-col gap-3">
          <p className="text-green-400 text-xs tracking-widest uppercase">// Planned Upgrade</p>
          <div className="flex flex-col gap-2">
            {[
              { label: "MCU",      value: "RP2040-Zero (USB-C, native HID)" },
              { label: "Display",  value: "0.96\" I2C OLED · SSD1306 128×64" },
              { label: "Storage",  value: "AT24C256 I2C EEPROM · 32KB · ~640 entries" },
              { label: "Enclosure",value: "3D-printed · credit-card form factor" },
              { label: "Future",   value: "STM32F4 · hardware AES engine" },
            ].map(({ label, value }) => (
              <div key={label} className="flex items-baseline justify-between gap-2">
                <span className="text-zinc-600 text-xs flex-shrink-0">{label}</span>
                <span className="border-b border-dashed border-zinc-800 flex-1" />
                <span className="text-zinc-300 text-xs text-right">{value}</span>
              </div>
            ))}
          </div>
        </div>

      </div>
    </div>
  );
}
