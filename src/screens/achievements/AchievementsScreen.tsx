import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, FlatList, TouchableOpacity, ActivityIndicator } from 'react-native';
import { Award, Star, Zap, BookOpen, Trophy, MapPin, Globe, Flag, TrendingUp, CheckCircle, Swords, ArrowLeft } from 'lucide-react-native';
import { useTheme } from '../../hooks/useTheme';
import { useHeaderTopPadding } from '../../hooks/useHeaderTopPadding';
import { useContentWidth } from '../../hooks/useContentWidth';
import { supabase } from '../../lib/supabase';
import { useAuthStore } from '../../store/authStore';
import { Spacing, FontSize, FontWeight, Radius, scaleFont } from '../../constants/layout';
import { HomeTheme } from '../../constants/colors';
import { ScreenContainer } from '../../components/ui/ScreenContainer';

const ICON_MAP: Record<string, any> = {
  'star': Star, 'zap': Zap, 'book': BookOpen, 'award': Award,
  'trophy': Trophy, 'map-pin': MapPin, 'globe': Globe, 'flag': Flag,
  'trending-up': TrendingUp, 'check': CheckCircle, 'check-circle': CheckCircle,
  'swords': Swords,
};

interface Achievement {
  id: string;
  key: string;
  name: string;
  description: string;
  icon: string;
  xp_reward: number;
  earned?: boolean;
  earned_at?: string;
}

