"use client";

import { useState } from "react";
import { Credential, ICON_OPTIONS } from "@/types/credential";

type CredentialFields = Omit<Credential, "id" | "createdAt">;

interface AddCredentialModalProps {
  onAdd: (cred: CredentialFields) => void;
  onCancel: () => void;
  initialValues?: CredentialFields;
}

export default function AddCredentialModal({ onAdd, onCancel, initialValues }: AddCredentialModalProps) {
  const [serviceName, setServiceName]         = useState(initialValues?.serviceName ?? "");
  const [username, setUsername]               = useState(initialValues?.username ?? "");
  const [password, setPassword]               = useState(initialValues?.password ?? "");
  const [confirmPassword, setConfirmPassword] = useState(initialValues?.password ?? "");
  const [showPassword, setShowPassword]       = useState(false);
  const [showConfirm, setShowConfirm]         = useState(false);
  const [selectedIcon, setSelectedIcon]       = useState(initialValues?.icon ?? ICON_OPTIONS[0].char);

  const isEditing = !!initialValues;

  // Password is optional, but if entered both fields must match
  const passwordsMatch  = password === confirmPassword;
  const passwordMismatch = password.length > 0 && confirmPassword.length > 0 && !passwordsMatch;

  const canSubmit =
    serviceName.trim() !== "" &&
    username.trim() !== "" &&
    passwordsMatch;

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!canSubmit) return;
    onAdd({ serviceName: serviceName.trim(), username: username.trim(), password, icon: selectedIcon });
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm">
      <div className="bg-zinc-900 border border-zinc-800 rounded-xl max-w-md w-full mx-4 p-6 flex flex-col gap-5">

        {/* Header */}
        <div>
          <p className="text-green-400 font-mono text-xs tracking-widest uppercase mb-1">
            {isEditing ? "// Edit Credential" : "// Stage New Credential"}
          </p>
          <h2 className="text-zinc-100 font-mono text-lg font-bold">
            {isEditing ? "Edit Account" : "Add to Local Vault"}
          </h2>
          <p className="text-zinc-500 font-mono text-xs mt-1">
            Data is encrypted before sync. Nothing is sent until you initiate.
          </p>
        </div>

        <form onSubmit={handleSubmit} className="flex flex-col gap-4">

          {/* Icon picker */}
          <div>
            <label className="text-zinc-400 font-mono text-xs block mb-2">// Select Icon</label>
            <div className="grid grid-cols-6 gap-1.5">
              {ICON_OPTIONS.map((opt) => (
                <button
                  key={opt.char}
                  type="button"
                  onClick={() => setSelectedIcon(opt.char)}
                  title={opt.label}
                  className={`h-9 rounded border font-mono text-base transition-colors ${
                    selectedIcon === opt.char
                      ? "border-green-500 bg-green-500/10 text-green-400"
                      : "border-zinc-700 bg-zinc-800 text-zinc-400 hover:border-zinc-500"
                  }`}
                >
                  {opt.char}
                </button>
              ))}
            </div>
          </div>

          {/* Service name */}
          <div>
            <label className="text-zinc-400 font-mono text-xs block mb-1.5">
              // Service Name <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              value={serviceName}
              onChange={(e) => setServiceName(e.target.value)}
              placeholder="e.g. GitHub, AWS, Hospital Portal"
              className="w-full bg-zinc-800 border border-zinc-700 focus:border-green-500 rounded px-3 py-2.5 text-zinc-100 font-mono text-sm outline-none transition-colors placeholder:text-zinc-600"
            />
          </div>

          {/* Username */}
          <div>
            <label className="text-zinc-400 font-mono text-xs block mb-1.5">
              // Username / Email <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              placeholder="e.g. you@example.com"
              className="w-full bg-zinc-800 border border-zinc-700 focus:border-green-500 rounded px-3 py-2.5 text-zinc-100 font-mono text-sm outline-none transition-colors placeholder:text-zinc-600"
            />
          </div>

          {/* Password */}
          <div>
            <label className="text-zinc-400 font-mono text-xs block mb-1.5">
              // Password
              <span className="text-zinc-600 ml-2">(stored encrypted on device)</span>
            </label>
            <div className="relative">
              <input
                type={showPassword ? "text" : "password"}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••••••"
                className="w-full bg-zinc-800 border border-zinc-700 focus:border-green-500 rounded px-3 py-2.5 pr-16 text-zinc-100 font-mono text-sm outline-none transition-colors placeholder:text-zinc-600"
              />
              <button
                type="button"
                onClick={() => setShowPassword((v) => !v)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-zinc-500 hover:text-zinc-300 font-mono text-xs transition-colors"
              >
                {showPassword ? "HIDE" : "SHOW"}
              </button>
            </div>
          </div>

          {/* Confirm password */}
          <div>
            <label className={`font-mono text-xs block mb-1.5 ${passwordMismatch ? "text-red-400" : "text-zinc-400"}`}>
              // Confirm Password
              {passwordMismatch && (
                <span className="ml-2 text-red-400">— passwords do not match</span>
              )}
            </label>
            <div className="relative">
              <input
                type={showConfirm ? "text" : "password"}
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                placeholder="••••••••••••"
                className={`w-full bg-zinc-800 rounded px-3 py-2.5 pr-16 text-zinc-100 font-mono text-sm outline-none transition-colors placeholder:text-zinc-600 border ${
                  passwordMismatch
                    ? "border-red-500/60 focus:border-red-500"
                    : password.length > 0 && confirmPassword.length > 0 && passwordsMatch
                    ? "border-green-500/60 focus:border-green-500"
                    : "border-zinc-700 focus:border-green-500"
                }`}
              />
              <button
                type="button"
                onClick={() => setShowConfirm((v) => !v)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-zinc-500 hover:text-zinc-300 font-mono text-xs transition-colors"
              >
                {showConfirm ? "HIDE" : "SHOW"}
              </button>
            </div>
            {/* Match indicator */}
            {password.length > 0 && confirmPassword.length > 0 && (
              <p className={`font-mono text-xs mt-1 ${passwordsMatch ? "text-green-400" : "text-red-400"}`}>
                {passwordsMatch ? "✓ Passwords match" : "✗ Passwords do not match"}
              </p>
            )}
          </div>

          {/* Actions */}
          <div className="flex gap-3 pt-1">
            <button
              type="submit"
              disabled={!canSubmit}
              className="flex-1 bg-green-500 hover:bg-green-400 disabled:bg-zinc-700 disabled:text-zinc-500 disabled:cursor-not-allowed text-black font-bold font-mono py-3 rounded transition-colors"
            >
              {isEditing ? "SAVE CHANGES" : "STAGE CREDENTIAL"}
            </button>
            <button
              type="button"
              onClick={onCancel}
              className="border border-zinc-700 hover:border-zinc-500 text-zinc-400 hover:text-zinc-200 font-mono px-5 py-3 rounded transition-colors"
            >
              Cancel
            </button>
          </div>

        </form>
      </div>
    </div>
  );
}
