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
    textMuted:       '#A0A0A0',
    primary:         '#009C3B',
    primaryText:     '#FFFFFF',
    accent:          '#FFDF00',
    accentText:      '#002776',
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
    accent:          '#FFDF00',
    accentText:      '#002776',
    danger:          '#E24B4A',
    success:         '#009C3B',
    warning:         '#FFDF00',
  },
};

export type ColorScheme = 'light' | 'dark';
export type ThemeColors = typeof Colors.light;
