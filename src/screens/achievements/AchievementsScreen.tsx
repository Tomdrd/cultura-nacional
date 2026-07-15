import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, FlatList, TouchableOpacity, ActivityIndicator } from 'react-native';
import { Award, Star, Zap, BookOpen, Trophy, MapPin, Globe, Flag, TrendingUp, CheckCircle, Swords, ArrowLeft } from 'lucide-react-native';
import { useTheme } from '../../hooks/useTheme';
import { useHeaderTopPadding } from '../../hooks/useHeaderTopPadding';
import { supabase } from '../../lib/supabase';
import { useAuthStore } from '../../store/authStore';
import { Spacing, FontSize, FontWeight, Radius } from '../../constants/layout';

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
  const { colors } = useTheme();
  const headerPaddingTop = useHeaderTopPadding();
  const { user } = useAuthStore();
  const [achievements, setAchievements] = useState<Achievement[]>([]);
  const [loading,      setLoading]      = useState(true);

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
      <View style={[styles.center, { backgroundColor: colors.background }]}>
        <ActivityIndicator color={colors.primary} size="large" />
      </View>
    );
  }

  return (
    <View style={{ flex: 1, backgroundColor: colors.background }}>
      <View style={[styles.header, { borderBottomColor: colors.border, paddingTop: headerPaddingTop }]}>
        <TouchableOpacity onPress={() => navigation.goBack()}>
          <ArrowLeft size={22} color={colors.text} />
        </TouchableOpacity>
        <Text style={[styles.title, { color: colors.text }]}>Conquistas</Text>
        <View style={{ width: 22 }} />
      </View>

      {/* Stats */}
      <View style={styles.statsRow}>
        <View style={[styles.statCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
          <Trophy size={20} color="#FFDF00" />
          <Text style={[styles.statVal, { color: colors.text }]}>{earnedCount}/{achievements.length}</Text>
          <Text style={[styles.statLbl, { color: colors.textMuted }]}>Conquistadas</Text>
        </View>
        <View style={[styles.statCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
          <Zap size={20} color={colors.primary} />
          <Text style={[styles.statVal, { color: colors.text }]}>{totalXP}</Text>
          <Text style={[styles.statLbl, { color: colors.textMuted }]}>XP de conquistas</Text>
        </View>
        <View style={[styles.statCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
          <Award size={20} color="#D4537E" />
          <Text style={[styles.statVal, { color: colors.text }]}>{Math.round((earnedCount / Math.max(achievements.length, 1)) * 100)}%</Text>
          <Text style={[styles.statLbl, { color: colors.textMuted }]}>Completado</Text>
        </View>
      </View>

      <FlatList
        data={achievements}
        keyExtractor={item => item.id}
        numColumns={2}
        columnWrapperStyle={styles.row}
        contentContainerStyle={styles.grid}
        ListFooterComponent={<View style={{ height: 32 }} />}
        renderItem={({ item: ach }) => {
          const IconComp = ICON_MAP[ach.icon] ?? Award;
          return (
            <View
              style={[
                styles.achCard,
                {
                  backgroundColor: ach.earned ? colors.primary + '15' : colors.card,
                  borderColor:     ach.earned ? colors.primary + '40' : colors.border,
                  opacity: ach.earned ? 1 : 0.5,
                }
              ]}
            >
              <View style={[styles.achIcon, { backgroundColor: ach.earned ? colors.primary + '25' : colors.background }]}>
                <IconComp size={26} color={ach.earned ? colors.primary : colors.textMuted} />
              </View>
              <Text style={[styles.achName, { color: ach.earned ? colors.text : colors.textSecondary }]} numberOfLines={2}>
                {ach.name}
              </Text>
              <Text style={[styles.achDesc, { color: colors.textMuted }]} numberOfLines={2}>
                {ach.description}
              </Text>
              <View style={[styles.achXp, { backgroundColor: colors.primary + '15' }]}>
                <Text style={[styles.achXpText, { color: colors.primary }]}>+{ach.xp_reward} XP</Text>
              </View>
              {ach.earned && (
                <View style={styles.earnedBadge}>
                  <CheckCircle size={14} color={colors.primary} />
                </View>
              )}
            </View>
          );
        }}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  center:      { flex: 1, justifyContent: 'center', alignItems: 'center' },
  header:      { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', padding: Spacing.xl, borderBottomWidth: 0.5 },
  title:       { fontSize: FontSize.lg, fontWeight: FontWeight.bold },
  statsRow:    { flexDirection: 'row', gap: 10, padding: Spacing.xl, paddingBottom: 0 },
  statCard:    { flex: 1, borderRadius: Radius.lg, borderWidth: 0.5, padding: Spacing.md, alignItems: 'center', gap: 4 },
  statVal:     { fontSize: FontSize.lg, fontWeight: FontWeight.bold },
  statLbl:     { fontSize: 10, textAlign: 'center' },
  grid:        { padding: Spacing.xl, gap: 12 },
  row:         { gap: 12, justifyContent: 'space-between' as const },
  achCard:     { flex: 1, borderRadius: Radius.lg, borderWidth: 0.5, padding: Spacing.md, gap: 6, position: 'relative' as const },
  achIcon:     { width: 52, height: 52, borderRadius: 14, alignItems: 'center', justifyContent: 'center', marginBottom: 4 },
  achName:     { fontSize: FontSize.sm, fontWeight: FontWeight.bold, lineHeight: 18 },
  achDesc:     { fontSize: 11, lineHeight: 16 },
  achXp:       { alignSelf: 'flex-start', paddingHorizontal: 8, paddingVertical: 3, borderRadius: Radius.full },
  achXpText:   { fontSize: 11, fontWeight: FontWeight.bold },
  earnedBadge: { position: 'absolute', top: 8, right: 8 },
});
