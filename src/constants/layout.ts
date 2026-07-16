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

export const FontSize = {
  xs:   11,
  sm:   13,
  md:   15,
  lg:   17,
  xl:   20,
  xxl:  24,
  xxxl: 32,
};

export const FontWeight = {
  regular:  '400' as const,
  medium:   '500' as const,
  semibold: '600' as const,
  bold:     '700' as const,
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
