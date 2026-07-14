import { useEffect, useRef, useState } from 'react';
import { supabase } from '../lib/supabase';
import { useAuthStore } from '../store/authStore';

interface UseUnreadNotificationsResult {
  count: number;
  refetch: () => Promise<void>;
  markAllRead: () => Promise<void>;
}

export function useUnreadNotifications(): UseUnreadNotificationsResult {
  const { user } = useAuthStore();
  const [count, setCount] = useState(0);
  const channelRef = useRef<any>(null);

  async function fetchCount() {
    if (!user) { setCount(0); return; }
    const { count: c } = await supabase
      .from('notifications')
      .select('id', { count: 'exact', head: true })
      .eq('user_id', user.id)
      .eq('read', false);
    setCount(c ?? 0);
  }

  async function markAllRead() {
    if (!user) return;
    await supabase
      .from('notifications')
      .update({ read: true })
      .eq('user_id', user.id)
      .eq('read', false);
    setCount(0);
  }

  useEffect(() => {
    if (!user) return;

    fetchCount();

    // Nome único por montagem: evita o erro "cannot add postgres_changes after
    // subscribe()" no StrictMode do React (que monta/desmonta duas vezes em dev).
    const channelName = `notif-badge-${user.id}-${Date.now()}`;
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
        () => { setCount(prev => prev + 1); }
      )
      .subscribe();

    channelRef.current = channel;

    return () => {
      supabase.removeChannel(channel);
      channelRef.current = null;
    };
  }, [user?.id]);

  return { count, refetch: fetchCount, markAllRead };
}
