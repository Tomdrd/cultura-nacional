import React, { useEffect } from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { useAuthStore } from '../store/authStore';
import { AuthNavigator } from './AuthNavigator';
import { AppNavigator } from './AppNavigator';
import { useTheme } from '../hooks/useTheme';
import { ActivityIndicator, View, Platform } from 'react-native';
import { supabase } from '../lib/supabase';

const Stack = createNativeStackNavigator();

export function RootNavigator() {
  const { session, loading, init } = useAuthStore();
  const { colors } = useTheme();
  const navigationRef = React.useRef<any>(null);

  useEffect(() => { init(); }, []);

  useEffect(() => {
    if (Platform.OS !== 'web') return;
    const hash = window.location.hash;
    if (hash.includes('type=recovery')) {
      supabase.auth.onAuthStateChange((event, session) => {
        if (event === 'PASSWORD_RECOVERY') {
          setTimeout(() => {
            navigationRef.current?.navigate('Auth', { screen: 'ResetPassword' });
          }, 500);
        }
      });
    }
  }, []);

  if (loading) {
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: colors.background }}>
        <ActivityIndicator color={colors.primary} size="large" />
      </View>
    );
  }

  return (
    <NavigationContainer ref={navigationRef}>
      <Stack.Navigator screenOptions={{ headerShown: false }}>
        {session ? (
          <Stack.Screen name="App" component={AppNavigator} />
        ) : (
          <Stack.Screen name="Auth" component={AuthNavigator} />
        )}
      </Stack.Navigator>
    </NavigationContainer>
  );
}
