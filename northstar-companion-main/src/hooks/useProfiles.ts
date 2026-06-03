"use client";

import { useState, useCallback, useEffect } from "react";

export interface Profile {
  id: string;
  name: string;
  createdAt: string;
}

const PROFILES_KEY = "nsa-profiles";
const ACTIVE_KEY   = "nsa-active-profile";

export function useProfiles() {
  const [profiles, setProfiles] = useState<Profile[]>([]);
  const [activeId, setActiveId] = useState<string | null>(null);
  const [loaded,   setLoaded]   = useState(false);

  // On mount: read profile list + last-used profile id from localStorage
  useEffect(() => {
    try {
      const raw = localStorage.getItem(PROFILES_KEY);
      const list: Profile[] = raw ? JSON.parse(raw) : [];
      const saved = localStorage.getItem(ACTIVE_KEY);
      const validId = saved && list.some((p) => p.id === saved) ? saved : null;
      setProfiles(list);
      setActiveId(validId);
    } catch {
      setProfiles([]);
      setActiveId(null);
    } finally {
      setLoaded(true);
    }
  }, []);

  const persist = useCallback((next: Profile[]) => {
    localStorage.setItem(PROFILES_KEY, JSON.stringify(next));
    setProfiles(next);
  }, []);

  const createProfile = useCallback((name: string): Profile => {
    const profile: Profile = {
      id: `p-${Date.now()}`,
      name: name.trim(),
      createdAt: new Date().toISOString(),
    };
    const raw = localStorage.getItem(PROFILES_KEY);
    const existing: Profile[] = raw ? JSON.parse(raw) : [];
    persist([...existing, profile]);
    localStorage.setItem(ACTIVE_KEY, profile.id);
    setActiveId(profile.id);
    return profile;
  }, [persist]);

  const selectProfile = useCallback((id: string) => {
    localStorage.setItem(ACTIVE_KEY, id);
    setActiveId(id);
  }, []);

  const deleteProfile = useCallback((id: string) => {
    localStorage.removeItem(`nsa-vault-${id}`);
    sessionStorage.removeItem(`nsa-session-${id}`);
    const raw = localStorage.getItem(PROFILES_KEY);
    const existing: Profile[] = raw ? JSON.parse(raw) : [];
    const next = existing.filter((p) => p.id !== id);
    persist(next);
    setActiveId((cur) => {
      if (cur !== id) return cur;
      // deleted the active one — clear it
      localStorage.removeItem(ACTIVE_KEY);
      return null;
    });
  }, [persist]);

  const activeProfile = profiles.find((p) => p.id === activeId) ?? null;

  return { profiles, activeProfile, loaded, createProfile, selectProfile, deleteProfile };
}
