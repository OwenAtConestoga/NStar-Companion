"use client";

import { useState, useCallback } from "react";
import Dashboard from "@/components/layout/Dashboard";
import TransferModal from "@/components/device/TransferModal";
import AddCredentialModal from "@/components/vault/AddCredentialModal";
import UnlockScreen from "@/components/auth/UnlockScreen";
import ProfileSelect from "@/components/auth/ProfileSelect";
import ChangePasswordModal from "@/components/auth/ChangePasswordModal";
import PasswordReadyModal from "@/components/device/PasswordReadyModal";
import type { Credential } from "@/types/credential";
import { useSerialDevice } from "@/hooks/useSerialDevice";
import { useVaultStorage } from "@/hooks/useVaultStorage";
import { useProfiles } from "@/hooks/useProfiles";
import { useEffect } from "react";

export default function VaultPage() {
  const { profiles, activeProfile, loaded: profilesLoaded, createProfile, selectProfile, deleteProfile } = useProfiles();
  const [showProfileSelect, setShowProfileSelect] = useState(false);
  const [showChangePwd, setShowChangePwd]         = useState(false);

  const {
    isSupported, isConnected, isPaired, syncState, lastSync,
    deviceSelectedIdx, connect, disconnect, syncCredentials, resetSync, clearDeviceSelect,
  } = useSerialDevice();

  // Only mount the vault hook once a profile is selected
  const profileId = activeProfile?.id ?? "";

  const {
    status, credentials, unlockError,
    createVault, unlock, saveCredentials, changePassword, lock,
  } = useVaultStorage(profileId || "default");

  const [isTransferring, setIsTransferring]       = useState(false);
  const [isAddingNew, setIsAddingNew]             = useState(false);
  const [editingCredential, setEditingCredential] = useState<Credential | null>(null);
  const [selectedCredential, setSelectedCredential] = useState<Credential | null>(null);

  // Device SELECT → show password modal
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

  const handleLock = useCallback(() => {
    lock();
    setShowProfileSelect(true);
  }, [lock]);

  const handleSwitchProfile = useCallback(() => {
    lock();
    setShowProfileSelect(true);
  }, [lock]);

  // ── Profile select screen ───────────────────────────────────────────────────

  // Wait for localStorage read before deciding which screen to show
  if (!profilesLoaded) return null;

  const needsProfileSelect = profiles.length === 0 || !activeProfile || showProfileSelect;

  if (needsProfileSelect) {
    return (
      <ProfileSelect
        profiles={profiles}
        onSelect={(id) => { selectProfile(id); setShowProfileSelect(false); }}
        onCreate={(name) => { createProfile(name); setShowProfileSelect(false); }}
        onDelete={deleteProfile}
      />
    );
  }

  // ── Vault unlock screens ────────────────────────────────────────────────────

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
        profileName={activeProfile.name}
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
        onLock={handleLock}
        onSwitchProfile={handleSwitchProfile}
        onChangePassword={() => setShowChangePwd(true)}
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

      {selectedCredential && (
        <PasswordReadyModal
          credential={selectedCredential}
          onDismiss={() => setSelectedCredential(null)}
        />
      )}

      {showChangePwd && (
        <ChangePasswordModal
          onSave={changePassword}
          onClose={() => setShowChangePwd(false)}
        />
      )}
    </>
  );
}
