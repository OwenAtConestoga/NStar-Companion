"use client";

import { useState } from "react";

interface CredentialCardProps {
  id: string;
  serviceName: string;
  username: string;
  icon: string;
  createdAt?: string;
  lastSyncAt?: string;
  onEdit: (id: string) => void;
  onDelete: (id: string) => void;
}

function formatDate(iso?: string) {
  if (!iso) return null;
  const d = new Date(iso);
  return d.toLocaleDateString("en-CA"); // YYYY-MM-DD
}

export default function CredentialCard({ id, serviceName, username, icon, createdAt, lastSyncAt, onEdit, onDelete }: CredentialCardProps) {
  const [confirmingDelete, setConfirmingDelete] = useState(false);
  const dateLabel = formatDate(createdAt);

  // Sync status: only meaningful once a sync has happened
  const synced = lastSyncAt !== undefined && createdAt
    ? new Date(createdAt) <= new Date(lastSyncAt)
    : lastSyncAt !== undefined; // no createdAt → treat as synced if we've synced at all

  const syncKnown = lastSyncAt !== undefined;

  const borderColor = confirmingDelete
    ? "border-red-500/40 border-l-red-500"
    : syncKnown
      ? synced ? "border-zinc-800 border-l-green-500" : "border-zinc-800 border-l-yellow-400"
      : "border-zinc-800 border-l-zinc-600";

  return (
    <div className={`bg-zinc-900 border border-l-4 rounded-md px-4 py-4 flex items-center gap-4 transition-colors ${borderColor}`}>
      <span className={`text-xl w-7 text-center flex-shrink-0 ${syncKnown ? synced ? "text-green-400" : "text-yellow-400" : "text-zinc-400"}`}>
        {icon}
      </span>

      <div className="flex-1 min-w-0">
        <p className="text-zinc-100 font-mono text-sm font-semibold truncate">{serviceName}</p>
        <p className={`font-mono text-xs truncate ml-2 ${confirmingDelete ? "text-red-400" : "text-zinc-400"}`}>
          {confirmingDelete
            ? "Delete this account?"
            : dateLabel
              ? <>{username}<span className="text-zinc-600"> · {dateLabel}</span></>
              : username}
        </p>
      </div>

      {confirmingDelete ? (
        <div className="flex items-center gap-1 flex-shrink-0">
          <button
            onClick={() => onDelete(id)}
            className="text-red-400 hover:text-red-300 bg-red-500/10 hover:bg-red-500/20 border border-red-500/40 font-mono text-xs px-2 py-1 rounded transition-colors"
          >
            CONFIRM
          </button>
          <button
            onClick={() => setConfirmingDelete(false)}
            className="text-zinc-400 hover:text-zinc-200 border border-zinc-700 hover:border-zinc-500 font-mono text-xs px-2 py-1 rounded transition-colors"
          >
            CANCEL
          </button>
        </div>
      ) : (
        <div className="flex items-center gap-1 flex-shrink-0">
          {syncKnown ? (
            synced ? (
              <span className="bg-green-500/10 text-green-400 border border-green-500/30 px-2 py-0.5 rounded text-xs font-mono">
                SYNCED
              </span>
            ) : (
              <span className="bg-yellow-400/10 text-yellow-400 border border-yellow-400/30 px-2 py-0.5 rounded text-xs font-mono">
                SYNC ↑
              </span>
            )
          ) : (
            <span className="bg-zinc-800 text-zinc-500 border border-zinc-700 px-2 py-0.5 rounded text-xs font-mono">
              SECURE
            </span>
          )}
          <button
            onClick={() => onEdit(id)}
            className="text-zinc-500 hover:text-zinc-200 border border-zinc-700 hover:border-zinc-500 font-mono text-xs px-2 py-1 rounded transition-colors"
          >
            EDIT
          </button>
          <button
            onClick={() => setConfirmingDelete(true)}
            className="text-zinc-500 hover:text-red-400 border border-zinc-700 hover:border-red-500/50 font-mono text-xs px-2 py-1 rounded transition-colors"
          >
            DEL
          </button>
        </div>
      )}
    </div>
  );
}
