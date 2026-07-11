import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { StateFlag } from './StateFlag';
import { useTheme } from '../../hooks/useTheme';
import { FontWeight } from '../../constants/layout';

interface StateFlagIconProps {
  uf: string;
  name: string;
  size?: number;
}

/**
 * Ícone de estado no estilo "app icon" de smartphone:
 * quadrado com bordas bem arredondadas (squircle), bandeira
 * preenchendo e recortada dentro, nome do estado embaixo.
 */
export function StateFlagIcon({ uf, name, size = 64 }: StateFlagIconProps) {
  const { colors } = useTheme();
  const radius = size * 0.22;

  return (
    <View style={styles.wrapper}>
      <View
        style={[
          styles.icon,
          {
            width: size,
            height: size,
            borderRadius: radius,
            backgroundColor: colors.card,
          },
        ]}
      >
        <StateFlag uf={uf} size={size} interactive={false} />
      </View>
      <Text
        style={[styles.label, { color: colors.textSecondary, maxWidth: size + 24 }]}
        numberOfLines={1}
      >
        {name}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: {
    alignItems: 'center',
    gap: 6,
  },
  icon: {
    overflow: 'hidden',
    alignItems: 'center',
    justifyContent: 'center',
  },
  label: {
    fontSize: 12,
    fontWeight: FontWeight.medium ?? '500',
    textAlign: 'center',
  },
});
