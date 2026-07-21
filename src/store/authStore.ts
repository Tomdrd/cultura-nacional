import { create } from 'zustand';
import { Session, User } from '@supabase/supabase-js';
import { supabase } from '../lib/supabase';

interface AuthState {
  session:       Session | null;
  user:          User    | null;
  loading:       boolean;
  profileLoading: boolean;
  cityNatalId:   string | null | undefined;
  isPasswordRecovery: boolean;
  setSession:    (session: Session | null) => void;
  setCityNatalId:(id: string | null) => void;
  setIsPasswordRecovery: (value: boolean) => void;
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
  isPasswordRecovery: false,

  setSession: (session) =>
    set({ session, user: session?.user ?? null }),

  setCityNatalId: (id) => set({ cityNatalId: id }),

  setIsPasswordRecovery: (value) => set({ isPasswordRecovery: value }),

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
      const previousUserId = get().user?.id ?? null;
      set({ session, user: newUser });
      if (_event === 'PASSWORD_RECOVERY') {
        set({ isPasswordRecovery: true });
      }
      if (_event === 'SIGNED_OUT') {
        set({ isPasswordRecovery: false });
      }

      if (!newUser) {
        set({ cityNatalId: null, profileLoading: false });
        return;
      }

      // O Supabase dispara este listener a cada evento de auth, inclusive
      // TOKEN_REFRESHED — que roda automaticamente sempre que a aba/janela
      // recupera o foco (comportamento padrão do supabase-js na web, não é
      // bug do app). Sem esta checagem, o refetch abaixo alternava
      // profileLoading true→false pro MESMO usuário a cada troca de aba, e o
      // RootNavigator desmontava o NavigationContainer inteiro nesse
      // intervalo (ver `if (loading || (session && profileLoading))`),
      // perdendo o histórico de navegação — o botão de voltar parava de
      // funcionar em qualquer tela. Ver docs/incidents/2026-07-21-profileLoading-desmonta-navegacao.md
      const userChanged = newUser.id !== previousUserId;
      if (!userChanged && !get().profileLoading) {
        return;
      }

      set({ profileLoading: true });
      const { data: profile } = await supabase
        .from('profiles')
        .select('city_natal_id')
        .eq('id', newUser.id)
        .single();
      set({ cityNatalId: profile?.city_natal_id ?? null, profileLoading: false });
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
