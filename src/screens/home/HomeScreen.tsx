import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, ActivityIndicator } from 'react-native';
import { MapPin, Trophy, Zap, ChevronRight, Star, BookOpen, Utensils, Leaf, Compass, Lightbulb, Clock, Video } from 'lucide-react-native';
import { useTheme } from '../../hooks/useTheme';
import { supabase } from '../../lib/supabase';
import { useAuthStore } from '../../store/authStore';
import { Spacing, FontSize, FontWeight, Radius } from '../../constants/layout';

const SUBCATEGORY_ICONS: Record<string, any> = {
  Cultura:      { Icon: Star,      color: '#7F77DD' },
  História:     { Icon: BookOpen,  color: '#D85A30' },
  Gastronomia:  { Icon: Utensils,  color: '#BA7517' },
  Natureza:     { Icon: Leaf,      color: '#009C3B' },
  Turismo:      { Icon: Compass,   color: '#378ADD' },
  Curiosidades: { Icon: Lightbulb, color: '#D4537E' },
};

const REGION_COLORS: Record<string, string> = {
  Norte:        '#378ADD',
  Nordeste:     '#D85A30',
  'Centro-Oeste': '#BA7517',
  Sudeste:      '#7F77DD',
  Sul:          '#009C3B',
};

interface State { id: string; name: string; uf: string; region: string; }
interface Profile { username: string; xp: number; level: number; streak: number; city_natal_id: string | null; }

export function HomeScreen({ navigation }: any) {
  const { colors, isDark } = useTheme();
  const { user } = useAuthStore();
  const [states,   setStates]   = useState<State[]>([]);
  const [profile,  setProfile]  = useState<Profile | null>(null);
  const [loading,  setLoading]  = useState(true);
  const [region,   setRegion]   = useState<string | null>(null);

  const regions = ['Norte', 'Nordeste', 'Centro-Oeste', 'Sudeste', 'Sul'];

  useEffect(() => { loadData(); }, []);

  async function loadData() {
    setLoading(true);
    const [{ data: statesData }, { data: profileData }] = await Promise.all([
      supabase.from('states').select('*').order('name'),
      user ? supabase.from('profiles').select('username, xp, level, streak, city_natal_id').eq('id', user.id).single() : Promise.resolve({ data: null }),
    ]);
    if (statesData) setStates(statesData);
    if (profileData) setProfile(profileData);
    setLoading(false);
  }

  const filteredStates = region
    ? states.filter(s => s.region === region)
    : states;

  const xpToNext = (profile?.level ?? 1) * 500;
  const xpPct    = Math.min(((profile?.xp ?? 0) % xpToNext) / xpToNext, 1);

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

      {/* Subcategories */}
      <View style={styles.section}>
        <Text style={[styles.sectionTitle, { color: colors.text }]}>Categorias</Text>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.catRow}>
          {Object.entries(SUBCATEGORY_ICONS).map(([name, { Icon, color }]) => (
            <TouchableOpacity
              key={name}
              style={[styles.catCard, { backgroundColor: color + '18', borderColor: color + '40' }]}
              onPress={() => navigation.navigate('Quiz', { subcategory: name })}
            >
              <Icon size={20} color={color} />
              <Text style={[styles.catLabel, { color }]}>{name}</Text>
            </TouchableOpacity>
          ))}
        </ScrollView>
      </View>

      {/* States */}
      <View style={styles.section}>
        <Text style={[styles.sectionTitle, { color: colors.text }]}>Explorar estados</Text>

        {/* Region filter */}
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.regionRow}>
          <TouchableOpacity
            onPress={() => setRegion(null)}
            style={[styles.regionPill, { backgroundColor: !region ? colors.primary : colors.card, borderColor: !region ? colors.primary : colors.border }]}
          >
            <Text style={[styles.regionText, { color: !region ? '#FFF' : colors.textSecondary }]}>Todos</Text>
          </TouchableOpacity>
          {regions.map(r => (
            <TouchableOpacity
              key={r}
              onPress={() => setRegion(r === region ? null : r)}
              style={[styles.regionPill, {
                backgroundColor: region === r ? REGION_COLORS[r] : colors.card,
                borderColor: region === r ? REGION_COLORS[r] : colors.border,
              }]}
            >
              <Text style={[styles.regionText, { color: region === r ? '#FFF' : colors.textSecondary }]}>{r}</Text>
            </TouchableOpacity>
          ))}
        </ScrollView>

        {/* State list */}
        <View style={styles.stateList}>
          {filteredStates.map(state => (
            <TouchableOpacity
              key={state.id}
              onPress={() => navigation.navigate('Quiz', { stateId: state.id, stateName: state.name })}
              style={[styles.stateCard, { backgroundColor: colors.card, borderColor: colors.border }]}
            >
              <View style={[styles.ufBadge, { backgroundColor: REGION_COLORS[state.region] + '20' }]}>
                <Text style={[styles.ufText, { color: REGION_COLORS[state.region] }]}>{state.uf}</Text>
              </View>
              <View style={{ flex: 1 }}>
                <Text style={[styles.stateName, { color: colors.text }]}>{state.name}</Text>
                <Text style={[styles.stateRegion, { color: colors.textMuted }]}>{state.region}</Text>
              </View>
              <ChevronRight size={16} color={colors.textMuted} />
            </TouchableOpacity>
          ))}
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
  stateList:     { gap: 8 },
  stateCard:     { flexDirection: 'row', alignItems: 'center', borderRadius: Radius.md, borderWidth: 0.5, padding: Spacing.md, gap: 12 },
  ufBadge:       { width: 40, height: 40, borderRadius: 8, alignItems: 'center', justifyContent: 'center' },
  ufText:        { fontSize: 13, fontWeight: FontWeight.bold },
  stateName:     { fontSize: FontSize.md, fontWeight: FontWeight.medium },
  stateRegion:   { fontSize: FontSize.xs, marginTop: 2 },
});
