"use client";

import Link from "next/link";

const FEATURES = [
  { icon: "◈", label: "AES-256-GCM", desc: "Military-grade encryption" },
  { icon: "⬡", label: "Zero Knowledge", desc: "No cloud, no clipboard" },
  { icon: "▲", label: "USB HID", desc: "Types directly into OS" },
  { icon: "✦", label: "Self-Destruct", desc: "Wipes after 5 failed PINs" },
];

export default function WelcomePage() {
  return (
    <div className="flex flex-col min-h-screen bg-zinc-950 font-mono text-zinc-100">
      {/* Nav */}
      <div className="flex items-center justify-between px-6 py-4 border-b border-zinc-800">
        <span className="text-green-500 font-bold text-lg">N*</span>
        <div className="flex items-center gap-4">
          <Link href="/faq"   className="text-zinc-500 hover:text-zinc-300 text-xs transition-colors">// FAQ</Link>
          <Link href="/vault" className="text-zinc-500 hover:text-zinc-300 text-xs transition-colors">// Vault</Link>
        </div>
      </div>

      {/* Hero */}
      <div className="flex-1 flex flex-col items-center justify-center px-6 text-center gap-10 py-16">
        {/* Logo */}
        <div className="flex flex-col items-center gap-3">
          <div className="w-24 h-24 rounded-2xl border-2 border-green-500/40 bg-green-500/5 flex items-center justify-center">
            <span className="text-green-400 font-bold text-4xl">N*</span>
          </div>
          <div>
            <h1 className="text-zinc-100 text-3xl font-bold tracking-tight">NorthStar Auth</h1>
            <p className="text-green-400 text-sm mt-1">// Own your security, physically.</p>
          </div>
        </div>

        {/* Description */}
        <p className="max-w-md text-zinc-400 text-sm leading-relaxed">
          A hardware-encrypted password vault that eliminates the software footprint.
          Credentials are typed directly from the device via USB — they never touch
          your clipboard, browser, or unencrypted RAM.
        </p>

        {/* Feature grid */}
        <div className="grid grid-cols-2 gap-3 max-w-sm w-full">
          {FEATURES.map((f) => (
            <div
              key={f.label}
              className="bg-zinc-900 border border-zinc-800 rounded-lg px-4 py-3 text-left"
            >
              <div className="flex items-center gap-2 mb-1">
                <span className="text-green-400 text-sm">{f.icon}</span>
                <span className="text-zinc-200 text-xs font-bold">{f.label}</span>
              </div>
              <p className="text-zinc-500 text-xs">{f.desc}</p>
            </div>
          ))}
        </div>

        {/* Hardware status */}
        <div className="flex items-center gap-2 bg-zinc-900 border border-zinc-800 rounded-full px-4 py-2">
          <span className="w-2 h-2 bg-green-500 rounded-full animate-pulse flex-shrink-0" />
          <span className="text-green-400 text-xs">Hardware: Connected (Secure)</span>
        </div>

        {/* CTA */}
        <div className="flex flex-col items-center gap-3">
          <Link href="/vault">
            <button className="bg-green-500 hover:bg-green-400 text-black font-bold px-10 py-4 rounded text-base transition-colors">
              ENTER VAULT →
            </button>
          </Link>
          <Link href="/faq" className="text-zinc-600 hover:text-zinc-400 text-xs transition-colors underline underline-offset-4">
            Read the docs &amp; FAQ
          </Link>
        </div>
      </div>

      {/* Footer */}
      <div className="px-6 py-4 border-t border-zinc-800 flex items-center justify-between">
        <span className="text-zinc-600 text-xs">// NorthStar Auth (NSA) · Phase 1</span>
        <span className="text-zinc-600 text-xs">Protocol: AES-256-GCM</span>
      </div>
    </div>
  );
}
