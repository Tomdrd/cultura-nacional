/**
 * Ícones "preenchidos" (selo sólido + check branco por cima).
 *
 * Por que isso existe: os ícones do lucide-react-native aplicam a mesma
 * cor/borda (stroke) em TODOS os traços do desenho ao mesmo tempo — não dá
 * pra pintar o contorno do selo de uma cor e o check de outra usando só as
 * props do componente (`color`, `fill`, `stroke`). Isso fazia o selo aparecer
 * com uma borda branca indesejada ao redor (em vez de 100% sólido).
 *
 * Aqui desenhamos o SVG diretamente (via react-native-svg, já usado no
 * projeto) com cada parte do desenho controlada separadamente:
 *   - a forma do selo/círculo → preenchida com a cor (sem borda)
 *   - o check → sempre um traço branco por cima
 *
 * Os paths vêm dos mesmos ícones do Lucide (BadgeCheck / CircleCheck),
 * mantendo o mesmo visual/proporção do resto do app (viewBox 24x24).
 */

import React from 'react';
import Svg, { Path, Circle } from 'react-native-svg';

interface FilledIconProps {
  size: number;
  color: string;
  checkColor?: string;
}

/** Selo de verificado (formato de emblema, cantos arredondados em "estrela"). */
export function BadgeCheckSolid({ size, color, checkColor = '#fff' }: FilledIconProps) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Path
        d="M3.85 8.62a4 4 0 0 1 4.78-4.77 4 4 0 0 1 6.74 0 4 4 0 0 1 4.78 4.78 4 4 0 0 1 0 6.74 4 4 0 0 1-4.77 4.78 4 4 0 0 1-6.75 0 4 4 0 0 1-4.78-4.77 4 4 0 0 1 0-6.76Z"
        fill={color}
      />
      <Path
        d="m9 12 2 2 4-4"
        stroke={checkColor}
        strokeWidth={2}
        strokeLinecap="round"
        strokeLinejoin="round"
        fill="none"
      />
    </Svg>
  );
}

/** Ícone de sucesso (círculo simples + check), usado em confirmações. */
export function CircleCheckSolid({ size, color, checkColor = '#fff' }: FilledIconProps) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Circle cx={12} cy={12} r={10} fill={color} />
      <Path
        d="m9 12 2 2 4-4"
        stroke={checkColor}
        strokeWidth={2}
        strokeLinecap="round"
        strokeLinejoin="round"
        fill="none"
      />
    </Svg>
  );
}
