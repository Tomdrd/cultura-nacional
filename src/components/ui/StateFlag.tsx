import React, { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Modal, Pressable } from 'react-native';
import { useTheme } from '../../hooks/useTheme';
import { Radius, FontWeight, FontSize } from '../../constants/layout';
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

const STATE_NAMES: Record<string, string> = {
  AC: 'Acre', AL: 'Alagoas', AM: 'Amazonas', AP: 'Amapá',
  BA: 'Bahia', CE: 'Ceará', DF: 'Distrito Federal', ES: 'Espírito Santo',
  GO: 'Goiás', MA: 'Maranhão', MG: 'Minas Gerais', MS: 'Mato Grosso do Sul',
  MT: 'Mato Grosso', PA: 'Pará', PB: 'Paraíba', PE: 'Pernambuco',
  PI: 'Piauí', PR: 'Paraná', RJ: 'Rio de Janeiro', RN: 'Rio Grande do Norte',
  RO: 'Rondônia', RR: 'Roraima', RS: 'Rio Grande do Sul', SC: 'Santa Catarina',
  SE: 'Sergipe', SP: 'São Paulo', TO: 'Tocantins',
};

interface StateFlagProps {
  uf: string;
  size?: number;
  interactive?: boolean;
}

export function StateFlag({ uf, size = 40, interactive = true }: StateFlagProps) {
  const { colors, isDark } = useTheme();
  const [visible, setVisible] = useState(false);
  const Flag  = FLAGS[uf.toUpperCase()];
  const label = STATE_NAMES[uf.toUpperCase()] ?? uf.toUpperCase();

  const flagContent = Flag ? (
    <Flag width={size} height={size} preserveAspectRatio="xMidYMid slice" />
  ) : (
    <Text style={[styles.fallbackText, { color: colors.textMuted, fontSize: size * 0.32 }]}>{uf}</Text>
  );

  // Usado dentro de outro touchable (ex: grid da EstadosScreen que navega pro
  // Quiz) — sem TouchableOpacity/Modal próprios pra não capturar o toque
  // que deveria ir pro elemento pai.
  if (!interactive) {
    return (
      <View style={[styles.wrapper, { width: size, height: size, borderRadius: size / 4, backgroundColor: colors.card }]}>
        {flagContent}
      </View>
    );
  }

  return (
    <>
      <TouchableOpacity
        onPress={() => setVisible(true)}
        activeOpacity={0.75}
        style={[styles.wrapper, { width: size, height: size, borderRadius: size / 4, backgroundColor: colors.card }]}
      >
        {flagContent}
      </TouchableOpacity>

      <Modal transparent animationType="fade" visible={visible} onRequestClose={() => setVisible(false)}>
        <Pressable style={styles.overlay} onPress={() => setVisible(false)}>
          <View style={[
            styles.tooltip,
            {
              backgroundColor: isDark ? 'rgba(30,30,36,0.97)' : 'rgba(255,255,255,0.97)',
              borderColor: isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.08)',
              shadowColor: isDark ? '#000' : '#999',
            }
          ]}>
            <View style={[styles.flagLarge, { borderRadius: size * 0.3 }]}>
              {Flag && <Flag width={48} height={48} preserveAspectRatio="xMidYMid slice" />}
            </View>
            <Text style={[styles.stateName, { color: colors.text }]}>{label}</Text>
            <Text style={[styles.stateUf, { color: colors.textMuted }]}>{uf.toUpperCase()}</Text>
          </View>
        </Pressable>
      </Modal>
    </>
  );
}

const styles = StyleSheet.create({
  wrapper: {
    alignItems:      'center',
    justifyContent:  'center',
    overflow:        'hidden',
  },
  fallbackText: {
    fontWeight: FontWeight.bold,
  },
  overlay: {
    flex:            1,
    backgroundColor: 'rgba(0,0,0,0.25)',
    alignItems:      'center',
    justifyContent:  'center',
  },
  tooltip: {
    alignItems:    'center',
    gap:           8,
    paddingVertical:   20,
    paddingHorizontal: 28,
    borderRadius:  16,
    borderWidth:   0.5,
    shadowOffset:  { width: 0, height: 8 },
    shadowOpacity: 0.15,
    shadowRadius:  20,
    elevation:     12,
  },
  flagLarge: {
    width:    48,
    height:   48,
    overflow: 'hidden',
  },
  stateName: {
    fontSize:   FontSize.md,
    fontWeight: FontWeight.bold,
  },
  stateUf: {
    fontSize: FontSize.xs,
  },
});
