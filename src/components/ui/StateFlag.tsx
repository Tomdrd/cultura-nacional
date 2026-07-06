import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { useTheme } from '../../hooks/useTheme';
import { Radius, FontWeight } from '../../constants/layout';

import AC from '../../../assets/flags/ac.svg';
import AL from '../../../assets/flags/al.svg';
import AM from '../../../assets/flags/am.svg';
import AP from '../../../assets/flags/ap.svg';
import BA from '../../../assets/flags/ba.svg';
import CE from '../../../assets/flags/ce.svg';
import DF from '../../../assets/flags/df.svg';
import ES from '../../../assets/flags/es.svg';
import GO from '../../../assets/flags/go.svg';
import MA from '../../../assets/flags/ma.svg';
import MG from '../../../assets/flags/mg.svg';
import MS from '../../../assets/flags/ms.svg';
import MT from '../../../assets/flags/mt.svg';
import PA from '../../../assets/flags/pa.svg';
import PB from '../../../assets/flags/pb.svg';
import PE from '../../../assets/flags/pe.svg';
import PI from '../../../assets/flags/pi.svg';
import PR from '../../../assets/flags/pr.svg';
import RJ from '../../../assets/flags/rj.svg';
import RN from '../../../assets/flags/rn.svg';
import RO from '../../../assets/flags/ro.svg';
import RR from '../../../assets/flags/rr.svg';
import RS from '../../../assets/flags/rs.svg';
import SC from '../../../assets/flags/sc.svg';
import SE from '../../../assets/flags/se.svg';
import SP from '../../../assets/flags/sp.svg';
import TO from '../../../assets/flags/to.svg';

const FLAGS: Record<string, React.FC<{ width?: number; height?: number }>> = {
  AC, AL, AM, AP, BA, CE, DF, ES, GO, MA, MG, MS, MT,
  PA, PB, PE, PI, PR, RJ, RN, RO, RR, RS, SC, SE, SP, TO,
};

interface StateFlagProps {
  uf: string;
  size?: number;
}

/**
 * Renders a state flag from assets/flags/{uf}.svg (imported statically,
 * since Metro/react-native-svg-transformer can't resolve dynamic paths).
 * Falls back to a badge with the UF letters if the code isn't found.
 */
export function StateFlag({ uf, size = 40 }: StateFlagProps) {
  const { colors } = useTheme();
  const Flag = FLAGS[uf.toUpperCase()];

  return (
    <View
      style={[
        styles.wrapper,
        { width: size, height: size, borderRadius: size / 4, backgroundColor: colors.card },
      ]}
    >
      {Flag ? (
        <Flag width={size} height={size} preserveAspectRatio="xMidYMid slice" />
      ) : (
        <Text style={[styles.fallbackText, { color: colors.textMuted, fontSize: size * 0.32 }]}>
          {uf}
        </Text>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: {
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
  fallbackText: {
    fontWeight: FontWeight.bold,
  },
});
