import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, ActivityIndicator } from 'react-native';
import { MapPin, Trophy, Zap, Music, Map, Tag, ChevronRight, Video } from 'lucide-react-native';
import { useFocusEffect } from '@react-navigation/native';
import { useTheme } from '../../hooks/useTheme';
import { supabase } from '../../lib/supabase';
import { useAuthStore } from '../../store/authStore';
import { Spacing, FontSize, FontWeight, Radius } from '../../constants/layout';
import { CategoryColors, QuickActionColors, withOpacity } from '../../constants/colors';
import { getXpProgress, XP_PER_LEVEL } from '../../utils/xp';

interface Profile { username: string; xp: number; level: number; streak: number; city_natal_id: string | null; }

export function HomeScreen({ navigation }: any) {
  const { colors, isDark } = useTheme();
  const { user } = useAuthStore();
  const [profile,  setProfile]  = useState<Profile | null>(null);
  const [loading,  setLoading]  = useState(true);
  const [cityNatal, setCityNatal] = useState<{ id: string; name: string; state_id: string; stateName: string; stateUf: string } | null>(null);

  useFocusEffect(React.useCallback(() => { loadData(); }, []));

  async function loadData() {
    setLoading(true);
    const { data: profileData } = user ? await supabase.from('profiles').select('username, xp, level, streak, city_natal_id').eq('id', user.id).single() : { data: null };
    if (profileData) {
      setProfile(profileData);
      if (profileData.city_natal_id) {
        const { data: cityData } = await supabase.from('cities').select('id, name, state_id, states(name, uf)').eq('id', profileData.city_natal_id).single();
        
        if (cityData) setCityNatal({ id: cityData.id, name: cityData.name, state_id: cityData.state_id, stateName: (cityData.states as any)?.name ?? '', stateUf: (cityData.states as any)?.uf?.trim()?.toLowerCase() ?? '' });
      }
    }
    setLoading(false);
  }

  const xpToNext = XP_PER_LEVEL;
  const xpPct    = getXpProgress(profile?.xp ?? 0);

  if (loading) {
    return (
      <View style={[styles.center, { backgroundColor: colors.background }]}>
        <ActivityIndicator color={colors.primary} size="large" />
      </View>
    );
  }

  return (
    <ScrollView style={{ flex: 1, backgroundColor: colors.background }} showsVerticalScrollIndicator={false}>

      {/* Header */}
      <View style={[styles.header, { backgroundColor: colors.card, borderBottomColor: colors.border }]}>
        <View>
          <Text style={[styles.greeting, { color: colors.textSecondary }]}>Olá,</Text>
          <Text style={[styles.username, { color: colors.text }]}>{profile?.username ?? 'Explorador'} 👋</Text>
        </View>
        <View style={[styles.streakBadge, { backgroundColor: withOpacity(colors.primary, 20) }]}>
          <Zap size={14} color={colors.primary} />
          <Text style={[styles.streakText, { color: colors.primary }]}>{profile?.streak ?? 0} dias</Text>
        </View>
      </View>

      {/* XP Card */}
      <View style={[styles.xpCard, { backgroundColor: colors.card, borderColor: withOpacity(colors.primary, 65), borderWidth: 0.5 }]}>
        <View style={styles.xpRow}>
          <View>
            <Text style={[styles.xpLevel, { color: colors.textSecondary }]}>Nível {profile?.level ?? 1}</Text>
            <Text style={[styles.xpPoints, { color: colors.primary }]}>{profile?.xp ?? 0} XP</Text>
          </View>
          <View style={[styles.xpBadge, { backgroundColor: withOpacity(colors.primary, 20) }]}>
            <Trophy size={20} color="#FFDF00" />
            <Text style={[styles.xpBadgeText, { color: colors.primary }]}>Curioso</Text>
          </View>
        </View>
        <View style={[styles.xpBarBg, { backgroundColor: withOpacity(colors.primary, 30) }]}>
          <View style={[styles.xpBarFill, { width: `${xpPct * 100}%`, backgroundColor: colors.primary }]} />
        </View>
        <Text style={[styles.xpHint, { color: colors.textMuted }]}>{Math.round(xpPct * xpToNext)} / {xpToNext} XP para o próximo nível</Text>
      </View>

      {/* Quick Actions */}
      <View style={styles.quickActions}>

        <TouchableOpacity
          style={[styles.actionCard, { backgroundColor: QuickActionColors.relampago.bg, borderColor: QuickActionColors.relampago.border, borderWidth: 0.5 }]}
          onPress={() => navigation.navigate('Quiz', { mode: 'relampago' })}
        >
          <Zap size={22} color={QuickActionColors.relampago.fg} />
          <Text style={[styles.actionLabel, { color: QuickActionColors.relampago.fg }]}>Relâmpago</Text>
          <Text style={[styles.actionSub, { color: withOpacity(QuickActionColors.relampago.fg, 85) }]}>30 segundos</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.actionCard, { backgroundColor: QuickActionColors.viral.bg, borderColor: QuickActionColors.viral.border, borderWidth: 0.5 }]}
          onPress={() => navigation.navigate('ViralMode')}
        >
          <Video size={22} color={QuickActionColors.viral.fg} />
          <Text style={[styles.actionLabel, { color: QuickActionColors.viral.fg }]}>Modo Viral</Text>
          <Text style={[styles.actionSub, { color: withOpacity(QuickActionColors.viral.fg, 85) }]}>Grave e compartilhe</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.actionCard, { backgroundColor: QuickActionColors.duelo.bg, borderColor: QuickActionColors.duelo.border, borderWidth: 0.5 }]}
          onPress={() => navigation.navigate('Duel')}
        >
          <Trophy size={22} color={QuickActionColors.duelo.fg} />
          <Text style={[styles.actionLabel, { color: QuickActionColors.duelo.fg }]}>Duelo</Text>
          <Text style={[styles.actionSub, { color: withOpacity(QuickActionColors.duelo.fg, 85) }]}>1 vs 1</Text>
        </TouchableOpacity>
      </View>

      {/* Grid de seções */}
      <View style={styles.section}>
        <Text style={[styles.sectionTitle, { color: colors.text }]}>Explorar</Text>
        <View style={styles.sectionGrid}>
          {cityNatal && (
            <TouchableOpacity
              style={[styles.sectionCard, { backgroundColor: withOpacity(CategoryColors.natureza, 15), borderColor: withOpacity(CategoryColors.natureza, 65) }]}
              onPress={() => navigation.navigate('Quiz', { stateId: cityNatal.state_id, stateName: cityNatal.stateName, cityName: cityNatal.name })}
            >
              <View style={[styles.sectionIconWrap, { backgroundColor: withOpacity(CategoryColors.natureza, 25) }]}>
                <MapPin size={26} color={CategoryColors.natureza} />
              </View>
              <Text style={[styles.sectionCardName, { color: colors.text }]}>{cityNatal.name}</Text>
              <Text style={[styles.sectionCardDesc, { color: colors.textMuted }]}>Perguntas da sua cidade natal</Text>
            </TouchableOpacity>
          )}
          <TouchableOpacity
            style={[styles.sectionCard, { backgroundColor: withOpacity(CategoryColors.turismo, 15), borderColor: withOpacity(CategoryColors.turismo, 65) }]}
            onPress={() => navigation.navigate('Estados')}
          >
            <View style={[styles.sectionIconWrap, { backgroundColor: withOpacity(CategoryColors.turismo, 25) }]}>
              <Map size={26} color={CategoryColors.turismo} />
            </View>
            <Text style={[styles.sectionCardName, { color: colors.text }]}>Estados</Text>
            <Text style={[styles.sectionCardDesc, { color: colors.textMuted }]}>Explore todos os estados do Brasil</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.sectionCard, { backgroundColor: withOpacity(CategoryColors.cultura, 15), borderColor: withOpacity(CategoryColors.cultura, 65) }]}
            onPress={() => navigation.navigate('Categorias')}
          >
            <View style={[styles.sectionIconWrap, { backgroundColor: withOpacity(CategoryColors.cultura, 25) }]}>
              <Tag size={26} color={CategoryColors.cultura} />
            </View>
            <Text style={[styles.sectionCardName, { color: colors.text }]}>Categorias</Text>
            <Text style={[styles.sectionCardDesc, { color: colors.textMuted }]}>Cultura, história, gastronomia e mais</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.sectionCard, { backgroundColor: withOpacity(CategoryColors.musica, 15), borderColor: withOpacity(CategoryColors.musica, 65) }]}
            onPress={() => navigation.navigate('Musica')}
          >
            <View style={[styles.sectionIconWrap, { backgroundColor: withOpacity(CategoryColors.musica, 25) }]}>
              <Music size={26} color={CategoryColors.musica} />
            </View>
            <Text style={[styles.sectionCardName, { color: colors.text }]}>Música</Text>
            <Text style={[styles.sectionCardDesc, { color: colors.textMuted }]}>MPB, Reggae e RAP brasileiro</Text>
          </TouchableOpacity>
        </View>
      </View>

      <View style={{ height: 32 }} />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  center:        { flex: 1, justifyContent: 'center', alignItems: 'center' },
  header:        { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: Spacing.xl, paddingTop: 56, borderBottomWidth: 0.5 },
  greeting:      { fontSize: FontSize.xs },
  username:      { fontSize: FontSize.lg, fontWeight: FontWeight.bold },
  streakBadge:   { flexDirection: 'row', alignItems: 'center', gap: 4, paddingHorizontal: 10, paddingVertical: 6, borderRadius: Radius.full },
  streakText:    { fontSize: FontSize.xs, fontWeight: FontWeight.medium },
  xpCard:        { margin: Spacing.xl, borderRadius: Radius.lg, padding: Spacing.xl },
  xpRow:         { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: Spacing.md },
  xpLevel:       { fontSize: FontSize.xs, fontWeight: FontWeight.medium },
  xpPoints:      { fontSize: FontSize.xl, fontWeight: FontWeight.bold, marginTop: 2 },
  xpBadge:       { flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: 10, paddingVertical: 6, borderRadius: Radius.full },
  xpBadgeText:   { fontSize: FontSize.xs, fontWeight: FontWeight.medium },
  xpBarBg:       { height: 6, borderRadius: 3, marginBottom: 6 },
  xpBarFill:     { height: 6, borderRadius: 3 },
  xpHint:        { fontSize: FontSize.xs },
  quickActions:  { flexDirection: 'row', gap: 10, paddingHorizontal: Spacing.xl, marginBottom: Spacing.xl },
  actionCard:    { flex: 1, borderRadius: Radius.lg, padding: Spacing.md, gap: 4 },
  actionLabel:   { fontSize: FontSize.sm, fontWeight: FontWeight.bold, marginTop: 4 },
  actionSub:     { fontSize: FontSize.xs },
  section:       { paddingHorizontal: Spacing.xl, marginBottom: Spacing.xl },
  sectionTitle:  { fontSize: FontSize.md, fontWeight: FontWeight.bold, marginBottom: Spacing.md },
  sectionGrid:     { flexDirection: 'row', flexWrap: 'wrap', gap: Spacing.md },
  sectionCard:     { flexGrow: 1, flexBasis: 150, minWidth: 150, borderRadius: Radius.lg, borderWidth: 0.5, padding: Spacing.lg, gap: 8 },
  sectionIconWrap: { width: 48, height: 48, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
  sectionCardName: { fontSize: FontSize.md, fontWeight: FontWeight.bold },
  sectionCardDesc: { fontSize: FontSize.xs, lineHeight: 18 },
});
