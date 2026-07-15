"use client";

interface BottomActionBarProps {
  onInitiateSync: () => void;
  onAddNew: () => void;
  deviceConnected: boolean;
  devicePaired: boolean;
}

export default function BottomActionBar({
  onInitiateSync,
  onAddNew,
  deviceConnected,
  devicePaired,
}: BottomActionBarProps) {
  const canSync  = deviceConnected && devicePaired;
  const waiting  = deviceConnected && !devicePaired;

  let buttonLabel: string;
  let hintLine: string | null = null;

  return (
    <div className="flex flex-col gap-2 px-4 sm:px-6 py-4 border-t border-zinc-800 flex-shrink-0">
      <div className="flex items-center gap-3">
        <button
          onClick={onInitiateSync}
          disabled={!canSync}
          className={`flex-1 min-w-0 font-bold font-mono px-4 py-3 rounded transition-colors truncate
            ${canSync
              ? "bg-green-500 hover:bg-green-400 text-black"
              : waiting
              ? "bg-zinc-800 text-yellow-600 border border-yellow-600/30 cursor-not-allowed"
              : "bg-zinc-800 text-zinc-600 border border-zinc-700 cursor-not-allowed"
            }`}
        >
          {canSync   ? "SYNC TO DEVICE >"
          : waiting  ? "WAITING FOR PAIRING..."
          :            "NO DEVICE CONNECTED"}
        </button>
        <button
          onClick={onAddNew}
          className="flex-shrink-0 border border-zinc-700 text-zinc-100 hover:text-green-400 hover:border-green-500/50 font-mono px-4 py-3 rounded transition-colors whitespace-nowrap"
        >
          + Add New
        </button>
      </div>
      {!canSync && (
        <p className="text-zinc-600 font-mono text-xs text-center truncate">
          {waiting
            ? "// Device connected — waiting for PAIR key"
            : "// Connect a NorthStar device via USB to sync"}
        </p>
      )}
    </div>
  );
}
