import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';

import type { Profile } from '@/src/models/profile';
import { fetchProfile, updateProfile as updateProfileApi } from '@/src/api/profile';
import { loadProfile, saveProfile } from '@/src/storage/profile-storage';

type ProfileContextValue = {
  profile: Profile | null;
  isLoading: boolean;
  updateProfile: (next: Profile) => Promise<void>;
  reload: () => Promise<void>;
};

const ProfileContext = createContext<ProfileContextValue | null>(null);

export function ProfileProvider({ children }: { children: React.ReactNode }) {
  const [profile, setProfile] = useState<Profile | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const reload = useCallback(async () => {
    setIsLoading(true);
    try {
      const loaded = await fetchProfile();
      const cached = await loadProfile();
      const merged = { ...loaded, photoUri: cached?.photoUri ?? loaded.photoUri };
      setProfile(merged);
      await saveProfile(merged);
    } catch {
      const cached = await loadProfile();
      setProfile(cached);
    }
    setIsLoading(false);
  }, []);

  useEffect(() => {
    void reload();
  }, [reload]);

  const updateProfile = useCallback(async (next: Profile) => {
    setProfile(next);
    try {
      const updated = await updateProfileApi(next);
      setProfile(updated);
      await saveProfile(updated);
    } catch {
      await saveProfile(next);
    }
  }, []);

  const value = useMemo(
    () => ({
      profile,
      isLoading,
      updateProfile,
      reload,
    }),
    [profile, isLoading, updateProfile, reload]
  );

  return <ProfileContext.Provider value={value}>{children}</ProfileContext.Provider>;
}

export function useProfile() {
  const ctx = useContext(ProfileContext);
  if (!ctx) {
    throw new Error('useProfile must be used within ProfileProvider');
  }
  return ctx;
}
