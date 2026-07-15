"use client";

import { useState } from "react";
import Link from "next/link";
import type { Profile } from "@/hooks/useProfiles";

interface ProfileSelectProps {
  profiles: Profile[];
  onSelect: (id: string) => void;
  onCreate: (name: string) => void;
  onDelete: (id: string) => void;
}

export default function ProfileSelect({ profiles, onSelect, onCreate, onDelete }: ProfileSelectProps) {
  const [creating, setCreating] = useState(profiles.length === 0);
  const [name, setName]         = useState("");
  const [confirmDelete, setConfirmDelete] = useState<string | null>(null);

  function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    if (!name.trim()) return;
    onCreate(name.trim());
  }

  const initials = (n: string) => n.slice(0, 2).toUpperCase();

  return (
    <div className="min-h-screen bg-zinc-950 flex items-center justify-center px-4">
      <div className="w-full max-w-sm flex flex-col gap-3">
        <Link
          href="/"
          className="self-start text-zinc-100 hover:text-green-400 border border-zinc-700 hover:border-zinc-500 font-mono text-sm font-bold px-3 py-1 rounded transition-colors"
        >
          ← HOME
        </Link>

        <div className="bg-zinc-900 border border-zinc-800 rounded-xl w-full p-8 flex flex-col gap-6">

        <div>
          <p className="text-green-400 font-mono text-xs tracking-widest uppercase mb-1">
            // NorthStar Auth
          </p>
          <h1 className="text-zinc-100 font-mono text-2xl font-bold">N* Profiles</h1>
          <p className="text-zinc-500 font-mono text-xs mt-1">
            {profiles.length === 0
              ? "Create your first profile to get started."
              : "Choose a profile or create a new one."}
          </p>
        </div>

        {/* Profile list */}
        {profiles.length > 0 && !creating && (
          <div className="flex flex-col gap-2">
            {profiles.map((p) => (
              <div key={p.id} className="group flex items-center gap-3">
                <button
                  onClick={() => onSelect(p.id)}
                  className="flex-1 flex items-center gap-3 bg-zinc-800 hover:bg-zinc-700 border border-zinc-700 hover:border-zinc-500 rounded-lg px-3 py-3 transition-colors text-left"
                >
                  <div className="w-9 h-9 rounded-full bg-green-500/20 border border-green-500/30 flex items-center justify-center flex-shrink-0">
                    <span className="text-green-400 font-mono text-xs font-bold">{initials(p.name)}</span>
                  </div>
                  <div>
                    <p className="text-zinc-100 font-mono text-sm font-bold">{p.name}</p>
                    <p className="text-zinc-600 font-mono text-xs">
                      Created {new Date(p.createdAt).toLocaleDateString("en-CA")}
                    </p>
                  </div>
                  <span className="ml-auto text-zinc-600 font-mono text-xs">UNLOCK →</span>
                </button>

                {confirmDelete === p.id ? (
                  <div className="flex gap-1">
                    <button
                      onClick={() => { onDelete(p.id); setConfirmDelete(null); }}
                      className="text-red-400 hover:text-red-300 font-mono text-xs border border-red-500/30 hover:border-red-500/60 px-2 py-1 rounded transition-colors"
                    >
                      DEL
                    </button>
                    <button
                      onClick={() => setConfirmDelete(null)}
                      className="text-zinc-500 hover:text-zinc-300 font-mono text-xs border border-zinc-700 px-2 py-1 rounded transition-colors"
                    >
                      ✕
                    </button>
                  </div>
                ) : (
                  <button
                    onClick={() => setConfirmDelete(p.id)}
                    className="text-zinc-500 hover:text-red-400 border border-zinc-700 hover:border-red-500/50 font-mono text-xs px-2 py-1 rounded transition-colors flex-shrink-0"
                    title="Delete profile"
                  >
                    DEL
                  </button>
                )}
              </div>
            ))}
          </div>
        )}

        {/* Create form */}
        {creating ? (
          <form onSubmit={handleCreate} className="flex flex-col gap-4">
            <div>
              <label className="text-zinc-400 font-mono text-xs block mb-1.5">// Profile Name</label>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                autoFocus
                placeholder="e.g. Mom, Dad, Work..."
                maxLength={24}
                className="w-full bg-zinc-800 border border-zinc-700 focus:border-green-500 rounded px-3 py-2.5 text-zinc-100 font-mono text-sm outline-none transition-colors placeholder:text-zinc-600"
              />
            </div>
            <div className="flex gap-2">
              <button
                type="submit"
                disabled={!name.trim()}
                className="flex-1 bg-green-500 hover:bg-green-400 disabled:bg-zinc-700 disabled:text-zinc-500 disabled:cursor-not-allowed text-black font-bold font-mono py-2.5 rounded transition-colors"
              >
                CREATE PROFILE
              </button>
              {profiles.length > 0 && (
                <button
                  type="button"
                  onClick={() => { setCreating(false); setName(""); }}
                  className="border border-zinc-700 hover:border-zinc-500 text-zinc-400 hover:text-zinc-200 font-mono px-4 rounded transition-colors"
                >
                  Cancel
                </button>
              )}
            </div>
          </form>
        ) : (
          <button
            onClick={() => setCreating(true)}
            className="w-full border border-zinc-700 hover:border-zinc-500 text-zinc-400 hover:text-zinc-200 font-mono text-sm py-2.5 rounded transition-colors"
          >
            + Add Profile
          </button>
        )}

        <p className="text-zinc-600 font-mono text-xs text-center">
          Each profile has its own encrypted vault
        </p>
        </div>
      </div>
    </div>
  );
}
