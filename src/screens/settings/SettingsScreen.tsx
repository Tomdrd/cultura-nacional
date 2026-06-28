import React from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Switch } from 'react-native';
import { Moon, Sun, Smartphone, Bell, Shield, Info, ChevronRight, LogOut } from 'lucide-react-native';
import { useTheme } from '../../hooks/useTheme';
import { useSettingsStore } from '../../store/settingsStore';
import { useAuthStore } from '../../store/authStore';
import { Spacing, FontSize, FontWeight, Radius } from '../../constants/layout';

type ThemeMode = 'light' | 'dark' | 'system';

export function SettingsScreen() {
  const { colors } = useTheme();
  const { themeMode, setThemeMode } = useSettingsStore();
  const { signOut } = useAuthStore();

  const themeOptions: { mode: ThemeMode; label: string; Icon: any }[] = [
    { mode: 'light',  label: 'Claro',     Icon: Sun         },
    { mode: 'dark',   label: 'Escuro',    Icon: Moon        },
    { mode: 'system', label: 'Automático',Icon: Smartphone  },
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
              style={[
                styles.themeOption,
                i > 0 && { borderTopWidth: 0.5, borderTopColor: colors.border },
              ]}
            >
              <Icon size={18} color={themeMode === mode ? colors.primary : colors.textSecondary} />
              <Text style={[styles.themeLabel, { color: themeMode === mode ? colors.primary : colors.text }]}>
                {label}
              </Text>
              <View style={[
                styles.radio,
                {
                  borderColor: themeMode === mode ? colors.primary : colors.border,
                  backgroundColor: themeMode === mode ? colors.primary : 'transparent',
                }
              ]}>
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
          {[
            { label: 'Streak diário',     sub: 'Lembrete para manter sua sequência' },
            { label: 'Missões do dia',    sub: 'Novas missões disponíveis' },
            { label: 'Desafios de duelo', sub: 'Quando alguém te desafia' },
          ].map(({ label, sub }, i) => (
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
                value={true}
                onValueChange={() => {}}
                trackColor={{ false: colors.border, true: colors.primary + '60' }}
                thumbColor={colors.primary}
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
