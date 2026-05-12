import Link from "next/link";
import PageNav from "@/components/layout/PageNav";

const FAQS = [
  {
    section: "// Overview",
    items: [
      {
        q: "What is NorthStar Auth (NSA)?",
        a: "NorthStar Auth is a hardware-encrypted password manager that stores all your credentials inside a physical USB device. It acts as a USB Human Interface Device (HID), meaning it emulates a keyboard and \"types\" your passwords directly into any computer — your credentials never touch the host machine's clipboard, browser storage, or unencrypted RAM.",
      },
      {
        q: "What is the core promise?",
        a: "\"Own your security, physically.\" NSA is built around the idea that total physical control of your identity is the only true security. If a software keylogger could intercept your password, the product has failed its promise. Physical isolation is non-negotiable.",
      },
    ],
  },
  {
    section: "// The Companion App",
    items: [
      {
        q: "What does this companion app do?",
        a: "The companion app is a temporary, zero-knowledge bridge between your computer and the NSA hardware. It lets you type credentials into a secure local interface, encrypts them using a hardware-generated key, and pushes the encrypted data to the device over USB. Once the hardware disconnects, no data persists in the app.",
      },
      {
        q: "How do I add a new credential?",
        a: "From the vault dashboard, click \"+ Add New\". Fill in the service name, username/email, and choose an icon. Click \"Stage Credential\" to add it to your local staging list. When ready, click \"INITIATE SECURE SYNC\" to push all staged credentials to the hardware device with AES-256-GCM encryption.",
      },
      {
        q: "How do I sync credentials to my device?",
        a: "Ensure your NSA hardware is plugged in and the status indicator shows \"Hardware: Connected (Secure)\". From the dashboard, press \"INITIATE SECURE SYNC >\". The companion app will encrypt each credential using the device's hardware-generated key and push it via USB. Do not unplug the device during this process.",
      },
    ],
  },
  {
    section: "// Security",
    items: [
      {
        q: "What encryption is used?",
        a: "All data at rest and in transit between the companion app and the hardware uses AES-256-GCM (Galois/Counter Mode). This is authenticated encryption — it provides both confidentiality and integrity. The encryption key is generated inside the hardware and never leaves the device.",
      },
      {
        q: "What happens after 5 wrong PIN attempts?",
        a: "The device enforces a Self-Destruct policy. After 5 consecutive failed PIN attempts, the device automatically wipes all stored credentials from its flash memory. This protects against brute-force physical attacks.",
      },
      {
        q: "Is RAM wiped when I unplug the device?",
        a: "Yes. Upon USB disconnection, the device immediately executes a RAM Wipe, zeroing all in-memory credential data. Combined with the companion app's ephemeral-only storage policy, this ensures no sensitive data persists anywhere after the session ends.",
      },
      {
        q: "What if my device is stolen?",
        a: "A thief would need your Master PIN to access the vault. After 5 failed guesses, the device self-destructs and all stored credentials are wiped. Your credentials remain safe even if the physical hardware is in the wrong hands.",
      },
      {
        q: "What if my device fails or is lost?",
        a: "During setup, you are provided with a Master Recovery Key in the form of a BIP-39 mnemonic phrase (a list of 12–24 words). Store this offline in a safe location. You can use this recovery key to restore your vault to a new NSA device.",
      },
      {
        q: "Can a USB interception attack steal my passwords?",
        a: "No. All credential data is encrypted with AES-256-GCM before it leaves the companion app and travels over USB. An attacker intercepting the USB data stream would only see ciphertext — unusable without the hardware-resident key.",
      },
    ],
  },
  {
    section: "// Using the Hardware Device",
    items: [
      {
        q: "How do I use credentials on a target machine?",
        a: "Plug the NSA device into any computer's USB port. Enter your PIN on the device's physical keypad. Navigate the on-device OLED menu with the directional D-pad to select the account you need. Press the Send button — the device emulates a keyboard and types your credential directly into the active input field.",
      },
      {
        q: "What hardware is inside the device?",
        a: "The NSA uses an STM32F4 series microcontroller (with native USB support and a hardware encryption engine), a 1.3-inch I2C OLED display (128×64), a 5-way tactile navigation joystick or 3-button membrane switch, and W25Qxx series external flash memory for encrypted credential storage. The enclosure is 3D-printed PLA/ABS or CNC-milled acrylic.",
      },
      {
        q: "How fast does the device type credentials?",
        a: "Keystroke emulation is guaranteed to complete in under 500ms per the project's Promise 0 performance standard. The companion app UI must also respond in under 2 seconds for all interactions.",
      },
    ],
  },
  {
    section: "// Future Roadmap",
    items: [
      {
        q: "What features are planned for future versions?",
        a: "Biometric Integration — replacing the PIN with a fingerprint sensor for true physical multi-factor authentication. NFC Support — allowing the device to act as a security key for mobile devices. Multi-Vault Sync — allowing two NSA devices to sync locally so a user can maintain a backup keychain without any cloud dependency.",
      },
    ],
  },
];

