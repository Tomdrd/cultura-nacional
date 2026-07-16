import { Dimensions } from 'react-native';

export const Spacing = {
  xs:  4,
  sm:  8,
  md:  12,
  lg:  16,
  xl:  24,
  xxl: 32,
  xxxl:48,
};

export const Radius = {
  sm:  6,
  md:  10,
  lg:  16,
  xl:  24,
  full: 9999,
};

export const BASE_WIDTH  = 375;
export const BASE_HEIGHT = 667;

// Pontos de quebra pra adaptar o layout a telas maiores (tablet/desktop web).
export const Breakpoints = {
  tablet:  600,
  desktop: 1024,
};

// Largura maxima do conteudo por faixa de tela. Em telas largas o conteudo
// nao fica preso ao tamanho de celular (480) nem esticado full-bleed --
// aproveita mais espaco em tablet/desktop de forma controlada.
// Use o hook useContentWidth() (src/hooks/useContentWidth.ts) pra ler o
// valor ja resolvido pra largura atual.
export const ContentWidth = {
  mobile:  480,
  tablet:  760,
  desktop: 1040,
};

// Mantido por compatibilidade com telas ainda nao migradas pro sistema de
// breakpoints -- equivale a ContentWidth.mobile.
export const MAX_CONTENT_WIDTH = ContentWidth.mobile;

// ── Escala de fonte responsiva ──────────────────────────────────────────
// Calcula um fator de escala a partir da largura da tela, usando a mesma
// largura "efetiva" que o conteudo ocupa (useContentWidth) -- assim,
// telas de celular pequeno (iPhone SE, ~320) ganham fontes um pouco
// menores, celulares grandes/tablets ganham um pouco maiores, e o teto
// e travado pra nao deixar texto gigante em desktop web (onde o conteudo
// ja fica limitado a ContentWidth.desktop de qualquer forma).
//
// Formula "moderate scale": em vez de escalar 1:1 com a largura (que deixa
// tudo desproporcional), aplica so uma fracao (`factor`) da diferenca --
// controlado, holivel, sem textos absurdamente grandes em tablet.
//
// Calculado uma vez no import do modulo (nao reativo a resize ao vivo na
// web -- recalcula ao recarregar a pagina/app). Suficiente pra adaptar a
// diferentes tamanhos de tela/dispositivo, que e o objetivo aqui.
function getScreenScaleFactor(): number {
  const { width } = Dimensions.get('window');

  let effectiveWidth = width;
  if (width >= Breakpoints.desktop) effectiveWidth = ContentWidth.desktop;
  else if (width >= Breakpoints.tablet) effectiveWidth = ContentWidth.tablet;
  else effectiveWidth = Math.min(width, ContentWidth.mobile);

  const rawScale = effectiveWidth / BASE_WIDTH;
  // Trava entre 0.85x (celular bem pequeno) e 1.3x (tablet/desktop) pra
  // texto nunca ficar ilegivel de tao pequeno nem desproporcional de
  // tao grande.
  return Math.min(Math.max(rawScale, 0.85), 1.3);
}

const SCREEN_SCALE_FACTOR = getScreenScaleFactor();

/**
 * Escala um tamanho de fonte conforme o tamanho da tela do dispositivo.
 * Usa "moderate scale": aplica so uma fracao (`factor`) da diferenca de
 * escala, entao o crescimento/encolhimento e suave, nao proporcional puro.
 *
 * Usar em qualquer `fontSize` numerico solto (fora do objeto `FontSize`)
 * que ainda nao passa pela escala automatica:
 *   fontSize: scaleFont(11)
 */
export function scaleFont(size: number, factor: number = 0.3): number {
  const scaled = size + (SCREEN_SCALE_FACTOR - 1) * size * factor;
  return Math.round(scaled);
}

export const FontSize = {
  xs:   scaleFont(11),
  sm:   scaleFont(13),
  md:   scaleFont(15),
  lg:   scaleFont(17),
  xl:   scaleFont(20),
  xxl:  scaleFont(24),
  xxxl: scaleFont(32),
};

export const FontWeight = {
  regular:  '400' as const,
  medium:   '500' as const,
  semibold: '600' as const,
  bold:     '700' as const,
};
