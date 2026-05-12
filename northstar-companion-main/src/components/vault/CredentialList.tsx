"use client";

import { useState } from "react";
import { Credential } from "@/types/credential";
import CredentialCard from "./CredentialCard";

interface CredentialListProps {
  credentials: Credential[];
  onEdit: (id: string) => void;
  onDelete: (id: string) => void;
  lastSyncAt?: string;
}

export default function CredentialList({ credentials, onEdit, onDelete, lastSyncAt }: CredentialListProps) {
  const [search, setSearch] = useState("");

  const filtered = credentials.filter((c) =>
    c.serviceName.toLowerCase().includes(search.toLowerCase()) ||
    c.username.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="flex-1 overflow-y-auto px-6 py-4 space-y-3">
      <div className="mb-4 bg-zinc-900 border border-zinc-700 border-l-4 border-l-green-500 rounded-md px-4 py-3 flex items-center gap-3">
        <span className="text-green-400 font-mono text-sm flex-shrink-0">◈</span>
        <h2 className="text-zinc-100 font-mono text-sm font-bold tracking-widest uppercase flex-shrink-0">Staged Accounts</h2>
        <input
          type="text"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="search..."
          className="flex-1 min-w-0 bg-zinc-800 border border-zinc-700 focus:border-zinc-500 rounded px-3 py-1 text-zinc-300 font-mono text-xs outline-none placeholder:text-zinc-600 transition-colors"
        />
        <p className="text-zinc-500 font-mono text-xs flex-shrink-0">
          {filtered.length}{search ? `/${credentials.length}` : ""} credential{credentials.length !== 1 ? "s" : ""}
        </p>
        {lastSyncAt && (
          <p className="text-zinc-600 font-mono text-xs flex-shrink-0 border-l border-zinc-700 pl-3">
            last synced <span className="text-zinc-400">{new Date(lastSyncAt).toLocaleDateString("en-CA")}</span>
          </p>
        )}
      </div>

      {credentials.length === 0 && (
        <div className="flex flex-col items-center justify-center py-16 gap-3">
          <span className="text-zinc-600 text-3xl">◈</span>
          <p className="text-zinc-600 font-mono text-sm">// No credentials staged.</p>
          <p className="text-zinc-700 font-mono text-xs">Use &quot;+ Add New&quot; to stage your first credential.</p>
        </div>
      )}

      {credentials.length > 0 && filtered.length === 0 && (
        <div className="flex flex-col items-center justify-center py-16 gap-3">
          <span className="text-zinc-600 text-3xl">◈</span>
          <p className="text-zinc-600 font-mono text-sm">// No matches for &quot;{search}&quot;</p>
        </div>
      )}

      {filtered.map((cred) => (
        <CredentialCard
          key={cred.id}
          id={cred.id}
          serviceName={cred.serviceName}
          username={cred.username}
          icon={cred.icon}
          createdAt={cred.createdAt}
          lastSyncAt={lastSyncAt}
          onEdit={onEdit}
          onDelete={onDelete}
        />
      ))}
    </div>
  );
}
