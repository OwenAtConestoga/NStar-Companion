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

  if (canSync) {
    buttonLabel = "INITIATE SECURE SYNC >";
  } else if (waiting) {
    buttonLabel = "WAITING FOR DEVICE PAIRING...";
    hintLine = "// Device connected — waiting for PAIR key from device";
  } else {
    buttonLabel = "NO DEVICE CONNECTED";
    hintLine = "// Connect a NorthStar device via USB to enable sync";
  }

  return (
    <div className="flex flex-col gap-2 px-6 py-4 border-t border-zinc-800 flex-shrink-0">
      <div className="flex items-center gap-3">
        <button
          onClick={onInitiateSync}
          disabled={!canSync}
          className={`flex-1 font-bold font-mono px-6 py-3 rounded transition-colors
            ${canSync
              ? "bg-green-500 hover:bg-green-400 text-black"
              : waiting
              ? "bg-zinc-800 text-yellow-600 border border-yellow-600/30 cursor-not-allowed"
              : "bg-zinc-800 text-zinc-600 border border-zinc-700 cursor-not-allowed"
            }`}
        >
          {buttonLabel}
        </button>
        <button
          onClick={onAddNew}
          className="border border-zinc-700 text-zinc-400 hover:text-zinc-200 hover:border-zinc-500 font-mono px-4 py-3 rounded transition-colors"
        >
          + Add New
        </button>
      </div>
      {hintLine && (
        <p className="text-zinc-600 font-mono text-xs text-center">{hintLine}</p>
      )}
    </div>
  );
}
