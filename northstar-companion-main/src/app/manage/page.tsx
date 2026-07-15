"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { useProfiles } from "@/hooks/useProfiles";
import PageNav from "@/components/layout/PageNav";

export default function ManageAccountsPage() {
  const { profiles, loaded, resetProfile, deleteProfile } = useProfiles();
  const [vaultConfigured, setVaultConfigured] = useState<Record<string, boolean>>({});
  const [confirmReset, setConfirmReset] = useState<string | null>(null);
  const [confirmWipe,  setConfirmWipe]  = useState<string | null>(null);

  // Vault existence is just a localStorage key check — no need to unlock to know it exists
  useEffect(() => {
    if (!loaded) return;
    const next: Record<string, boolean> = {};
    for (const p of profiles) {
      next[p.id] = localStorage.getItem(`nsa-vault-${p.id}`) !== null;
    }
    setVaultConfigured(next);
  }, [loaded, profiles]);

  function handleReset(id: string) {
    resetProfile(id);
    setVaultConfigured((s) => ({ ...s, [id]: false }));
    setConfirmReset(null);
  }

  function handleWipe(id: string) {
    deleteProfile(id);
    setConfirmWipe(null);
  }

  const initials = (n: string) => n.slice(0, 2).toUpperCase();

  return (
    <div className="flex flex-col min-h-screen bg-zinc-950 font-mono text-zinc-100">
      <PageNav subtitle="// manage accounts" />

      <div className="max-w-2xl mx-auto w-full px-6 py-10 flex flex-col gap-6">

        <div>
          <p className="text-green-400 text-xs tracking-widest uppercase mb-1">// Enterprise</p>
          <h1 className="text-2xl font-bold">Manage Accounts</h1>
          <p className="text-zinc-500 text-sm mt-1">
            {loaded ? `${profiles.length} profile${profiles.length !== 1 ? "s" : ""} on this device` : "Loading…"} — each has its own independent, encrypted vault.
          </p>
        </div>

        {!loaded ? null : profiles.length === 0 ? (
          <p className="text-zinc-600 text-sm">
            No profiles yet. <Link href="/vault" className="text-green-500 hover:text-green-400 underline underline-offset-4">Create one →</Link>
          </p>
        ) : (
          <div className="flex flex-col gap-3">
            {profiles.map((p) => {
              const configured = vaultConfigured[p.id];
              return (
                <div key={p.id} className="bg-zinc-900 border border-zinc-800 rounded-lg p-4 flex items-center gap-4">
                  <div className="w-10 h-10 rounded-full bg-green-500/10 border border-green-500/30 flex items-center justify-center text-green-400 text-sm font-bold flex-shrink-0">
                    {initials(p.name)}
                  </div>

                  <div className="flex-1 min-w-0">
                    <p className="text-zinc-100 text-sm font-bold truncate">{p.name}</p>
                    <p className="text-zinc-500 text-xs mt-0.5">
                      Created {new Date(p.createdAt).toLocaleDateString("en-CA")} · {configured === undefined ? "…" : configured ? "vault configured" : "not yet set up"}
                    </p>
                  </div>

                  <div className="flex items-center gap-2 flex-shrink-0">
                    {confirmReset === p.id ? (
                      <>
                        <button onClick={() => handleReset(p.id)} className="text-yellow-400 hover:text-yellow-300 bg-yellow-500/10 hover:bg-yellow-500/20 border border-yellow-500/40 text-xs px-2.5 py-1.5 rounded transition-colors">
                          CONFIRM RESET
                        </button>
                        <button onClick={() => setConfirmReset(null)} className="text-zinc-400 hover:text-zinc-200 border border-zinc-700 text-xs px-2.5 py-1.5 rounded transition-colors">
                          Cancel
                        </button>
                      </>
                    ) : confirmWipe === p.id ? (
                      <>
                        <button onClick={() => handleWipe(p.id)} className="text-red-400 hover:text-red-300 bg-red-500/10 hover:bg-red-500/20 border border-red-500/40 text-xs px-2.5 py-1.5 rounded transition-colors">
                          CONFIRM WIPE
                        </button>
                        <button onClick={() => setConfirmWipe(null)} className="text-zinc-400 hover:text-zinc-200 border border-zinc-700 text-xs px-2.5 py-1.5 rounded transition-colors">
                          Cancel
                        </button>
                      </>
                    ) : (
                      <>
                        <button
                          onClick={() => setConfirmReset(p.id)}
                          disabled={!configured}
                          title="Clear this profile's vault — keeps the profile, next unlock starts fresh"
                          className="text-zinc-100 hover:text-yellow-400 border border-zinc-700 hover:border-yellow-500/50 text-xs px-2.5 py-1.5 rounded transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
                        >
                          RESET
                        </button>
                        <button
                          onClick={() => setConfirmWipe(p.id)}
                          title="Delete this profile and its vault completely"
                          className="text-zinc-100 hover:text-red-400 border border-zinc-700 hover:border-red-500/50 text-xs px-2.5 py-1.5 rounded transition-colors"
                        >
                          WIPE
                        </button>
                      </>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}

        <div className="bg-zinc-900 border border-zinc-800 rounded-lg p-4">
          <p className="text-zinc-500 text-xs leading-relaxed">
            <span className="text-yellow-400 font-bold">RESET</span> clears a profile&apos;s vault and master password — the profile stays, next unlock starts fresh.{" "}
            <span className="text-red-400 font-bold">WIPE</span> permanently deletes the profile and its vault. Neither can be undone, and neither touches the physical device — sync again afterward.
          </p>
        </div>

      </div>
    </div>
  );
}
