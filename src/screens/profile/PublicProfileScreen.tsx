import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, Image, ScrollView, TouchableOpacity, ActivityIndicator } from 'react-native';
import { ArrowLeft, User, MapPin, Trophy, Zap, Star, Award, Copy, UserPlus, UserCheck, Swords } from 'lucide-react-native';
import { useTheme } from '../../hooks/useTheme';
import { useHeaderTopPadding } from '../../hooks/useHeaderTopPadding';
import { supabase } from '../../lib/supabase';
import { useAuthStore } from '../../store/authStore';
import { Spacing, FontSize, FontWeight, Radius, scaleFont } from '../../constants/layout';
import { HomeTheme } from '../../constants/colors';
import { getXpProgress, XP_PER_LEVEL } from '../../utils/xp';
import { VerifiedBadge, AvatarVerifiedBadge } from '../../components/ui/VerifiedBadge';
import { StateFlag } from '../../components/ui/StateFlag';
import { Plan } from '../../types';
import * as Clipboard from 'expo-clipboard';

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
  city_natal_id: string | null;
  state_uf: string | null;
}

interface CityInfo { name: string; state_uf: string; }

export function PublicProfileScreen({ route, navigation }: any) {
  const { userId } = route.params;
  const { isDark } = useTheme();
  const C = isDark ? HomeTheme.dark : HomeTheme.light;
  const headerPaddingTop = useHeaderTopPadding();
  const { user } = useAuthStore();
  const [profile,     setProfile]     = useState<Profile | null>(null);
  const [city,        setCity]        = useState<CityInfo | null>(null);
  const [cityRank,    setCityRank]    = useState<number | null>(null);
  const [loading,     setLoading]     = useState(true);
  const [notFound,    setNotFound]    = useState(false);
  const [isFollowing, setIsFollowing] = useState(false);
  const [followLoading, setFollowLoading] = useState(false);
  const [followersCount, setFollowersCount] = useState(0);
  const [followingCount, setFollowingCount] = useState(0);
  const [copied,      setCopied]      = useState(false);
  const [quizStats, setQuizStats] = useState({ total: 0, correct: 0 });

  const isMe = user?.id === userId;

  useEffect(() => {
    loadProfile();
    loadFollowInfo();
    loadQuizStats();
  }, [userId]);

  async function loadQuizStats() {
    const { data: progress } = await supabase
      .from('user_state_progress')
      .select('questions_answered, correct_answers')
      .eq('user_id', userId);
    
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
    const [{ count: followers }, { count: following }] = await Promise.all([
      supabase.from('follows').select('follower_id', { count: 'exact', head: true }).eq('following_id', userId),
      supabase.from('follows').select('following_id', { count: 'exact', head: true }).eq('follower_id', userId),
    ]);
    setFollowersCount(followers ?? 0);
    setFollowingCount(following ?? 0);

    if (user && user.id !== userId) {
      const { data } = await supabase
        .from('follows')
        .select('follower_id')
        .eq('follower_id', user.id)
        .eq('following_id', userId)
        .maybeSingle();
      setIsFollowing(!!data);
    }
  }

  async function toggleFollow() {
    if (!user || followLoading) return;
    setFollowLoading(true);
    if (isFollowing) {
      await supabase.from('follows').delete().eq('follower_id', user.id).eq('following_id', userId);
      setIsFollowing(false);
      setFollowersCount(c => Math.max(0, c - 1));
    } else {
      await supabase.from('follows').insert({ follower_id: user.id, following_id: userId });
      setIsFollowing(true);
      setFollowersCount(c => c + 1);

      // Notifica o seguido
      const { data: myProfile } = await supabase.from('profiles').select('username, avatar_url').eq('id', user.id).single();
      const myUsername = myProfile?.username ?? 'Alguém';
      
      await supabase.from('notifications').insert({
        user_id: userId,
        type:    'new_follower',
        title:   'Novo seguidor',
        body:    `${myUsername} começou a seguir você.`,
        data:    { followerId: user.id, followerUsername: myUsername, followerAvatar: myProfile?.avatar_url },
      });
    }
    setFollowLoading(false);
  }

  async function handleCopyUrl() {
    if (!profile?.username) return;
    await Clipboard.setStringAsync(`https://cultura-nacional.vercel.app/${profile.username}`);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  async function loadProfile() {
    setLoading(true);
    setNotFound(false);
    const { data } = await supabase
      .from('profiles')
      .select('username, avatar_url, xp, level, streak, plan, city_natal_id, cities!city_natal_id(state_uf)')
      .eq('id', userId)
      .single();

    if (data) {
      setProfile({ ...data, state_uf: (data as any).cities?.state_uf ?? null } as Profile);
      if (data.city_natal_id) {
        const [{ data: cityData }, { data: rankData }] = await Promise.all([
          supabase.from('cities').select('name, state_uf').eq('id', data.city_natal_id).single(),
          supabase.from('city_rankings').select('position').eq('city_id', data.city_natal_id).eq('user_id', userId).single(),
        ]);
        if (cityData) setCity(cityData);
        if (rankData) setCityRank(rankData.position);
      }
    } else {
      setNotFound(true);
    }
    setLoading(false);
  }

  const xpToNext  = XP_PER_LEVEL;
  const xpPct     = getXpProgress(profile?.xp ?? 0);
  const levelInfo = getLevelInfo(profile?.level ?? 1);
  const isProProfile = profile?.plan === 'pro';

  return (
    <ScrollView style={{ flex: 1, backgroundColor: C.bg }} showsVerticalScrollIndicator={false}>

      {/* Topbar */}
      <View style={[styles.topBar, { paddingTop: headerPaddingTop, borderBottomColor: C.border }]}>
        <TouchableOpacity onPress={() => navigation.goBack()}>
          <ArrowLeft size={22} color={C.text} />
        </TouchableOpacity>
        <Text style={[styles.topTitle, { color: C.text }]}>Perfil</Text>
        <View style={{ width: 22 }} />
      </View>

      {loading ? (
        <View style={[styles.center, { backgroundColor: C.bg }]}>
          <ActivityIndicator color={C.green} size="large" />
        </View>
      ) : notFound ? (
        <View style={styles.center}>
          <User size={36} color={C.muted} />
          <Text style={[styles.emptyText, { color: C.muted }]}>Perfil não encontrado.</Text>
        </View>
      ) : (
        <>
          {/* Header */}
          <View style={styles.header}>
            <View style={{ position: 'relative' }}>
              <View style={[styles.avatar, { backgroundColor: C.card, borderColor: C.border }]}>
                {profile?.avatar_url ? (
                  <Image source={{ uri: profile.avatar_url }} style={{ width: 72, height: 72, borderRadius: 36 }} />
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

            <View style={[styles.pill, { backgroundColor: C.iconBg, borderColor: C.border }]}>
              <Award size={13} color={C.subtle} />
              <Text style={[styles.pillText, { color: C.subtle }]}>{levelInfo.label}</Text>
            </View>

            {city && (
              <View style={styles.cityRow}>
                <MapPin size={12} color={C.muted} />
                <Text style={[styles.cityText, { color: C.muted }]}>{city.name}, {city.state_uf}</Text>
              </View>
            )}

            {isProProfile && (
              <TouchableOpacity
                onPress={handleCopyUrl}
                style={[styles.urlPill, { backgroundColor: C.iconBg, borderColor: C.border }]}
              >
                <Text style={[styles.urlText, { color: C.subtle }]} numberOfLines={1}>
                  cultura-nacional.vercel.app/{profile?.username}
                </Text>
                <Copy size={13} color={C.muted} />
              </TouchableOpacity>
            )}

            {/* Seguidores / Seguindo */}
            <View style={styles.followStatsRow}>
              <TouchableOpacity
                style={styles.followStat}
                onPress={() => navigation.navigate('FollowList', { userId, type: 'followers' })}
              >
                <Text style={[styles.followStatVal, { color: C.text }]}>{followersCount}</Text>
                <Text style={[styles.followStatLbl, { color: C.muted }]}>Seguidores</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.followStat}
                onPress={() => navigation.navigate('FollowList', { userId, type: 'following' })}
              >
                <Text style={[styles.followStatVal, { color: C.text }]}>{followingCount}</Text>
                <Text style={[styles.followStatLbl, { color: C.muted }]}>Seguindo</Text>
              </TouchableOpacity>
            </View>

            {!isMe && (
              <View style={styles.actionRow}>
                <TouchableOpacity
                  onPress={toggleFollow}
                  disabled={followLoading}
                  style={[
                    styles.followBtn,
                    { flex: 1 },
                    isFollowing
                      ? { backgroundColor: C.card, borderWidth: 1, borderColor: C.border }
                      : { backgroundColor: C.green },
                  ]}
                >
                  {isFollowing ? <UserCheck size={16} color={C.text} /> : <UserPlus size={16} color="#FFF" />}
                  <Text style={[styles.followBtnText, { color: isFollowing ? C.text : '#FFF' }]}>
                    {isFollowing ? 'Seguindo' : 'Adicionar'}
                  </Text>
                </TouchableOpacity>

                <TouchableOpacity
                  onPress={() => navigation.navigate('Duel', { challengeUserId: userId })}
                  style={[styles.followBtn, styles.duelBtn, { borderColor: C.border }]}
                >
                  <Swords size={16} color={C.text} />
                  <Text style={[styles.followBtnText, { color: C.text }]}>Desafiar</Text>
                </TouchableOpacity>
              </View>
            )}
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
          </View>

          {/* Stats */}
          <View style={[styles.card, styles.statsCard, { backgroundColor: C.card, borderColor: C.border }]}>
            <View style={styles.statItem}>
              <Zap size={18} color={C.yellow} />
              <Text style={[styles.statVal, { color: C.text }]}>{profile?.streak ?? 0}</Text>
              <Text style={[styles.statLbl, { color: C.muted }]}>Streak</Text>
            </View>
            <View style={[styles.statDivider, { backgroundColor: C.border }]} />
            <View style={styles.statItem}>
              <Trophy size={18} color={C.text} />
              <Text style={[styles.statVal, { color: C.text }]}>{cityRank ? `#${cityRank}` : '-'}</Text>
              <Text style={[styles.statLbl, { color: C.muted }]}>Ranking cidade</Text>
            </View>
            <View style={[styles.statDivider, { backgroundColor: C.border }]} />
            <View style={styles.statItem}>
              <Star size={18} color={C.text} />
              <Text style={[styles.statVal, { color: C.text }]}>{profile?.level ?? 1}</Text>
              <Text style={[styles.statLbl, { color: C.muted }]}>Nível</Text>
            </View>
          </View>

          {/* Desempenho */}
          <View style={[styles.card, { marginHorizontal: Spacing.xl, marginBottom: Spacing.md, padding: Spacing.lg, backgroundColor: C.card, borderColor: C.border }]}>
            <Text style={{ fontSize: FontSize.xs, fontWeight: FontWeight.bold, color: C.muted, marginBottom: Spacing.md }}>DESEMPENHO NO QUIZ</Text>
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
        </>
      )}

      <View style={{ height: 40 }} />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  center:       { flex: 1, justifyContent: 'center', alignItems: 'center', gap: 12, paddingTop: 60 },
  topBar:       { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: Spacing.xl, paddingBottom: 14, borderBottomWidth: 1 },
  topTitle:     { fontSize: FontSize.md, fontWeight: FontWeight.medium },
  header:       { alignItems: 'center', paddingHorizontal: Spacing.xl, paddingVertical: Spacing.lg, gap: 8 },
  card:         { borderWidth: 1, borderRadius: 16 },
  avatar:       { width: 72, height: 72, borderRadius: 36, alignItems: 'center', justifyContent: 'center', borderWidth: 1, marginBottom: 4 },
  username:     { fontSize: FontSize.lg, fontWeight: FontWeight.bold },
  pill:         { flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: 12, paddingVertical: 5, borderRadius: Radius.full, borderWidth: 1 },
  pillText:     { fontSize: FontSize.xs, fontWeight: FontWeight.medium },
  cityRow:      { flexDirection: 'row', alignItems: 'center', gap: 4 },
  cityText:     { fontSize: FontSize.xs },
  urlPill:      { flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: 12, paddingVertical: 6, borderRadius: Radius.full, borderWidth: 1, maxWidth: '90%' },
  urlText:      { fontSize: FontSize.xs, fontWeight: FontWeight.medium, flexShrink: 1 },
  followStatsRow: { flexDirection: 'row', gap: 24, marginTop: 4 },
  followStat:     { alignItems: 'center' },
  followStatVal:  { fontSize: FontSize.md, fontWeight: FontWeight.bold },
  followStatLbl:  { fontSize: scaleFont(10), marginTop: 1 },
  actionRow:      { flexDirection: 'row', gap: 10, marginTop: 4, width: '100%' },
  followBtn:      { flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: 20, paddingVertical: 9, borderRadius: Radius.full },
  followBtnText:  { fontSize: FontSize.sm, fontWeight: FontWeight.bold },
  duelBtn:        { backgroundColor: 'transparent', borderWidth: 1 },
  xpCard:       { marginHorizontal: Spacing.xl, marginBottom: Spacing.md, padding: Spacing.lg },
  xpRow:        { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: Spacing.md },
  xpLabel:      { fontSize: FontSize.xs, marginBottom: 2 },
  xpValue:      { fontSize: FontSize.sm, fontWeight: FontWeight.bold },
  xpLevel:      { fontSize: FontSize.sm, fontWeight: FontWeight.bold },
  xpBarBg:      { height: 3, borderRadius: 99, overflow: 'hidden' },
  xpBarFill:    { height: 3, borderRadius: 99 },
  statsCard:    { flexDirection: 'row', marginHorizontal: Spacing.xl, marginBottom: Spacing.md, padding: Spacing.lg },
  statItem:     { flex: 1, alignItems: 'center', gap: 4 },
  statVal:      { fontSize: FontSize.md, fontWeight: FontWeight.bold },
  statLbl:      { fontSize: scaleFont(9), textAlign: 'center' },
  statDivider:  { width: 1 },
  quizStatsRow: { flexDirection: 'row', justifyContent: 'space-between', paddingHorizontal: Spacing.sm },
  quizStat:     { alignItems: 'center', gap: 4 },
  quizStatVal:  { fontSize: FontSize.lg, fontWeight: FontWeight.bold },
  quizStatLbl:  { fontSize: FontSize.xs },
  emptyText:    { fontSize: FontSize.sm, textAlign: 'center' },
});
