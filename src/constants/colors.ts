// Cores da marca, fora do tema light/dark (não mudam com o tema).
export const BrandColors = {
  green:  '#009C3B',
  yellow: '#FFDF00',
  blue:   '#002776',
} as const;

export const CategoryColors = {
  cultura:      '#7F77DD',
  historia:     '#D85A30',
  gastronomia:  '#BA7517',
  natureza:     '#009C3B',
  turismo:      '#378ADD',
  curiosidades: '#D4537E',
  musica:       '#7F3FBF',
  reggae:       '#2E8B57',
  rap:          '#1A1A2E',
  aleatorio:    '#E24B4A',
} as const;

export const RegionColors = {
  Norte:          CategoryColors.turismo,
  Nordeste:       CategoryColors.historia,
  'Centro-Oeste': CategoryColors.gastronomia,
  Sudeste:        CategoryColors.cultura,
  Sul:            CategoryColors.natureza,
} as const;

export const MedalColors = {
  gold:   '#FFDF00',
  silver: '#C0C0C0',
  bronze: '#CD7F32',
} as const;

export const QuickActionColors = {
  relampago: { bg: '#5C4600', fg: '#FFDF00', border: 'rgba(255,223,0,0.35)' },
  viral:     { bg: '#C23B3A', fg: '#FFFFFF', border: 'rgba(255,255,255,0.25)' },
  duelo:     { bg: '#002776', fg: '#FFFFFF', border: 'rgba(255,255,255,0.25)' },
} as const;

export function withOpacity(hexColor: string, level: number): string {
  const hex = Math.round((level / 100) * 255).toString(16).padStart(2, '0');
  return `${hexColor}${hex}`;
}

// Tema único do app (light/dark). Fonte única de verdade pra qualquer cor
// de superfície/texto/borda usada nas telas -- pra trocar uma cor do app
// inteiro (ex: o background), edite só os valores base abaixo (bg, card,
// border, text, muted, green...); os campos derivados (background,
// textSecondary, textMuted, primary, accent) reaproveitam esses mesmos
// valores, então nunca ficam fora de sincronia.
//
// Histórico: até 2026-07-21 existiam dois objetos de tema paralelos
// (HomeTheme e um antigo `Colors`, usado só por 4 arquivos). Consolidado
// num só -- ver docs/DECISIONS.md dessa data.
const darkBase = {
  bg: '#0e1015', card: '#1c2029', iconBg: '#16191f', border: '#252b38',
  text: '#f0f2f5', muted: '#7E879D', subtle: '#8a92a0', green: '#009C3B', yellow: '#FEDD00',
  danger: '#E24B4A',
};

const lightBase = {
  bg: '#FFFFFF', card: '#FFFFFF', iconBg: '#F0F0F0', border: '#D6D6D6',
  text: '#0A0A0A', muted: '#6B6B6B', subtle: '#4A4A4A', green: '#00792E', yellow: '#8A6D00',
  danger: '#E24B4A',
};

export const HomeTheme = {
  dark: {
    ...darkBase,
    background:    darkBase.bg,
    textSecondary: darkBase.muted,
    textMuted:     darkBase.muted,
    primary:       darkBase.green,
    accent:        darkBase.yellow,
  },
  light: {
    ...lightBase,
    background:    lightBase.bg,
    textSecondary: lightBase.muted,
    textMuted:     lightBase.muted,
    primary:       lightBase.green,
    accent:        lightBase.yellow,
  },
} as const;

export type ColorScheme = 'light' | 'dark';
export type ThemeColors = typeof HomeTheme.light;
