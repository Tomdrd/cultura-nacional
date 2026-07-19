import React from 'react';
import { View, StyleSheet, ViewStyle, StyleProp } from 'react-native';
import { BlurView } from 'expo-blur';
import { useTheme } from '../../hooks/useTheme';

interface GlassCardProps {
  children: React.ReactNode;
  style?: StyleProp<ViewStyle>;
  /**
   * 'full'  - BlurView de verdade (vidro fosco real). Usar em cards fixos,
   *           poucos por tela (header, cards de destaque, grid).
   * 'flat'  - sem BlurView, só fundo translucido. Usar em linhas de lista
   *           rolavel (Ranking, Missoes, Notificacoes) -- BlurView por
   *           item travaria o scroll com muitas linhas.
   */
  variant?: 'full' | 'flat';
  radius?: number;
}

export function GlassCard({ children, style, variant = 'full', radius = 16 }: GlassCardProps) {
  const { isDark } = useTheme();

  const tint = isDark
    ? { bg: 'rgba(255,255,255,0.09)', border: 'rgba(255,255,255,0.14)' }
    : { bg: 'rgba(255,255,255,0.55)', border: 'rgba(255,255,255,0.8)' };

  if (variant === 'flat') {
    return (
      <View style={[{ borderRadius: radius, borderWidth: 1, backgroundColor: tint.bg, borderColor: tint.border }, style]}>
        {children}
      </View>
    );
  }

  return (
    <View style={[{ borderRadius: radius, borderWidth: 1, borderColor: tint.border, overflow: 'hidden' }, style]}>
      <BlurView intensity={isDark ? 30 : 40} tint={isDark ? 'dark' : 'light'} style={StyleSheet.absoluteFill} />
      <View style={[StyleSheet.absoluteFill, { backgroundColor: tint.bg }]} />
      {children}
    </View>
  );
}

/** Fundo translúcido + borda pra caixa de ícone, tingido com a cor da categoria/ação. */
export function glassTint(color: string, isDark: boolean) {
  return {
    backgroundColor: `${color}${isDark ? '40' : '33'}`,
    borderColor: `${color}${isDark ? '66' : '5c'}`,
  };
}
