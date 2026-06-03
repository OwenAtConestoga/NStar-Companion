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
  const [serviceName,      setServiceName]      = useState(initialValues?.serviceName ?? "");
  const [username,         setUsername]         = useState(initialValues?.username    ?? "");
  const [confirmUsername,  setConfirmUsername]  = useState(initialValues?.username    ?? "");
  const [password,         setPassword]         = useState(initialValues?.password    ?? "");
  const [confirmPassword,  setConfirmPassword]  = useState(initialValues?.password    ?? "");
  const [showPassword,     setShowPassword]     = useState(false);
  const [selectedIcon,     setSelectedIcon]     = useState(initialValues?.icon ?? ICON_OPTIONS[0].char);

  const isEditing = !!initialValues;

  const MAX_SERVICE  = 64;
  const MAX_USERNAME = 254;
  const MAX_PASSWORD = 128;
  const WARN_AT = 0.85; // show counter at 85% of max

  const serviceOver  = serviceName.length > MAX_SERVICE;
  const usernameOver = username.length > MAX_USERNAME;
  const passwordOver = password.length > MAX_PASSWORD;

  function charHint(len: number, max: number) {
    if (len < max * WARN_AT) return null;
    const over = len > max;
    return (
      <p className={`font-mono text-xs mt-1 text-right ${over ? "text-red-400" : "text-yellow-400"}`}>
        {len}/{max}{over ? " — exceeds limit" : ""}
      </p>
    );
  }

  const usernameMatch   = username === confirmUsername;
  const usernameMismatch = username.length > 0 && confirmUsername.length > 0 && !usernameMatch;
  const usernameOK      = username.length > 0 && confirmUsername.length > 0 && usernameMatch;

  const passwordMatch   = password === confirmPassword;
  const passwordMismatch = password.length > 0 && confirmPassword.length > 0 && !passwordMatch;
  const passwordOK      = password.length > 0 && confirmPassword.length > 0 && passwordMatch;

  const canSubmit =
    serviceName.trim() !== "" && !serviceOver &&
    username.trim() !== "" && usernameMatch && !usernameOver &&
    passwordMatch && !passwordOver;

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!canSubmit) return;
    onAdd({ serviceName: serviceName.trim(), username: username.trim(), password, icon: selectedIcon });
  }

  function generatePassword() {
    const charset = "abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789!@#$%^&*()-_=+";
    const bytes   = crypto.getRandomValues(new Uint8Array(20));
    const pwd     = Array.from(bytes).map((b) => charset[b % charset.length]).join("");
    setPassword(pwd);
    setConfirmPassword(pwd);
    setShowPassword(true);
  }

  function fieldBorder(mismatch: boolean, ok: boolean) {
    if (mismatch) return "border-red-500/60 focus:border-red-500";
    if (ok)       return "border-green-500/60 focus:border-green-500";
    return "border-zinc-700 focus:border-green-500";
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm">
      <div className="bg-zinc-900 border border-zinc-800 rounded-xl max-w-md w-full mx-4 p-6 flex flex-col gap-5 max-h-[90vh] overflow-y-auto">

        {/* Header */}
        <div>
          <p className="text-green-400 font-mono text-xs tracking-widest uppercase mb-1">
            {isEditing ? "// Edit Credential" : "// Stage New Credential"}
          </p>
          <h2 className="text-zinc-100 font-mono text-lg font-bold">
            {isEditing ? "Edit Account" : "Add to Local Vault"}
          </h2>
          <p className="text-zinc-500 font-mono text-xs mt-1">
            Username and password are both sent to the device on sync.
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
              placeholder="e.g. Gmail Login, GitHub, AWS"
              maxLength={MAX_SERVICE + 10}
              className={`w-full bg-zinc-800 rounded px-3 py-2.5 text-zinc-100 font-mono text-sm outline-none transition-colors placeholder:text-zinc-600 border ${serviceOver ? "border-red-500/60 focus:border-red-500" : "border-zinc-700 focus:border-green-500"}`}
            />
            {charHint(serviceName.length, MAX_SERVICE)}
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
              placeholder="you@example.com"
              autoComplete="off"
              maxLength={MAX_USERNAME + 10}
              className={`w-full bg-zinc-800 rounded px-3 py-2.5 text-zinc-100 font-mono text-sm outline-none transition-colors placeholder:text-zinc-600 border ${usernameOver ? "border-red-500/60 focus:border-red-500" : fieldBorder(usernameMismatch, usernameOK)}`}
            />
            {charHint(username.length, MAX_USERNAME)}
          </div>

          {/* Confirm username */}
          <div>
            <label className={`font-mono text-xs block mb-1.5 ${usernameMismatch ? "text-red-400" : "text-zinc-400"}`}>
              // Confirm Username / Email
              {usernameMismatch && <span className="ml-2">— do not match</span>}
            </label>
            <input
              type="text"
              value={confirmUsername}
              onChange={(e) => setConfirmUsername(e.target.value)}
              placeholder="re-enter username"
              autoComplete="off"
              className={`w-full bg-zinc-800 rounded px-3 py-2.5 text-zinc-100 font-mono text-sm outline-none transition-colors placeholder:text-zinc-600 border ${fieldBorder(usernameMismatch, usernameOK)}`}
            />
            {username.length > 0 && confirmUsername.length > 0 && (
              <p className={`font-mono text-xs mt-1 ${usernameOK ? "text-green-400" : "text-red-400"}`}>
                {usernameOK ? "✓ Match" : "✗ Do not match"}
              </p>
            )}
          </div>

          {/* Password */}
          <div>
            <div className="flex items-center justify-between mb-1.5">
              <label className="text-zinc-400 font-mono text-xs">
                // Password
                <span className="text-zinc-600 ml-2">(sent to device, stored encrypted)</span>
              </label>
              <button
                type="button"
                onClick={generatePassword}
                className="font-mono text-xs text-green-500 hover:text-green-400 border border-green-500/30 hover:border-green-500/60 px-2 py-0.5 rounded transition-colors"
              >
                ⟳ Generate
              </button>
            </div>
            <div className="relative">
              <input
                type={showPassword ? "text" : "password"}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••••••"
                maxLength={MAX_PASSWORD + 10}
                className={`w-full bg-zinc-800 rounded px-3 py-2.5 pr-16 text-zinc-100 font-mono text-sm outline-none transition-colors placeholder:text-zinc-600 border ${passwordOver ? "border-red-500/60 focus:border-red-500" : fieldBorder(passwordMismatch, passwordOK)}`}
              />
              <button
                type="button"
                onClick={() => setShowPassword((v) => !v)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-zinc-500 hover:text-zinc-300 font-mono text-xs transition-colors"
              >
                {showPassword ? "HIDE" : "SHOW"}
              </button>
            </div>
            {charHint(password.length, MAX_PASSWORD)}
          </div>

          {/* Confirm password */}
          <div>
            <label className={`font-mono text-xs block mb-1.5 ${passwordMismatch ? "text-red-400" : "text-zinc-400"}`}>
              // Confirm Password
              {passwordMismatch && <span className="ml-2">— do not match</span>}
            </label>
            <div className="relative">
              <input
                type={showPassword ? "text" : "password"}
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                placeholder="••••••••••••"
                className={`w-full bg-zinc-800 rounded px-3 py-2.5 pr-16 text-zinc-100 font-mono text-sm outline-none transition-colors placeholder:text-zinc-600 border ${fieldBorder(passwordMismatch, passwordOK)}`}
              />
              <button
                type="button"
                onClick={() => setShowPassword((v) => !v)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-zinc-500 hover:text-zinc-300 font-mono text-xs transition-colors"
              >
                {showPassword ? "HIDE" : "SHOW"}
              </button>
            </div>
            {password.length > 0 && confirmPassword.length > 0 && (
              <p className={`font-mono text-xs mt-1 ${passwordOK ? "text-green-400" : "text-red-400"}`}>
                {passwordOK ? "✓ Match" : "✗ Do not match"}
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
