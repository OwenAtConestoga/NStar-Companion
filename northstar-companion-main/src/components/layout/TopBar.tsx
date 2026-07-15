"use client";

import { useState } from "react";
import Link from "next/link";

interface TopBarProps {
  isConnected: boolean;
  isPaired: boolean;
  isSupported: boolean;
  profileName: string;
  onConnect: () => void | Promise<void>;
  onDisconnect: () => void;
  onLock: () => void;
  onSwitchProfile: () => void;
}

// Low-key uniform button — same bordered-pill shape as CONNECT, muted colours so
// it doesn't compete with the actual device-status CTAs.
const ACTION_BTN =
  "border border-zinc-700 hover:border-zinc-500 text-zinc-300 hover:text-zinc-100 font-mono text-xs px-2.5 py-1 rounded transition-colors whitespace-nowrap";

export default function TopBar({
  isConnected,
  isPaired,
  isSupported,
  profileName,
  onConnect,
  onDisconnect,
  onLock,
  onSwitchProfile,
}: TopBarProps) {
  const [awaitingPick, setAwaitingPick] = useState(false);

  // Give the "select the device" hint a chance to paint before the
  // (blocking, native) Web Serial port picker opens.
  async function handleConnectClick() {
    setAwaitingPick(true);
    await new Promise(requestAnimationFrame);
    try {
      await onConnect();
    } finally {
      setAwaitingPick(false);
    }
  }

  return (
    <div className="relative flex items-center px-4 sm:px-6 py-3 border-b border-zinc-800 flex-shrink-0 gap-3 min-w-0">

      {/* Left: logo + profile switcher */}
      <div className="flex items-center gap-3 flex-shrink-0">
        <Link href="/" className="text-green-500 font-bold text-4xl sm:text-5xl font-mono hover:text-green-400 transition-colors leading-none">
          N*
        </Link>

        <div className="flex items-center gap-1.5 bg-zinc-800 border border-zinc-700 rounded px-2 py-1.5">
          <div className="w-5 h-5 rounded-full bg-green-500/20 border border-green-500/30 flex items-center justify-center flex-shrink-0">
            <span className="text-green-400 font-mono text-[9px] font-bold">
              {profileName.slice(0, 2).toUpperCase()}
            </span>
          </div>
          <span className="hidden sm:inline text-zinc-300 font-mono text-xs max-w-[5rem] truncate">
            {profileName}
          </span>
          <button
            onClick={onSwitchProfile}
            className="text-zinc-600 hover:text-zinc-400 font-mono text-[10px] transition-colors ml-0.5"
            title="Switch profile"
          >
            ⇄
          </button>
        </div>
      </div>

      {/* Center: title — flex-1 so it never overlaps neighbours */}
      <div className="flex-1 min-w-0 hidden md:flex justify-center pointer-events-none">
        <div className="inline-block bg-zinc-900 border border-zinc-700 rounded px-6 py-2.5 pointer-events-auto">
          <p className="text-zinc-100 font-mono text-lg sm:text-xl font-bold tracking-widest uppercase whitespace-nowrap">NorthStar Companion</p>
          <p className="text-green-500/70 font-mono text-sm tracking-wider mt-0.5 whitespace-nowrap">// local vault</p>
        </div>
      </div>

      {/* Right: actions + device */}
      <div className="ml-auto flex items-center gap-2 sm:gap-3 flex-shrink-0 min-w-0">

        {/* Settings + Lock — everything else (FAQ, export, import, password, delete vault) lives on /settings */}
        <div className="flex items-center gap-2">
          <Link href="/settings" className={ACTION_BTN} title="Settings, backup, instructions">⚙ settings</Link>
          <button onClick={onLock} className={ACTION_BTN} title="Lock vault">⊠ lock</button>
        </div>

        {/* Device status */}
        {!isSupported ? (
          <div className="hidden sm:flex items-center gap-2 bg-zinc-800 border border-zinc-700 rounded px-2.5 py-1.5 flex-shrink-0">
            <span className="w-2 h-2 bg-zinc-600 rounded-full flex-shrink-0" />
            <span className="text-zinc-500 font-mono text-xs whitespace-nowrap">Chrome/Edge only</span>
          </div>

        ) : !isConnected ? (
          <div className="flex items-center gap-3 bg-zinc-900 border border-yellow-500/40 rounded-lg px-4 py-2.5 flex-shrink-0">
            <span className="w-2.5 h-2.5 bg-yellow-400 rounded-full flex-shrink-0 animate-pulse" />
            <span className="hidden sm:inline text-zinc-300 font-mono text-sm whitespace-nowrap">
              {awaitingPick ? "Select the NorthStar device in the picker…" : "No Device Connected"}
            </span>
            <button
              onClick={handleConnectClick}
              disabled={awaitingPick}
              className="text-yellow-400 hover:text-yellow-300 border border-yellow-500/50 hover:border-yellow-400 font-mono text-sm font-bold px-3 py-1 rounded transition-colors whitespace-nowrap disabled:opacity-50 disabled:cursor-wait"
            >
              {awaitingPick ? "…" : "CONNECT"}
            </button>
          </div>

        ) : !isPaired ? (
          <div className="flex items-center gap-2 bg-yellow-500/10 border border-yellow-500/30 rounded px-2.5 py-1.5 flex-shrink-0">
            <span className="w-2 h-2 bg-yellow-500 rounded-full animate-pulse flex-shrink-0" />
            <span className="hidden sm:inline text-yellow-400 font-mono text-xs whitespace-nowrap">Pairing...</span>
            <button onClick={onDisconnect} className="text-zinc-600 hover:text-red-400 font-mono text-xs transition-colors" title="Disconnect">✕</button>
          </div>

        ) : (
          <div className="flex items-center gap-2 bg-green-500/10 border border-green-500/30 rounded px-2.5 py-1.5 flex-shrink-0">
            <span className="w-2 h-2 bg-green-500 rounded-full animate-pulse flex-shrink-0" />
            <span className="hidden sm:inline text-green-400 font-mono text-xs whitespace-nowrap">Device Ready</span>
            <button onClick={onDisconnect} className="text-zinc-600 hover:text-red-400 font-mono text-xs transition-colors" title="Disconnect">✕</button>
          </div>
        )}

      </div>
    </div>
  );
}
