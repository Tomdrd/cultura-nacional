import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, ActivityIndicator } from 'react-native';
import { Target, CheckCircle, Clock, Zap, ArrowLeft } from 'lucide-react-native';
import { useTheme } from '../../hooks/useTheme';
import { supabase } from '../../lib/supabase';
import { useAuthStore } from '../../store/authStore';
import { Spacing, FontSize, FontWeight, Radius } from '../../constants/layout';

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
  const { colors } = useTheme();
  const { user } = useAuthStore();
  const [missions, setMissions] = useState<Mission[]>([]);
  const [loading,  setLoading]  = useState(true);

  useEffect(() => { load(); }, []);

  async function load() {
    if (!user) return;
    setLoading(true);

    // Gera missões se não existirem
    await supabase.rpc('generate_daily_missions', { p_user_id: user.id });

    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    tomorrow.setHours(0, 0, 0, 0);

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
    const now = new Date();
    const midnight = new Date();
    midnight.setHours(24, 0, 0, 0);
    const diff = midnight.getTime() - now.getTime();
    const h = Math.floor(diff / 3600000);
    const m = Math.floor((diff % 3600000) / 60000);
    return `${h}h ${m}m`;
  }

  const completedCount = missions.filter(m => m.completed).length;
  const totalXP = missions.filter(m => m.completed).reduce((sum, m) => sum + m.xp_reward, 0);

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
      <View style={[styles.header, { borderBottomColor: colors.border }]}>
        <TouchableOpacity onPress={() => navigation.goBack()}>
          <ArrowLeft size={22} color={colors.text} />
        </TouchableOpacity>
        <Text style={[styles.title, { color: colors.text }]}>Missões do Dia</Text>
        <View style={{ width: 22 }} />
      </View>

      {/* Progress card */}
      <View style={[styles.progressCard, { backgroundColor: colors.primary }]}>
        <View style={styles.progressRow}>
          <View>
            <Text style={styles.progressLabel}>Missões concluídas</Text>
            <Text style={styles.progressValue}>{completedCount}/{missions.length}</Text>
          </View>
          <View style={[styles.xpBadge, { backgroundColor: 'rgba(255,255,255,0.2)' }]}>
            <Zap size={14} color="#FFDF00" />
            <Text style={styles.xpBadgeText}>+{totalXP} XP ganhos</Text>
          </View>
        </View>
        <View style={styles.progressBarBg}>
          <View style={[styles.progressBarFill, { width: `${(completedCount / Math.max(missions.length, 1)) * 100}%` }]} />
        </View>
        <View style={styles.timerRow}>
          <Clock size={12} color="rgba(255,255,255,0.7)" />
          <Text style={styles.timerText}>Renova em {timeUntilMidnight()}</Text>
        </View>
      </View>

      {/* Missions */}
      <View style={styles.list}>
        {missions.map(mission => {
          const pct = Math.min((mission.progress / mission.target) * 100, 100);
          return (
            <View
              key={mission.id}
              style={[
                styles.missionCard,
                {
                  backgroundColor: mission.completed ? colors.primary + '10' : colors.card,
                  borderColor:     mission.completed ? colors.primary + '40' : colors.border,
                }
              ]}
            >
              <View style={styles.missionTop}>
                <View style={[styles.missionIcon, { backgroundColor: mission.completed ? colors.primary + '20' : colors.background }]}>
                  {mission.completed
                    ? <CheckCircle size={22} color={colors.primary} />
                    : <Target size={22} color={colors.textSecondary} />
                  }
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={[styles.missionDesc, { color: mission.completed ? colors.primary : colors.text }]}>
                    {mission.description}
                  </Text>
                  <Text style={[styles.missionProgress, { color: colors.textMuted }]}>
                    {mission.progress}/{mission.target} {mission.completed ? '— Concluída!' : ''}
                  </Text>
                </View>
                <View style={[styles.xpTag, { backgroundColor: colors.primary + '15', borderColor: colors.primary + '30' }]}>
                  <Text style={[styles.xpTagText, { color: colors.primary }]}>+{mission.xp_reward} XP</Text>
                </View>
              </View>
              {!mission.completed && (
                <View style={[styles.missionBar, { backgroundColor: colors.border }]}>
                  <View style={[styles.missionBarFill, { width: `${pct}%`, backgroundColor: colors.primary }]} />
                </View>
              )}
            </View>
          );
        })}

        {missions.length === 0 && (
          <View style={styles.empty}>
            <Target size={40} color={colors.textMuted} />
            <Text style={[styles.emptyText, { color: colors.textMuted }]}>Missões sendo geradas...</Text>
          </View>
        )}
      </View>

      <View style={{ height: 32 }} />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  center:          { flex: 1, justifyContent: 'center', alignItems: 'center' },
  header:          { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', padding: Spacing.xl, paddingTop: 56, borderBottomWidth: 0.5 },
  title:           { fontSize: FontSize.lg, fontWeight: FontWeight.bold },
  progressCard:    { margin: Spacing.xl, borderRadius: Radius.lg, padding: Spacing.xl },
  progressRow:     { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: Spacing.md },
  progressLabel:   { color: 'rgba(255,255,255,0.8)', fontSize: FontSize.xs },
  progressValue:   { color: '#FFF', fontSize: FontSize.xxl, fontWeight: FontWeight.bold, marginTop: 2 },
  xpBadge:        { flexDirection: 'row', alignItems: 'center', gap: 4, paddingHorizontal: 10, paddingVertical: 5, borderRadius: Radius.full },
  xpBadgeText:    { color: '#FFDF00', fontSize: FontSize.xs, fontWeight: FontWeight.medium },
  progressBarBg:   { height: 6, backgroundColor: 'rgba(255,255,255,0.3)', borderRadius: 3, marginBottom: 8 },
  progressBarFill: { height: 6, backgroundColor: '#FFDF00', borderRadius: 3 },
  timerRow:        { flexDirection: 'row', alignItems: 'center', gap: 4 },
  timerText:       { color: 'rgba(255,255,255,0.7)', fontSize: 11 },
  list:            { padding: Spacing.xl, gap: 12 },
  missionCard:     { borderRadius: Radius.lg, borderWidth: 0.5, padding: Spacing.lg, gap: 10 },
  missionTop:      { flexDirection: 'row', alignItems: 'flex-start', gap: 12 },
  missionIcon:     { width: 44, height: 44, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
  missionDesc:     { fontSize: FontSize.sm, fontWeight: FontWeight.medium, lineHeight: 20 },
  missionProgress: { fontSize: FontSize.xs, marginTop: 3 },
  xpTag:          { paddingHorizontal: 8, paddingVertical: 4, borderRadius: Radius.full, borderWidth: 0.5 },
  xpTagText:      { fontSize: 11, fontWeight: FontWeight.bold },
  missionBar:      { height: 4, borderRadius: 2, overflow: 'hidden' },
  missionBarFill:  { height: 4, borderRadius: 2 },
  empty:           { alignItems: 'center', gap: 12, paddingVertical: 40 },
  emptyText:       { fontSize: FontSize.sm },
});
