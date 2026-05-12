"use client";

import { useState, useEffect } from "react";
import type { Credential } from "@/types/credential";

interface PasswordReadyModalProps {
  credential: Credential;
  onDismiss: () => void;
}

export default function PasswordReadyModal({ credential, onDismiss }: PasswordReadyModalProps) {
  const [show,   setShow]   = useState(false);
  const [copied, setCopied] = useState(false);

  // Auto-dismiss after 30 seconds if user doesn't interact
  useEffect(() => {
    const t = setTimeout(onDismiss, 30_000);
    return () => clearTimeout(t);
  }, [onDismiss]);

  async function handleCopy() {
    if (!credential.password) return;
    await navigator.clipboard.writeText(credential.password);
    setCopied(true);
    setTimeout(onDismiss, 1200);
  }

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center pb-28 px-4">
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/40" onClick={onDismiss} />

      <div className="relative bg-zinc-900 border border-green-500/40 rounded-xl p-6 w-full max-w-sm shadow-2xl">

        {/* Header */}
        <div className="flex items-start justify-between mb-4">
          <div>
            <p className="text-green-400 font-mono text-xs tracking-widest uppercase mb-0.5">
              // Device selected
            </p>
            <h2 className="text-zinc-100 font-mono text-lg font-bold">
              {credential.icon} {credential.serviceName}
            </h2>
            <p className="text-zinc-500 font-mono text-xs">{credential.username}</p>
          </div>
          <button
            onClick={onDismiss}
            className="text-zinc-600 hover:text-zinc-400 font-mono text-base leading-none mt-1 transition-colors"
          >
            ✕
          </button>
        </div>

        {/* Password display */}
        {credential.password ? (
          <>
            <div className="bg-zinc-800 border border-zinc-700 rounded px-3 py-2.5 font-mono text-sm flex items-center justify-between mb-3">
              <span className={show ? "text-zinc-100 break-all" : "text-zinc-400 tracking-widest"}>
                {show ? credential.password : "••••••••••••"}
              </span>
              <button
                onClick={() => setShow((v) => !v)}
                className="text-zinc-500 hover:text-zinc-300 font-mono text-xs ml-3 flex-shrink-0 transition-colors"
              >
                {show ? "HIDE" : "SHOW"}
              </button>
            </div>

            {/* Copy button — user gesture means clipboard.writeText always works */}
            <div className="flex gap-2">
              <button
                onClick={handleCopy}
                className={`flex-1 font-bold font-mono py-3 rounded transition-colors ${
                  copied
                    ? "bg-green-500/20 border border-green-500/40 text-green-400"
                    : "bg-green-500 hover:bg-green-400 text-black"
                }`}
              >
                {copied ? "✓ COPIED — PASTE NOW" : "COPY PASSWORD"}
              </button>
              <button
                onClick={onDismiss}
                className="border border-zinc-700 hover:border-zinc-500 text-zinc-400 hover:text-zinc-200 font-mono px-4 rounded transition-colors"
              >
                Cancel
              </button>
            </div>
          </>
        ) : (
          <p className="text-zinc-500 font-mono text-xs border border-zinc-700 rounded px-3 py-2">
            No password saved for this account. Edit it in the vault to add one.
          </p>
        )}

      </div>
    </div>
  );
}
