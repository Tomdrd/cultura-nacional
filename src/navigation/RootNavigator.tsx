import React, { useEffect, useState } from 'react';
import { NavigationContainer, LinkingOptions } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { useAuthStore } from '../store/authStore';
import { AuthNavigator } from './AuthNavigator';
import { AppNavigator } from './AppNavigator';
import { PublicProfileScreen } from '../screens/profile/PublicProfileScreen';
import { useTheme } from '../hooks/useTheme';
import { ActivityIndicator, View, Platform, Linking } from 'react-native';
import { supabase } from '../lib/supabase';

const Stack = createNativeStackNavigator();

const linking: LinkingOptions<any> = {
  prefixes: [
    'culturanacional://',
    'https://culturanacional.com.br',
    'https://www.culturanacional.com.br',
    'https://cultura-nacional.vercel.app',
  ],
  config: {
    screens: {
      // Sempre acessível, com ou sem sessão ativa — ver docs/DECISIONS.md
      // (2026-07-21): antes vivia dentro de App.screens, então sumia da
      // árvore de navegação (e caía em auth/callback) pra quem não estava
      // logado, quebrando todo link de perfil compartilhado.
      PublicProfile: ':slug', // URL amigável: /tom → PublicProfile com slug="tom"
      Auth: {
        screens: {
          ResetPassword: 'auth/reset-password',
          Login: 'auth/callback',
          Register: 'cadastro',
        },
      },
      App: {
        screens: {
          HomeTabs: {
            screens: {
              Home: '',
              Ranking: 'ranking',
              Notifications: 'notificacoes',
              Settings: 'configuracoes',
            },
          },
          AppEntry: 'app', // rota reservada p/ links externos (ex: CTA da landing page)
          Estados: 'estados',
          Categorias: 'categorias',
          Musica: 'musica',
          CityQuiz: 'quiz-cidade',
          Quiz: 'quiz',
          Duel: 'duelo',
          Subscription: 'assinatura',
          Missions: 'missoes',
          Achievements: 'conquistas',
          CidadeSetup: 'configurar-cidade',
          Profile: 'perfil',
          ViralMode: 'modo-viral',
          FollowList: 'seguidores',
        },
      },
    },
  },
};

export function RootNavigator() {
  const { session, loading, profileLoading, init, isPasswordRecovery } = useAuthStore();
  const { colors } = useTheme();
  const navigationRef = React.useRef<any>(null);
  const [navReady, setNavReady] = useState(false);

  useEffect(() => { init(); }, []);

  useEffect(() => {
    if (navReady && isPasswordRecovery) {
      navigationRef.current?.navigate('Auth', { screen: 'ResetPassword' });
    }
  }, [isPasswordRecovery, navReady]);

  useEffect(() => {
    async function handleDeepLink(url: string) {
      if (!url) return;
      if (Platform.OS === 'web') {
        if (url.includes('type=recovery')) {
          const { data: { subscription } } = supabase.auth.onAuthStateChange((event) => {
            if (event === 'PASSWORD_RECOVERY') {
              setTimeout(() => {
                navigationRef.current?.navigate('Auth', { screen: 'ResetPassword' });
              }, 300);
              subscription.unsubscribe();
            }
          });
        }
        return;
      }
      if (url.includes('auth/reset-password') || url.includes('type=recovery')) {
        const { data } = await supabase.auth.getSession();
        if (data.session) {
          navigationRef.current?.navigate('Auth', { screen: 'ResetPassword' });
        } else {
          const { data: { subscription } } = supabase.auth.onAuthStateChange((event) => {
            if (event === 'PASSWORD_RECOVERY') {
              navigationRef.current?.navigate('Auth', { screen: 'ResetPassword' });
              subscription.unsubscribe();
            }
          });
        }
      }
    }

    Linking.getInitialURL().then(url => { if (url) handleDeepLink(url); });
    const sub = Linking.addEventListener('url', ({ url }) => handleDeepLink(url));
    return () => sub.remove();
  }, []);

  if (loading || (session && profileLoading)) {
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: colors.background }}>
        <ActivityIndicator color={colors.primary} size="large" />
      </View>
    );
  }

  return (
    <NavigationContainer ref={navigationRef} linking={linking} onReady={() => setNavReady(true)}>
      <Stack.Navigator
        screenOptions={{ headerShown: false }}
        // Sem isso, toda vez que "App"/"Auth" trocam de lugar como filho
        // condicional (login, logout, ou chegada direta numa URL do branch
        // que ainda não está montado — ex: '/app' deslogado, ou
        // '/auth/callback' já com sessão pronta), o React Navigation não
        // acha o nome de rota antigo entre as screens registradas e recria
        // o estado a partir de routeNames[0] — que é 'PublicProfile', o
        // primeiro Stack.Screen declarado abaixo. Como a URL dele é o
        // catch-all ':slug' e não há slug nenhum nesse fallback, a barra de
        // endereço vira literalmente '/undefined'. Fixando o
        // initialRouteName pro branch certo (App/Auth) garante que esse
        // fallback caia no lugar certo em vez de esbarrar no PublicProfile.
        initialRouteName={session && !isPasswordRecovery ? 'App' : 'Auth'}
      >
        <Stack.Screen name="PublicProfile" component={PublicProfileScreen} />
        {session && !isPasswordRecovery ? (
          <Stack.Screen name="App" component={AppNavigator} />
        ) : (
          <Stack.Screen name="Auth" component={AuthNavigator} />
        )}
      </Stack.Navigator>
    </NavigationContainer>
  );
}
