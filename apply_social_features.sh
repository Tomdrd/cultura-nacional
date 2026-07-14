#!/usr/bin/env bash
set -e

# Rode este script na RAIZ do repositorio cultura-nacional clonado localmente.
echo "Aplicando mudancas de rede social (perfil publico, seguir, URL personalizada)..."

mkdir -p src/screens/profile

cat > src/types/navigation.ts << 'FILEEOF0'
export type AuthStackParamList = {
  Login:         undefined;
  Register:      undefined;
  ResetPassword: undefined;
};

export type AppStackParamList = {
  HomeTabs:     undefined;
  Estados:      undefined;
  Categorias:   undefined;
  Musica:       undefined;
  CityQuiz:     { cityId: string; cityName: string };
  Quiz: {
    stateId?:     string;
    stateName?:   string;
    subcategory?: string;
    mode?:        'relampago';
  };
  Duel:         undefined;
  Subscription: undefined;
  Missions:     undefined;
  Achievements: undefined;
  CidadeSetup: undefined;
  ViralMode: {
    stateId?:     string;
    stateName?:   string;
    subcategory?: string;
  };
  PublicProfile: { userId: string };
};

export type HomeTabsParamList = {
  Home:     undefined;
  Ranking:  undefined;
  Profile:  undefined;
  Settings: undefined;
};
FILEEOF0

cat > src/navigation/AppNavigator.tsx << 'FILEEOF1'
import React from 'react';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { AppStackParamList, HomeTabsParamList } from '../types/navigation';
import { Home, Trophy, User, Settings } from 'lucide-react-native';
import { HomeScreen }            from '../screens/home/HomeScreen';
import { RankingScreen }         from '../screens/ranking/RankingScreen';
import { ProfileScreen }         from '../screens/profile/ProfileScreen';
import { PublicProfileScreen }   from '../screens/profile/PublicProfileScreen';
import { SettingsScreen }        from '../screens/settings/SettingsScreen';
import { QuizScreen }            from '../screens/quiz/QuizScreen';
import { DuelScreen }            from '../screens/duel/DuelScreen';
import { SubscriptionScreen }    from '../screens/subscription/SubscriptionScreen';
import { MissionsScreen }        from '../screens/missions/MissionsScreen';
import { AchievementsScreen }    from '../screens/achievements/AchievementsScreen';
import { ViralModeScreen }       from '../screens/viral/ViralModeScreen';
import { EstadosScreen }         from '../screens/estados/EstadosScreen';
import { CategoriasScreen }      from '../screens/categorias/CategoriasScreen';
import { MusicaScreen }          from '../screens/musica/MusicaScreen';
import { CidadeSetupScreen }     from '../screens/onboarding/CidadeSetupScreen';
import { useTheme }              from '../hooks/useTheme';
import { HomeTheme }             from '../constants/colors';
import { useAuthStore }          from '../store/authStore';

const Tab   = createBottomTabNavigator<HomeTabsParamList>();
const Stack = createNativeStackNavigator<AppStackParamList>();

function HomeTabs() {
  const { isDark } = useTheme();
  const C = isDark ? HomeTheme.dark : HomeTheme.light;
  return (
    <Tab.Navigator
      screenOptions={({ route }) => ({
        headerShown: false,
        tabBarStyle: {
          backgroundColor: C.card,
          borderTopColor:  C.border,
          borderTopWidth:  0.5,
          height: 60,
          paddingBottom: 8,
        },
        tabBarActiveTintColor:   C.green,
        tabBarInactiveTintColor: C.muted,
        tabBarLabelStyle: { fontSize: 11, fontWeight: '500' },
        tabBarIcon: ({ color, size }) => {
          if (route.name === 'Home')     return <Home     size={size} color={color} />;
          if (route.name === 'Ranking')  return <Trophy   size={size} color={color} />;
          if (route.name === 'Profile')  return <User     size={size} color={color} />;
          if (route.name === 'Settings') return <Settings size={size} color={color} />;
          return null;
        },
      })}
    >
      <Tab.Screen name="Home"     component={HomeScreen}    options={{ title: 'Explorar' }} />
      <Tab.Screen name="Ranking"  component={RankingScreen} options={{ title: 'Ranking' }} />
      <Tab.Screen name="Profile"  component={ProfileScreen} options={{ title: 'Perfil' }} />
      <Tab.Screen name="Settings" component={SettingsScreen} options={{ title: 'Config' }} />
    </Tab.Navigator>
  );
}

