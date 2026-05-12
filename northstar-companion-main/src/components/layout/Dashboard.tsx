import { Credential } from "@/types/credential";
import type { LastSync } from "@/hooks/useSerialDevice";
import TopBar from "@/components/layout/TopBar";
import CredentialList from "@/components/vault/CredentialList";
import BottomActionBar from "@/components/layout/BottomActionBar";
import DevicePanel from "@/components/device/DevicePanel";

interface DashboardProps {
  credentials: Credential[];
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
  lastSync: LastSync | null;
}

export default function Dashboard({
  credentials,
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
  lastSync,
}: DashboardProps) {
  return (
    <div className="flex flex-col h-screen bg-zinc-950">
      <TopBar
        isConnected={isConnected}
        isPaired={isPaired}
        isSupported={isSupported}
        onConnect={onConnect}
        onDisconnect={onDisconnect}
        onLock={onLock}
      />

      {/* Body — single column on small screens, two columns on xl+ */}
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

        {/* Right: device panel — visible on lg screens (≥1024px) */}
        <div className="hidden lg:flex lg:flex-col w-1/5 min-w-72 border-l border-zinc-800 flex-shrink-0 overflow-hidden">
          <DevicePanel
            credentials={credentials}
            isConnected={isConnected}
            isPaired={isPaired}
            onConnect={onConnect}
            onSync={onInitiateSync}
            lastSync={lastSync}
          />
        </div>

      </div>
    </div>
  );
}
