"use client";

import { useState, useRef, useCallback, useEffect } from "react";
import { Credential } from "@/types/credential";

export type VaultStatus = "loading" | "new" | "locked" | "unlocked";

interface StoredVault {
  salt: string;    // base64 — 16-byte random salt
  payload: string; // "<iv_b64>:<ciphertext+tag_b64>"
}

interface SessionData {
  keyB64: string;
  expiresAt: number;
}

const PBKDF2_ITERATIONS = 100_000;
const SESSION_DURATION  = 30 * 60 * 1000;

const toB64 = (u8: Uint8Array): string =>
  btoa(String.fromCharCode(...u8));

const fromB64 = (s: string): Uint8Array =>
  new Uint8Array(Array.from(atob(s), (c) => c.charCodeAt(0)));

async function deriveKey(password: string, salt: Uint8Array): Promise<CryptoKey> {
  const baseKey = await crypto.subtle.importKey(
    "raw", new TextEncoder().encode(password), "PBKDF2", false, ["deriveKey"]
  );
  return crypto.subtle.deriveKey(
    { name: "PBKDF2", salt: salt as BufferSource, iterations: PBKDF2_ITERATIONS, hash: "SHA-256" },
    baseKey,
    { name: "AES-GCM", length: 256 },
    true,
    ["encrypt", "decrypt"]
  );
}

async function encryptJSON(data: unknown, key: CryptoKey): Promise<string> {
  const iv    = crypto.getRandomValues(new Uint8Array(12));
  const plain = new TextEncoder().encode(JSON.stringify(data));
  const cipher = await crypto.subtle.encrypt({ name: "AES-GCM", iv, tagLength: 128 }, key, plain);
  return toB64(iv) + ":" + toB64(new Uint8Array(cipher));
}

async function decryptJSON(payload: string, key: CryptoKey): Promise<unknown> {
  const [ivB64, dataB64] = payload.split(":");
  const plain = await crypto.subtle.decrypt(
    { name: "AES-GCM", iv: fromB64(ivB64) as BufferSource, tagLength: 128 },
    key,
    fromB64(dataB64) as BufferSource
  );
  return JSON.parse(new TextDecoder().decode(plain));
}

async function persistSession(key: CryptoKey, sessionKey: string) {
  const exported = await crypto.subtle.exportKey("raw", key);
  const session: SessionData = { keyB64: toB64(new Uint8Array(exported)), expiresAt: Date.now() + SESSION_DURATION };
  sessionStorage.setItem(sessionKey, JSON.stringify(session));
}

