"use client";

import { useState } from "react";
import { Credential } from "@/types/credential";
import type { LastSync } from "@/hooks/useSerialDevice";
import TopBar from "@/components/layout/TopBar";
import CredentialList from "@/components/vault/CredentialList";
import BottomActionBar from "@/components/layout/BottomActionBar";
import DevicePanel from "@/components/device/DevicePanel";

interface DashboardProps {
  credentials: Credential[];
  profileName: string;
  onInitiateSync: () => void;
  onAddNew: () => void;
  onEdit: (id: string) => void;
  onDelete: (id: string) => void;
  isConnected: boolean;
  isPaired: boolean;
  isSupported: boolean;
  onConnect: () => void;
  onDisconnect: () => void;
  onLock: () => void;
  onSwitchProfile: () => void;
  lastSync: LastSync | null;
}

export default function Dashboard({
  credentials,
  profileName,
  onInitiateSync,
  onAddNew,
  onEdit,
  onDelete,
  isConnected,
  isPaired,
  isSupported,
  onConnect,
  onDisconnect,
  onLock,
  onSwitchProfile,
  lastSync,
}: DashboardProps) {
  const [panelCollapsed, setPanelCollapsed] = useState(false);

  return (
    <div className="flex flex-col h-screen bg-zinc-950">
      <TopBar
        isConnected={isConnected}
        isPaired={isPaired}
        isSupported={isSupported}
        profileName={profileName}
        onConnect={onConnect}
        onDisconnect={onDisconnect}
        onLock={onLock}
        onSwitchProfile={onSwitchProfile}
      />

      {!isSupported && (
        <div className="flex items-center gap-3 px-6 py-2 bg-yellow-500/5 border-b border-yellow-500/20 flex-shrink-0">
          <span className="text-yellow-400 font-mono text-xs">⚠</span>
          <p className="text-yellow-400/80 font-mono text-xs">
            Device sync requires Chrome or Edge on desktop — vault features work normally.
          </p>
        </div>
      )}

      <div className="flex flex-1 overflow-hidden">

        {/* Left: credential list + action bar */}
        <div className="flex flex-col flex-1 min-w-0 overflow-hidden">
          <CredentialList credentials={credentials} onEdit={onEdit} onDelete={onDelete} lastSyncAt={lastSync?.at} />
          <BottomActionBar
            onInitiateSync={onInitiateSync}
            onAddNew={onAddNew}
            deviceConnected={isConnected}
            devicePaired={isPaired}
          />
        </div>

        {/* Right: device panel — collapsible */}
        {panelCollapsed ? (
          <button
            onClick={() => setPanelCollapsed(false)}
            title="Show device panel"
            className="hidden lg:flex flex-col items-center justify-center gap-4 w-14 border-l-2 border-green-500/40 hover:border-green-400 bg-zinc-900 hover:bg-zinc-800 text-green-500 hover:text-green-400 transition-colors flex-shrink-0"
          >
            <span className="text-2xl leading-none font-bold">‹</span>
            <span className="[writing-mode:vertical-rl] font-mono text-sm tracking-widest font-bold">// DEVICE</span>
          </button>
        ) : (
          <div className="hidden lg:flex lg:flex-col w-1/4 min-w-72 max-w-96 border-l border-zinc-800 flex-shrink-0 overflow-hidden relative">
            <button
              onClick={() => setPanelCollapsed(true)}
              title="Collapse device panel"
              className="absolute top-4 right-4 z-10 text-green-500 hover:text-green-400 border-2 border-green-500/50 hover:border-green-400 bg-zinc-900 rounded-lg px-3 py-2 text-lg font-bold leading-none transition-colors"
            >
              ›
            </button>
            <DevicePanel
              credentials={credentials}
              isConnected={isConnected}
              isPaired={isPaired}
              onSync={onInitiateSync}
              lastSync={lastSync}
            />
          </div>
        )}

      </div>
    </div>
  );
}
