import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';
import AsyncStorage from '@react-native-async-storage/async-storage';

type ThemeMode = 'light' | 'dark' | 'system';

interface SettingsState {
  themeMode:         ThemeMode;
  notifStreak:       boolean;
  notifMissions:     boolean;
  notifDuel:         boolean;
  audioNarration:    boolean;
  audioSfx:          boolean;
  quizTimer:         boolean;
  setThemeMode:      (mode: ThemeMode) => void;
  setNotifStreak:    (val: boolean) => void;
  setNotifMissions:  (val: boolean) => void;
  setNotifDuel:      (val: boolean) => void;
  setAudioNarration: (val: boolean) => void;
  setAudioSfx:       (val: boolean) => void;
  setQuizTimer:      (val: boolean) => void;
}

export const useSettingsStore = create<SettingsState>()(
  persist(
    (set) => ({
      themeMode:      'system',
      notifStreak:    true,
      notifMissions:  true,
      notifDuel:      true,
      audioNarration: true,
      audioSfx:       true,
      quizTimer:      false, // desativado por padrão
      setThemeMode:      (mode) => set({ themeMode: mode }),
      setNotifStreak:    (val)  => set({ notifStreak: val }),
      setNotifMissions:  (val)  => set({ notifMissions: val }),
      setNotifDuel:      (val)  => set({ notifDuel: val }),
      setAudioNarration: (val)  => set({ audioNarration: val }),
      setAudioSfx:       (val)  => set({ audioSfx: val }),
      setQuizTimer:      (val)  => set({ quizTimer: val }),
    }),
    {
      name:    'cn-settings',
      storage: createJSONStorage(() => AsyncStorage),
    }
  )
);
