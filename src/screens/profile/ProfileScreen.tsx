import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, Image, ScrollView, TouchableOpacity, ActivityIndicator } from 'react-native';
import { User, MapPin, Trophy, Zap, Star, BookOpen, Utensils, Leaf, Compass, Lightbulb, LogOut, ChevronRight, Award } from 'lucide-react-native';
import { useTheme } from '../../hooks/useTheme';
import { supabase } from '../../lib/supabase';
import { useAuthStore } from '../../store/authStore';
import { Spacing, FontSize, FontWeight, Radius } from '../../constants/layout';
import { getXpInCurrentLevel, getXpProgress, XP_PER_LEVEL } from '../../utils/xp';
import { VerifiedBadge, AvatarVerifiedBadge } from '../../components/ui/VerifiedBadge';
import { Plan } from '../../types';

const LEVELS = [
  { min: 0,    label: 'Curioso',     color: '#6B6B6B' },
  { min: 3,    label: 'Viajante',    color: '#378ADD' },
  { min: 6,    label: 'Descobridor', color: '#7F77DD' },
  { min: 10,   label: 'Conhecedor',  color: '#BA7517' },
  { min: 15,   label: 'Especialista',color: '#009C3B' },
  { min: 20,   label: 'Mestre Cultural', color: '#FFDF00' },
];

function getLevelInfo(level: number) {
  for (let i = LEVELS.length - 1; i >= 0; i--) {
    if (level >= LEVELS[i].min) return LEVELS[i];
  }
  return LEVELS[0];
}

interface Profile {
  username: string;
  avatar_url: string | null;
  xp: number;
  level: number;
  streak: number;
  plan: Plan;
  plan_expires_at: string | null;
  city_natal_id: string | null;
  created_at: string;
}

interface CityInfo { name: string; state_uf: string; }

