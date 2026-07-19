import React, { useEffect, useState } from 'react';
import { NavigationContainer, LinkingOptions } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { useAuthStore } from '../store/authStore';
import { AuthNavigator } from './AuthNavigator';
import { AppNavigator } from './AppNavigator';
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
      Auth: {
        screens: {
          ResetPassword: 'auth/reset-password',
          Login: 'auth/callback',
        },
      },
      App: {
        screens: {
          HomeTabs: '',
          PublicProfile: ':slug', // URL amigável: /tom → PublicProfile com slug="tom"
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
      <Stack.Navigator screenOptions={{ headerShown: false }}>
        {session && !isPasswordRecovery ? (
          <Stack.Screen name="App" component={AppNavigator} />
        ) : (
          <Stack.Screen name="Auth" component={AuthNavigator} />
        )}
      </Stack.Navigator>
    </NavigationContainer>
  );
}
