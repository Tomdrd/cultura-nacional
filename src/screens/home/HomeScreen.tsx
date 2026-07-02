import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, ActivityIndicator } from 'react-native';
import { MapPin, Trophy, Zap, Music, Map, Tag, ChevronRight, Video } from 'lucide-react-native';
import { useFocusEffect } from '@react-navigation/native';
import { useTheme } from '../../hooks/useTheme';
import { supabase } from '../../lib/supabase';
import { useAuthStore } from '../../store/authStore';
import { Spacing, FontSize, FontWeight, Radius } from '../../constants/layout';
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
        <View style={[styles.streakBadge, { backgroundColor: colors.primary + '20' }]}>
          <Zap size={14} color={colors.primary} />
          <Text style={[styles.streakText, { color: colors.primary }]}>{profile?.streak ?? 0} dias</Text>
        </View>
      </View>

      {/* XP Card */}
      <View style={[styles.xpCard, { backgroundColor: colors.primary }]}>
        <View style={styles.xpRow}>
          <View>
            <Text style={styles.xpLevel}>Nível {profile?.level ?? 1}</Text>
            <Text style={styles.xpPoints}>{profile?.xp ?? 0} XP</Text>
          </View>
          <View style={[styles.xpBadge, { backgroundColor: 'rgba(255,255,255,0.2)' }]}>
            <Trophy size={20} color="#FFDF00" />
            <Text style={styles.xpBadgeText}>Curioso</Text>
          </View>
        </View>
        <View style={styles.xpBarBg}>
          <View style={[styles.xpBarFill, { width: `${xpPct * 100}%` }]} />
        </View>
        <Text style={styles.xpHint}>{Math.round(xpPct * xpToNext)} / {xpToNext} XP para o próximo nível</Text>
      </View>

      {/* Quick Actions */}
      <View style={styles.quickActions}>
        {cityNatal && (
          <TouchableOpacity
            style={[styles.actionCard, { backgroundColor: '#009C3B' }]}
            onPress={() => navigation.navigate('Quiz', { stateId: cityNatal.state_id, stateName: cityNatal.stateName, cityName: cityNatal.name })}
          >
            <MapPin size={22} color="#FFF" />
            <Text style={[styles.actionLabel, { color: '#FFF' }]} numberOfLines={1}>{cityNatal.name}</Text>
            <Text style={[styles.actionSub, { color: 'rgba(255,255,255,0.8)' }]}>Sua cidade</Text>
          </TouchableOpacity>
        )}
        <TouchableOpacity
          style={[styles.actionCard, { backgroundColor: '#FFDF00' }]}
          onPress={() => navigation.navigate('Quiz', { mode: 'relampago' })}
        >
          <Zap size={22} color="#002776" />
          <Text style={[styles.actionLabel, { color: '#002776' }]}>Relâmpago</Text>
          <Text style={[styles.actionSub, { color: '#002776' + 'AA' }]}>30 segundos</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.actionCard, { backgroundColor: '#E24B4A' }]}
          onPress={() => navigation.navigate('ViralMode')}
        >
          <Video size={22} color="#FFF" />
          <Text style={[styles.actionLabel, { color: '#FFF' }]}>Modo Viral</Text>
          <Text style={[styles.actionSub, { color: 'rgba(255,255,255,0.8)' }]}>Grave e compartilhe</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.actionCard, { backgroundColor: colors.card, borderColor: colors.border, borderWidth: 0.5 }]}
          onPress={() => navigation.navigate('Duel')}
        >
          <Trophy size={22} color={colors.primary} />
          <Text style={[styles.actionLabel, { color: colors.text }]}>Duelo</Text>
          <Text style={[styles.actionSub, { color: colors.textMuted }]}>1 vs 1</Text>
        </TouchableOpacity>
      </View>

      {/* Grid de seções */}
      <View style={styles.section}>
        <Text style={[styles.sectionTitle, { color: colors.text }]}>Explorar</Text>
        <View style={styles.sectionGrid}>
          {cityNatal && (
            <TouchableOpacity
              style={[styles.sectionCard, { backgroundColor: '#009C3B' + '15', borderColor: '#009C3B' + '40' }]}
              onPress={() => navigation.navigate('Quiz', { stateId: cityNatal.state_id, stateName: cityNatal.stateName, cityName: cityNatal.name })}
            >
              <View style={[styles.sectionIconWrap, { backgroundColor: '#009C3B' + '25' }]}>
                <MapPin size={26} color="#009C3B" />
              </View>
              <Text style={[styles.sectionCardName, { color: '#009C3B' }]}>{cityNatal.name}</Text>
              <Text style={[styles.sectionCardDesc, { color: colors.textMuted }]}>Perguntas da sua cidade natal</Text>
            </TouchableOpacity>
          )}
          <TouchableOpacity
            style={[styles.sectionCard, { backgroundColor: '#378ADD' + '15', borderColor: '#378ADD' + '40' }]}
            onPress={() => navigation.navigate('Estados')}
          >
            <View style={[styles.sectionIconWrap, { backgroundColor: '#378ADD' + '25' }]}>
              <Map size={26} color="#378ADD" />
            </View>
            <Text style={[styles.sectionCardName, { color: '#378ADD' }]}>Estados</Text>
            <Text style={[styles.sectionCardDesc, { color: colors.textMuted }]}>Explore todos os estados do Brasil</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.sectionCard, { backgroundColor: '#7F77DD' + '15', borderColor: '#7F77DD' + '40' }]}
            onPress={() => navigation.navigate('Categorias')}
          >
            <View style={[styles.sectionIconWrap, { backgroundColor: '#7F77DD' + '25' }]}>
              <Tag size={26} color="#7F77DD" />
            </View>
            <Text style={[styles.sectionCardName, { color: '#7F77DD' }]}>Categorias</Text>
            <Text style={[styles.sectionCardDesc, { color: colors.textMuted }]}>Cultura, história, gastronomia e mais</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.sectionCard, { backgroundColor: '#7F3FBF' + '15', borderColor: '#7F3FBF' + '40' }]}
            onPress={() => navigation.navigate('Musica')}
          >
            <View style={[styles.sectionIconWrap, { backgroundColor: '#7F3FBF' + '25' }]}>
              <Music size={26} color="#7F3FBF" />
            </View>
            <Text style={[styles.sectionCardName, { color: '#7F3FBF' }]}>Música</Text>
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
  xpLevel:       { color: 'rgba(255,255,255,0.8)', fontSize: FontSize.xs, fontWeight: FontWeight.medium },
  xpPoints:      { color: '#FFFFFF', fontSize: FontSize.xl, fontWeight: FontWeight.bold, marginTop: 2 },
  xpBadge:       { flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: 10, paddingVertical: 6, borderRadius: Radius.full },
  xpBadgeText:   { color: '#FFDF00', fontSize: FontSize.xs, fontWeight: FontWeight.medium },
  xpBarBg:       { height: 6, backgroundColor: 'rgba(255,255,255,0.3)', borderRadius: 3, marginBottom: 6 },
  xpBarFill:     { height: 6, backgroundColor: '#FFDF00', borderRadius: 3 },
  xpHint:        { color: 'rgba(255,255,255,0.7)', fontSize: 11 },
  quickActions:  { flexDirection: 'row', gap: 10, paddingHorizontal: Spacing.xl, marginBottom: Spacing.xl },
  actionCard:    { flex: 1, borderRadius: Radius.lg, padding: Spacing.md, gap: 4 },
  actionLabel:   { fontSize: FontSize.sm, fontWeight: FontWeight.bold, marginTop: 4 },
  actionSub:     { fontSize: 11 },
  section:       { paddingHorizontal: Spacing.xl, marginBottom: Spacing.xl },
  sectionTitle:  { fontSize: FontSize.md, fontWeight: FontWeight.bold, marginBottom: Spacing.md },
  catRow:        { gap: 10, paddingBottom: 4 },
  catCard:       { alignItems: 'center', gap: 6, paddingHorizontal: 14, paddingVertical: 10, borderRadius: Radius.md, borderWidth: 0.5 },
  catLabel:      { fontSize: 11, fontWeight: FontWeight.medium },
  regionRow:     { gap: 8, marginBottom: Spacing.md, paddingBottom: 4 },
  regionPill:    { paddingHorizontal: 14, paddingVertical: 6, borderRadius: Radius.full, borderWidth: 0.5 },
  regionText:    { fontSize: FontSize.xs, fontWeight: FontWeight.medium },
  sectionGrid:     { flexDirection: 'row', flexWrap: 'wrap', gap: 12 },
  sectionCard:     { width: '47%', borderRadius: Radius.lg, borderWidth: 0.5, padding: Spacing.lg, gap: 8 },
  sectionIconWrap: { width: 48, height: 48, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
  sectionCardName: { fontSize: FontSize.md, fontWeight: FontWeight.bold },
  sectionCardDesc: { fontSize: FontSize.xs, lineHeight: 18 },
});
