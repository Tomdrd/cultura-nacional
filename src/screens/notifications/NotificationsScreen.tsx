import React, { useEffect, useRef, useState, useCallback } from 'react';
import {
  View, Text, StyleSheet, FlatList, TouchableOpacity,
  ActivityIndicator,
} from 'react-native';
import { Bell, UserPlus, Swords, Trophy } from 'lucide-react-native';
import { useFocusEffect } from '@react-navigation/native';
import { useTheme } from '../../hooks/useTheme';
import { useHeaderTopPadding } from '../../hooks/useHeaderTopPadding';
import { useAuthStore } from '../../store/authStore';
import { useUnreadNotifications } from '../../hooks/useUnreadNotifications';
import { supabase } from '../../lib/supabase';
import { HomeTheme } from '../../constants/colors';
import { Spacing, FontSize, FontWeight, Radius } from '../../constants/layout';

interface Notification {
  id: string;
  type: 'new_follower' | 'duel_result' | 'duel_invite';
  title: string;
  body: string;
  data: any;
  read: boolean;
  created_at: string;
}

function timeAgo(dateStr: string): string {
  const diff = Date.now() - new Date(dateStr).getTime();
  const secs  = Math.floor(diff / 1000);
  if (secs < 60)   return 'agora';
  const mins = Math.floor(secs / 60);
  if (mins < 60)   return `${mins}m`;
  const hours = Math.floor(mins / 60);
  if (hours < 24)  return `${hours}h`;
  const days = Math.floor(hours / 24);
  return `${days}d`;
}

function NotifIcon({ type, color }: { type: Notification['type']; color: string }) {
  if (type === 'new_follower') return <UserPlus size={20} color={color} />;
  if (type === 'duel_result')  return <Trophy   size={20} color={color} />;
  return <Swords size={20} color={color} />;
}

function iconColor(type: Notification['type'], C: any): string {
  if (type === 'new_follower') return C.green;
  if (type === 'duel_result')  return C.yellow;
  return C.text;
}

export function NotificationsScreen({ navigation }: any) {
  const { isDark } = useTheme();
  const C = isDark ? HomeTheme.dark : HomeTheme.light;
  const headerPaddingTop = useHeaderTopPadding();
  const { user } = useAuthStore();
  const { markAllRead } = useUnreadNotifications();

  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [loading, setLoading]             = useState(true);
  const channelRef = useRef<any>(null);

  async function fetchNotifications() {
    if (!user) return;
    setLoading(true);
    const { data } = await supabase
      .from('notifications')
      .select('*')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false })
      .limit(50);
    setNotifications((data as Notification[]) ?? []);
    setLoading(false);
  }

  // Marca todas como lidas e inscreve Realtime ao entrar na aba
  useFocusEffect(
    useCallback(() => {
      fetchNotifications().then(() => markAllRead());

      if (!user) return;
      // Nome único por foco: evita conflito no StrictMode / re-focus
      const channelName = `notif-screen-${user.id}-${Date.now()}`;
      const channel = supabase
        .channel(channelName)
        .on(
          'postgres_changes',
          {
            event: 'INSERT',
            schema: 'public',
            table: 'notifications',
            filter: `user_id=eq.${user.id}`,
          },
          (payload) => {
            setNotifications(prev => [payload.new as Notification, ...prev]);
          }
        )
        .subscribe();
      channelRef.current = channel;

      return () => {
        supabase.removeChannel(channel);
        channelRef.current = null;
      };
    }, [user?.id])
  );

  function handleNotifPress(item: Notification) {
    if (item.type === 'duel_invite' && item.data?.code) {
      navigation.navigate('Duel', { joinCode: item.data.code });
    }
  }

  function renderItem({ item }: { item: Notification }) {
    const color = iconColor(item.type, C);
    return (
      <TouchableOpacity
        onPress={() => handleNotifPress(item)}
        activeOpacity={item.type === 'duel_invite' ? 0.7 : 1}
        style={[
          styles.item,
          {
            backgroundColor: item.read ? C.card : (isDark ? '#1a2a1a' : '#f0fff4'),
            borderColor: C.border,
          },
        ]}
      >
        <View style={[styles.iconWrap, { backgroundColor: isDark ? C.iconBg : `${color}18` }]}>
          <NotifIcon type={item.type} color={color} />
        </View>
        <View style={{ flex: 1 }}>
          <Text style={[styles.title, { color: C.text }]}>{item.title}</Text>
          <Text style={[styles.body, { color: C.muted }]} numberOfLines={2}>{item.body}</Text>
        </View>
        <Text style={[styles.time, { color: C.muted }]}>{timeAgo(item.created_at)}</Text>
        {!item.read && <View style={[styles.dot, { backgroundColor: C.green }]} />}
      </TouchableOpacity>
    );
  }

  return (
    <View style={{ flex: 1, backgroundColor: C.bg }}>
      {/* Header */}
      <View style={[styles.header, { paddingTop: headerPaddingTop, borderBottomColor: C.border }]}>
        <Bell size={20} color={C.text} />
        <Text style={[styles.headerTitle, { color: C.text }]}>Notificações</Text>
      </View>

      {loading ? (
        <View style={styles.center}>
          <ActivityIndicator color={C.green} size="large" />
        </View>
      ) : notifications.length === 0 ? (
        <View style={styles.center}>
          <Bell size={44} color={C.border} />
          <Text style={[styles.emptyTitle, { color: C.muted }]}>Nenhuma notificação</Text>
          <Text style={[styles.emptyBody, { color: C.muted }]}>
            Quando alguém seguir você ou um duelo terminar,{'\n'}você verá aqui.
          </Text>
        </View>
      ) : (
        <FlatList
          data={notifications}
          keyExtractor={item => item.id}
          renderItem={renderItem}
          contentContainerStyle={{ padding: Spacing.xl, gap: 10 }}
          showsVerticalScrollIndicator={false}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  header:      { flexDirection: 'row', alignItems: 'center', gap: 10, paddingHorizontal: Spacing.xl, paddingBottom: 14, borderBottomWidth: 0.5 },
  headerTitle: { fontSize: FontSize.md, fontWeight: FontWeight.bold },
  center:      { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 12, padding: Spacing.xl },
  emptyTitle:  { fontSize: FontSize.md, fontWeight: FontWeight.bold, marginTop: 8 },
  emptyBody:   { fontSize: FontSize.sm, textAlign: 'center', lineHeight: 20 },
  item:        { flexDirection: 'row', alignItems: 'flex-start', gap: 12, borderRadius: Radius.lg, borderWidth: 1, padding: Spacing.md },
  iconWrap:    { width: 40, height: 40, borderRadius: 20, alignItems: 'center', justifyContent: 'center', flexShrink: 0 },
  title:       { fontSize: FontSize.sm, fontWeight: FontWeight.bold, marginBottom: 2 },
  body:        { fontSize: FontSize.xs, lineHeight: 18 },
  time:        { fontSize: 10, flexShrink: 0, marginTop: 2 },
  dot:         { width: 7, height: 7, borderRadius: 4, position: 'absolute', top: 10, right: 10 },
});
