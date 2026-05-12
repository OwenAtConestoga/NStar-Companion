"use client";

import ProgressRing from "@/components/ui/ProgressRing";
import { SyncState } from "@/hooks/useSerialDevice";

interface TransferModalProps {
  syncState: SyncState;
  onClose: () => void;
}

export default function TransferModal({ syncState, onClose }: TransferModalProps) {
  const { phase, progress, statusLine, error } = syncState;

  const isDone  = phase === "done";
  const isError = phase === "error";
  const isActive = phase === "encrypting" || phase === "sending";

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm">
      <div className="bg-zinc-900 border border-zinc-800 rounded-xl max-w-md w-full mx-4 p-8 flex flex-col items-center gap-6">

        {/* Header */}
        <div className="text-center">
          <p className="text-green-400 font-mono text-xs tracking-widest uppercase mb-1">
            {isDone ? "// Transfer Complete" : isError ? "// Transfer Failed" : "// Secure Data Transfer"}
          </p>
          <h2 className="text-zinc-100 font-mono text-lg font-bold">
            NorthStar Hardware Sync
          </h2>
        </div>

        {/* Transfer beam */}
        <div className="flex items-center gap-2 w-full">
          <div className="flex flex-col items-center gap-1 flex-shrink-0">
            <span className="text-zinc-400 text-2xl">⬜</span>
            <span className="text-zinc-500 font-mono text-xs">PC</span>
          </div>
          <div
            className={`flex-1 h-0.5 ${
              isError
                ? "bg-red-500/40"
                : isDone
                ? "bg-green-500"
                : "bg-gradient-to-r from-green-500/20 via-green-500 to-green-500/20 animate-pulse"
            }`}
          />
          <div className="flex flex-col items-center gap-1 flex-shrink-0">
            <span className="text-2xl">{isError ? "⚠" : "🔒"}</span>
            <span className="text-zinc-500 font-mono text-xs">ENC</span>
          </div>
          <div
            className={`flex-1 h-0.5 ${
              isError
                ? "bg-red-500/40"
                : isDone
                ? "bg-green-500"
                : "bg-gradient-to-r from-green-500/20 via-green-500 to-green-500/20 animate-pulse"
            }`}
          />
          <div className="flex flex-col items-center gap-1 flex-shrink-0">
            <span className={`text-2xl ${isDone ? "text-green-400" : "text-zinc-400"}`}>▭</span>
            <span className="text-zinc-500 font-mono text-xs">NSA</span>
          </div>
        </div>

        {/* Progress ring */}
        <div className="flex flex-col items-center gap-2">
          <ProgressRing progress={progress} />
          <p className={`font-mono text-xs ${isError ? "text-red-400" : isDone ? "text-green-400" : "text-zinc-400"}`}>
            {statusLine || "// Initializing..."}
          </p>
        </div>

        {/* Error detail */}
        {isError && error && (
          <div className="bg-red-950/40 border border-red-500/30 rounded px-4 py-3 w-full">
            <p className="text-red-400 font-mono text-xs text-center">{error}</p>
          </div>
        )}

        {/* Protocol box — only shown while active */}
        {isActive && (
          <div className="bg-zinc-950 border border-zinc-800 rounded px-4 py-3 w-full">
            <p className="text-zinc-500 font-mono text-xs text-center leading-relaxed">
              Protocol: AES-256-GCM // Zero-Knowledge Tunnel Active.
              <br />
              <span className="text-yellow-500/70">Do not unplug the device.</span>
            </p>
          </div>
        )}

        {/* Done confirmation */}
        {isDone && (
          <div className="bg-green-500/10 border border-green-500/30 rounded px-4 py-3 w-full">
            <p className="text-green-400 font-mono text-xs text-center">
              Encrypted payload stored on device. Safe to unplug.
            </p>
          </div>
        )}

        {/* Action button */}
        {(isDone || isError) ? (
          <button
            onClick={onClose}
            className={`font-mono px-8 py-2 rounded transition-colors ${
              isDone
                ? "bg-green-500 hover:bg-green-400 text-black font-bold"
                : "border border-red-500/50 hover:border-red-400 text-red-400 hover:text-red-300"
            }`}
          >
            {isDone ? "DONE" : "CLOSE"}
          </button>
        ) : (
          <button
            disabled
            className="border border-zinc-700 text-zinc-600 font-mono px-6 py-2 rounded cursor-not-allowed"
          >
            Syncing...
          </button>
        )}
      </div>
    </div>
  );
}
