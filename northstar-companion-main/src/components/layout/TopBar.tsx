"use client";

import Link from "next/link";

interface TopBarProps {
  isConnected: boolean;
  isPaired: boolean;
  isSupported: boolean;
  onConnect: () => void;
  onDisconnect: () => void;
  onLock: () => void;
}

export default function TopBar({
  isConnected,
  isPaired,
  isSupported,
  onConnect,
  onDisconnect,
  onLock,
}: TopBarProps) {
  return (
    <div className="relative flex items-center px-6 py-5 border-b border-zinc-800 flex-shrink-0">

      {/* Left: N* logo + nav links */}
      <div className="flex items-center gap-4">
        <Link
          href="/"
          className="text-green-500 font-bold text-3xl font-mono hover:text-green-400 transition-colors leading-none"
        >
          N*
        </Link>
        <Link href="/device"   className="text-zinc-500 hover:text-zinc-300 font-mono text-xs transition-colors">// Device</Link>
        <Link href="/settings" className="text-zinc-500 hover:text-zinc-300 font-mono text-xs transition-colors">// Settings</Link>
        <Link href="/faq"      className="text-zinc-500 hover:text-zinc-300 font-mono text-xs transition-colors">// FAQ</Link>
      </div>

      {/* Center: truly centered regardless of sidebar widths */}
      <div className="absolute left-1/2 -translate-x-1/2 text-center pointer-events-none">
        <div className="inline-block bg-zinc-900 border border-zinc-700 rounded px-5 py-2 pointer-events-auto">
          <p className="text-zinc-100 font-mono text-sm tracking-widest uppercase">NorthStar Companion</p>
          <p className="text-green-500/70 font-mono text-xs tracking-wider mt-0.5">// local vault</p>
        </div>
      </div>

      {/* Right: lock + device status */}
      <div className="ml-auto flex items-center gap-4">
        <button
          onClick={onLock}
          className="text-zinc-500 hover:text-zinc-300 font-mono text-xs transition-colors"
          title="Lock vault"
        >
          ⊠ LOCK
        </button>

        {!isSupported ? (
          <div className="flex items-center gap-2 bg-zinc-800 border border-zinc-700 rounded px-3 py-1.5">
            <span className="w-2 h-2 bg-zinc-600 rounded-full flex-shrink-0" />
            <span className="text-zinc-500 font-mono text-xs">Use Chrome/Edge</span>
          </div>

        ) : !isConnected ? (
          <div className="flex items-center gap-2 bg-zinc-900 border border-zinc-700 rounded px-3 py-1.5">
            <span className="w-2 h-2 bg-zinc-600 rounded-full flex-shrink-0" />
            <span className="text-zinc-500 font-mono text-xs">No Device</span>
            <button
              onClick={onConnect}
              className="text-green-500 hover:text-green-400 border border-green-500/40 hover:border-green-500 font-mono text-xs px-2 py-0.5 rounded ml-1 transition-colors"
              title="Look for USB-SERIAL CH340 in the picker (Elegoo Uno)"
            >
              CONNECT
            </button>
          </div>

        ) : !isPaired ? (
          <div className="flex items-center gap-2 bg-yellow-500/10 border border-yellow-500/30 rounded px-3 py-1.5">
            <span className="w-2 h-2 bg-yellow-500 rounded-full animate-pulse flex-shrink-0" />
            <span className="text-yellow-400 font-mono text-xs">Pairing...</span>
            <button
              onClick={onDisconnect}
              className="text-zinc-600 hover:text-red-400 font-mono text-xs ml-1 transition-colors"
              title="Disconnect"
            >
              ✕
            </button>
          </div>

        ) : (
          <div className="flex items-center gap-2 bg-green-500/10 border border-green-500/30 rounded px-3 py-1.5">
            <span className="w-2 h-2 bg-green-500 rounded-full animate-pulse flex-shrink-0" />
            <span className="text-green-400 font-mono text-xs">Device Ready</span>
            <button
              onClick={onDisconnect}
              className="text-zinc-600 hover:text-red-400 font-mono text-xs ml-1 transition-colors"
              title="Disconnect"
            >
              ✕
            </button>
          </div>
        )}
      </div>

    </div>
  );
}
