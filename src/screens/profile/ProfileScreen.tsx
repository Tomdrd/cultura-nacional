import React, { useEffect, useState, useCallback } from 'react';
import { View, Text, StyleSheet, Image, ScrollView, TouchableOpacity, ActivityIndicator, Modal, TextInput, KeyboardAvoidingView, Platform } from 'react-native';
import User from 'lucide-react-native/dist/esm/icons/user';
import MapPin from 'lucide-react-native/dist/esm/icons/map-pin';
import Trophy from 'lucide-react-native/dist/esm/icons/trophy';
import Zap from 'lucide-react-native/dist/esm/icons/zap';
import Star from 'lucide-react-native/dist/esm/icons/star';
import LogOut from 'lucide-react-native/dist/esm/icons/log-out';
import ChevronRight from 'lucide-react-native/dist/esm/icons/chevron-right';
import Award from 'lucide-react-native/dist/esm/icons/award';
import Copy from 'lucide-react-native/dist/esm/icons/copy';
import Check from 'lucide-react-native/dist/esm/icons/check';
import Lock from 'lucide-react-native/dist/esm/icons/lock';
import Swords from 'lucide-react-native/dist/esm/icons/swords';
import ArrowLeft from 'lucide-react-native/dist/esm/icons/arrow-left';
import Pencil from 'lucide-react-native/dist/esm/icons/pencil';
import X from 'lucide-react-native/dist/esm/icons/x';
import * as Clipboard from 'expo-clipboard';
import { useTheme } from '../../hooks/useTheme';
import { useHeaderTopPadding } from '../../hooks/useHeaderTopPadding';
import { supabase } from '../../lib/supabase';
import { useAuthStore } from '../../store/authStore';
import { Spacing, FontSize, FontWeight, Radius, scaleFont } from '../../constants/layout';
import { HomeTheme } from '../../constants/colors';
import { getXpInCurrentLevel, getXpProgress, XP_PER_LEVEL } from '../../utils/xp';
import { VerifiedBadge, AvatarVerifiedBadge } from '../../components/ui/VerifiedBadge';
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
  profile_slug: string | null;
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
  const [editModalOpen, setEditModalOpen] = useState(false);
  const [slugInput,     setSlugInput]     = useState('');
  const [slugError,     setSlugError]     = useState('');
  const [slugSaving,    setSlugSaving]    = useState(false);

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
      .select('id, username, avatar_url, xp, level, streak, plan, plan_expires_at, city_natal_id, created_at, profile_slug, cities!city_natal_id(state_uf)')
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
  const isPro = (() => {
    const plan    = profile?.plan ?? 'free';
    const expires = profile?.plan_expires_at;
    const expired = expires ? new Date(expires) < new Date() : false;
    return (plan === 'pro' || plan === 'family' || plan === 'education') && !expired;
  })();
  function sanitizeSlug(input: string) {
    return input.toLowerCase().replace(/[^a-z0-9\-]/g, '').replace(/--+/g, '-');
  }
  function isValidSlug(slug: string) {
    return /^[a-z0-9][a-z0-9\-]{1,28}[a-z0-9]$/.test(slug) && slug.length >= 3 && slug.length <= 30;
  }
  function openEditModal() {
    setSlugInput(profile?.profile_slug ?? profile?.username ?? '');
    setSlugError('');
    setEditModalOpen(true);
  }
  function handleSlugChange(text: string) {
    const clean = sanitizeSlug(text);
    setSlugInput(clean);
    if (clean.length > 0 && clean.length < 3) setSlugError('Mínimo 3 caracteres');
    else if (clean.length > 0 && !isValidSlug(clean)) setSlugError('Letras minúsculas, números e hífens. Sem hífen no início ou fim.');
    else setSlugError('');
  }
  async function handleSaveSlug() {
    if (!user || !profile) return;
    const slug = slugInput.trim();
    if (!isValidSlug(slug)) { setSlugError('URL inválida.'); return; }
    if (slug === profile.profile_slug) { setEditModalOpen(false); return; }
    setSlugSaving(true);
    const { data: existing } = await supabase.from('profiles').select('id').eq('profile_slug', slug).neq('id', user.id).maybeSingle();
    if (existing) { setSlugError('Essa URL já está em uso.'); setSlugSaving(false); return; }
    const { error } = await supabase.from('profiles').update({ profile_slug: slug }).eq('id', user.id);
    setSlugSaving(false);
    if (error) { setSlugError('Erro ao salvar. Tente novamente.'); return; }
    setProfile((prev: Profile | null) => prev ? { ...prev, profile_slug: slug } : prev);
    setEditModalOpen(false);
  }

  const urlSlug   = profile?.profile_slug ?? profile?.username ?? '';
  const profileUrl  = `culturanacional.com.br/${urlSlug}`;

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
          <Text style={[styles.username, { color: C.text }]}>{profile?.username ?? 'Explorador'}</Text>
          {profile?.plan && <VerifiedBadge plan={profile.plan} size={20} />}
        </View>
        {isPro ? (
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, maxWidth: '90%' }}>
            <TouchableOpacity
              onPress={handleCopyUrl}
              style={[styles.urlPill, { backgroundColor: C.iconBg, borderColor: C.border, flex: 1 }]}
            >
              <Text style={[styles.urlText, { color: C.subtle }]} numberOfLines={1}>{profileUrl}</Text>
              {copied
                ? <Check size={14} color={C.green} />
                : <Copy size={14} color={C.muted} />
              }
            </TouchableOpacity>
            <TouchableOpacity
              onPress={openEditModal}
              style={[styles.urlPill, { backgroundColor: C.iconBg, borderColor: C.border, paddingHorizontal: 10 }]}
            >
              <Pencil size={14} color={C.subtle} />
            </TouchableOpacity>
          </View>
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

      <Modal visible={editModalOpen} transparent animationType="fade" onRequestClose={() => setEditModalOpen(false)}>
        <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.6)', justifyContent: 'center', alignItems: 'center', padding: Spacing.xl }}>
          <View style={{ width: '100%', maxWidth: 400, backgroundColor: C.card, borderRadius: 20, borderWidth: 1, borderColor: C.border, padding: Spacing.xl, gap: Spacing.md }}>
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
              <Text style={{ fontSize: FontSize.md, fontWeight: FontWeight.bold, color: C.text }}>Editar URL do perfil</Text>
              <TouchableOpacity onPress={() => setEditModalOpen(false)}><X size={18} color={C.muted} /></TouchableOpacity>
            </View>
            <Text style={{ fontSize: FontSize.xs, color: C.muted, lineHeight: 18 }}>Letras minúsculas, números e hífens. Entre 3 e 30 caracteres.</Text>
            <View style={{ flexDirection: 'row', flexWrap: 'wrap', backgroundColor: C.iconBg, borderRadius: Radius.md, borderWidth: 1, borderColor: C.border, paddingHorizontal: 12, paddingVertical: 8 }}>
              <Text style={{ fontSize: FontSize.xs, color: C.muted }}>culturanacional.com.br/</Text>
              <Text style={{ fontSize: FontSize.xs, fontWeight: FontWeight.bold, color: slugError ? '#E24B4A' : C.green }}>{slugInput || '...'}</Text>
            </View>
            <TextInput
              value={slugInput}
              onChangeText={handleSlugChange}
              placeholder="minha-url"
              placeholderTextColor={C.muted}
              autoCapitalize="none"
              autoCorrect={false}
              maxLength={30}
              style={{ borderWidth: 1, borderRadius: Radius.md, paddingHorizontal: 14, paddingVertical: 10, fontSize: FontSize.sm, borderColor: slugError ? '#E24B4A' : C.border, color: C.text, backgroundColor: C.iconBg }}
            />
            {slugError
              ? <Text style={{ fontSize: FontSize.xs, color: '#E24B4A', marginTop: -4 }}>{slugError}</Text>
              : <Text style={{ fontSize: FontSize.xs, color: C.muted, textAlign: 'right', marginTop: -4 }}>{slugInput.length}/30</Text>
            }
            <View style={{ flexDirection: 'row', gap: Spacing.sm, marginTop: Spacing.xs }}>
              <TouchableOpacity onPress={() => setEditModalOpen(false)} style={{ flex: 1, borderWidth: 1, borderColor: C.border, borderRadius: Radius.md, paddingVertical: 11, alignItems: 'center' }}>
                <Text style={{ fontSize: FontSize.sm, fontWeight: FontWeight.medium, color: C.subtle }}>Cancelar</Text>
              </TouchableOpacity>
              <TouchableOpacity
                onPress={handleSaveSlug}
                disabled={slugSaving || !!slugError || slugInput.length < 3}
                style={{ flex: 1, borderRadius: Radius.md, paddingVertical: 11, alignItems: 'center', backgroundColor: C.green, opacity: (slugSaving || !!slugError || slugInput.length < 3) ? 0.5 : 1 }}
              >
                {slugSaving ? <ActivityIndicator size="small" color="#FFF" /> : <Text style={{ color: '#FFF', fontSize: FontSize.sm, fontWeight: FontWeight.bold }}>Salvar</Text>}
              </TouchableOpacity>
            </View>
          </View>
        </KeyboardAvoidingView>
      </Modal>

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
  followStatLbl:   { fontSize: scaleFont(10), marginTop: 1 },
  xpCard:        { margin: Spacing.xl, marginBottom: Spacing.md, padding: Spacing.lg },
  xpRow:         { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: Spacing.md },
  xpLabel:       { fontSize: FontSize.xs, marginBottom: 2 },
  xpValue:       { fontSize: FontSize.sm, fontWeight: FontWeight.bold },
  xpLevel:       { fontSize: FontSize.sm, fontWeight: FontWeight.bold },
  xpBarBg:       { height: 3, borderRadius: 99, marginBottom: 6, overflow: 'hidden' },
  xpBarFill:     { height: 3, borderRadius: 99 },
  xpHint:        { fontSize: scaleFont(10) },
  statsCard:     { flexDirection: 'row', marginHorizontal: Spacing.xl, marginBottom: Spacing.md, padding: Spacing.lg },
  statItem:      { flex: 1, alignItems: 'center', gap: 4 },
  statVal:       { fontSize: FontSize.md, fontWeight: FontWeight.bold },
  statLbl:       { fontSize: scaleFont(9), textAlign: 'center' },
  statDivider:   { width: 1 },
  quizStatsRow:  { flexDirection: 'row', justifyContent: 'space-between', paddingHorizontal: Spacing.sm },
  quizStat:      { alignItems: 'center', gap: 4 },
  quizStatVal:   { fontSize: FontSize.lg, fontWeight: FontWeight.bold },
  quizStatLbl:   { fontSize: FontSize.xs },
  section:       { marginHorizontal: Spacing.xl, marginBottom: Spacing.md, padding: Spacing.lg },
  sectionTitle:  { fontSize: scaleFont(10), fontWeight: FontWeight.bold, letterSpacing: 0.6, marginBottom: Spacing.md, textTransform: 'uppercase' },
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
