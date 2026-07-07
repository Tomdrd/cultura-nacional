import React, { useEffect } from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { useAuthStore } from '../store/authStore';
import { AuthNavigator } from './AuthNavigator';
import { AppNavigator } from './AppNavigator';
import { useTheme } from '../hooks/useTheme';
import { ActivityIndicator, View, Platform, Linking } from 'react-native';
import { supabase } from '../lib/supabase';

const Stack = createNativeStackNavigator();

const linking = {
  prefixes: ['culturanacional://', 'https://cultura-nacional.vercel.app'],
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
        },
      },
    },
  },
};

export function RootNavigator() {
  const { session, loading, profileLoading, init, isPasswordRecovery } = useAuthStore();
  const { colors } = useTheme();
  const navigationRef = React.useRef<any>(null);

  useEffect(() => { init(); }, []);

  useEffect(() => {
    if (isPasswordRecovery) {
      navigationRef.current?.navigate('Auth', { screen: 'ResetPassword' });
    }
  }, [isPasswordRecovery]);

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
    <NavigationContainer ref={navigationRef} linking={linking}>
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
