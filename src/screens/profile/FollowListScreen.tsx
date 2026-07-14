import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, FlatList, TouchableOpacity, Image, ActivityIndicator } from 'react-native';
import { ArrowLeft, User } from 'lucide-react-native';
import { useTheme } from '../../hooks/useTheme';
import { useHeaderTopPadding } from '../../hooks/useHeaderTopPadding';
import { supabase } from '../../lib/supabase';
import { HomeTheme } from '../../constants/colors';
import { Spacing, FontSize, FontWeight, Radius } from '../../constants/layout';

interface ProfileData {
  id: string;
  username: string;
  avatar_url: string | null;
  level: number;
}

const LIMIT = 20;

export function FollowListScreen({ route, navigation }: any) {
  const { userId, type } = route.params as { userId: string; type: 'followers' | 'following' };
  const { isDark } = useTheme();
  const C = isDark ? HomeTheme.dark : HomeTheme.light;
  const headerPaddingTop = useHeaderTopPadding();

  const [profiles, setProfiles] = useState<ProfileData[]>([]);
  const [loading, setLoading]   = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [page, setPage]         = useState(0);
  const [hasMore, setHasMore]   = useState(true);

  useEffect(() => {
    loadData(0);
  }, [userId, type]);

  async function loadData(pageNumber: number) {
    if (pageNumber === 0) setLoading(true);
    else setLoadingMore(true);

    const from = pageNumber * LIMIT;
    const to = from + LIMIT - 1;

    let query = supabase.from('follows');
    if (type === 'followers') {
      // Busca quem me segue
      query = query
        .select('created_at, profiles!follows_follower_id_fkey(id, username, avatar_url, level)')
        .eq('following_id', userId);
    } else {
      // Busca quem eu sigo
      query = query
        .select('created_at, profiles!follows_following_id_fkey(id, username, avatar_url, level)')
        .eq('follower_id', userId);
    }

    const { data, error } = await query
      .order('created_at', { ascending: false })
      .range(from, to);

    if (error) {
      console.error('[FollowListScreen] Error fetching data:', error);
    }

    const fetchedProfiles: ProfileData[] = (data || [])
      .map(row => row.profiles as unknown as ProfileData)
      .filter(Boolean);

    if (pageNumber === 0) {
      setProfiles(fetchedProfiles);
    } else {
      setProfiles(prev => [...prev, ...fetchedProfiles]);
    }

    setHasMore(fetchedProfiles.length === LIMIT);
    setPage(pageNumber);
    setLoading(false);
    setLoadingMore(false);
  }

  function handleEndReached() {
    if (hasMore && !loading && !loadingMore) {
      loadData(page + 1);
    }
  }

  function handleProfilePress(targetId: string) {
    navigation.push('PublicProfile', { userId: targetId });
  }

  const title = type === 'followers' ? 'Seguidores' : 'Seguindo';

  function renderItem({ item }: { item: ProfileData }) {
    return (
      <TouchableOpacity
        onPress={() => handleProfilePress(item.id)}
        style={[styles.itemCard, { backgroundColor: C.card, borderColor: C.border }]}
      >
        <View style={[styles.avatarWrap, { backgroundColor: C.iconBg, borderColor: C.border }]}>
          {item.avatar_url ? (
            <Image source={{ uri: item.avatar_url }} style={styles.avatar} />
          ) : (
            <User size={20} color={C.subtle} />
          )}
        </View>
        <View style={styles.userInfo}>
          <Text style={[styles.username, { color: C.text }]} numberOfLines={1}>
            {item.username}
          </Text>
          <Text style={[styles.level, { color: C.muted }]}>Nível {item.level}</Text>
        </View>
      </TouchableOpacity>
    );
  }

  return (
    <View style={{ flex: 1, backgroundColor: C.bg }}>
      <View style={[styles.header, { paddingTop: headerPaddingTop, borderBottomColor: C.border }]}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={{ padding: 4 }}>
          <ArrowLeft size={24} color={C.text} />
        </TouchableOpacity>
        <Text style={[styles.headerTitle, { color: C.text }]}>{title}</Text>
        <View style={{ width: 32 }} />
      </View>

      {loading ? (
        <View style={styles.center}>
          <ActivityIndicator size="large" color={C.green} />
        </View>
      ) : profiles.length === 0 ? (
        <View style={styles.center}>
          <User size={48} color={C.border} />
          <Text style={[styles.emptyText, { color: C.muted }]}>
            Nenhum usuário encontrado.
          </Text>
        </View>
      ) : (
        <FlatList
          data={profiles}
          keyExtractor={(item, index) => `${item.id}-${index}`}
          renderItem={renderItem}
          contentContainerStyle={styles.listContent}
          showsVerticalScrollIndicator={false}
          onEndReached={handleEndReached}
          onEndReachedThreshold={0.5}
          ListFooterComponent={
            loadingMore ? (
              <ActivityIndicator size="small" color={C.green} style={{ padding: 20 }} />
            ) : (
              <View style={{ height: 40 }} />
            )
          }
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: Spacing.lg,
    paddingBottom: 14,
    borderBottomWidth: 1,
  },
  headerTitle: {
    fontSize: FontSize.lg,
    fontWeight: FontWeight.bold,
  },
  center: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 12,
  },
  emptyText: {
    fontSize: FontSize.sm,
  },
  listContent: {
    padding: Spacing.xl,
    gap: 12,
  },
  itemCard: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: Spacing.md,
    borderRadius: Radius.lg,
    borderWidth: 1,
    gap: 12,
  },
  avatarWrap: {
    width: 48,
    height: 48,
    borderRadius: 24,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
  },
  avatar: {
    width: 48,
    height: 48,
    borderRadius: 24,
  },
  userInfo: {
    flex: 1,
  },
  username: {
    fontSize: FontSize.md,
    fontWeight: FontWeight.bold,
    marginBottom: 2,
  },
  level: {
    fontSize: FontSize.xs,
  },
});
