"use client";

import { useState } from "react";
import Link from "next/link";

interface TopBarProps {
  isConnected: boolean;
  isPaired: boolean;
  isSupported: boolean;
  profileName: string;
  onConnect: () => void;
  onDisconnect: () => void;
  onLock: () => void;
  onSwitchProfile: () => void;
  onChangePassword: () => void;
  onExport: () => void;
  onImport: () => void;
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
  onChangePassword,
  onExport,
  onImport,
}: TopBarProps) {
  const [menuOpen, setMenuOpen] = useState(false);

  return (
    <div className="relative flex items-center px-4 sm:px-6 py-3 border-b border-zinc-800 flex-shrink-0 gap-3 min-w-0">

      {/* Left: logo + profile switcher */}
      <div className="flex items-center gap-3 flex-shrink-0">
        <Link href="/" className="text-green-500 font-bold text-3xl font-mono hover:text-green-400 transition-colors leading-none">
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
        <div className="inline-block bg-zinc-900 border border-zinc-700 rounded px-4 py-1.5 pointer-events-auto">
          <p className="text-zinc-100 font-mono text-sm tracking-widest uppercase whitespace-nowrap">NorthStar Companion</p>
          <p className="text-green-500/70 font-mono text-xs tracking-wider mt-0.5 whitespace-nowrap">// local vault</p>
        </div>
      </div>

      {/* Right: actions + device */}
      <div className="ml-auto flex items-center gap-2 sm:gap-3 flex-shrink-0 min-w-0">

        {/* Actions — visible on large screens, all uniform low-key buttons */}
        <div className="hidden lg:flex items-center gap-2">
          <Link href="/faq" className={ACTION_BTN}>// FAQ</Link>
          <button onClick={onExport}         className={ACTION_BTN} title="Download encrypted backup">// export</button>
          <button onClick={onImport}         className={ACTION_BTN} title="Restore from backup">// import</button>
          <button onClick={onChangePassword} className={ACTION_BTN} title="Change vault password">// pwd</button>
          <button onClick={onLock}           className={ACTION_BTN} title="Lock vault">⊠ lock</button>
        </div>

        {/* ⋯ overflow menu for medium/small screens */}
        <div className="relative lg:hidden">
          <button
            onClick={() => setMenuOpen((v) => !v)}
            className="text-zinc-500 hover:text-zinc-300 font-mono text-sm px-1.5 py-0.5 rounded hover:bg-zinc-800 transition-colors"
            title="More actions"
          >
            ⋯
          </button>
          {menuOpen && (
            <>
              <div className="fixed inset-0 z-40" onClick={() => setMenuOpen(false)} />
              <div className="absolute right-0 top-full mt-1 z-50 bg-zinc-900 border border-zinc-700 rounded-lg shadow-xl py-1 min-w-36">
                <Link href="/faq" onClick={() => setMenuOpen(false)} className="block w-full text-left px-4 py-2 text-zinc-300 hover:bg-zinc-800 font-mono text-xs transition-colors">// FAQ</Link>
                <button onClick={() => { onExport();         setMenuOpen(false); }} className="w-full text-left px-4 py-2 text-zinc-300 hover:bg-zinc-800 font-mono text-xs transition-colors">// export backup</button>
                <button onClick={() => { onImport();         setMenuOpen(false); }} className="w-full text-left px-4 py-2 text-zinc-300 hover:bg-zinc-800 font-mono text-xs transition-colors">// import backup</button>
                <button onClick={() => { onChangePassword(); setMenuOpen(false); }} className="w-full text-left px-4 py-2 text-zinc-300 hover:bg-zinc-800 font-mono text-xs transition-colors">// change password</button>
                <button onClick={() => { onLock();           setMenuOpen(false); }} className="w-full text-left px-4 py-2 text-zinc-300 hover:bg-zinc-800 font-mono text-xs transition-colors">⊠ lock vault</button>
              </div>
            </>
          )}
        </div>

        {/* Device status */}
        {!isSupported ? (
          <div className="hidden sm:flex items-center gap-2 bg-zinc-800 border border-zinc-700 rounded px-2.5 py-1.5 flex-shrink-0">
            <span className="w-2 h-2 bg-zinc-600 rounded-full flex-shrink-0" />
            <span className="text-zinc-500 font-mono text-xs whitespace-nowrap">Chrome/Edge only</span>
          </div>

        ) : !isConnected ? (
          <div className="flex items-center gap-2 bg-zinc-900 border border-zinc-700 rounded px-2.5 py-1.5 flex-shrink-0">
            <span className="w-2 h-2 bg-zinc-600 rounded-full flex-shrink-0" />
            <span className="hidden sm:inline text-zinc-500 font-mono text-xs whitespace-nowrap">No Device</span>
            <button
              onClick={onConnect}
              className="text-green-500 hover:text-green-400 border border-green-500/40 hover:border-green-500 font-mono text-xs px-2 py-0.5 rounded transition-colors whitespace-nowrap"
            >
              CONNECT
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
