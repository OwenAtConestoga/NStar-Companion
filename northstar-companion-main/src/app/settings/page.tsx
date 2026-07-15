"use client";

import { useState } from "react";
import Link from "next/link";
import { useVaultStorage } from "@/hooks/useVaultStorage";
import { useProfiles } from "@/hooks/useProfiles";
import PageNav from "@/components/layout/PageNav";
import ImportModal from "@/components/vault/ImportModal";
import ChangePasswordModal from "@/components/auth/ChangePasswordModal";

export default function SettingsPage() {
  const { activeProfile } = useProfiles();
  const profileId = activeProfile?.id ?? "";
  const { status, credentials, wipeVault, exportVault, importVault, changePassword } = useVaultStorage(profileId || "default");
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [wiped, setWiped] = useState(false);
  const [isImporting, setIsImporting] = useState(false);
  const [showChangePwd, setShowChangePwd] = useState(false);

  async function handleWipe() {
    await wipeVault();
    setWiped(true);
    setConfirmDelete(false);
  }

  const isUnlocked = status === "unlocked";

  return (
    <div className="flex flex-col min-h-screen bg-zinc-950 font-mono text-zinc-100">

      <PageNav subtitle="// settings" />

      <div className="max-w-xl mx-auto w-full px-6 py-10 flex flex-col gap-8">

        {/* Header */}
        <div>
          <p className="text-green-400 text-xs tracking-widest uppercase mb-1">// Config</p>
          <h1 className="text-2xl font-bold">Settings</h1>
        </div>

        {/* Instructions / Quick Start */}
        <div className="bg-zinc-900 border border-zinc-800 border-l-4 border-l-green-500 rounded-lg p-5 flex flex-col gap-3">
          <p className="text-green-400 text-xs tracking-widest uppercase">// Quick Start</p>
          <ol className="text-zinc-300 text-sm leading-relaxed list-none flex flex-col gap-1.5">
            <li>1. Click <span className="text-zinc-100 font-bold">+ Add New</span> on the vault screen to stage a credential.</li>
            <li>2. Plug the NorthStar device into a USB port, then click <span className="text-zinc-100 font-bold">CONNECT</span> in the top bar.</li>
            <li>3. Select the NorthStar device in the browser&apos;s picker — it may show up as a generic &quot;USB Serial&quot; port.</li>
            <li>4. Once paired, click <span className="text-zinc-100 font-bold">SYNC TO DEVICE</span> to push credentials.</li>
            <li>5. On the device, navigate with the joystick and press <span className="text-zinc-100 font-bold">K1</span> to select an account — <span className="text-zinc-100 font-bold">K2</span> goes back, <span className="text-zinc-100 font-bold">K3</span> jumps home.</li>
          </ol>
          <Link href="/faq" className="self-start text-green-500 hover:text-green-400 text-xs underline underline-offset-4 mt-1">
            Full FAQ & documentation →
          </Link>
        </div>

        {/* Profile / Account */}
        <div className="bg-zinc-900 border border-zinc-800 rounded-lg p-5 flex flex-col gap-4">
          <p className="text-green-400 text-xs tracking-widest uppercase">// Your Account</p>

          <div className="flex items-center gap-4">
            <div className="w-12 h-12 rounded-full bg-green-500/10 border border-green-500/30 flex items-center justify-center text-green-400 text-xl flex-shrink-0">
              ◈
            </div>
            <div>
              <p className="text-zinc-100 text-sm font-bold">{activeProfile?.name ?? "NorthStar User"}</p>
              <p className="text-zinc-500 text-xs mt-0.5">
                {isUnlocked
                  ? `${credentials.length} credential${credentials.length !== 1 ? "s" : ""} stored`
                  : "Vault locked — unlock to view"}
              </p>
            </div>
          </div>

          <div className="flex flex-col gap-2 pt-1 border-t border-zinc-800">
            {[
              { label: "Vault status", value: status === "unlocked" ? "Unlocked" : status === "locked" ? "Locked" : "Loading..." },
              { label: "Encryption",   value: "AES-256-GCM" },
              { label: "Key derive",   value: "PBKDF2 · SHA-256 · 100k iter" },
              { label: "Salt",         value: "16-byte random · stored locally" },
              { label: "Master key",   value: "Never stored — memory only" },
            ].map(({ label, value }) => (
              <div key={label} className="flex items-baseline justify-between gap-2">
                <span className="text-zinc-400 text-sm flex-shrink-0">{label}</span>
                <span className="border-b border-dashed border-zinc-800 flex-1" />
                <span className="text-zinc-100 text-sm text-right">{value}</span>
              </div>
            ))}
          </div>

          {!isUnlocked && (
            <Link
              href="/vault"
              className="self-start text-green-500 hover:text-green-400 border border-green-500/40 hover:border-green-500 text-xs px-3 py-1.5 rounded transition-colors"
            >
              Unlock Vault →
            </Link>
          )}
        </div>

        {/* Backup & security actions — moved here from the top bar */}
        <div className="bg-zinc-900 border border-zinc-800 rounded-lg p-5 flex flex-col gap-4">
          <p className="text-green-400 text-xs tracking-widest uppercase">// Backup & Security</p>

          <div className="flex flex-col gap-2">
            <div className="flex items-center justify-between gap-3">
              <div>
                <p className="text-zinc-100 text-sm">Export encrypted backup</p>
                <p className="text-zinc-500 text-xs mt-0.5">Downloads a .nstar file — still encrypted with your master password.</p>
              </div>
              <button
                onClick={() => exportVault(activeProfile?.name ?? "vault")}
                disabled={!isUnlocked}
                className="text-zinc-100 hover:text-green-400 border border-zinc-700 hover:border-green-500/50 text-xs px-3 py-1.5 rounded transition-colors flex-shrink-0 disabled:opacity-40 disabled:cursor-not-allowed"
              >
                EXPORT
              </button>
            </div>

            <div className="flex items-center justify-between gap-3 pt-2 border-t border-zinc-800">
              <div>
                <p className="text-zinc-100 text-sm">Import backup</p>
                <p className="text-zinc-500 text-xs mt-0.5">Replaces the current vault with a previously exported backup.</p>
              </div>
              <button
                onClick={() => setIsImporting(true)}
                className="text-zinc-100 hover:text-green-400 border border-zinc-700 hover:border-green-500/50 text-xs px-3 py-1.5 rounded transition-colors flex-shrink-0"
              >
                IMPORT
              </button>
            </div>

            <div className="flex items-center justify-between gap-3 pt-2 border-t border-zinc-800">
              <div>
                <p className="text-zinc-100 text-sm">Change master password</p>
                <p className="text-zinc-500 text-xs mt-0.5">Re-encrypts your vault with a new password.</p>
              </div>
              <button
                onClick={() => setShowChangePwd(true)}
                disabled={!isUnlocked}
                className="text-zinc-100 hover:text-green-400 border border-zinc-700 hover:border-green-500/50 text-xs px-3 py-1.5 rounded transition-colors flex-shrink-0 disabled:opacity-40 disabled:cursor-not-allowed"
              >
                CHANGE
              </button>
            </div>
          </div>
        </div>

        {/* App info */}
        <div className="bg-zinc-900 border border-zinc-800 rounded-lg p-5 flex flex-col gap-3">
          <p className="text-green-400 text-xs tracking-widest uppercase">// App Info</p>
          <div className="flex flex-col gap-2">
            {[
              { label: "App",       value: "NorthStar Companion" },
              { label: "Version",   value: "v1.0 · Phase 1" },
              { label: "Stack",     value: "Next.js 16 · Tailwind v4" },
              { label: "Crypto",    value: "Web Crypto API (browser-native)" },
              { label: "Serial",    value: "Web Serial API (Chrome/Edge)" },
              { label: "Backend",   value: "None" },
              { label: "Database",  value: "None" },
            ].map(({ label, value }) => (
              <div key={label} className="flex items-baseline justify-between gap-2">
                <span className="text-zinc-400 text-sm flex-shrink-0">{label}</span>
                <span className="border-b border-dashed border-zinc-800 flex-1" />
                <span className="text-zinc-100 text-sm text-right">{value}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Device info shortcut */}
        <div className="bg-zinc-900 border border-zinc-800 rounded-lg p-5 flex items-center justify-between">
          <div>
            <p className="text-zinc-100 text-sm font-bold">Hardware / Device Info</p>
            <p className="text-zinc-500 text-xs mt-0.5">Specs, wiring, protocol</p>
          </div>
          <Link
            href="/device"
            className="text-green-500 hover:text-green-400 border border-green-500/40 hover:border-green-500 text-xs px-3 py-1.5 rounded transition-colors flex-shrink-0"
          >
            View →
          </Link>
        </div>

        {/* Danger zone */}
        <div className="bg-red-500/5 border border-red-500/20 rounded-lg p-5 flex flex-col gap-3">
          <p className="text-red-400 text-xs tracking-widest uppercase">// Danger Zone</p>

          {wiped ? (
            <div className="flex flex-col gap-2">
              <p className="text-green-400 text-xs">✓ Vault wiped. All credentials deleted.</p>
              <Link href="/vault" className="self-start text-zinc-400 hover:text-zinc-200 text-xs underline underline-offset-4">
                Set up a new vault →
              </Link>
            </div>
          ) : !isUnlocked ? (
            <p className="text-zinc-600 text-xs">Unlock your vault to access destructive actions.</p>
          ) : !confirmDelete ? (
            <div className="flex flex-col gap-2">
              <p className="text-zinc-500 text-xs">
                Permanently wipe the local vault — deletes all {credentials.length} credential{credentials.length !== 1 ? "s" : ""} and resets the master password. Cannot be undone.
              </p>
              <button
                onClick={() => setConfirmDelete(true)}
                className="self-start text-red-400 hover:text-red-300 border border-red-500/40 hover:border-red-500/70 text-xs px-3 py-1.5 rounded transition-colors"
              >
                Delete All &amp; Wipe Vault
              </button>
            </div>
          ) : (
            <div className="flex flex-col gap-3">
              <p className="text-red-400 text-xs font-bold">Are you sure? This cannot be undone.</p>
              <div className="flex gap-2">
                <button
                  onClick={handleWipe}
                  className="text-red-400 hover:text-red-300 bg-red-500/10 hover:bg-red-500/20 border border-red-500/40 text-xs px-3 py-1.5 rounded transition-colors"
                >
                  YES — WIPE EVERYTHING
                </button>
                <button
                  onClick={() => setConfirmDelete(false)}
                  className="text-zinc-400 hover:text-zinc-200 border border-zinc-700 text-xs px-3 py-1.5 rounded transition-colors"
                >
                  Cancel
                </button>
              </div>
            </div>
          )}
        </div>

      </div>

      {isImporting && (
        <ImportModal
          onImport={importVault}
          onClose={() => setIsImporting(false)}
        />
      )}

      {showChangePwd && (
        <ChangePasswordModal
          onSave={changePassword}
          onClose={() => setShowChangePwd(false)}
        />
      )}
    </div>
  );
}
