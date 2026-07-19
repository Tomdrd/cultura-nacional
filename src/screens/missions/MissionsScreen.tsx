import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, ActivityIndicator } from 'react-native';
import Target from 'lucide-react-native/dist/esm/icons/target';
import CheckCircle from 'lucide-react-native/dist/esm/icons/circle-check';
import Clock from 'lucide-react-native/dist/esm/icons/clock';
import Zap from 'lucide-react-native/dist/esm/icons/zap';
import ArrowLeft from 'lucide-react-native/dist/esm/icons/arrow-left';
import { useTheme } from '../../hooks/useTheme';
import { useHeaderTopPadding } from '../../hooks/useHeaderTopPadding';
import { supabase } from '../../lib/supabase';
import { useAuthStore } from '../../store/authStore';
import { Spacing, FontSize, FontWeight, Radius, scaleFont } from '../../constants/layout';
import { HomeTheme } from '../../constants/colors';
import { ScreenContainer } from '../../components/ui/ScreenContainer';

interface Mission {
  id: string;
  key: string;
  description: string;
  target: number;
  progress: number;
  completed: boolean;
  xp_reward: number;
  expires_at: string;
}

export function MissionsScreen({ navigation }: any) {
  const { isDark } = useTheme();
  const C = isDark ? HomeTheme.dark : HomeTheme.light;
  const headerPaddingTop = useHeaderTopPadding();
  const { user } = useAuthStore();
  const [missions, setMissions] = useState<Mission[]>([]);
  const [loading,  setLoading]  = useState(true);

  useEffect(() => { load(); }, []);

  async function load() {
    if (!user) return;
    setLoading(true);
    await supabase.rpc('generate_daily_missions', { p_user_id: user.id });
    const { data } = await supabase
      .from('daily_missions')
      .select('*')
      .eq('user_id', user.id)
      .gte('expires_at', new Date().toISOString())
      .order('completed', { ascending: true });
    if (data) setMissions(data);
    setLoading(false);
  }

  function timeUntilMidnight() {
    const now      = new Date();
    const midnight = new Date();
    midnight.setHours(24, 0, 0, 0);
    const diff = midnight.getTime() - now.getTime();
    const h = Math.floor(diff / 3600000);
    const m = Math.floor((diff % 3600000) / 60000);
    return `${h}h ${m}m`;
  }

  const completedCount = missions.filter(m => m.completed).length;
  const totalXP        = missions.filter(m => m.completed).reduce((sum, m) => sum + m.xp_reward, 0);
  const totalPossible  = missions.reduce((sum, m) => sum + m.xp_reward, 0);
  const pctDone        = missions.length > 0 ? completedCount / missions.length : 0;

  if (loading) {
    return (
      <ScreenContainer style={styles.center}>
        <ActivityIndicator color={C.green} size="large" />
      </ScreenContainer>
    );
  }

  return (
    <ScreenContainer>
      <ScrollView showsVerticalScrollIndicator={false}>

        {/* Header */}
        <View style={[styles.header, { paddingTop: headerPaddingTop }]}>
          <TouchableOpacity
            onPress={() => navigation.goBack()}
            style={styles.backBtn}
            hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
          >
            <ArrowLeft size={20} color={C.text} />
          </TouchableOpacity>
          <View style={{ flex: 1 }}>
            <Text style={[styles.headerTitle, { color: C.text }]}>
              Missões do <Text style={{ color: C.green }}>Dia</Text>
            </Text>
            <Text style={[styles.headerSub, { color: C.muted }]}>Complete missões e acumule XP</Text>
          </View>
        </View>

        {/* Stats Row */}
        <View style={[styles.statsRow, { paddingHorizontal: Spacing.xl }]}>
          <View style={[styles.statCard, { backgroundColor: C.card, borderColor: C.border }]}>
            <View style={[styles.statIcon, { backgroundColor: C.iconBg, borderColor: C.border }]}>
              <Target size={18} color={C.green} />
            </View>
            <Text style={[styles.statVal, { color: C.text }]}>{completedCount}/{missions.length}</Text>
            <Text style={[styles.statLbl, { color: C.muted }]}>Concluídas</Text>
          </View>

          <View style={[styles.statCard, { backgroundColor: C.card, borderColor: C.border }]}>
            <View style={[styles.statIcon, { backgroundColor: C.iconBg, borderColor: C.border }]}>
              <Zap size={18} color={C.yellow} />
            </View>
            <Text style={[styles.statVal, { color: C.text }]}>{totalXP}</Text>
            <Text style={[styles.statLbl, { color: C.muted }]}>XP ganhos</Text>
          </View>

          <View style={[styles.statCard, { backgroundColor: C.card, borderColor: C.border }]}>
            <View style={[styles.statIcon, { backgroundColor: C.iconBg, borderColor: C.border }]}>
              <Clock size={18} color={C.muted} />
            </View>
            <Text style={[styles.statVal, { color: C.text }]}>{timeUntilMidnight()}</Text>
            <Text style={[styles.statLbl, { color: C.muted }]}>Renova em</Text>
          </View>
        </View>

        {/* Progress bar global */}
        <View style={[styles.globalProgress, { paddingHorizontal: Spacing.xl }]}>
          <View style={[styles.progressBg, { backgroundColor: C.border }]}>
            <View style={[styles.progressFill, { width: `${pctDone * 100}%`, backgroundColor: C.green }]} />
          </View>
          <Text style={[styles.progressCaption, { color: C.muted }]}>
            {Math.round(pctDone * 100)}% completo · {totalPossible} XP disponíveis
          </Text>
        </View>

        {/* Section label */}
        <View style={[styles.sectionLabel, { paddingHorizontal: Spacing.xl }]}>
          <Text style={[styles.sectionText, { color: C.muted }]}>MISSÕES</Text>
          <Text style={[styles.sectionCount, { color: C.green }]}> {missions.length}</Text>
        </View>

        {/* Mission cards */}
        <View style={[styles.list, { paddingHorizontal: Spacing.xl }]}>
          {missions.map(mission => {
            const pct = Math.min((mission.progress / mission.target) * 100, 100);
            return (
              <View
                key={mission.id}
                style={[
                  styles.missionCard,
                  {
                    backgroundColor: C.card,
                    borderColor: mission.completed ? C.green : C.border,
                  },
                ]}
              >
                <View style={styles.missionTop}>
                  {/* Icon */}
                  <View
                    style={[
                      styles.missionIcon,
                      {
                        backgroundColor: mission.completed ? C.green + '22' : C.iconBg,
                        borderColor:     mission.completed ? C.green + '55' : C.border,
                      },
                    ]}
                  >
                    {mission.completed
                      ? <CheckCircle size={22} color={C.green} />
                      : <Target      size={22} color={C.muted} />
                    }
                  </View>

                  {/* Text */}
                  <View style={{ flex: 1, minWidth: 0 }}>
                    <Text
                      style={[
                        styles.missionDesc,
                        { color: mission.completed ? C.green : C.text },
                      ]}
                    >
                      {mission.description}
                    </Text>
                    <Text style={[styles.missionProgress, { color: C.muted }]}>
                      {mission.progress}/{mission.target}
                      {mission.completed ? ' · Concluída!' : ''}
                    </Text>
                  </View>

                  {/* XP tag */}
                  <View style={[styles.xpTag, { backgroundColor: C.iconBg, borderColor: C.border }]}>
                    <Text style={[styles.xpTagText, { color: C.green }]}>+{mission.xp_reward} XP</Text>
                  </View>
                </View>

                {/* Progress bar (só para missões pendentes) */}
                {!mission.completed && (
                  <View style={[styles.missionBar, { backgroundColor: C.border }]}>
                    <View
                      style={[
                        styles.missionBarFill,
                        { width: `${pct}%`, backgroundColor: C.green },
                      ]}
                    />
                  </View>
                )}
              </View>
            );
          })}

          {missions.length === 0 && (
            <View style={styles.empty}>
              <View style={[styles.emptyIcon, { backgroundColor: C.iconBg, borderColor: C.border }]}>
                <Target size={32} color={C.muted} />
              </View>
              <Text style={[styles.emptyTitle, { color: C.text }]}>Nenhuma missão</Text>
              <Text style={[styles.emptyText,  { color: C.muted }]}>Suas missões diárias estão sendo geradas...</Text>
            </View>
          )}
        </View>

        <View style={{ height: 32 }} />
      </ScrollView>
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  center:           { justifyContent: 'center', alignItems: 'center' },

  // Header
  header:           { flexDirection: 'row', alignItems: 'flex-start', gap: 12, paddingHorizontal: Spacing.xl, paddingBottom: 16 },
  backBtn:          { width: 20, paddingTop: 2 },
  headerTitle:      { fontSize: FontSize.lg, fontWeight: FontWeight.bold, lineHeight: 24 },
  headerSub:        { fontSize: FontSize.xs, marginTop: 2 },

  // Stats
  statsRow:         { flexDirection: 'row', gap: 10, paddingBottom: 16 },
  statCard:         { flex: 1, borderRadius: Radius.lg, borderWidth: 1, padding: Spacing.md, alignItems: 'center', gap: 4 },
  statIcon:         { width: 32, height: 32, borderRadius: 8, borderWidth: 1, alignItems: 'center', justifyContent: 'center', marginBottom: 2 },
  statVal:          { fontSize: FontSize.sm, fontWeight: FontWeight.bold, textAlign: 'center' },
  statLbl:          { fontSize: scaleFont(10), textAlign: 'center' },

  // Global progress
  globalProgress:   { paddingBottom: 16 },
  progressBg:       { height: 4, borderRadius: 2, overflow: 'hidden', marginBottom: 6 },
  progressFill:     { height: 4, borderRadius: 2 },
  progressCaption:  { fontSize: scaleFont(11) },

  // Section label
  sectionLabel:     { flexDirection: 'row', alignItems: 'center', marginBottom: 12 },
  sectionText:      { fontSize: FontSize.xs, fontWeight: FontWeight.semibold, letterSpacing: 0.5, textTransform: 'uppercase' },
  sectionCount:     { fontSize: FontSize.xs, fontWeight: FontWeight.bold },

  // Mission cards
  list:             { gap: 10 },
  missionCard:      { borderRadius: Radius.lg, borderWidth: 1, padding: Spacing.lg, gap: 10 },
  missionTop:       { flexDirection: 'row', alignItems: 'center', gap: 12 },
  missionIcon:      { width: 44, height: 44, borderRadius: 12, borderWidth: 1, alignItems: 'center', justifyContent: 'center', flexShrink: 0 },
  missionDesc:      { fontSize: FontSize.sm, fontWeight: FontWeight.medium, lineHeight: 20 },
  missionProgress:  { fontSize: FontSize.xs, marginTop: 3 },
  xpTag:            { paddingHorizontal: 8, paddingVertical: 4, borderRadius: Radius.full, borderWidth: 1, flexShrink: 0 },
  xpTagText:        { fontSize: scaleFont(11), fontWeight: FontWeight.bold },
  missionBar:       { height: 3, borderRadius: 2, overflow: 'hidden' },
  missionBarFill:   { height: 3, borderRadius: 2 },

  // Empty state
  empty:            { alignItems: 'center', gap: 12, paddingVertical: 48 },
  emptyIcon:        { width: 64, height: 64, borderRadius: 16, borderWidth: 1, alignItems: 'center', justifyContent: 'center' },
  emptyTitle:       { fontSize: FontSize.md, fontWeight: FontWeight.bold },
  emptyText:        { fontSize: FontSize.sm, textAlign: 'center' },
});