export function useVaultStorage(profileId: string) {
  const storageKey = `nsa-vault-${profileId}`;
  const sessionKey = `nsa-session-${profileId}`;

  const [status, setStatus]           = useState<VaultStatus>("loading");
  const [credentials, setCredentials] = useState<Credential[]>([]);
  const [unlockError, setUnlockError] = useState<string | null>(null);

  const keyRef  = useRef<CryptoKey | null>(null);
  const saltRef = useRef<Uint8Array | null>(null);

  useEffect(() => {
    async function init() {
      const raw = localStorage.getItem(storageKey);
      if (!raw) { setStatus("new"); return; }

      try {
        const sessionRaw = sessionStorage.getItem(sessionKey);
        if (sessionRaw) {
          const session: SessionData = JSON.parse(sessionRaw);
          if (Date.now() < session.expiresAt) {
            const key = await crypto.subtle.importKey(
              "raw", fromB64(session.keyB64) as BufferSource, { name: "AES-GCM" }, true, ["encrypt", "decrypt"]
            );
            const stored: StoredVault = JSON.parse(raw);
            const creds = (await decryptJSON(stored.payload, key)) as Credential[];
            keyRef.current  = key;
            saltRef.current = fromB64(stored.salt);
            setCredentials(creds);
            setStatus("unlocked");
            return;
          } else {
            sessionStorage.removeItem(sessionKey);
          }
        }
      } catch {
        sessionStorage.removeItem(sessionKey);
      }

      setStatus("locked");
    }
    init();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [profileId]);

  const createVault = useCallback(async (password: string) => {
    setUnlockError(null);
    try {
      const salt    = crypto.getRandomValues(new Uint8Array(16));
      const key     = await deriveKey(password, salt);
      const payload = await encryptJSON([], key);
      localStorage.setItem(storageKey, JSON.stringify({ salt: toB64(salt), payload }));
      keyRef.current  = key;
      saltRef.current = salt;
      await persistSession(key, sessionKey);
      setCredentials([]);
      setStatus("unlocked");
    } catch {
      setUnlockError("Failed to create vault. Please try again.");
    }
  }, [storageKey, sessionKey]);

  const unlock = useCallback(async (password: string) => {
    setUnlockError(null);
    try {
      const raw = localStorage.getItem(storageKey);
      if (!raw) { setStatus("new"); return; }
      const stored: StoredVault = JSON.parse(raw);
      const salt = fromB64(stored.salt);
      const key  = await deriveKey(password, salt);
      const creds = (await decryptJSON(stored.payload, key)) as Credential[];
      keyRef.current  = key;
      saltRef.current = salt;
      await persistSession(key, sessionKey);
      setCredentials(creds);
      setStatus("unlocked");
    } catch {
      setUnlockError("Incorrect password — please try again.");
    }
  }, [storageKey, sessionKey]);

  const saveCredentials = useCallback(async (creds: Credential[]) => {
    const key  = keyRef.current;
    const salt = saltRef.current;
    if (!key || !salt) return;
    const payload = await encryptJSON(creds, key);
    localStorage.setItem(storageKey, JSON.stringify({ salt: toB64(salt), payload }));
    await persistSession(key, sessionKey);
    setCredentials(creds);
  }, [storageKey, sessionKey]);

  const changePassword = useCallback(async (currentPwd: string, newPwd: string): Promise<string | null> => {
    try {
      const raw = localStorage.getItem(storageKey);
      if (!raw) return "No vault found.";
      const stored: StoredVault = JSON.parse(raw);
      const oldSalt = fromB64(stored.salt);
      const oldKey  = await deriveKey(currentPwd, oldSalt);
      // Verify current password by attempting decryption
      const creds = (await decryptJSON(stored.payload, oldKey)) as Credential[];
      // Re-encrypt with new password + new salt
      const newSalt = crypto.getRandomValues(new Uint8Array(16));
      const newKey  = await deriveKey(newPwd, newSalt);
      const payload = await encryptJSON(creds, newKey);
      localStorage.setItem(storageKey, JSON.stringify({ salt: toB64(newSalt), payload }));
      keyRef.current  = newKey;
      saltRef.current = newSalt;
      await persistSession(newKey, sessionKey);
      return null; // success
    } catch {
      return "Current password is incorrect.";
    }
  }, [storageKey, sessionKey]);

  const lock = useCallback(() => {
    keyRef.current  = null;
    saltRef.current = null;
    sessionStorage.removeItem(sessionKey);
    setCredentials([]);
    setStatus("locked");
  }, [sessionKey]);

  const wipeVault = useCallback(() => {
    localStorage.removeItem(storageKey);
    sessionStorage.removeItem(sessionKey);
    keyRef.current  = null;
    saltRef.current = null;
    setCredentials([]);
    setStatus("new");
  }, [storageKey, sessionKey]);

  const exportVault = useCallback((profileName: string) => {
    const raw = localStorage.getItem(storageKey);
    if (!raw) return;
    const backup = {
      version: "1",
      profile: profileName,
      vault: JSON.parse(raw),
      exportedAt: new Date().toISOString(),
    };
    const blob = new Blob([JSON.stringify(backup, null, 2)], { type: "application/json" });
    const url  = URL.createObjectURL(blob);
    const a    = document.createElement("a");
    a.href     = url;
    a.download = `nstar-${profileName.toLowerCase().replace(/\s+/g, "-")}-${new Date().toISOString().slice(0, 10)}.nstar`;
    a.click();
    URL.revokeObjectURL(url);
  }, [storageKey]);

  const importVault = useCallback(async (fileContent: string, password: string): Promise<string | null> => {
    try {
      const backup = JSON.parse(fileContent);
      if (!backup.vault?.salt || !backup.vault?.payload) return "Invalid backup file.";
      const stored: StoredVault = backup.vault;
      const salt = fromB64(stored.salt);
      const key  = await deriveKey(password, salt);
      const creds = (await decryptJSON(stored.payload, key)) as Credential[];
      localStorage.setItem(storageKey, JSON.stringify(stored));
      keyRef.current  = key;
      saltRef.current = salt;
      await persistSession(key, sessionKey);
      setCredentials(creds);
      setStatus("unlocked");
      return null;
    } catch {
      return "Could not decrypt backup — check the password and try again.";
    }
  }, [storageKey, sessionKey]);

  return { status, credentials, unlockError, createVault, unlock, saveCredentials, changePassword, lock, wipeVault, exportVault, importVault };
}
