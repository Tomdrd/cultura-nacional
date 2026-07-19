import React from 'react';
import { StyleSheet, useWindowDimensions } from 'react-native';
import Svg, { Defs, RadialGradient, Stop, Rect } from 'react-native-svg';
import { useTheme } from '../../hooks/useTheme';

/**
 * Mesh de cor por trás dos cards de vidro (GlassCard). Um blob radial por
 * cor (âmbar, verde, azul, roxo), cada um com opacidade menor no claro
 * (senão fica forte demais contra fundo branco).
 *
 * Fica atrás de tudo (position: absolute), então quem usa só precisa
 * colocar <GlassBackground /> como primeiro filho do container da tela.
 */
export function GlassBackground() {
  const { isDark } = useTheme();
  const { width, height } = useWindowDimensions();
  const opacity = isDark ? 1 : 0.72;

  return (
    <Svg
      width={width}
      height={height}
      style={StyleSheet.absoluteFill}
      pointerEvents="none"
    >
      <Defs>
        <RadialGradient id="blobAmber" cx="15%" cy="6%" r="45%">
          <Stop offset="0" stopColor="#FFC44D" stopOpacity={0.5 * opacity} />
          <Stop offset="1" stopColor="#FFC44D" stopOpacity={0} />
        </RadialGradient>
        <RadialGradient id="blobGreen" cx="100%" cy="26%" r="42%">
          <Stop offset="0" stopColor="#3DC77A" stopOpacity={0.45 * opacity} />
          <Stop offset="1" stopColor="#3DC77A" stopOpacity={0} />
        </RadialGradient>
        <RadialGradient id="blobBlue" cx="18%" cy="98%" r="48%">
          <Stop offset="0" stopColor="#4C8DFF" stopOpacity={0.4 * opacity} />
          <Stop offset="1" stopColor="#4C8DFF" stopOpacity={0} />
        </RadialGradient>
        <RadialGradient id="blobPurple" cx="92%" cy="92%" r="40%">
          <Stop offset="0" stopColor="#A78BFA" stopOpacity={0.35 * opacity} />
          <Stop offset="1" stopColor="#A78BFA" stopOpacity={0} />
        </RadialGradient>
      </Defs>
      <Rect width={width} height={height} fill="url(#blobAmber)" />
      <Rect width={width} height={height} fill="url(#blobGreen)" />
      <Rect width={width} height={height} fill="url(#blobBlue)" />
      <Rect width={width} height={height} fill="url(#blobPurple)" />
    </Svg>
  );
}
