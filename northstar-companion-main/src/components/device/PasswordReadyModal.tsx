"use client";

import { useState, useEffect } from "react";
import type { Credential } from "@/types/credential";

interface PasswordReadyModalProps {
  credential: Credential;
  onDismiss: () => void;
}

export default function PasswordReadyModal({ credential, onDismiss }: PasswordReadyModalProps) {
  const [showPwd,      setShowPwd]      = useState(false);
  const [copiedUser,   setCopiedUser]   = useState(false);
  const [copiedPwd,    setCopiedPwd]    = useState(false);

  // Auto-dismiss after 30s
  useEffect(() => {
    const t = setTimeout(onDismiss, 30_000);
    return () => clearTimeout(t);
  }, [onDismiss]);

  async function copyUsername() {
    if (!credential.username) return;
    await navigator.clipboard.writeText(credential.username);
    setCopiedUser(true);
    setTimeout(() => setCopiedUser(false), 3000);
  }

  async function copyPassword() {
    if (!credential.password) return;
    await navigator.clipboard.writeText(credential.password);
    setCopiedPwd(true);
    setTimeout(onDismiss, 1200);
  }

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center pb-28 px-4">
      <div className="absolute inset-0 bg-black/40" onClick={onDismiss} />

      <div className="relative bg-zinc-900 border border-green-500/40 rounded-xl p-6 w-full max-w-sm shadow-2xl">

        {/* Header */}
        <div className="flex items-start justify-between mb-5">
          <div>
            <p className="text-green-400 font-mono text-xs tracking-widest uppercase mb-0.5">
              // Device selected
            </p>
            <h2 className="text-zinc-100 font-mono text-lg font-bold">
              {credential.icon} {credential.serviceName}
            </h2>
          </div>
          <button
            onClick={onDismiss}
            className="text-zinc-600 hover:text-zinc-400 font-mono text-base leading-none mt-1 transition-colors"
          >
            ✕
          </button>
        </div>

        <div className="flex flex-col gap-3">

          {/* Username row */}
          <div>
            <p className="text-zinc-500 font-mono text-xs mb-1.5">// Username / Email</p>
            <div className="flex items-center gap-2">
              <div className="flex-1 bg-zinc-800 border border-zinc-700 rounded px-3 py-2 font-mono text-sm text-zinc-200 truncate">
                {credential.username || <span className="text-zinc-600">none</span>}
              </div>
              <button
                onClick={copyUsername}
                disabled={!credential.username}
                className={`flex-shrink-0 font-mono text-xs font-bold px-3 py-2 rounded border transition-colors ${
                  copiedUser
                    ? "bg-green-500/20 border-green-500/40 text-green-400"
                    : "bg-zinc-700 border-zinc-600 hover:bg-zinc-600 hover:border-zinc-500 text-zinc-200"
                }`}
              >
                {copiedUser ? "✓ COPIED" : "COPY"}
              </button>
            </div>
          </div>

          {/* Password row */}
          <div>
            <p className="text-zinc-500 font-mono text-xs mb-1.5">// Password</p>
            <div className="flex items-center gap-2 mb-2">
              <div className="flex-1 bg-zinc-800 border border-zinc-700 rounded px-3 py-2 font-mono text-sm flex items-center justify-between min-w-0">
                <span className={showPwd ? "text-zinc-100 break-all text-xs" : "text-zinc-400 tracking-widest"}>
                  {credential.password ? (showPwd ? credential.password : "••••••••••••") : <span className="text-zinc-600">none</span>}
                </span>
                {credential.password && (
                  <button
                    onClick={() => setShowPwd((v) => !v)}
                    className="text-zinc-500 hover:text-zinc-300 font-mono text-xs ml-2 flex-shrink-0 transition-colors"
                  >
                    {showPwd ? "HIDE" : "SHOW"}
                  </button>
                )}
              </div>
              <button
                onClick={copyPassword}
                disabled={!credential.password}
                className={`flex-shrink-0 font-mono text-xs font-bold px-3 py-2 rounded border transition-colors ${
                  copiedPwd
                    ? "bg-green-500/20 border-green-500/40 text-green-400"
                    : "bg-green-500 border-green-500 hover:bg-green-400 text-black"
                }`}
              >
                {copiedPwd ? "✓ COPIED" : "COPY"}
              </button>
            </div>
          </div>

          {/* Hint */}
          <p className="text-zinc-600 font-mono text-xs text-center">
            Copy username → paste → tab → copy password → paste
          </p>

          <button
            onClick={onDismiss}
            className="w-full border border-zinc-700 hover:border-zinc-500 text-zinc-400 hover:text-zinc-200 font-mono text-sm py-2 rounded transition-colors"
          >
            Dismiss
          </button>
        </div>

      </div>
    </div>
  );
}
