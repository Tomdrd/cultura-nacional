import React, { useEffect } from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { RootNavigator } from './src/navigation/RootNavigator';
import {
  requestNotificationPermission,
  scheduleStreakReminder,
  scheduleMissionsReminder,
} from './src/lib/notifications';
import { useSettingsStore } from './src/store/settingsStore';

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 1000 * 60 * 5,
      retry: 2,
    },
  },
});

function AppContent() {
  const { notifStreak, notifMissions } = useSettingsStore();

  useEffect(() => {
    async function initNotifications() {
      const granted = await requestNotificationPermission();
      if (!granted) return;
      await Promise.all([
        scheduleStreakReminder(notifStreak),
        scheduleMissionsReminder(notifMissions),
      ]);
    }
    initNotifications();
  }, []);

  return <RootNavigator />;
}

export default function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <AppContent />
    </QueryClientProvider>
  );
}
