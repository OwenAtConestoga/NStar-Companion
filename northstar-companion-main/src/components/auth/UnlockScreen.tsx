"use client";

import { useState } from "react";

interface UnlockScreenProps {
  mode: "new" | "locked";
  error: string | null;
  onSubmit: (password: string) => void;
}

export default function UnlockScreen({ mode, error, onSubmit }: UnlockScreenProps) {
  const [password, setPassword] = useState("");
  const [confirm,  setConfirm]  = useState("");
  const [show,     setShow]     = useState(false);
  const [loading,  setLoading]  = useState(false);

  const isNew     = mode === "new";
  const mismatch  = isNew && password.length > 0 && confirm.length > 0 && password !== confirm;
  const matched   = isNew && password.length > 0 && confirm.length > 0 && password === confirm;
  const canSubmit = password.length >= 1 && (!isNew || matched);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!canSubmit || loading) return;
    setLoading(true);
    // PBKDF2 is intentionally slow — keep UI responsive with a tiny yield
    await new Promise((r) => setTimeout(r, 0));
    onSubmit(password);
    // parent will update status; reset loading if an error comes back
    setLoading(false);
  }

  return (
    <div className="min-h-screen bg-zinc-950 flex items-center justify-center px-4">
      <div className="bg-zinc-900 border border-zinc-800 rounded-xl w-full max-w-sm p-8 flex flex-col gap-6">

        {/* Header */}
        <div>
          <p className="text-green-400 font-mono text-xs tracking-widest uppercase mb-1">
            {isNew ? "// First Run — Create Vault" : "// Vault Locked"}
          </p>
          <h1 className="text-zinc-100 font-mono text-2xl font-bold">
            N* NorthStar
          </h1>
          <p className="text-zinc-500 font-mono text-xs mt-1">
            {isNew
              ? "Choose a master password to encrypt your local vault. It is never stored or sent anywhere."
              : "Enter your master password to unlock the vault."}
          </p>
        </div>

        <form onSubmit={handleSubmit} className="flex flex-col gap-4">

          {/* Password */}
          <div>
            <label className="text-zinc-400 font-mono text-xs block mb-1.5">
              // Master Password
            </label>
            <div className="relative">
              <input
                type={show ? "text" : "password"}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                autoFocus
                placeholder="••••••••••••"
                className="w-full bg-zinc-800 border border-zinc-700 focus:border-green-500 rounded px-3 py-2.5 pr-16 text-zinc-100 font-mono text-sm outline-none transition-colors placeholder:text-zinc-600"
              />
              <button
                type="button"
                onClick={() => setShow((v) => !v)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-zinc-500 hover:text-zinc-300 font-mono text-xs transition-colors"
              >
                {show ? "HIDE" : "SHOW"}
              </button>
            </div>
          </div>

          {/* Confirm (create mode only) */}
          {isNew && (
            <div>
              <label className={`font-mono text-xs block mb-1.5 ${mismatch ? "text-red-400" : "text-zinc-400"}`}>
                // Confirm Password
                {mismatch && <span className="ml-2">— do not match</span>}
              </label>
              <input
                type={show ? "text" : "password"}
                value={confirm}
                onChange={(e) => setConfirm(e.target.value)}
                placeholder="••••••••••••"
                className={`w-full bg-zinc-800 rounded px-3 py-2.5 text-zinc-100 font-mono text-sm outline-none transition-colors placeholder:text-zinc-600 border ${
                  mismatch ? "border-red-500/60 focus:border-red-500"
                  : matched  ? "border-green-500/60 focus:border-green-500"
                  :            "border-zinc-700 focus:border-green-500"
                }`}
              />
              {(password.length > 0 && confirm.length > 0) && (
                <p className={`font-mono text-xs mt-1 ${matched ? "text-green-400" : "text-red-400"}`}>
                  {matched ? "✓ Passwords match" : "✗ Passwords do not match"}
                </p>
              )}
            </div>
          )}

          {/* Error */}
          {error && (
            <p className="text-red-400 font-mono text-xs border border-red-500/30 bg-red-500/10 rounded px-3 py-2">
              {error}
            </p>
          )}

          {/* Submit */}
          <button
            type="submit"
            disabled={!canSubmit || loading}
            className="bg-green-500 hover:bg-green-400 disabled:bg-zinc-700 disabled:text-zinc-500 disabled:cursor-not-allowed text-black font-bold font-mono py-3 rounded transition-colors"
          >
            {loading ? "Working..." : isNew ? "CREATE VAULT" : "UNLOCK"}
          </button>

        </form>

        {/* Footer */}
        <p className="text-zinc-600 font-mono text-xs text-center">
          AES-256-GCM · PBKDF2 · Local only — no server, no cloud
        </p>

      </div>
    </div>
  );
}
