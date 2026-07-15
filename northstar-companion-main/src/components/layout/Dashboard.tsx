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

        {/* Right: device panel */}
        <div className="hidden lg:flex lg:flex-col w-1/4 min-w-64 max-w-80 border-l border-zinc-800 flex-shrink-0 overflow-hidden">
          <DevicePanel
            credentials={credentials}
            isConnected={isConnected}
            isPaired={isPaired}
            onSync={onInitiateSync}
            lastSync={lastSync}
          />
        </div>

      </div>
    </div>
  );
}
