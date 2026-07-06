import { useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';
import { useAuthStore } from '../store/authStore';
import { Plan } from '../types';

interface UserPlanState {
  plan:           Plan;
  planExpiresAt:  string | null;
  loading:        boolean;
  isPremium:      boolean;
}

export function useUserPlan(): UserPlanState {
  const { user } = useAuthStore();
  const [plan,          setPlan]          = useState<Plan>('free');
  const [planExpiresAt, setPlanExpiresAt] = useState<string | null>(null);
  const [loading,       setLoading]       = useState(true);

  useEffect(() => {
    if (!user) {
      setPlan('free');
      setLoading(false);
      return;
    }

    supabase
      .from('profiles')
      .select('plan, plan_expires_at')
      .eq('id', user.id)
      .single()
      .then(({ data }) => {
        if (data) {
          const p = (data.plan ?? 'free') as Plan;
          const expires = data.plan_expires_at ?? null;
          const isExpired = expires ? new Date(expires) < new Date() : false;
          setPlan(isExpired ? 'free' : p);
          setPlanExpiresAt(expires);
        }
        setLoading(false);
      });
  }, [user?.id]);

  const isPremium = plan === 'pro' || plan === 'family' || plan === 'education';

  return { plan, planExpiresAt, loading, isPremium };
}
