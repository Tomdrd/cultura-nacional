export const Colors = {
  brand: {
    green:  '#009C3B',
    yellow: '#FFDF00',
    blue:   '#002776',
  },
  light: {
    background:      '#FFFFFF',
    backgroundAlt:   '#F5F5F5',
    card:            '#FFFFFF',
    border:          '#E5E5E5',
    text:            '#0A0A0A',
    textSecondary:   '#6B6B6B',
    textMuted:       '#767676',
    primary:         '#009C3B',
    primaryText:     '#FFFFFF',
    accent:          '#FFDF00',
    accentText:      '#002776',
    accentTextSafe:  '#8A6D00',
    danger:          '#E24B4A',
    success:         '#009C3B',
    warning:         '#FFDF00',
  },
  dark: {
    background:      '#0A0A0A',
    backgroundAlt:   '#141414',
    card:            '#1A1A1A',
    border:          '#2A2A2A',
    text:            '#F5F5F5',
    textSecondary:   '#A0A0A0',
    textMuted:       '#6B6B6B',
    primary:         '#009C3B',
    primaryText:     '#FFFFFF',
    primaryTextOnDark: '#4FC97A',
    accent:          '#FFDF00',
    accentText:      '#002776',
    accentTextSafe:  '#FFDF00',
    danger:          '#E24B4A',
    success:         '#009C3B',
    warning:         '#FFDF00',
  },
};

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

// Paleta do redesign inspirado na EstadosScreen (Home + tab bar inferior,
// que fica colada nela). Própria/independente do Colors light/dark padrão
// pra manter fidelidade exata ao mockup aprovado - cor só onde tem
// significado (XP/progresso), resto em tons neutros.
export const HomeTheme = {
  dark: {
    bg: '#0e1015', card: '#1c2029', iconBg: '#16191f', border: '#252b38',
    text: '#f0f2f5', muted: '#7E879D', subtle: '#8a92a0', green: '#009C3B', yellow: '#FEDD00',
    danger: '#E24B4A',
  },
  light: {
    bg: '#FFFFFF', card: '#FFFFFF', iconBg: '#F0F0F0', border: '#D6D6D6',
    text: '#0A0A0A', muted: '#6B6B6B', subtle: '#4A4A4A', green: '#00792E', yellow: '#8A6D00',
    danger: '#E24B4A',
  },
} as const;

export type ColorScheme = 'light' | 'dark';
export type ThemeColors = typeof Colors.light;
