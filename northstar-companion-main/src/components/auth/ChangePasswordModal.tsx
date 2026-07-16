"use client";

import { useState } from "react";

interface ChangePasswordModalProps {
  onSave: (currentPwd: string, newPwd: string) => Promise<string | null>;
  onClose: () => void;
}

export default function ChangePasswordModal({ onSave, onClose }: ChangePasswordModalProps) {
  const [current, setCurrent]   = useState("");
  const [next, setNext]         = useState("");
  const [confirm, setConfirm]   = useState("");
  const [show, setShow]         = useState(false);
  const [error, setError]       = useState<string | null>(null);
  const [loading, setLoading]   = useState(false);
  const [success, setSuccess]   = useState(false);

  const mismatch = next.length > 0 && confirm.length > 0 && next !== confirm;
  const matched  = next.length > 0 && confirm.length > 0 && next === confirm;
  const canSave  = current.length > 0 && matched && !loading;

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!canSave) return;
    setLoading(true);
    setError(null);
    const err = await onSave(current, next);
    setLoading(false);
    if (err) { setError(err); return; }
    setSuccess(true);
    setTimeout(onClose, 1500);
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center px-4">
      <div className="absolute inset-0 bg-black/50" onClick={onClose} />
      <div className="relative bg-zinc-900 border border-zinc-700 rounded-xl w-full max-w-sm p-6 flex flex-col gap-5 shadow-2xl">

        <div className="flex items-start justify-between">
          <div>
            <p className="text-green-400 font-mono text-xs tracking-widest uppercase mb-0.5">// Vault Security</p>
            <h2 className="text-zinc-100 font-mono text-lg font-bold">Change Password</h2>
          </div>
          <button onClick={onClose} className="text-zinc-600 hover:text-zinc-400 font-mono text-base leading-none mt-1 transition-colors">✕</button>
        </div>

        {success ? (
          <div className="bg-green-500/10 border border-green-500/30 rounded-lg px-4 py-3">
            <p className="text-green-400 font-mono text-sm">✓ Password changed successfully</p>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="flex flex-col gap-4">

            <div>
              <label className="text-zinc-400 font-mono text-xs block mb-1.5">// Current Password</label>
              <div className="relative">
                <input
                  type={show ? "text" : "password"}
                  value={current}
                  onChange={(e) => setCurrent(e.target.value)}
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

            <div>
              <label className="text-zinc-400 font-mono text-xs block mb-1.5">// New Password</label>
              <input
                type={show ? "text" : "password"}
                value={next}
                onChange={(e) => setNext(e.target.value)}
                placeholder="••••••••••••"
                className="w-full bg-zinc-800 border border-zinc-700 focus:border-green-500 rounded px-3 py-2.5 text-zinc-100 font-mono text-sm outline-none transition-colors placeholder:text-zinc-600"
              />
            </div>

            <div>
              <label className={`font-mono text-xs block mb-1.5 ${mismatch ? "text-red-400" : "text-zinc-400"}`}>
                // Confirm New Password{mismatch && <span className="ml-2">— do not match</span>}
              </label>
              <input
                type={show ? "text" : "password"}
                value={confirm}
                onChange={(e) => setConfirm(e.target.value)}
                placeholder="••••••••••••"
                className={`w-full bg-zinc-800 rounded px-3 py-2.5 text-zinc-100 font-mono text-sm outline-none transition-colors placeholder:text-zinc-600 border ${
                  mismatch ? "border-red-500/60" : matched ? "border-green-500/60" : "border-zinc-700"
                }`}
              />
              {matched && <p className="text-green-400 font-mono text-xs mt-1">✓ Passwords match</p>}
            </div>

            {error && (
              <p className="text-red-400 font-mono text-xs border border-red-500/30 bg-red-500/10 rounded px-3 py-2">{error}</p>
            )}

            <div className="flex gap-2">
              <button
                type="submit"
                disabled={!canSave}
                className="flex-1 bg-green-500 hover:bg-green-400 disabled:bg-zinc-700 disabled:text-zinc-500 disabled:cursor-not-allowed text-black font-bold font-mono py-2.5 rounded transition-colors"
              >
                {loading ? "Saving..." : "SAVE"}
              </button>
              <button
                type="button"
                onClick={onClose}
                className="border border-zinc-700 hover:border-zinc-500 text-zinc-400 hover:text-zinc-200 font-mono px-4 rounded transition-colors"
              >
                Cancel
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}
