import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, ActivityIndicator } from 'react-native';
import { Trophy, MapPin, Globe, User } from 'lucide-react-native';
import { useTheme } from '../../hooks/useTheme';
import { supabase } from '../../lib/supabase';
import { useAuthStore } from '../../store/authStore';
import { Spacing, FontSize, FontWeight, Radius } from '../../constants/layout';

type Scope = 'national' | 'state' | 'city';

interface RankEntry {
  user_id: string;
  xp: number;
  level: number;
  username: string;
  city_name?: string;
  state_uf?: string;
}

interface MyLocation {
  city_natal_id: string | null;
  state_uf: string | null;
}

export function RankingScreen() {
  const { colors } = useTheme();
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
        .select('city_natal_id, cities(state_uf)')
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
      .select('id, username, xp, level, city_natal_id, cities!city_natal_id(name, state_uf)')
      .order('xp', { ascending: false })
      .limit(50);

    if (scope === 'city' && myLocation?.city_natal_id) {
      query = query.eq('city_natal_id', myLocation.city_natal_id);
      setScopeLabel('sua cidade');
    } else if (scope === 'state' && myLocation?.state_uf) {
      // Filtra por state_uf via join com cities
      query = supabase
        .from('profiles')
        .select('id, username, xp, level, city_natal_id, cities!city_natal_id(name, state_uf)')
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
        city_name: p.cities?.name ?? null,
        state_uf:  p.cities?.state_uf ?? null,
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

  // Mensagem quando aba requer localização não configurada
  const needsLocation = (scope === 'city' || scope === 'state') && myLocation && !myLocation.city_natal_id;

  return (
    <ScrollView style={{ flex: 1, backgroundColor: colors.background }} showsVerticalScrollIndicator={false}>

      {/* Header */}
      <View style={[styles.header, { backgroundColor: colors.card, borderBottomColor: colors.border }]}>
        <Trophy size={24} color="#FFDF00" />
        <Text style={[styles.title, { color: colors.text }]}>Ranking</Text>
        {myRank ? (
          <View style={[styles.myRankBadge, { backgroundColor: colors.primary + '20' }]}>
            <Text style={[styles.myRankText, { color: colors.primary }]}>
              Sua posição: #{myRank}{scopeLabel ? ` em ${scopeLabel}` : ''}
            </Text>
          </View>
        ) : scope !== 'national' && (
          <View style={[styles.myRankBadge, { backgroundColor: colors.border }]}>
            <Text style={[styles.myRankText, { color: colors.textMuted }]}>Fora do top 50</Text>
          </View>
        )}
      </View>

      {/* Scope tabs */}
      <View style={[styles.tabs, { backgroundColor: colors.card, borderBottomColor: colors.border }]}>
        {([
          { key: 'national', label: 'Nacional', Icon: Globe  },
          { key: 'state',    label: 'Estado',   Icon: MapPin },
          { key: 'city',     label: 'Cidade',   Icon: User   },
        ] as { key: Scope; label: string; Icon: any }[]).map(({ key, label, Icon }) => (
          <TouchableOpacity
            key={key}
            onPress={() => setScope(key)}
            style={[styles.tab, scope === key && { borderBottomColor: colors.primary, borderBottomWidth: 2 }]}
          >
            <Icon size={15} color={scope === key ? colors.primary : colors.textMuted} />
            <Text style={[styles.tabText, { color: scope === key ? colors.primary : colors.textMuted }]}>{label}</Text>
          </TouchableOpacity>
        ))}
      </View>

      {loading ? (
        <View style={styles.center}>
          <ActivityIndicator color={colors.primary} size="large" />
        </View>
      ) : needsLocation ? (
        <View style={styles.center}>
          <MapPin size={40} color={colors.textMuted} />
          <Text style={[styles.emptyText, { color: colors.textMuted }]}>
            Configure sua cidade natal no perfil{'\n'}para ver o ranking local.
          </Text>
        </View>
      ) : (
        <>
          {/* Podium */}
          {podium.length >= 3 && (
            <View style={[styles.podiumWrap, { backgroundColor: colors.card, borderBottomColor: colors.border }]}>
              {/* 2nd */}
              <View style={styles.podiumItem}>
                <View style={[styles.podiumAvatar, { backgroundColor: '#C0C0C020', borderColor: '#C0C0C0' }]}>
                  <User size={20} color="#C0C0C0" />
                </View>
                <Text style={[styles.podiumMedal, { color: '#C0C0C0' }]}>2º</Text>
                <Text style={[styles.podiumName, { color: colors.text }]} numberOfLines={1}>{podium[1]?.username}</Text>
                <Text style={[styles.podiumXp, { color: colors.textMuted }]}>{podium[1]?.xp} XP</Text>
              </View>
              {/* 1st */}
              <View style={[styles.podiumItem, styles.podiumFirst]}>
                <View style={[styles.podiumAvatar, styles.podiumAvatarLg, { backgroundColor: '#FFDF0020', borderColor: '#FFDF00' }]}>
                  <User size={28} color="#FFDF00" />
                </View>
                <Trophy size={18} color="#FFDF00" />
                <Text style={[styles.podiumMedal, { color: '#FFDF00' }]}>1º</Text>
                <Text style={[styles.podiumName, { color: colors.text }]} numberOfLines={1}>{podium[0]?.username}</Text>
                <Text style={[styles.podiumXp, { color: colors.textMuted }]}>{podium[0]?.xp} XP</Text>
              </View>
              {/* 3rd */}
              <View style={styles.podiumItem}>
                <View style={[styles.podiumAvatar, { backgroundColor: '#CD7F3220', borderColor: '#CD7F32' }]}>
                  <User size={20} color="#CD7F32" />
                </View>
                <Text style={[styles.podiumMedal, { color: '#CD7F32' }]}>3º</Text>
                <Text style={[styles.podiumName, { color: colors.text }]} numberOfLines={1}>{podium[2]?.username}</Text>
                <Text style={[styles.podiumXp, { color: colors.textMuted }]}>{podium[2]?.xp} XP</Text>
              </View>
            </View>
          )}

          {/* Rest of ranking */}
          <View style={styles.list}>
            {rest.map((entry, i) => {
              const isMe = entry.user_id === user?.id;
              return (
                <View key={entry.user_id} style={[styles.row, {
                  backgroundColor: isMe ? colors.primary + '10' : colors.card,
                  borderColor:     isMe ? colors.primary + '40' : colors.border,
                }]}>
                  <Text style={[styles.rank, { color: colors.textMuted }]}>#{i + 4}</Text>
                  <View style={[styles.rowAvatar, { backgroundColor: colors.border }]}>
                    <User size={16} color={colors.textMuted} />
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={[styles.rowName, { color: isMe ? colors.primary : colors.text }]}>
                      {entry.username}{isMe ? ' (você)' : ''}
                    </Text>
                    {entry.city_name && (
                      <Text style={[styles.rowCity, { color: colors.textMuted }]}>
                        {entry.city_name}, {entry.state_uf}
                      </Text>
                    )}
                  </View>
                  <View style={{ alignItems: 'flex-end' }}>
                    <Text style={[styles.rowXp, { color: colors.text }]}>{entry.xp} XP</Text>
                    <Text style={[styles.rowLevel, { color: colors.textMuted }]}>Nível {entry.level}</Text>
                  </View>
                </View>
              );
            })}

            {entries.length === 0 && (
              <View style={styles.empty}>
                <Trophy size={40} color={colors.textMuted} />
                <Text style={[styles.emptyText, { color: colors.textMuted }]}>
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
  header:         { alignItems: 'center', padding: Spacing.xl, paddingTop: 60, gap: 8, borderBottomWidth: 0.5 },
  title:          { fontSize: FontSize.xl, fontWeight: FontWeight.bold },
  myRankBadge:    { paddingHorizontal: 12, paddingVertical: 5, borderRadius: Radius.full },
  myRankText:     { fontSize: FontSize.xs, fontWeight: FontWeight.medium },
  tabs:           { flexDirection: 'row', borderBottomWidth: 0.5 },
  tab:            { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, paddingVertical: 12 },
  tabText:        { fontSize: FontSize.xs, fontWeight: FontWeight.medium },
  center:         { alignItems: 'center', justifyContent: 'center', padding: 40, gap: 12 },
  podiumWrap:     { flexDirection: 'row', alignItems: 'flex-end', justifyContent: 'center', padding: Spacing.xl, gap: Spacing.lg, borderBottomWidth: 0.5 },
  podiumItem:     { flex: 1, alignItems: 'center', gap: 4 },
  podiumFirst:    { marginBottom: 16 },
  podiumAvatar:   { width: 48, height: 48, borderRadius: 24, alignItems: 'center', justifyContent: 'center', borderWidth: 2 },
  podiumAvatarLg: { width: 60, height: 60, borderRadius: 30 },
  podiumMedal:    { fontSize: FontSize.md, fontWeight: FontWeight.bold },
  podiumName:     { fontSize: FontSize.xs, fontWeight: FontWeight.medium, textAlign: 'center' },
  podiumXp:       { fontSize: 10 },
  list:           { padding: Spacing.xl, gap: 8 },
  row:            { flexDirection: 'row', alignItems: 'center', gap: 12, padding: Spacing.md, borderRadius: Radius.md, borderWidth: 0.5 },
  rank:           { fontSize: FontSize.sm, fontWeight: FontWeight.bold, width: 28 },
  rowAvatar:      { width: 32, height: 32, borderRadius: 16, alignItems: 'center', justifyContent: 'center' },
  rowName:        { fontSize: FontSize.sm, fontWeight: FontWeight.medium },
  rowCity:        { fontSize: 11, marginTop: 2 },
  rowXp:          { fontSize: FontSize.sm, fontWeight: FontWeight.bold },
  rowLevel:       { fontSize: 10, marginTop: 2 },
  empty:          { alignItems: 'center', gap: 12, paddingVertical: 40 },
  emptyText:      { fontSize: FontSize.sm, textAlign: 'center', lineHeight: 22 },
});