export function AchievementsScreen({ navigation }: any) {
  const { isDark } = useTheme();
  const C = isDark ? HomeTheme.dark : HomeTheme.light;
  const headerPaddingTop = useHeaderTopPadding();
  const { user } = useAuthStore();
  const { maxWidth, numColumns } = useContentWidth({ mobile: 2, tablet: 3, desktop: 4 });
  const [achievements, setAchievements] = useState<Achievement[]>([]);
  const [loading,      setLoading]      = useState(true);

  const cols = numColumns ?? 2;
  const cardWidth = (maxWidth - Spacing.xl * 2 - 12 * (cols - 1)) / cols;

  useEffect(() => { load(); }, []);

  async function load() {
    if (!user) return;
    setLoading(true);
    const [{ data: all }, { data: earned }] = await Promise.all([
      supabase.from('achievements').select('*').order('xp_reward', { ascending: true }),
      supabase.from('user_achievements').select('achievement_id, earned_at').eq('user_id', user.id),
    ]);
    if (all) {
      const earnedIds = new Set(earned?.filter(e => e.earned_at).map(e => e.achievement_id) ?? []);
      const earnedMap = Object.fromEntries(earned?.map(e => [e.achievement_id, e.earned_at]) ?? []);
      setAchievements(all.map(a => ({
        ...a,
        earned: earnedIds.has(a.id),
        earned_at: earnedMap[a.id],
      })));
    }
    setLoading(false);
  }

  const earnedCount = achievements.filter(a => a.earned).length;
  const totalXP     = achievements.filter(a => a.earned).reduce((s, a) => s + a.xp_reward, 0);

  if (loading) {
    return (
      <ScreenContainer style={styles.center}>
        <ActivityIndicator color={C.green} size="large" />
      </ScreenContainer>
    );
  }

  return (
    <ScreenContainer>
      {/* Header */}
      <View style={[styles.header, { paddingTop: headerPaddingTop }]}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
          <ArrowLeft size={20} color={C.text} />
        </TouchableOpacity>
        <View style={{ flex: 1 }}>
          <Text style={[styles.headerTitle, { color: C.text }]}>
            Suas <Text style={{ color: C.green }}>Conquistas</Text>
          </Text>
          <Text style={[styles.headerSub, { color: C.muted }]}>Acompanhe seu progresso e recompensas</Text>
        </View>
      </View>

      {/* Stats */}
      <View style={[styles.statsRow, { paddingHorizontal: Spacing.xl }]}>
        <View style={[styles.statCard, { backgroundColor: C.card, borderColor: C.border }]}>
          <View style={[styles.statIcon, { backgroundColor: C.iconBg, borderColor: C.border }]}>
            <Trophy size={18} color={C.yellow} />
          </View>
          <Text style={[styles.statVal, { color: C.text }]}>{earnedCount}/{achievements.length}</Text>
          <Text style={[styles.statLbl, { color: C.muted }]}>Conquistadas</Text>
        </View>
        <View style={[styles.statCard, { backgroundColor: C.card, borderColor: C.border }]}>
          <View style={[styles.statIcon, { backgroundColor: C.iconBg, borderColor: C.border }]}>
            <Zap size={18} color={C.green} />
          </View>
          <Text style={[styles.statVal, { color: C.text }]}>{totalXP}</Text>
          <Text style={[styles.statLbl, { color: C.muted }]}>XP de conquistas</Text>
        </View>
        <View style={[styles.statCard, { backgroundColor: C.card, borderColor: C.border }]}>
          <View style={[styles.statIcon, { backgroundColor: C.iconBg, borderColor: C.border }]}>
            <Award size={18} color={C.text} />
          </View>
          <Text style={[styles.statVal, { color: C.text }]}>{Math.round((earnedCount / Math.max(achievements.length, 1)) * 100)}%</Text>
          <Text style={[styles.statLbl, { color: C.muted }]}>Completado</Text>
        </View>
      </View>

      {/* Section Label */}
      <View style={[styles.sectionLabel, { paddingHorizontal: Spacing.xl }]}>
        <Text style={[styles.sectionText, { color: C.muted }]}>TODAS</Text>
        <Text style={[styles.sectionCount, { color: C.green }]}> {achievements.length}</Text>
      </View>

      <FlatList
        data={achievements}
        keyExtractor={item => item.id}
        numColumns={cols}
        key={cols}
        columnWrapperStyle={cols > 1 ? styles.row : undefined}
        contentContainerStyle={[styles.grid, { paddingHorizontal: Spacing.xl }]}
        showsVerticalScrollIndicator={false}
        ListFooterComponent={<View style={{ height: 32 }} />}
        renderItem={({ item: ach }) => {
          const IconComp = ICON_MAP[ach.icon] ?? Award;
          return (
            <View
              style={[
                styles.achCard,
                {
                  width: cardWidth,
                  backgroundColor: C.card,
                  borderColor: ach.earned ? C.green : C.border,
                  opacity: ach.earned ? 1 : 0.6,
                }
              ]}
            >
              <View style={[styles.achIcon, { backgroundColor: C.iconBg, borderColor: C.border }]}>
                <IconComp size={24} color={ach.earned ? C.green : C.muted} />
              </View>
              <Text style={[styles.achName, { color: C.text }]} numberOfLines={2}>
                {ach.name}
              </Text>
              <Text style={[styles.achDesc, { color: C.muted }]} numberOfLines={2}>
                {ach.description}
              </Text>
              <View style={[styles.achXp, { backgroundColor: C.iconBg, borderColor: C.border }]}>
                <Text style={[styles.achXpText, { color: C.green }]}>+{ach.xp_reward} XP</Text>
              </View>
              {ach.earned && (
                <View style={styles.earnedBadge}>
                  <CheckCircle size={14} color={C.green} />
                </View>
              )}
            </View>
          );
        }}
      />
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  center:      { justifyContent: 'center', alignItems: 'center' },
  header:      { flexDirection: 'row', alignItems: 'flex-start', gap: 12, paddingHorizontal: Spacing.xl, paddingBottom: 16 },
  backBtn:     { width: 20, paddingTop: 2 },
  headerTitle: { fontSize: FontSize.lg, fontWeight: FontWeight.bold, lineHeight: 24 },
  headerSub:   { fontSize: FontSize.xs, marginTop: 2 },
  statsRow:    { flexDirection: 'row', gap: 10, paddingBottom: 16 },
  statCard:    { flex: 1, borderRadius: Radius.lg, borderWidth: 1, padding: Spacing.md, alignItems: 'center', gap: 4 },
  statIcon:    { width: 32, height: 32, borderRadius: 8, borderWidth: 1, alignItems: 'center', justifyContent: 'center', marginBottom: 2 },
  statVal:     { fontSize: FontSize.lg, fontWeight: FontWeight.bold },
  statLbl:     { fontSize: scaleFont(10), textAlign: 'center' },
  sectionLabel:{ flexDirection: 'row', justifyContent: 'flex-start', alignItems: 'center', marginBottom: 12 },
  sectionText: { fontSize: FontSize.xs, fontWeight: FontWeight.semibold, letterSpacing: 0.5 },
  sectionCount:{ fontSize: FontSize.xs, fontWeight: FontWeight.bold },
  grid:        { gap: 12 },
  row:         { gap: 12, justifyContent: 'flex-start' as const },
  achCard:     { borderRadius: Radius.lg, borderWidth: 1, padding: Spacing.md, gap: 6, position: 'relative' as const, marginBottom: 12 },
  achIcon:     { width: 48, height: 48, borderRadius: 10, borderWidth: 1, alignItems: 'center', justifyContent: 'center', marginBottom: 4 },
  achName:     { fontSize: FontSize.sm, fontWeight: FontWeight.bold, lineHeight: 18 },
  achDesc:     { fontSize: scaleFont(11), lineHeight: 17 },
  achXp:       { alignSelf: 'flex-start', paddingHorizontal: 8, paddingVertical: 3, borderRadius: Radius.full, borderWidth: 1 },
  achXpText:   { fontSize: scaleFont(11), fontWeight: FontWeight.bold },
  earnedBadge: { position: 'absolute', top: 8, right: 8 },
});
