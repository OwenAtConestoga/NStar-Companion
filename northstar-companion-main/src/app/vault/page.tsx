"use client";

import { useState, useEffect, useCallback } from "react";
import Dashboard from "@/components/layout/Dashboard";
import TransferModal from "@/components/device/TransferModal";
import AddCredentialModal from "@/components/vault/AddCredentialModal";
import UnlockScreen from "@/components/auth/UnlockScreen";
import PasswordReadyModal from "@/components/device/PasswordReadyModal";
import type { Credential } from "@/types/credential";
import { useSerialDevice } from "@/hooks/useSerialDevice";
import { useVaultStorage } from "@/hooks/useVaultStorage";

export default function VaultPage() {
  const {
    isSupported,
    isConnected,
    isPaired,
    syncState,
    lastSync,
    deviceSelectedIdx,
    connect,
    disconnect,
    syncCredentials,
    resetSync,
    clearDeviceSelect,
  } = useSerialDevice();

  const {
    status,
    credentials,
    unlockError,
    createVault,
    unlock,
    saveCredentials,
    lock,
  } = useVaultStorage();

  const [isTransferring, setIsTransferring]       = useState(false);
  const [isAddingNew, setIsAddingNew]             = useState(false);
  const [editingCredential, setEditingCredential] = useState<Credential | null>(null);
  const [selectedCredential, setSelectedCredential] = useState<Credential | null>(null);

  // ── Device SELECT → show password modal ────────────────────────────────────
  // NOTE: we do NOT auto-copy to clipboard here because navigator.clipboard.writeText()
  // requires the document to have focus. When the user has clicked away to another app
  // (to paste), the tab is unfocused and the write silently fails on macOS.
  // Instead we surface a modal with a COPY button — that user gesture always works.
  useEffect(() => {
    if (deviceSelectedIdx === null || status !== "unlocked") return;
    const cred = credentials[deviceSelectedIdx];
    clearDeviceSelect();
    if (cred) setSelectedCredential(cred);
  }, [deviceSelectedIdx, credentials, status, clearDeviceSelect]);

  // ── Credential mutations ────────────────────────────────────────────────────

  const handleAdd = useCallback(async (cred: Omit<Credential, "id" | "createdAt">) => {
    await saveCredentials([...credentials, { ...cred, id: String(Date.now()), createdAt: new Date().toISOString() }]);
    setIsAddingNew(false);
  }, [credentials, saveCredentials]);

  const handleDelete = useCallback(async (id: string) => {
    await saveCredentials(credentials.filter((c) => c.id !== id));
  }, [credentials, saveCredentials]);

  const handleEditSave = useCallback(async (cred: Omit<Credential, "id" | "createdAt">) => {
    if (!editingCredential) return;
    await saveCredentials(
      credentials.map((c) => c.id === editingCredential.id ? { ...cred, id: c.id, createdAt: c.createdAt } : c)
    );
    setEditingCredential(null);
  }, [credentials, editingCredential, saveCredentials]);

  const handleInitiateSync = useCallback(() => {
    if (!isPaired) return;
    setIsTransferring(true);
    syncCredentials(credentials);
  }, [isPaired, credentials, syncCredentials]);

  const handleCloseTransfer = useCallback(() => {
    setIsTransferring(false);
    resetSync();
  }, [resetSync]);

  // ── Render unlock screens ───────────────────────────────────────────────────

  if (status === "loading") return null;

  if (status === "new") {
    return <UnlockScreen mode="new" error={unlockError} onSubmit={createVault} />;
  }

  if (status === "locked") {
    return <UnlockScreen mode="locked" error={unlockError} onSubmit={unlock} />;
  }

  // ── Vault unlocked ──────────────────────────────────────────────────────────

  return (
    <>
      <Dashboard
        credentials={credentials}
        onInitiateSync={handleInitiateSync}
        onAddNew={() => setIsAddingNew(true)}
        onDelete={handleDelete}
        onEdit={(id) => {
          const cred = credentials.find((c) => c.id === id);
          if (cred) setEditingCredential(cred);
        }}
        isConnected={isConnected}
        isPaired={isPaired}
        isSupported={isSupported}
        onConnect={connect}
        onDisconnect={disconnect}
        onLock={lock}
        lastSync={lastSync}
      />

      {isTransferring && (
        <TransferModal syncState={syncState} onClose={handleCloseTransfer} />
      )}

      {isAddingNew && (
        <AddCredentialModal onAdd={handleAdd} onCancel={() => setIsAddingNew(false)} />
      )}

      {editingCredential && (
        <AddCredentialModal
          initialValues={{
            serviceName: editingCredential.serviceName,
            username:    editingCredential.username,
            password:    editingCredential.password,
            icon:        editingCredential.icon,
          }}
          onAdd={handleEditSave}
          onCancel={() => setEditingCredential(null)}
        />
      )}

      {/* Password modal — shown when user selects account on device */}
      {selectedCredential && (
        <PasswordReadyModal
          credential={selectedCredential}
          onDismiss={() => setSelectedCredential(null)}
        />
      )}
    </>
  );
}
