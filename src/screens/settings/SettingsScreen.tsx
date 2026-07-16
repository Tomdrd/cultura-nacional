import React, { useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Switch, Alert, Platform } from 'react-native';
import { Moon, Sun, Smartphone, Bell, Shield, Info, ChevronRight, LogOut, Volume2 } from 'lucide-react-native';
import { Linking } from 'react-native';
import { useTheme } from '../../hooks/useTheme';
import { useHeaderTopPadding } from '../../hooks/useHeaderTopPadding';
import { useSettingsStore } from '../../store/settingsStore';
import { useAuthStore } from '../../store/authStore';
import { Spacing, FontSize, FontWeight, Radius, scaleFont } from '../../constants/layout';
import { HomeTheme } from '../../constants/colors';
import {
  requestNotificationPermission,
  scheduleStreakReminder,
  scheduleMissionsReminder,
} from '../../lib/notifications';

type ThemeMode = 'light' | 'dark' | 'system';

export function SettingsScreen() {
  const { isDark } = useTheme();
  const C = isDark ? HomeTheme.dark : HomeTheme.light;
  const headerPaddingTop = useHeaderTopPadding();
  const { themeMode, setThemeMode, notifStreak, notifMissions, notifDuel, setNotifStreak, setNotifMissions, setNotifDuel, audioNarration, audioSfx, setAudioNarration, setAudioSfx } = useSettingsStore();
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
    <ScrollView style={{ flex: 1, backgroundColor: C.bg }} showsVerticalScrollIndicator={false}>

      {/* Header */}
      <View style={[styles.header, { paddingTop: headerPaddingTop }]}>
        <Text style={[styles.title, { color: C.text }]}>Configurações</Text>
      </View>

      {/* Theme */}
      <View style={styles.section}>
        <Text style={[styles.sectionLabel, { color: C.muted }]}>APARÊNCIA</Text>
        <View style={[styles.card, { backgroundColor: C.card, borderColor: C.border }]}>
          {themeOptions.map(({ mode, label, Icon }, i) => (
            <TouchableOpacity
              key={mode}
              onPress={() => setThemeMode(mode)}
              style={[styles.themeOption, i > 0 && { borderTopWidth: 1, borderTopColor: C.border }]}
            >
              <Icon size={16} color={themeMode === mode ? C.green : C.muted} />
              <Text style={[styles.themeLabel, { color: themeMode === mode ? C.green : C.text, fontWeight: themeMode === mode ? FontWeight.medium : FontWeight.regular }]}>
                {label}
              </Text>
              <View style={[styles.radio, {
                borderColor:     themeMode === mode ? C.green : C.border,
                backgroundColor: themeMode === mode ? C.green : 'transparent',
              }]}>
                {themeMode === mode && <View style={styles.radioDot} />}
              </View>
            </TouchableOpacity>
          ))}
        </View>
      </View>

      {/* Audio */}
      <View style={styles.section}>
        <Text style={[styles.sectionLabel, { color: C.muted }]}>ÁUDIO</Text>
        <View style={[styles.card, { backgroundColor: C.card, borderColor: C.border }]}>
          <View style={styles.notifRow}>
            <Volume2 size={16} color={C.muted} />
            <View style={{ flex: 1 }}>
              <Text style={[styles.notifLabel, { color: C.text }]}>Narração das perguntas</Text>
              <Text style={[styles.notifSub, { color: C.muted }]}>Lê a pergunta em voz alta antes do timer</Text>
            </View>
            <Switch
              value={audioNarration}
              onValueChange={setAudioNarration}
              trackColor={{ false: C.border, true: `${C.green}60` }}
              thumbColor={audioNarration ? C.green : C.subtle}
            />
          </View>
          <View style={[styles.notifRow, { borderTopWidth: 1, borderTopColor: C.border }]}>
            <Volume2 size={16} color={C.muted} />
            <View style={{ flex: 1 }}>
              <Text style={[styles.notifLabel, { color: C.text }]}>Efeitos sonoros</Text>
              <Text style={[styles.notifSub, { color: C.muted }]}>Sons de acerto, erro e resultado</Text>
            </View>
            <Switch
              value={audioSfx}
              onValueChange={setAudioSfx}
              trackColor={{ false: C.border, true: `${C.green}60` }}
              thumbColor={audioSfx ? C.green : C.subtle}
            />
          </View>
        </View>
      </View>

      {/* Notifications */}
      <View style={styles.section}>
        <Text style={[styles.sectionLabel, { color: C.muted }]}>NOTIFICAÇÕES</Text>
        <View style={[styles.card, { backgroundColor: C.card, borderColor: C.border }]}>
          {notifOptions.map(({ label, sub, value, onValueChange }, i) => (
            <View
              key={label}
              style={[styles.notifRow, i > 0 && { borderTopWidth: 1, borderTopColor: C.border }]}
            >
              <Bell size={16} color={C.muted} />
              <View style={{ flex: 1 }}>
                <Text style={[styles.notifLabel, { color: C.text }]}>{label}</Text>
                <Text style={[styles.notifSub, { color: C.muted }]}>{sub}</Text>
              </View>
              <Switch
                value={value}
                onValueChange={onValueChange}
                trackColor={{ false: C.border, true: `${C.green}60` }}
                thumbColor={value ? C.green : C.subtle}
              />
            </View>
          ))}
        </View>
      </View>

      {/* About */}
      <View style={styles.section}>
        <Text style={[styles.sectionLabel, { color: C.muted }]}>SOBRE</Text>
        <View style={[styles.card, { backgroundColor: C.card, borderColor: C.border }]}>
          {([
            { Icon: Shield, label: 'Política de Privacidade', url: 'https://cultura-nacional.vercel.app/privacidade.html' },
            { Icon: Info,   label: 'Termos de Uso',             url: 'https://cultura-nacional.vercel.app/termos.html' },
            { Icon: Info,   label: 'Versão 1.0.0',               url: null },
          ] as { Icon: any; label: string; url: string | null }[]).map(({ Icon, label, url }, i) => (
            <TouchableOpacity
              key={label}
              onPress={() => url && Linking.openURL(url)}
              disabled={!url}
              style={[styles.menuItem, i > 0 && { borderTopWidth: 1, borderTopColor: C.border }]}
            >
              <View style={[styles.iconBox, { backgroundColor: C.iconBg, borderColor: C.border }]}>
                <Icon size={13} color={url ? C.text : C.muted} />
              </View>
              <Text style={[styles.menuLabel, { color: url ? C.text : C.muted }]}>{label}</Text>
              {url && <ChevronRight size={14} color={C.muted} />}
            </TouchableOpacity>
          ))}
        </View>
      </View>

      {/* Logout */}
      <TouchableOpacity
        onPress={signOut}
        style={[styles.logoutBtn, { backgroundColor: C.card, borderColor: '#E24B4A44' }]}
      >
        <LogOut size={16} color="#F09595" />
        <Text style={[styles.logoutText, { color: '#F09595' }]}>Sair da conta</Text>
      </TouchableOpacity>

      <View style={{ height: 40 }} />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  header:       { paddingHorizontal: Spacing.xl, paddingBottom: Spacing.lg },
  title:        { fontSize: FontSize.lg, fontWeight: FontWeight.bold },
  section:      { paddingHorizontal: Spacing.xl, marginBottom: Spacing.md },
  sectionLabel: { fontSize: scaleFont(10), fontWeight: FontWeight.bold, letterSpacing: 0.6, marginBottom: Spacing.sm, textTransform: 'uppercase' },
  card:         { borderRadius: 16, borderWidth: 1, overflow: 'hidden' },
  iconBox:      { width: 28, height: 28, borderRadius: 8, borderWidth: 1, alignItems: 'center', justifyContent: 'center' },
  themeOption:  { flexDirection: 'row', alignItems: 'center', gap: 12, padding: Spacing.md },
  themeLabel:   { flex: 1, fontSize: FontSize.xs },
  radio:        { width: 18, height: 18, borderRadius: 9, borderWidth: 2, alignItems: 'center', justifyContent: 'center' },
  radioDot:     { width: 7, height: 7, borderRadius: 4, backgroundColor: '#FFF' },
  notifRow:     { flexDirection: 'row', alignItems: 'center', gap: 12, padding: Spacing.md },
  notifLabel:   { fontSize: FontSize.xs, fontWeight: FontWeight.medium },
  notifSub:     { fontSize: scaleFont(9), marginTop: 2 },
  menuItem:     { flexDirection: 'row', alignItems: 'center', gap: 10, padding: Spacing.md },
  menuLabel:    { flex: 1, fontSize: FontSize.xs },
  logoutBtn:    { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, marginHorizontal: Spacing.xl, borderRadius: 16, borderWidth: 1, padding: Spacing.md },
  logoutText:   { fontSize: FontSize.xs, fontWeight: FontWeight.bold },
});
