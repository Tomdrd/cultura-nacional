import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, Image, ScrollView, TouchableOpacity, ActivityIndicator } from 'react-native';
import { User, MapPin, Trophy, Zap, Star, LogOut, ChevronRight, Award, Copy, Check, Lock, Swords, ArrowLeft } from 'lucide-react-native';
import * as Clipboard from 'expo-clipboard';
import { useTheme } from '../../hooks/useTheme';
import { useHeaderTopPadding } from '../../hooks/useHeaderTopPadding';
import { supabase } from '../../lib/supabase';
import { useAuthStore } from '../../store/authStore';
import { Spacing, FontSize, FontWeight, Radius } from '../../constants/layout';
import { HomeTheme } from '../../constants/colors';
import { getXpInCurrentLevel, getXpProgress, XP_PER_LEVEL } from '../../utils/xp';
import { VerifiedBadge, AvatarVerifiedBadge } from '../../components/ui/VerifiedBadge';
import { StateFlag } from '../../components/ui/StateFlag';
import { Plan } from '../../types';

const LEVELS = [
  { min: 0,    label: 'Curioso' },
  { min: 3,    label: 'Viajante' },
  { min: 6,    label: 'Descobridor' },
  { min: 10,   label: 'Conhecedor' },
  { min: 15,   label: 'Especialista' },
  { min: 20,   label: 'Mestre Cultural' },
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
  state_uf: string | null;
}

interface CityInfo { name: string; state_uf: string; }

