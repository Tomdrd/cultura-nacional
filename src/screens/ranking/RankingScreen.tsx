import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, ActivityIndicator, Image } from 'react-native';
import { Trophy, MapPin, Globe, User, ArrowLeft } from 'lucide-react-native';
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
    <View style={{ flex: 1, backgroundColor: C.bg }}>
      <TouchableOpacity 
        onPress={() => navigation.goBack()}
        style={styles.backButton}
        activeOpacity={0.7}
      >
        <ArrowLeft size={20} color={C.text} />
      </TouchableOpacity>
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
    <TouchableOpacity 
      onPress={() => navigation.goBack()}
      style={[styles.backButton, { paddingTop: headerPaddingTop }]}
      activeOpacity={0.7}
    >
      <ArrowLeft size={20} color={C.text} />
    </TouchableOpacity>
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
    </View>
  );
}

const styles = StyleSheet.create({
  backButton:    { paddingHorizontal: Spacing.xl, paddingVertical: Spacing.md },
  backButton:    { paddingHorizontal: Spacing.xl, paddingVertical: Spacing.md },
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
