import { create } from 'zustand';
import { Session, User } from '@supabase/supabase-js';
import { supabase } from '../lib/supabase';

interface AuthState {
  session:       Session | null;
  user:          User    | null;
  loading:       boolean;
  profileLoading: boolean;
  cityNatalId:   string | null | undefined;
  setSession:    (session: Session | null) => void;
  setCityNatalId:(id: string | null) => void;
  signOut:       () => Promise<void>;
  init:          () => Promise<void>;
  cleanup:       () => void;
  loadProfile:   () => Promise<void>;
}

let authSubscription: { unsubscribe: () => void } | null = null;

export const useAuthStore = create<AuthState>((set, get) => ({
  session:     null,
  user:        null,
  loading:     true,
  profileLoading: true,
  cityNatalId: undefined,

  setSession: (session) =>
    set({ session, user: session?.user ?? null }),

  setCityNatalId: (id) => set({ cityNatalId: id }),

  loadProfile: async () => {
    const { user } = get();
    if (!user) return;
    set({ profileLoading: true });
    const { data } = await supabase
      .from('profiles')
      .select('city_natal_id')
      .eq('id', user.id)
      .single();
    set({ cityNatalId: data?.city_natal_id ?? null, profileLoading: false });
  },

  signOut: async () => {
    await supabase.auth.signOut();
    set({ session: null, user: null, cityNatalId: null });
  },

  init: async () => {
    if (authSubscription) {
      authSubscription.unsubscribe();
      authSubscription = null;
    }
    const { data } = await supabase.auth.getSession();
    const user = data.session?.user ?? null;
    set({ session: data.session, user, loading: false });

    if (user) {
      const { data: profile } = await supabase
        .from('profiles')
        .select('city_natal_id')
        .eq('id', user.id)
        .single();
      set({ cityNatalId: profile?.city_natal_id ?? null, profileLoading: false });
    } else {
      set({ profileLoading: false });
    }

    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (_event, session) => {
      const newUser = session?.user ?? null;
      set({ session, user: newUser });
      if (newUser) {
        set({ profileLoading: true });
        const { data: profile } = await supabase
          .from('profiles')
          .select('city_natal_id')
          .eq('id', newUser.id)
          .single();
        set({ cityNatalId: profile?.city_natal_id ?? null, profileLoading: false });
      } else {
        set({ cityNatalId: null, profileLoading: false });
      }
    });
    authSubscription = subscription;
  },

  cleanup: () => {
    if (authSubscription) {
      authSubscription.unsubscribe();
      authSubscription = null;
    }
  },
}));