export function ProfileScreen({ navigation }: any) {

  const { isDark } = useTheme();
  const C = isDark ? HomeTheme.dark : HomeTheme.light;
  const headerPaddingTop = useHeaderTopPadding();
  const { user, signOut } = useAuthStore();
  const [profile,  setProfile]  = useState<Profile | null>(null);
  const [city,     setCity]     = useState<CityInfo | null>(null);
  const [loading,  setLoading]  = useState(true);
  const [cityRank, setCityRank] = useState<number | null>(null);
  const [copied,   setCopied]   = useState(false);
  const [followersCount, setFollowersCount] = useState(0);
  const [followingCount, setFollowingCount] = useState(0);
  const [quizStats, setQuizStats] = useState({ total: 0, correct: 0 });

  useEffect(() => { loadProfile(); loadFollowInfo(); loadQuizStats(); }, []);

  async function loadQuizStats() {
    if (!user) return;
    const { data: progress } = await supabase
      .from('user_state_progress')
      .select('questions_answered, correct_answers')
      .eq('user_id', user.id);
    
    let total = 0;
    let correct = 0;
    if (progress) {
      for (const p of progress) {
        total += p.questions_answered || 0;
        correct += p.correct_answers || 0;
      }
    }
    setQuizStats({ total, correct });
  }

  async function loadFollowInfo() {
    if (!user) return;
    const [{ count: followers }, { count: following }] = await Promise.all([
      supabase.from('follows').select('follower_id', { count: 'exact', head: true }).eq('following_id', user.id),
      supabase.from('follows').select('following_id', { count: 'exact', head: true }).eq('follower_id', user.id),
    ]);
    setFollowersCount(followers ?? 0);
    setFollowingCount(following ?? 0);
  }

  async function loadProfile() {
    if (!user) return;
    setLoading(true);
    const { data } = await supabase
      .from('profiles')
      .select('id, username, avatar_url, xp, level, streak, plan, plan_expires_at, city_natal_id, created_at, cities!city_natal_id(state_uf)')
      .eq('id', user.id)
      .single();

    if (data) {
      setProfile({ ...data, state_uf: (data as any).cities?.state_uf ?? null } as Profile);
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
      <View style={[styles.center, { backgroundColor: C.bg }]}>
        <ActivityIndicator color={C.green} size="large" />
      </View>
    );
  }

  const xpToNext    = XP_PER_LEVEL;
  const xpCurrent   = getXpInCurrentLevel(profile?.xp ?? 0);
  const xpPct       = getXpProgress(profile?.xp ?? 0);
  const levelInfo   = getLevelInfo(profile?.level ?? 1);
  const isPro       = profile?.plan === 'pro';
  const profileUrl  = `cultura-nacional.vercel.app/${profile?.username ?? ''}`;

  async function handleCopyUrl() {
    await Clipboard.setStringAsync(`https://${profileUrl}`);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  return (
    <ScrollView style={{ flex: 1, backgroundColor: C.bg }} showsVerticalScrollIndicator={false}>

      {/* Back button */}
      <TouchableOpacity 
        onPress={() => navigation.goBack()}
        style={[styles.backButton, { paddingTop: headerPaddingTop }]}
        activeOpacity={0.7}
      >
        <ArrowLeft size={20} color={C.text} />
      </TouchableOpacity>

      {/* Header */}
      <View style={[styles.header]}>
        <View style={{ position: 'relative' }}>
          <View style={[styles.avatar, { backgroundColor: C.card, borderColor: C.border }]}>
            {(profile?.avatar_url || user?.user_metadata?.avatar_url) ? (
              <Image
                source={{ uri: profile?.avatar_url ?? user?.user_metadata?.avatar_url }}
                style={{ width: 72, height: 72, borderRadius: 36 }}
              />
            ) : (
              <User size={30} color={C.subtle} />
            )}
          </View>
          {profile?.plan && <AvatarVerifiedBadge plan={profile.plan} avatarSize={72} />}
        </View>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
          {profile?.state_uf && <StateFlag uf={profile.state_uf} size={20} />}
          <Text style={[styles.username, { color: C.text }]}>{profile?.username ?? 'Explorador'}</Text>
          {profile?.plan && <VerifiedBadge plan={profile.plan} size={20} />}
        </View>
        {isPro ? (
          <TouchableOpacity
            onPress={handleCopyUrl}
            style={[styles.urlPill, { backgroundColor: C.iconBg, borderColor: C.border }]}
          >
            <Text style={[styles.urlText, { color: C.subtle }]} numberOfLines={1}>{profileUrl}</Text>
            {copied
              ? <Check size={14} color={C.green} />
              : <Copy size={14} color={C.muted} />
            }
          </TouchableOpacity>
        ) : (
          <TouchableOpacity
            onPress={() => navigation.navigate('Subscription')}
            style={[styles.urlPill, { backgroundColor: C.iconBg, borderColor: C.border }]}
          >
            <Lock size={12} color={C.muted} />
            <Text style={[styles.urlLockedText, { color: C.muted }]}>
              Assine o Pro pra ter sua URL personalizada
            </Text>
          </TouchableOpacity>
        )}

        {/* Level badge */}
        <View style={[styles.pill, { backgroundColor: C.iconBg, borderColor: C.border }]}>
          <Award size={13} color={C.subtle} />
          <Text style={[styles.pillText, { color: C.subtle }]}>{levelInfo.label}</Text>
        </View>

        {/* City */}
        {city && (
          <View style={styles.cityRow}>
            <MapPin size={12} color={C.muted} />
            <Text style={[styles.cityText, { color: C.muted }]}>{city.name}, {city.state_uf}</Text>
          </View>
        )}

        {/* Seguidores / Seguindo */}
        <View style={styles.followStatsRow}>
          <TouchableOpacity
            style={styles.followStat}
            onPress={() => navigation.navigate('FollowList', { userId: user?.id, type: 'followers' })}
          >
            <Text style={[styles.followStatVal, { color: C.text }]}>{followersCount}</Text>
            <Text style={[styles.followStatLbl, { color: C.muted }]}>Seguidores</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.followStat}
            onPress={() => navigation.navigate('FollowList', { userId: user?.id, type: 'following' })}
          >
            <Text style={[styles.followStatVal, { color: C.text }]}>{followingCount}</Text>
            <Text style={[styles.followStatLbl, { color: C.muted }]}>Seguindo</Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* XP Progress */}
      <View style={[styles.card, styles.xpCard, { backgroundColor: C.card, borderColor: C.border }]}>
        <View style={styles.xpRow}>
          <View>
            <Text style={[styles.xpLabel, { color: C.muted }]}>Experiência</Text>
            <Text style={[styles.xpValue, { color: C.text }]}>{profile?.xp ?? 0} XP total</Text>
          </View>
          <Text style={[styles.xpLevel, { color: C.green }]}>Nível {profile?.level ?? 1}</Text>
        </View>
        <View style={[styles.xpBarBg, { backgroundColor: C.border }]}>
          <View style={[styles.xpBarFill, { width: `${xpPct * 100}%`, backgroundColor: C.green }]} />
        </View>
        <Text style={[styles.xpHint, { color: C.muted }]}>
          {xpCurrent} / {xpToNext} XP para Nível {(profile?.level ?? 1) + 1}
        </Text>
      </View>

      {/* Stats */}
      <View style={[styles.card, styles.statsCard, { backgroundColor: C.card, borderColor: C.border }]}>
        <View style={styles.statItem}>
          <Zap size={18} color={C.yellow} />
          <Text style={[styles.statVal, { color: C.text }]}>{profile?.streak ?? 0}</Text>
          <Text style={[styles.statLbl, { color: C.muted }]}>Streak</Text>
        </View>
        <View style={[styles.statDivider, { backgroundColor: C.border }]} />
        <TouchableOpacity style={styles.statItem} onPress={() => navigation.navigate('CityRanking')}>
          <Trophy size={18} color={C.text} />
          <Text style={[styles.statVal, { color: C.text }]}>{cityRank ? `#${cityRank}` : '-'}</Text>
          <Text style={[styles.statLbl, { color: C.muted }]}>Ranking cidade</Text>
        </TouchableOpacity>
        <View style={[styles.statDivider, { backgroundColor: C.border }]} />
        <TouchableOpacity style={styles.statItem} onPress={() => navigation.navigate('Achievements')}>
          <Star size={18} color={C.text} />
          <Text style={[styles.statVal, { color: C.text }]}>{profile?.level ?? 1}</Text>
          <Text style={[styles.statLbl, { color: C.muted }]}>Nível</Text>
        </TouchableOpacity>
      </View>

      {/* Desempenho */}
      <View style={[styles.card, styles.section, { backgroundColor: C.card, borderColor: C.border }]}>
        <Text style={[styles.sectionTitle, { color: C.muted }]}>DESEMPENHO NO QUIZ</Text>
        <View style={styles.quizStatsRow}>
          <View style={styles.quizStat}>
            <Text style={[styles.quizStatVal, { color: C.text }]}>{quizStats.total}</Text>
            <Text style={[styles.quizStatLbl, { color: C.muted }]}>Respondidas</Text>
          </View>
          <View style={styles.quizStat}>
            <Text style={[styles.quizStatVal, { color: C.green }]}>
              {quizStats.total > 0 ? Math.round((quizStats.correct / quizStats.total) * 100) : 0}%
            </Text>
            <Text style={[styles.quizStatLbl, { color: C.muted }]}>Acertos</Text>
          </View>
          <View style={styles.quizStat}>
            <Text style={[styles.quizStatVal, { color: '#F09595' }]}>
              {quizStats.total > 0 ? Math.round(((quizStats.total - quizStats.correct) / quizStats.total) * 100) : 0}%
            </Text>
            <Text style={[styles.quizStatLbl, { color: C.muted }]}>Erros</Text>
          </View>
        </View>
      </View>

      {/* Plan */}
      <View style={[styles.card, styles.section, { backgroundColor: C.card, borderColor: C.border }]}>
        <Text style={[styles.sectionTitle, { color: C.muted }]}>PLANO</Text>
        <View style={styles.planRow}>
          {(() => {
            const p = profile?.plan ?? 'free';
            const isPremium = p === 'pro' || p === 'family' || p === 'education';
            const planLabel   = p === 'pro' ? 'CN Pro' : p === 'family' ? 'Família' : p === 'education' ? 'Educação' : 'Gratuito';
            const planColor   = p === 'pro' ? '#1877F2' : p === 'family' ? '#009C3B' : p === 'education' ? '#7F77DD' : C.subtle;
            const planBgColor = p === 'pro' ? '#1877F220' : p === 'family' ? '#009C3B20' : p === 'education' ? '#7F77DD20' : C.iconBg;
            return (
              <>
                <View style={[styles.pill, { backgroundColor: isPremium ? planBgColor : C.iconBg, borderColor: isPremium ? planColor : C.border }]}>
                  <Text style={[styles.pillText, { color: isPremium ? planColor : C.subtle }]}>{planLabel}</Text>
                </View>
                {!isPremium && (
                  <TouchableOpacity
                    onPress={() => navigation.navigate('Subscription')}
                    style={[styles.upgradeBtn, { backgroundColor: C.green }]}
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
      <View style={[styles.card, styles.menuCard, { backgroundColor: C.card, borderColor: C.border }]}>
        <Text style={[styles.sectionTitle, { color: C.muted }]}>CONTA</Text>
        {[
          { icon: MapPin,   label: 'Minha cidade natal',  onPress: () => navigation.navigate('CidadeSetup') },
          { icon: Trophy,   label: 'Minhas conquistas',   onPress: () => navigation.navigate('Achievements') },
          { icon: Zap,      label: 'Missões diárias',     onPress: () => navigation.navigate('Missions') },
          { icon: Swords,   label: 'Duelo 1v1',           onPress: () => navigation.navigate('Duel') },
        ].map(({ icon: Icon, label, onPress }) => (
          <TouchableOpacity key={label} onPress={onPress} style={[styles.menuItem, { borderTopColor: C.border }]}>
            <View style={[styles.iconBoxSm, { backgroundColor: C.iconBg, borderColor: C.border }]}>
              <Icon size={14} color={C.text} />
            </View>
            <Text style={[styles.menuLabel, { color: C.text }]}>{label}</Text>
            <ChevronRight size={15} color={C.muted} />
          </TouchableOpacity>
        ))}
      </View>

      {/* Logout */}
      <TouchableOpacity
        onPress={signOut}
        style={[styles.card, styles.logoutBtn, { backgroundColor: C.card, borderColor: '#E24B4A44' }]}
      >
        <LogOut size={16} color="#F09595" />
        <Text style={[styles.logoutText, { color: '#F09595' }]}>Sair da conta</Text>
      </TouchableOpacity>

      <View style={{ height: 40 }} />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  center:        { flex: 1, justifyContent: 'center', alignItems: 'center' },
  backButton:    { paddingHorizontal: Spacing.xl, paddingVertical: Spacing.md },
  header:        { alignItems: 'center', paddingHorizontal: Spacing.xl, paddingBottom: Spacing.lg, gap: 8 },
  card:          { borderWidth: 1, borderRadius: 16 },
  avatar:        { width: 72, height: 72, borderRadius: 36, alignItems: 'center', justifyContent: 'center', borderWidth: 1, marginBottom: 4 },
  username:      { fontSize: FontSize.lg, fontWeight: FontWeight.bold },
  email:         { fontSize: FontSize.xs },
  urlPill:       { flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: 12, paddingVertical: 6, borderRadius: Radius.full, borderWidth: 1, maxWidth: '90%' },
  urlText:       { fontSize: FontSize.xs, fontWeight: FontWeight.medium, flexShrink: 1 },
  urlLockedText: { fontSize: FontSize.xs, flexShrink: 1 },
  pill:          { flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: 12, paddingVertical: 5, borderRadius: Radius.full, borderWidth: 1 },
  pillText:      { fontSize: FontSize.xs, fontWeight: FontWeight.medium },
  cityRow:       { flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: 4 },
  cityText:      { fontSize: FontSize.xs },
  followStatsRow:  { flexDirection: 'row', gap: 24, marginTop: 12 },
  followStat:      { alignItems: 'center' },
  followStatVal:   { fontSize: FontSize.md, fontWeight: FontWeight.bold },
  followStatLbl:   { fontSize: 10, marginTop: 1 },
  xpCard:        { margin: Spacing.xl, marginBottom: Spacing.md, padding: Spacing.lg },
  xpRow:         { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: Spacing.md },
  xpLabel:       { fontSize: FontSize.xs, marginBottom: 2 },
  xpValue:       { fontSize: FontSize.sm, fontWeight: FontWeight.bold },
  xpLevel:       { fontSize: FontSize.sm, fontWeight: FontWeight.bold },
  xpBarBg:       { height: 3, borderRadius: 99, marginBottom: 6, overflow: 'hidden' },
  xpBarFill:     { height: 3, borderRadius: 99 },
  xpHint:        { fontSize: 10 },
  statsCard:     { flexDirection: 'row', marginHorizontal: Spacing.xl, marginBottom: Spacing.md, padding: Spacing.lg },
  statItem:      { flex: 1, alignItems: 'center', gap: 4 },
  statVal:       { fontSize: FontSize.md, fontWeight: FontWeight.bold },
  statLbl:       { fontSize: 9, textAlign: 'center' },
  statDivider:   { width: 1 },
  quizStatsRow:  { flexDirection: 'row', justifyContent: 'space-between', paddingHorizontal: Spacing.sm },
  quizStat:      { alignItems: 'center', gap: 4 },
  quizStatVal:   { fontSize: FontSize.lg, fontWeight: FontWeight.bold },
  quizStatLbl:   { fontSize: FontSize.xs },
  section:       { marginHorizontal: Spacing.xl, marginBottom: Spacing.md, padding: Spacing.lg },
  sectionTitle:  { fontSize: 10, fontWeight: FontWeight.bold, letterSpacing: 0.6, marginBottom: Spacing.md, textTransform: 'uppercase' },
  planRow:       { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  upgradeBtn:    { paddingHorizontal: 14, paddingVertical: 7, borderRadius: Radius.md },
  upgradeBtnText: { color: '#FFF', fontSize: FontSize.xs, fontWeight: FontWeight.bold },
  menuCard:      { marginHorizontal: Spacing.xl, marginBottom: Spacing.md, padding: Spacing.lg, paddingTop: Spacing.lg },
  menuItem:      { flexDirection: 'row', alignItems: 'center', gap: 10, paddingVertical: 11, borderTopWidth: 1 },
  iconBoxSm:     { width: 30, height: 30, borderRadius: 8, borderWidth: 1, alignItems: 'center', justifyContent: 'center' },
  menuLabel:     { flex: 1, fontSize: FontSize.xs },
  logoutBtn:     { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, marginHorizontal: Spacing.xl, padding: Spacing.md },
  logoutText:    { fontSize: FontSize.xs, fontWeight: FontWeight.bold },
});