export function AppNavigator() {
  const { cityNatalId } = useAuthStore();

  return (
    <Stack.Navigator
      screenOptions={{ headerShown: false }}
      initialRouteName={cityNatalId === null ? 'CidadeSetup' : 'HomeTabs'}
    >
      <Stack.Screen name="HomeTabs"     component={HomeTabs} />
      <Stack.Screen name="Quiz"         component={QuizScreen} />
      <Stack.Screen name="Duel"         component={DuelScreen} />
      <Stack.Screen name="Subscription" component={SubscriptionScreen} />
      <Stack.Screen name="Missions"     component={MissionsScreen} />
      <Stack.Screen name="Achievements" component={AchievementsScreen} />
      <Stack.Screen name="Estados"      component={EstadosScreen} />
      <Stack.Screen name="Categorias"   component={CategoriasScreen} />
      <Stack.Screen name="Musica"       component={MusicaScreen} />
      <Stack.Screen name="ViralMode"    component={ViralModeScreen} options={{ animation: 'slide_from_bottom' }} />
      <Stack.Screen name="CidadeSetup"  component={CidadeSetupScreen} options={{ animation: 'slide_from_bottom' }} />
      <Stack.Screen name="PublicProfile" component={PublicProfileScreen} />
    </Stack.Navigator>
  );
}
FILEEOF1

cat > src/screens/profile/ProfileScreen.tsx << 'FILEEOF2'
import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, Image, ScrollView, TouchableOpacity, ActivityIndicator } from 'react-native';
import { User, MapPin, Trophy, Zap, Star, LogOut, ChevronRight, Award, Copy, Check, Lock } from 'lucide-react-native';
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

  useEffect(() => { loadProfile(); }, []);

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

      {/* Header */}
      <View style={[styles.header, { paddingTop: headerPaddingTop }]}>
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
  center:       { flex: 1, justifyContent: 'center', alignItems: 'center' },
  header:       { alignItems: 'center', paddingHorizontal: Spacing.xl, paddingBottom: Spacing.lg, gap: 8 },
  card:         { borderWidth: 1, borderRadius: 16 },
  avatar:       { width: 72, height: 72, borderRadius: 36, alignItems: 'center', justifyContent: 'center', borderWidth: 1, marginBottom: 4 },
  username:     { fontSize: FontSize.lg, fontWeight: FontWeight.bold },
  email:        { fontSize: FontSize.xs },
  urlPill:      { flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: 12, paddingVertical: 6, borderRadius: Radius.full, borderWidth: 1, maxWidth: '90%' },
  urlText:      { fontSize: FontSize.xs, fontWeight: FontWeight.medium, flexShrink: 1 },
  urlLockedText:{ fontSize: FontSize.xs, flexShrink: 1 },
  pill:         { flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: 12, paddingVertical: 5, borderRadius: Radius.full, borderWidth: 1 },
  pillText:     { fontSize: FontSize.xs, fontWeight: FontWeight.medium },
  cityRow:      { flexDirection: 'row', alignItems: 'center', gap: 4 },
  cityText:     { fontSize: FontSize.xs },
  xpCard:       { margin: Spacing.xl, marginBottom: Spacing.md, padding: Spacing.lg },
  xpRow:        { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: Spacing.md },
  xpLabel:      { fontSize: FontSize.xs, marginBottom: 2 },
  xpValue:      { fontSize: FontSize.sm, fontWeight: FontWeight.bold },
  xpLevel:      { fontSize: FontSize.sm, fontWeight: FontWeight.bold },
  xpBarBg:      { height: 3, borderRadius: 99, marginBottom: 6, overflow: 'hidden' },
  xpBarFill:    { height: 3, borderRadius: 99 },
  xpHint:       { fontSize: 10 },
  statsCard:    { flexDirection: 'row', marginHorizontal: Spacing.xl, marginBottom: Spacing.md, padding: Spacing.lg },
  statItem:     { flex: 1, alignItems: 'center', gap: 4 },
  statVal:      { fontSize: FontSize.md, fontWeight: FontWeight.bold },
  statLbl:      { fontSize: 9, textAlign: 'center' },
  statDivider:  { width: 1 },
  section:      { marginHorizontal: Spacing.xl, marginBottom: Spacing.md, padding: Spacing.lg },
  sectionTitle: { fontSize: 10, fontWeight: FontWeight.bold, letterSpacing: 0.6, marginBottom: Spacing.md, textTransform: 'uppercase' },
  planRow:      { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  upgradeBtn:   { paddingHorizontal: 14, paddingVertical: 7, borderRadius: Radius.md },
  upgradeBtnText: { color: '#FFF', fontSize: FontSize.xs, fontWeight: FontWeight.bold },
  menuCard:     { marginHorizontal: Spacing.xl, marginBottom: Spacing.md, padding: Spacing.lg, paddingTop: Spacing.lg },
  menuItem:     { flexDirection: 'row', alignItems: 'center', gap: 10, paddingVertical: 11, borderTopWidth: 1 },
  iconBoxSm:    { width: 30, height: 30, borderRadius: 8, borderWidth: 1, alignItems: 'center', justifyContent: 'center' },
  menuLabel:    { flex: 1, fontSize: FontSize.xs },
  logoutBtn:    { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, marginHorizontal: Spacing.xl, padding: Spacing.md },
  logoutText:   { fontSize: FontSize.xs, fontWeight: FontWeight.bold },
});
FILEEOF2