export default function FAQPage() {
  return (
    <div className="flex flex-col min-h-screen bg-zinc-950 font-mono text-zinc-100">
      <PageNav subtitle="// faq & docs" />

      {/* Content */}
      <div className="flex-1 max-w-2xl mx-auto w-full px-6 py-8 space-y-10">
        {/* Intro */}
        <div className="bg-zinc-900 border border-zinc-800 border-l-4 border-l-green-500 rounded-md px-5 py-4">
          <p className="text-green-400 text-xs mb-1">// Project Charter · Phase 1 · Lead: Owen Oliveira</p>
          <p className="text-zinc-300 text-sm leading-relaxed">
            NorthStar Auth is a hardware-encrypted password manager built for people who
            demand physical sovereignty over their credentials — healthcare professionals,
            developers, and remote workers who can&apos;t afford a compromised identity.
          </p>
        </div>

        {/* FAQ sections */}
        {FAQS.map((section) => (
          <div key={section.section} className="space-y-4">
            <h2 className="text-green-400 font-bold text-sm tracking-wider border-b border-zinc-800 pb-2">
              {section.section}
            </h2>
            <div className="space-y-4">
              {section.items.map((item) => (
                <div
                  key={item.q}
                  className="bg-zinc-900 border border-zinc-800 rounded-md px-5 py-4 space-y-2"
                >
                  <p className="text-zinc-100 text-sm font-bold">{item.q}</p>
                  <p className="text-zinc-400 text-sm leading-relaxed">{item.a}</p>
                </div>
              ))}
            </div>
          </div>
        ))}

        {/* Security promises box */}
        <div className="bg-zinc-900 border border-zinc-800 rounded-md px-5 py-4 space-y-3">
          <h2 className="text-green-400 font-bold text-sm">// Promise 0: Universal Definition of Done</h2>
          <p className="text-zinc-500 text-xs">Every feature in this project must meet these standards before it is considered complete.</p>
          <div className="space-y-2">
            {[
              ["Security", "AES-256 encryption at rest + audit logging for all access attempts."],
              ["Performance", "UI responsiveness &lt;2s · Keystroke emulation &lt;500ms."],
              ["Integrity", "Self-Destruct logic wipes memory after 5 failed PIN attempts."],
              ["Isolation", "RAM wiped immediately upon USB disconnection."],
            ].map(([label, desc]) => (
              <div key={label} className="flex gap-3">
                <span className="text-green-500 text-xs w-20 flex-shrink-0 pt-0.5">{label}</span>
                <span
                  className="text-zinc-400 text-xs leading-relaxed"
                  dangerouslySetInnerHTML={{ __html: desc }}
                />
              </div>
            ))}
          </div>
        </div>

        {/* Back link */}
        <div className="flex justify-center pb-4">
          <Link
            href="/vault"
            className="bg-green-500 hover:bg-green-400 text-black font-bold px-8 py-3 rounded text-sm transition-colors"
          >
            OPEN VAULT →
          </Link>
        </div>
      </div>
    </div>
  );
}
