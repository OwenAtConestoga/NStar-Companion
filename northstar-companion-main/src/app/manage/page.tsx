"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { useProfiles } from "@/hooks/useProfiles";
import PageNav from "@/components/layout/PageNav";

export default function ManageAccountsPage() {
  const { profiles, loaded, createProfile, resetProfile, deleteProfile } = useProfiles();
  const [vaultConfigured, setVaultConfigured] = useState<Record<string, boolean>>({});
  const [confirmReset, setConfirmReset] = useState<string | null>(null);
  const [confirmDelete, setConfirmDelete] = useState<string | null>(null);
  const [creating, setCreating] = useState(false);
  const [newName, setNewName] = useState("");

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

  function handleDeleteUser(id: string) {
    deleteProfile(id);
    setConfirmDelete(null);
  }

  function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    if (!newName.trim()) return;
    createProfile(newName.trim());
    setNewName("");
    setCreating(false);
  }

  const initials = (n: string) => n.slice(0, 2).toUpperCase();

  return (
    <div className="flex flex-col min-h-screen bg-zinc-950 font-mono text-zinc-100">
      <PageNav subtitle="// manage accounts" />

      <div className="max-w-2xl mx-auto w-full px-6 py-10 flex flex-col gap-6">

        <div className="flex items-start justify-between gap-4">
          <div>
            <p className="text-green-400 text-xs tracking-widest uppercase mb-1">// Enterprise</p>
            <h1 className="text-2xl font-bold">Manage Accounts</h1>
            <p className="text-zinc-500 text-sm mt-1">
              {loaded ? `${profiles.length} profile${profiles.length !== 1 ? "s" : ""} on this device` : "Loading…"} — each has its own independent, encrypted vault.
            </p>
          </div>
          {!creating && (
            <button
              onClick={() => setCreating(true)}
              className="bg-green-500 hover:bg-green-400 text-black font-bold text-sm px-4 py-2 rounded transition-colors flex-shrink-0"
            >
              + New Account
            </button>
          )}
        </div>

        {creating && (
          <form onSubmit={handleCreate} className="bg-zinc-900 border border-green-500/30 rounded-lg p-4 flex items-end gap-3">
            <div className="flex-1">
              <label className="text-zinc-400 text-xs block mb-1.5">// Profile Name</label>
              <input
                type="text"
                value={newName}
                onChange={(e) => setNewName(e.target.value)}
                autoFocus
                placeholder="e.g. Sales, IT, Alice..."
                maxLength={24}
                className="w-full bg-zinc-800 border border-zinc-700 focus:border-green-500 rounded px-3 py-2 text-zinc-100 text-sm outline-none transition-colors placeholder:text-zinc-600"
              />
            </div>
            <button
              type="submit"
              disabled={!newName.trim()}
              className="bg-green-500 hover:bg-green-400 disabled:bg-zinc-700 disabled:text-zinc-500 disabled:cursor-not-allowed text-black font-bold text-sm px-4 py-2 rounded transition-colors"
            >
              CREATE
            </button>
            <button
              type="button"
              onClick={() => { setCreating(false); setNewName(""); }}
              className="text-zinc-400 hover:text-zinc-200 border border-zinc-700 text-sm px-4 py-2 rounded transition-colors"
            >
              Cancel
            </button>
          </form>
        )}

        {!loaded ? null : profiles.length === 0 && !creating ? (
          <p className="text-zinc-600 text-sm">No profiles yet. Click &quot;+ New Account&quot; above to create one.</p>
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
                    ) : confirmDelete === p.id ? (
                      <>
                        <button onClick={() => handleDeleteUser(p.id)} className="text-red-400 hover:text-red-300 bg-red-500/10 hover:bg-red-500/20 border border-red-500/40 text-xs px-2.5 py-1.5 rounded transition-colors">
                          CONFIRM DELETE
                        </button>
                        <button onClick={() => setConfirmDelete(null)} className="text-zinc-400 hover:text-zinc-200 border border-zinc-700 text-xs px-2.5 py-1.5 rounded transition-colors">
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
                          onClick={() => setConfirmDelete(p.id)}
                          title="Delete this profile and its vault completely"
                          className="text-zinc-100 hover:text-red-400 border border-zinc-700 hover:border-red-500/50 text-xs px-2.5 py-1.5 rounded transition-colors"
                        >
                          DELETE USER
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
            <span className="text-red-400 font-bold">DELETE USER</span> permanently removes the profile and its vault. Neither can be undone, and neither touches the physical device — sync again afterward.
          </p>
        </div>

      </div>
    </div>
  );
}
