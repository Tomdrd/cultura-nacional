import React, { useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Switch, Alert, Platform } from 'react-native';
import { Moon, Sun, Smartphone, Bell, Shield, Info, ChevronRight, LogOut } from 'lucide-react-native';
import { useTheme } from '../../hooks/useTheme';
import { useSettingsStore } from '../../store/settingsStore';
import { useAuthStore } from '../../store/authStore';
import { Spacing, FontSize, FontWeight, Radius } from '../../constants/layout';
import {
  requestNotificationPermission,
  scheduleStreakReminder,
  scheduleMissionsReminder,
} from '../../lib/notifications';

type ThemeMode = 'light' | 'dark' | 'system';

export function SettingsScreen() {
  const { colors } = useTheme();
  const { themeMode, setThemeMode, notifStreak, notifMissions, notifDuel, setNotifStreak, setNotifMissions, setNotifDuel } = useSettingsStore();
  const { signOut } = useAuthStore();

  // Ao montar, sincroniza notificações agendadas com as preferências salvas
  useEffect(() => {
    scheduleStreakReminder(notifStreak);
    scheduleMissionsReminder(notifMissions);
  }, []);

  async function handleToggleNotif(
    type: 'streak' | 'missions' | 'duel',
    value: boolean
  ) {
    const granted = await requestNotificationPermission();
    if (!granted && value) {
      if (Platform.OS === 'web') {
        window.alert('Permissão de notificações negada. Habilite nas configurações do dispositivo.');
      } else {
        Alert.alert(
          'Permissão necessária',
          'Habilite as notificações nas configurações do dispositivo para usar este recurso.'
        );
      }
      return;
    }

    if (type === 'streak') {
      setNotifStreak(value);
      await scheduleStreakReminder(value);
    } else if (type === 'missions') {
      setNotifMissions(value);
      await scheduleMissionsReminder(value);
    } else {
      // Duelo: push futuro, por ora só salva preferência
      setNotifDuel(value);
    }
  }

  const themeOptions: { mode: ThemeMode; label: string; Icon: any }[] = [
    { mode: 'light',  label: 'Claro',      Icon: Sun        },
    { mode: 'dark',   label: 'Escuro',     Icon: Moon       },
    { mode: 'system', label: 'Automático', Icon: Smartphone },
  ];

  const notifOptions = [
    {
      label: 'Streak diário',
      sub:   'Lembrete às 20h para manter sua sequência',
      value: notifStreak,
      onValueChange: (v: boolean) => handleToggleNotif('streak', v),
    },
    {
      label: 'Missões do dia',
      sub:   'Aviso às 8h quando novas missões estiverem disponíveis',
      value: notifMissions,
      onValueChange: (v: boolean) => handleToggleNotif('missions', v),
    },
    {
      label: 'Desafios de duelo',
      sub:   'Em breve — notificação quando alguém te desafiar',
      value: notifDuel,
      onValueChange: (v: boolean) => handleToggleNotif('duel', v),
    },
  ];

  return (
    <ScrollView style={{ flex: 1, backgroundColor: colors.background }} showsVerticalScrollIndicator={false}>

      {/* Header */}
      <View style={[styles.header, { borderBottomColor: colors.border }]}>
        <Text style={[styles.title, { color: colors.text }]}>Configurações</Text>
      </View>

      {/* Theme */}
      <View style={styles.section}>
        <Text style={[styles.sectionLabel, { color: colors.textSecondary }]}>APARÊNCIA</Text>
        <View style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border }]}>
          {themeOptions.map(({ mode, label, Icon }, i) => (
            <TouchableOpacity
              key={mode}
              onPress={() => setThemeMode(mode)}
              style={[styles.themeOption, i > 0 && { borderTopWidth: 0.5, borderTopColor: colors.border }]}
            >
              <Icon size={18} color={themeMode === mode ? colors.primary : colors.textSecondary} />
              <Text style={[styles.themeLabel, { color: themeMode === mode ? colors.primary : colors.text }]}>
                {label}
              </Text>
              <View style={[styles.radio, {
                borderColor:     themeMode === mode ? colors.primary : colors.border,
                backgroundColor: themeMode === mode ? colors.primary : 'transparent',
              }]}>
                {themeMode === mode && <View style={styles.radioDot} />}
              </View>
            </TouchableOpacity>
          ))}
        </View>
      </View>

      {/* Notifications */}
      <View style={styles.section}>
        <Text style={[styles.sectionLabel, { color: colors.textSecondary }]}>NOTIFICAÇÕES</Text>
        <View style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border }]}>
          {notifOptions.map(({ label, sub, value, onValueChange }, i) => (
            <View
              key={label}
              style={[styles.notifRow, i > 0 && { borderTopWidth: 0.5, borderTopColor: colors.border }]}
            >
              <Bell size={16} color={colors.textSecondary} />
              <View style={{ flex: 1 }}>
                <Text style={[styles.notifLabel, { color: colors.text }]}>{label}</Text>
                <Text style={[styles.notifSub, { color: colors.textMuted }]}>{sub}</Text>
              </View>
              <Switch
                value={value}
                onValueChange={onValueChange}
                trackColor={{ false: colors.border, true: colors.primary + '60' }}
                thumbColor={value ? colors.primary : colors.textMuted}
              />
            </View>
          ))}
        </View>
      </View>

      {/* About */}
      <View style={styles.section}>
        <Text style={[styles.sectionLabel, { color: colors.textSecondary }]}>SOBRE</Text>
        <View style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border }]}>
          {[
            { Icon: Shield, label: 'Política de Privacidade' },
            { Icon: Info,   label: 'Termos de Uso' },
            { Icon: Info,   label: 'Versão 1.0.0' },
          ].map(({ Icon, label }, i) => (
            <TouchableOpacity
              key={label}
              style={[styles.menuItem, i > 0 && { borderTopWidth: 0.5, borderTopColor: colors.border }]}
            >
              <Icon size={18} color={colors.textSecondary} />
              <Text style={[styles.menuLabel, { color: colors.text }]}>{label}</Text>
              <ChevronRight size={16} color={colors.textMuted} />
            </TouchableOpacity>
          ))}
        </View>
      </View>

      {/* Logout */}
      <TouchableOpacity
        onPress={signOut}
        style={[styles.logoutBtn, { backgroundColor: colors.card, borderColor: colors.border }]}
      >
        <LogOut size={18} color={colors.danger} />
        <Text style={[styles.logoutText, { color: colors.danger }]}>Sair da conta</Text>
      </TouchableOpacity>

      <View style={{ height: 40 }} />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  header:       { padding: Spacing.xl, paddingTop: 60, borderBottomWidth: 0.5 },
  title:        { fontSize: FontSize.xl, fontWeight: FontWeight.bold },
  section:      { padding: Spacing.xl, paddingBottom: 0 },
  sectionLabel: { fontSize: 11, fontWeight: FontWeight.bold, letterSpacing: 0.5, marginBottom: Spacing.sm },
  card:         { borderRadius: Radius.lg, borderWidth: 0.5, overflow: 'hidden' },
  themeOption:  { flexDirection: 'row', alignItems: 'center', gap: 12, padding: Spacing.md },
  themeLabel:   { flex: 1, fontSize: FontSize.sm },
  radio:        { width: 20, height: 20, borderRadius: 10, borderWidth: 2, alignItems: 'center', justifyContent: 'center' },
  radioDot:     { width: 8, height: 8, borderRadius: 4, backgroundColor: '#FFF' },
  notifRow:     { flexDirection: 'row', alignItems: 'center', gap: 12, padding: Spacing.md },
  notifLabel:   { fontSize: FontSize.sm, fontWeight: FontWeight.medium },
  notifSub:     { fontSize: 11, marginTop: 2 },
  menuItem:     { flexDirection: 'row', alignItems: 'center', gap: 12, padding: Spacing.md },
  menuLabel:    { flex: 1, fontSize: FontSize.sm },
  logoutBtn:    { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, margin: Spacing.xl, borderRadius: Radius.lg, borderWidth: 0.5, padding: Spacing.lg },
  logoutText:   { fontSize: FontSize.sm, fontWeight: FontWeight.medium },
});