cat > src/screens/profile/PublicProfileScreen.tsx << 'FILEEOF3'
import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, Image, ScrollView, TouchableOpacity, ActivityIndicator } from 'react-native';
import { ArrowLeft, User, MapPin, Trophy, Zap, Star, Award, Copy, UserPlus, UserCheck } from 'lucide-react-native';
import { useTheme } from '../../hooks/useTheme';
import { useHeaderTopPadding } from '../../hooks/useHeaderTopPadding';
import { supabase } from '../../lib/supabase';
import { useAuthStore } from '../../store/authStore';
import { Spacing, FontSize, FontWeight, Radius } from '../../constants/layout';
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

  useEffect(() => { loadProfile(); loadFollowInfo(); }, [userId]);

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
  const isMe      = user?.id === userId;
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
              <View style={styles.followStat}>
                <Text style={[styles.followStatVal, { color: C.text }]}>{followersCount}</Text>
                <Text style={[styles.followStatLbl, { color: C.muted }]}>Seguidores</Text>
              </View>
              <View style={styles.followStat}>
                <Text style={[styles.followStatVal, { color: C.text }]}>{followingCount}</Text>
                <Text style={[styles.followStatLbl, { color: C.muted }]}>Seguindo</Text>
              </View>
            </View>

            {!isMe && (
              <TouchableOpacity
                onPress={toggleFollow}
                disabled={followLoading}
                style={[
                  styles.followBtn,
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
  followStatLbl:  { fontSize: 10, marginTop: 1 },
  followBtn:      { flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: 20, paddingVertical: 9, borderRadius: Radius.full, marginTop: 4 },
  followBtnText:  { fontSize: FontSize.sm, fontWeight: FontWeight.bold },
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
  statLbl:      { fontSize: 9, textAlign: 'center' },
  statDivider:  { width: 1 },
  emptyText:    { fontSize: FontSize.sm, textAlign: 'center' },
});
FILEEOF3

cat > src/screens/ranking/RankingScreen.tsx << 'FILEEOF4'
import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, ActivityIndicator, Image } from 'react-native';
import { Trophy, MapPin, Globe, User } from 'lucide-react-native';
import { useTheme } from '../../hooks/useTheme';
import { useHeaderTopPadding } from '../../hooks/useHeaderTopPadding';
import { supabase } from '../../lib/supabase';
import { useAuthStore } from '../../store/authStore';
import { Spacing, FontSize, FontWeight, Radius } from '../../constants/layout';
import { HomeTheme, MedalColors } from '../../constants/colors';
import { VerifiedBadge, AvatarVerifiedBadge } from '../../components/ui/VerifiedBadge';
import { StateFlag } from '../../components/ui/StateFlag';
import { Plan } from '../../types';

type Scope = 'national' | 'state' | 'city';

interface RankEntry {
  user_id: string;
  xp: number;
  level: number;
  username: string;
  avatar_url?: string | null;
  city_name?: string;
  state_uf?: string;
  plan?: Plan;
}

interface MyLocation {
  city_natal_id: string | null;
  state_uf: string | null;
}

export function RankingScreen({ navigation }: any) {
  const { isDark } = useTheme();
  const C = isDark ? HomeTheme.dark : HomeTheme.light;
  const headerPaddingTop = useHeaderTopPadding();
  const { user } = useAuthStore();
  const [scope,      setScope]      = useState<Scope>('national');
  const [entries,    setEntries]    = useState<RankEntry[]>([]);
  const [loading,    setLoading]    = useState(true);
  const [myRank,     setMyRank]     = useState<number | null>(null);
  const [myLocation, setMyLocation] = useState<MyLocation | null>(null);
  const [scopeLabel, setScopeLabel] = useState('');

  // Carrega localização do usuário uma vez
  useEffect(() => {
    async function loadMyLocation() {
      if (!user) return;
      const { data } = await supabase
        .from('profiles')
        .select('city_natal_id, cities!city_natal_id(state_uf)')
        .eq('id', user.id)
        .single();
      if (data) {
        setMyLocation({
          city_natal_id: data.city_natal_id ?? null,
          state_uf:      (data as any).cities?.state_uf ?? null,
        });
      }
    }
    loadMyLocation();
  }, [user]);

  useEffect(() => { loadRanking(); }, [scope, myLocation]);

  async function loadRanking() {
    setLoading(true);

    let query = supabase
      .from('profiles')
      .select('id, username, xp, level, avatar_url, plan, city_natal_id, cities!city_natal_id(name, state_uf)')
      .order('xp', { ascending: false })
      .limit(50);

    if (scope === 'city' && myLocation?.city_natal_id) {
      query = query.eq('city_natal_id', myLocation.city_natal_id);
      setScopeLabel('sua cidade');
    } else if (scope === 'state' && myLocation?.state_uf) {
      // Filtra por state_uf via join com cities
      query = supabase
        .from('profiles')
        .select('id, username, xp, level, avatar_url, plan, city_natal_id, cities!city_natal_id(name, state_uf)')
        .eq('cities.state_uf', myLocation.state_uf.trim())
        .order('xp', { ascending: false })
        .limit(50);
      setScopeLabel('seu estado');
    } else if (scope === 'national') {
      setScopeLabel('');
    }

    // Se scope requer localização mas não tem, mostra vazio
    if ((scope === 'city' || scope === 'state') && !myLocation) {
      setEntries([]);
      setMyRank(null);
      setLoading(false);
      return;
    }

    const { data } = await query;

    if (data) {
      const mapped = data.map((p: any) => ({
        user_id:   p.id,
        xp:        p.xp,
        level:     p.level,
        username:  p.username ?? 'Anônimo',
        avatar_url: p.avatar_url ?? null,
        city_name:  p.cities?.name ?? null,
        state_uf:   p.cities?.state_uf ?? null,
        plan:       (p.plan ?? 'free') as Plan,
      }));
      setEntries(mapped);

      // Posição real do usuário no ranking filtrado
      const myIndex = mapped.findIndex(e => e.user_id === user?.id);
      if (myIndex >= 0) {
        setMyRank(myIndex + 1);
      } else {
        // Busca posição real se fora do top 50
        const { count } = await supabase
          .from('profiles')
          .select('id', { count: 'exact', head: true })
          .gt('xp', mapped[0]?.xp ?? 0);
        setMyRank(count ? count + 1 : null);
      }
    }
    setLoading(false);
  }

  const podium = entries.slice(0, 3);
  const rest   = entries.slice(3);

  function goToProfile(entryUserId: string) {
    if (entryUserId === user?.id) {
      navigation.navigate('HomeTabs', { screen: 'Profile' });
    } else {
      navigation.navigate('PublicProfile', { userId: entryUserId });
    }
  }

  // Mensagem quando aba requer localização não configurada
  const needsLocation = (scope === 'city' || scope === 'state') && myLocation && !myLocation.city_natal_id;

  return (
    <ScrollView style={{ flex: 1, backgroundColor: C.bg }} showsVerticalScrollIndicator={false}>

      {/* Header */}
      <View style={[styles.header, { paddingTop: headerPaddingTop }]}>
        <Trophy size={22} color={C.yellow} />
        <Text style={[styles.title, { color: C.text }]}>Ranking</Text>
        {myRank ? (
          <View style={[styles.pill, { backgroundColor: `${C.green}18`, borderColor: `${C.green}44` }]}>
            <Text style={[styles.pillText, { color: C.green }]}>
              Sua posição: #{myRank}{scopeLabel ? ` em ${scopeLabel}` : ''}
            </Text>
          </View>
        ) : scope !== 'national' && (
          <View style={[styles.pill, { backgroundColor: C.iconBg, borderColor: C.border }]}>
            <Text style={[styles.pillText, { color: C.muted }]}>Fora do top 50</Text>
          </View>
        )}
      </View>

      {/* Scope tabs */}
      <View style={[styles.tabs, { borderBottomColor: C.border }]}>
        {([
          { key: 'national', label: 'Nacional', Icon: Globe  },
          { key: 'state',    label: 'Estado',   Icon: MapPin },
          { key: 'city',     label: 'Cidade',   Icon: User   },
        ] as { key: Scope; label: string; Icon: any }[]).map(({ key, label, Icon }) => (
          <TouchableOpacity
            key={key}
            onPress={() => setScope(key)}
            style={[styles.tab, scope === key && { borderBottomColor: C.green, borderBottomWidth: 2 }]}
          >
            <Icon size={14} color={scope === key ? C.green : C.muted} />
            <Text style={[styles.tabText, { color: scope === key ? C.green : C.muted }]}>{label}</Text>
          </TouchableOpacity>
        ))}
      </View>

      {loading ? (
        <View style={styles.center}>
          <ActivityIndicator color={C.green} size="large" />
        </View>
      ) : needsLocation ? (
        <View style={styles.center}>
          <MapPin size={36} color={C.muted} />
          <Text style={[styles.emptyText, { color: C.muted }]}>
            Configure sua cidade natal no perfil{'\n'}para ver o ranking local.
          </Text>
        </View>
      ) : (
        <>
          {/* Podium */}
          {podium.length >= 1 && (
            <View style={[styles.card, styles.podiumWrap, { backgroundColor: C.card, borderColor: C.border }]}>
              {/* 2nd */}
              <TouchableOpacity style={styles.podiumItem} onPress={() => podium[1] && goToProfile(podium[1].user_id)} disabled={!podium[1]}>
                <View style={{ position: 'relative' }}>
                  {podium[1]?.avatar_url
                    ? <Image source={{ uri: podium[1].avatar_url }} style={[styles.podiumAvatar, { borderColor: MedalColors.silver }]} />
                    : <View style={[styles.podiumAvatar, { backgroundColor: `${MedalColors.silver}18`, borderColor: MedalColors.silver }]}><User size={18} color={MedalColors.silver} /></View>
                  }
                  {podium[1]?.plan && <AvatarVerifiedBadge plan={podium[1].plan} avatarSize={44} />}
                </View>
                <Text style={[styles.podiumMedal, { color: MedalColors.silver }]}>2º</Text>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 3 }}>
                  {podium[1]?.state_uf && <StateFlag uf={podium[1].state_uf} size={14} />}
                  <Text style={[styles.podiumName, { color: C.text }]} numberOfLines={1}>{podium[1]?.username}</Text>
                  {podium[1]?.plan && <VerifiedBadge plan={podium[1].plan} size={12} />}
                </View>
                <Text style={[styles.podiumXp, { color: C.muted }]}>{podium[1]?.xp} XP</Text>
              </TouchableOpacity>
              {/* 1st */}
              <TouchableOpacity style={[styles.podiumItem, styles.podiumFirst]} onPress={() => podium[0] && goToProfile(podium[0].user_id)} disabled={!podium[0]}>
                <View style={{ position: 'relative' }}>
                  {podium[0]?.avatar_url
                    ? <Image source={{ uri: podium[0].avatar_url }} style={[styles.podiumAvatar, styles.podiumAvatarLg, { borderColor: MedalColors.gold }]} />
                    : <View style={[styles.podiumAvatar, styles.podiumAvatarLg, { backgroundColor: `${MedalColors.gold}18`, borderColor: MedalColors.gold }]}><User size={26} color={MedalColors.gold} /></View>
                  }
                  {podium[0]?.plan && <AvatarVerifiedBadge plan={podium[0].plan} avatarSize={56} />}
                </View>
                <Trophy size={16} color={MedalColors.gold} />
                <Text style={[styles.podiumMedal, { color: MedalColors.gold }]}>1º</Text>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 3 }}>
                  {podium[0]?.state_uf && <StateFlag uf={podium[0].state_uf} size={14} />}
                  <Text style={[styles.podiumName, { color: C.text }]} numberOfLines={1}>{podium[0]?.username}</Text>
                  {podium[0]?.plan && <VerifiedBadge plan={podium[0].plan} size={12} />}
                </View>
                <Text style={[styles.podiumXp, { color: C.muted }]}>{podium[0]?.xp} XP</Text>
              </TouchableOpacity>
              {/* 3rd */}
              <TouchableOpacity style={styles.podiumItem} onPress={() => podium[2] && goToProfile(podium[2].user_id)} disabled={!podium[2]}>
                <View style={{ position: 'relative' }}>
                  {podium[2]?.avatar_url
                    ? <Image source={{ uri: podium[2].avatar_url }} style={[styles.podiumAvatar, { borderColor: MedalColors.bronze }]} />
                    : <View style={[styles.podiumAvatar, { backgroundColor: `${MedalColors.bronze}18`, borderColor: MedalColors.bronze }]}><User size={18} color={MedalColors.bronze} /></View>
                  }
                  {podium[2]?.plan && <AvatarVerifiedBadge plan={podium[2].plan} avatarSize={44} />}
                </View>
                <Text style={[styles.podiumMedal, { color: MedalColors.bronze }]}>3º</Text>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 3 }}>
                  {podium[2]?.state_uf && <StateFlag uf={podium[2].state_uf} size={14} />}
                  <Text style={[styles.podiumName, { color: C.text }]} numberOfLines={1}>{podium[2]?.username}</Text>
                  {podium[2]?.plan && <VerifiedBadge plan={podium[2].plan} size={12} />}
                </View>
                <Text style={[styles.podiumXp, { color: C.muted }]}>{podium[2]?.xp} XP</Text>
              </TouchableOpacity>
            </View>
          )}

          {/* Rest of ranking */}
          <View style={styles.list}>
            {rest.map((entry, i) => {
              const isMe = entry.user_id === user?.id;
              return (
                <TouchableOpacity key={entry.user_id} onPress={() => goToProfile(entry.user_id)} style={[styles.card, styles.row, {
                  backgroundColor: isMe ? `${C.green}0f` : C.card,
                  borderColor:     isMe ? `${C.green}44` : C.border,
                }]}>
                  <Text style={[styles.rank, { color: C.muted }]}>#{i + 4}</Text>
                  <View style={{ position: 'relative' }}>
                    {entry.avatar_url
                      ? <Image source={{ uri: entry.avatar_url }} style={styles.rowAvatar} />
                      : <View style={[styles.rowAvatar, { backgroundColor: C.iconBg, borderWidth: 1, borderColor: C.border }]}><User size={14} color={C.muted} /></View>
                    }
                    {entry.plan && <AvatarVerifiedBadge plan={entry.plan} avatarSize={30} />}
                  </View>
                  <View style={{ flex: 1 }}>
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
                      {entry.state_uf && <StateFlag uf={entry.state_uf} size={16} />}
                      <Text style={[styles.rowName, { color: isMe ? C.green : C.text }]}>
                        {entry.username}{isMe ? ' (você)' : ''}
                      </Text>
                      {entry.plan && <VerifiedBadge plan={entry.plan} size={13} />}
                    </View>
                    {entry.city_name && (
                      <Text style={[styles.rowCity, { color: C.muted }]}>
                        {entry.city_name}, {entry.state_uf}
                      </Text>
                    )}
                  </View>
                  <View style={{ alignItems: 'flex-end' }}>
                    <Text style={[styles.rowXp, { color: C.text }]}>{entry.xp} XP</Text>
                    <Text style={[styles.rowLevel, { color: C.muted }]}>Nível {entry.level}</Text>
                  </View>
                </TouchableOpacity>
              );
            })}

            {entries.length === 0 && (
              <View style={styles.empty}>
                <Trophy size={36} color={C.muted} />
                <Text style={[styles.emptyText, { color: C.muted }]}>
                  Nenhum jogador ainda.{'\n'}Seja o primeiro!
                </Text>
              </View>
            )}
          </View>
        </>
      )}

      <View style={{ height: 40 }} />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  header:         { alignItems: 'center', paddingHorizontal: Spacing.xl, paddingBottom: Spacing.lg, gap: 8 },
  title:          { fontSize: FontSize.lg, fontWeight: FontWeight.bold },
  card:           { borderWidth: 1, borderRadius: 16 },
  pill:           { paddingHorizontal: 12, paddingVertical: 5, borderRadius: Radius.full, borderWidth: 1 },
  pillText:       { fontSize: FontSize.xs, fontWeight: FontWeight.medium },
  tabs:           { flexDirection: 'row', borderBottomWidth: 1, marginHorizontal: Spacing.xl },
  tab:            { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, paddingVertical: 12 },
  tabText:        { fontSize: FontSize.xs, fontWeight: FontWeight.medium },
  center:         { alignItems: 'center', justifyContent: 'center', padding: 40, gap: 12 },
  podiumWrap:     { flexDirection: 'row', alignItems: 'flex-end', justifyContent: 'center', margin: Spacing.xl, padding: Spacing.lg, gap: Spacing.md },
  podiumItem:     { flex: 1, alignItems: 'center', gap: 4 },
  podiumFirst:    { marginBottom: 14 },
  podiumAvatar:   { width: 44, height: 44, borderRadius: 22, alignItems: 'center', justifyContent: 'center', borderWidth: 2, overflow: 'hidden' },
  podiumAvatarLg: { width: 56, height: 56, borderRadius: 28 },
  podiumMedal:    { fontSize: FontSize.sm, fontWeight: FontWeight.bold },
  podiumName:     { fontSize: FontSize.xs, fontWeight: FontWeight.medium, textAlign: 'center' },
  podiumXp:       { fontSize: 9 },
  list:           { paddingHorizontal: Spacing.xl, gap: 8 },
  row:            { flexDirection: 'row', alignItems: 'center', gap: 10, padding: Spacing.md },
  rank:           { fontSize: FontSize.sm, fontWeight: FontWeight.bold, width: 26 },
  rowAvatar:      { width: 30, height: 30, borderRadius: 15, alignItems: 'center', justifyContent: 'center', overflow: 'hidden' },
  rowName:        { fontSize: FontSize.xs, fontWeight: FontWeight.medium },
  rowCity:        { fontSize: 10, marginTop: 2 },
  rowXp:          { fontSize: FontSize.xs, fontWeight: FontWeight.bold },
  rowLevel:       { fontSize: 9, marginTop: 2 },
  empty:          { alignItems: 'center', gap: 12, paddingVertical: 40 },
  emptyText:      { fontSize: FontSize.sm, textAlign: 'center', lineHeight: 22 },
});
FILEEOF4

echo "Arquivos escritos. Rodando git status..."
git status

echo "Revise as mudancas com: git diff"
echo "Quando estiver satisfeito, rode:"
echo "  git add -A"
echo '  git commit -m "feat: perfil publico com seguir + URL personalizada (Pro)"'
echo "  git push"
