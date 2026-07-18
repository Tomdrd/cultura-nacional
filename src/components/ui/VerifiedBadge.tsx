import React from 'react';
import { View, StyleSheet } from 'react-native';
import { BadgeCheck } from 'lucide-react-native';
import { Plan } from '../../types';

interface Props {
  plan: Plan;
  size?: number;
}

const BADGE_COLOR = '#1877F2';

export function VerifiedBadge({ plan, size = 18 }: Props) {
  if (plan === 'free') return null;
  return (
    <View style={styles.wrapper}>
      <BadgeCheck size={size} color={BADGE_COLOR} fill={BADGE_COLOR} stroke="#fff" strokeWidth={1.5} />
    </View>
  );
}

export function AvatarVerifiedBadge({ plan, avatarSize }: { plan: Plan; avatarSize: number }) {
  if (plan === 'free') return null;
  const badgeSize = Math.round(avatarSize * 0.32);
  const offset    = Math.round(badgeSize * 0.1);
  return (
    <View style={[styles.avatarBadge, { width: badgeSize + 4, height: badgeSize + 4, borderRadius: (badgeSize + 4) / 2, bottom: -offset, right: -offset }]}>
      <BadgeCheck size={badgeSize} color={BADGE_COLOR} fill={BADGE_COLOR} stroke="#fff" strokeWidth={1.5} />
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper:     { lineHeight: 0 },
  avatarBadge: { position: 'absolute', backgroundColor: 'transparent', alignItems: 'center', justifyContent: 'center', zIndex: 10 },
});