export function ProfileScreen({ navigation }: any) {

  const { colors } = useTheme();
  const { user, signOut } = useAuthStore();
  const [profile,  setProfile]  = useState<Profile | null>(null);
  const [city,     setCity]     = useState<CityInfo | null>(null);
  const [loading,  setLoading]  = useState(true);
  const [cityRank, setCityRank] = useState<number | null>(null);

  useEffect(() => { loadProfile(); }, []);

  async function loadProfile() {
    if (!user) return;
    setLoading(true);
    const { data } = await supabase
      .from('profiles')
      .select('id, username, avatar_url, xp, level, streak, plan, plan_expires_at, city_natal_id, created_at')
      .eq('id', user.id)
      .single();

    if (data) {
      setProfile(data);
      if (data.city_natal_id) {
        const [{ data: cityData }, { data: rankData }] = await Promise.all([
          supabase.from('cities').select('name, state_uf').eq('id', data.city_natal_id).single(),
          supabase.from('city_rankings').select('position').eq('city_id', data.city_natal_id).eq('user_id', user.id).single(),
        ]);
        if (cityData) setCity(cityData);
        if (rankData) setCityRank(rankData.position);
      }
    }
    setLoading(false);
  }

  if (loading) {
    return (
      <View style={[styles.center, { backgroundColor: colors.background }]}>
        <ActivityIndicator color={colors.primary} size="large" />
      </View>
    );
  }

  const xpToNext    = XP_PER_LEVEL;
  const xpCurrent   = getXpInCurrentLevel(profile?.xp ?? 0);
  const xpPct       = getXpProgress(profile?.xp ?? 0);
  const levelInfo   = getLevelInfo(profile?.level ?? 1);

  return (
    <ScrollView style={{ flex: 1, backgroundColor: colors.background }} showsVerticalScrollIndicator={false}>

      {/* Header */}
      <View style={[styles.header, { backgroundColor: colors.card, borderBottomColor: colors.border }]}>
        <View style={{ position: 'relative' }}>
          <View style={[styles.avatar, { backgroundColor: colors.primary + '20', borderColor: colors.primary }]}>
            {(profile?.avatar_url || user?.user_metadata?.avatar_url) ? (
              <Image
                source={{ uri: profile?.avatar_url ?? user?.user_metadata?.avatar_url }}
                style={{ width: 80, height: 80, borderRadius: 40 }}
              />
            ) : (
              <User size={36} color={colors.primary} />
            )}
          </View>
          {profile?.plan && <AvatarVerifiedBadge plan={profile.plan} avatarSize={80} />}
        </View>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
          <Text style={[styles.username, { color: colors.text }]}>{profile?.username ?? 'Explorador'}</Text>
          {profile?.plan && <VerifiedBadge plan={profile.plan} size={20} />}
        </View>
        <Text style={[styles.email, { color: colors.textSecondary }]}>{user?.email}</Text>

        {/* Level badge */}
        <View style={[styles.levelBadge, { backgroundColor: levelInfo.color + '20', borderColor: levelInfo.color + '40' }]}>
          <Award size={14} color={levelInfo.color} />
          <Text style={[styles.levelText, { color: levelInfo.color }]}>{levelInfo.label}</Text>
        </View>

        {/* City */}
        {city && (
          <View style={styles.cityRow}>
            <MapPin size={13} color={colors.textMuted} />
            <Text style={[styles.cityText, { color: colors.textMuted }]}>{city.name}, {city.state_uf}</Text>
          </View>
        )}
      </View>

      {/* XP Progress */}
      <View style={[styles.xpCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
        <View style={styles.xpRow}>
          <View>
            <Text style={[styles.xpLabel, { color: colors.textSecondary }]}>Experiência</Text>
            <Text style={[styles.xpValue, { color: colors.text }]}>{profile?.xp ?? 0} XP total</Text>
          </View>
          <Text style={[styles.xpLevel, { color: colors.primary }]}>Nível {profile?.level ?? 1}</Text>
        </View>
        <View style={[styles.xpBarBg, { backgroundColor: colors.border }]}>
          <View style={[styles.xpBarFill, { width: `${xpPct * 100}%`, backgroundColor: colors.primary }]} />
        </View>
        <Text style={[styles.xpHint, { color: colors.textMuted }]}>
          {xpCurrent} / {xpToNext} XP para Nível {(profile?.level ?? 1) + 1}
        </Text>
      </View>

      {/* Stats */}
      <View style={[styles.statsCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
        <View style={styles.statItem}>
          <Zap size={20} color="#FFDF00" />
          <Text style={[styles.statVal, { color: colors.text }]}>{profile?.streak ?? 0}</Text>
          <Text style={[styles.statLbl, { color: colors.textMuted }]}>Streak</Text>
        </View>
        <View style={[styles.statDivider, { backgroundColor: colors.border }]} />
        <View style={styles.statItem}>
          <Trophy size={20} color={colors.primary} />
          <Text style={[styles.statVal, { color: colors.text }]}>{cityRank ? `#${cityRank}` : '-'}</Text>
          <Text style={[styles.statLbl, { color: colors.textMuted }]}>Ranking cidade</Text>
        </View>
        <View style={[styles.statDivider, { backgroundColor: colors.border }]} />
        <View style={styles.statItem}>
          <Star size={20} color="#D4537E" />
          <Text style={[styles.statVal, { color: colors.text }]}>{profile?.level ?? 1}</Text>
          <Text style={[styles.statLbl, { color: colors.textMuted }]}>Nível</Text>
        </View>
      </View>

      {/* Plan */}
      <View style={[styles.section, { backgroundColor: colors.card, borderColor: colors.border }]}>
        <Text style={[styles.sectionTitle, { color: colors.textSecondary }]}>PLANO</Text>
        <View style={styles.planRow}>
          {(() => {
            const p = profile?.plan ?? 'free';
            const isPremium = p === 'pro' || p === 'family' || p === 'education';
            const planLabel   = p === 'pro' ? 'CN Pro' : p === 'family' ? 'Família' : p === 'education' ? 'Educação' : 'Gratuito';
            const planColor   = p === 'pro' ? '#1877F2' : p === 'family' ? '#009C3B' : p === 'education' ? '#7F77DD' : colors.border;
            const planBgColor = p === 'pro' ? '#1877F220' : p === 'family' ? '#009C3B20' : p === 'education' ? '#7F77DD20' : colors.background;
            return (
              <>
                <View style={[styles.planBadge, { backgroundColor: planBgColor, borderColor: planColor }]}>
                  <Text style={[styles.planText, { color: isPremium ? planColor : colors.textSecondary }]}>{planLabel}</Text>
                </View>
                {!isPremium && (
                  <TouchableOpacity
                    onPress={() => navigation.navigate('Subscription')}
                    style={[styles.upgradeBtn, { backgroundColor: colors.primary }]}
                  >
                    <Text style={styles.upgradeBtnText}>Assinar Pro</Text>
                  </TouchableOpacity>
                )}
              </>
            );
          })()}
        </View>
      </View>

      {/* Menu items */}
      <View style={[styles.menuCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
        <Text style={[styles.sectionTitle, { color: colors.textSecondary }]}>CONTA</Text>
        {[
          { icon: MapPin,   label: 'Minha cidade natal',  onPress: () => navigation.navigate('Onboarding', { fromProfile: true }) },
          { icon: Trophy,   label: 'Minhas conquistas',   onPress: () => navigation.navigate('Achievements') },
          { icon: Zap,      label: 'Missões diárias',     onPress: () => navigation.navigate('Missions') },
        ].map(({ icon: Icon, label, onPress }, i) => (
          <TouchableOpacity
            key={label}
            onPress={onPress}
            style={[styles.menuItem, { borderTopColor: i === 0 ? 'transparent' : colors.border }]}
          >
            <Icon size={18} color={colors.textSecondary} />
            <Text style={[styles.menuLabel, { color: colors.text }]}>{label}</Text>
            <ChevronRight size={16} color={colors.textMuted} />
          </TouchableOpacity>
        ))}
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
  center:       { flex: 1, justifyContent: 'center', alignItems: 'center' },
  header:       { alignItems: 'center', padding: Spacing.xl, paddingTop: 60, borderBottomWidth: 0.5, gap: 8 },
  avatar:       { width: 80, height: 80, borderRadius: 40, alignItems: 'center', justifyContent: 'center', borderWidth: 2, marginBottom: 4 },
  username:     { fontSize: FontSize.xl, fontWeight: FontWeight.bold },
  email:        { fontSize: FontSize.sm },
  levelBadge:   { flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: 12, paddingVertical: 5, borderRadius: Radius.full, borderWidth: 0.5 },
  levelText:    { fontSize: FontSize.xs, fontWeight: FontWeight.medium },
  cityRow:      { flexDirection: 'row', alignItems: 'center', gap: 4 },
  cityText:     { fontSize: FontSize.xs },
  xpCard:       { margin: Spacing.xl, marginBottom: 0, borderRadius: Radius.lg, borderWidth: 0.5, padding: Spacing.xl },
  xpRow:        { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: Spacing.md },
  xpLabel:      { fontSize: FontSize.xs, marginBottom: 2 },
  xpValue:      { fontSize: FontSize.md, fontWeight: FontWeight.bold },
  xpLevel:      { fontSize: FontSize.md, fontWeight: FontWeight.bold },
  xpBarBg:      { height: 6, borderRadius: 3, marginBottom: 6 },
  xpBarFill:    { height: 6, borderRadius: 3 },
  xpHint:       { fontSize: 11 },
  statsCard:    { flexDirection: 'row', margin: Spacing.xl, marginBottom: 0, borderRadius: Radius.lg, borderWidth: 0.5, padding: Spacing.xl },
  statItem:     { flex: 1, alignItems: 'center', gap: 4 },
  statVal:      { fontSize: FontSize.lg, fontWeight: FontWeight.bold },
  statLbl:      { fontSize: 10, textAlign: 'center' },
  statDivider:  { width: 0.5 },
  section:      { margin: Spacing.xl, marginBottom: 0, borderRadius: Radius.lg, borderWidth: 0.5, padding: Spacing.xl },
  sectionTitle: { fontSize: 11, fontWeight: FontWeight.bold, letterSpacing: 0.5, marginBottom: Spacing.md },
  planRow:      { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  planBadge:    { paddingHorizontal: 12, paddingVertical: 5, borderRadius: Radius.full, borderWidth: 0.5 },
  planText:     { fontSize: FontSize.sm, fontWeight: FontWeight.medium },
  upgradeBtn:   { paddingHorizontal: 16, paddingVertical: 8, borderRadius: Radius.md },
  upgradeBtnText: { color: '#FFF', fontSize: FontSize.sm, fontWeight: FontWeight.medium },
  menuCard:     { margin: Spacing.xl, marginBottom: 0, borderRadius: Radius.lg, borderWidth: 0.5, padding: Spacing.xl },
  menuItem:     { flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: Spacing.md, borderTopWidth: 0.5 },
  menuLabel:    { flex: 1, fontSize: FontSize.sm },
  logoutBtn:    { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, margin: Spacing.xl, marginBottom: 0, borderRadius: Radius.lg, borderWidth: 0.5, padding: Spacing.lg },
  logoutText:   { fontSize: FontSize.sm, fontWeight: FontWeight.medium },
});
