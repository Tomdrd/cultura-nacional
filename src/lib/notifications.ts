import * as Notifications from 'expo-notifications';
import { Platform } from 'react-native';

// Comportamento padrão ao receber notificação com app aberto
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge:  false,
  }),
});

/**
 * Solicita permissão e retorna true se concedida.
 */
export async function requestNotificationPermission(): Promise<boolean> {
  if (Platform.OS === 'android') {
    await Notifications.setNotificationChannelAsync('default', {
      name:       'Padrão',
      importance: Notifications.AndroidImportance.DEFAULT,
      vibrationPattern: [0, 250, 250, 250],
    });
  }

  const { status: existing } = await Notifications.getPermissionsAsync();
  if (existing === 'granted') return true;

  const { status } = await Notifications.requestPermissionsAsync();
  return status === 'granted';
}

/**
 * Agenda lembrete diário de streak.
 * Dispara todo dia às 20h se o usuário não tiver jogado.
 */
export async function scheduleStreakReminder(enabled: boolean) {
  await Notifications.cancelScheduledNotificationAsync('streak-reminder').catch(() => {});
  if (!enabled) return;

  await Notifications.scheduleNotificationAsync({
    identifier: 'streak-reminder',
    content: {
      title: '🔥 Não perca sua sequência!',
      body:  'Você ainda não jogou hoje. Mantenha seu streak no Cultura Nacional!',
      sound: true,
    },
    trigger: {
      type: Notifications.SchedulableTriggerInputTypes.DAILY,
      hour:   20,
      minute: 0,
    },
  });
}

/**
 * Agenda lembrete diário de missões.
 * Dispara todo dia às 8h.
 */
export async function scheduleMissionsReminder(enabled: boolean) {
  await Notifications.cancelScheduledNotificationAsync('missions-reminder').catch(() => {});
  if (!enabled) return;

  await Notifications.scheduleNotificationAsync({
    identifier: 'missions-reminder',
    content: {
      title: '🎯 Novas missões disponíveis!',
      body:  'Suas missões diárias estão esperando. Complete e ganhe XP!',
      sound: true,
    },
    trigger: {
      type: Notifications.SchedulableTriggerInputTypes.DAILY,
      hour:   8,
      minute: 0,
    },
  });
}

/**
 * Cancela todas as notificações agendadas.
 */
export async function cancelAllNotifications() {
  await Notifications.cancelAllScheduledNotificationsAsync();
}
