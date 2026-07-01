import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';
import AsyncStorage from '@react-native-async-storage/async-storage';

type ThemeMode = 'light' | 'dark' | 'system';

interface SettingsState {
  themeMode:              ThemeMode;
  notifStreak:            boolean;
  notifMissions:          boolean;
  notifDuel:              boolean;
  setThemeMode:           (mode: ThemeMode) => void;
  setNotifStreak:         (val: boolean) => void;
  setNotifMissions:       (val: boolean) => void;
  setNotifDuel:           (val: boolean) => void;
}

export const useSettingsStore = create<SettingsState>()(
  persist(
    (set) => ({
      themeMode:     'system',
      notifStreak:   true,
      notifMissions: true,
      notifDuel:     true,

      setThemeMode:     (mode) => set({ themeMode: mode }),
      setNotifStreak:   (val)  => set({ notifStreak: val }),
      setNotifMissions: (val)  => set({ notifMissions: val }),
      setNotifDuel:     (val)  => set({ notifDuel: val }),
    }),
    {
      name:    'cn-settings',
      storage: createJSONStorage(() => AsyncStorage),
    }
  )
);
