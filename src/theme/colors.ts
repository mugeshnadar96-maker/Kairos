// MenuMind Design System — Colors
export type ThemeMode = 'light' | 'dark';

const darkTheme = {
  // Base dark theme
  bg: '#000000',
  bgCard: '#000000',
  bgCardAlt: '#000000',
  bgInput: '#111111',
  bgModal: '#000000',
  border: '#1F1F1F',
  borderLight: '#1A1A1A',

  // Text
  textPrimary: '#F0F2F8',
  textSecondary: '#8B95B0',
  textMuted: '#5A6580',
  textInverse: '#0A0E17',

  // Accent — Green (primary)
  accent: '#00E676',
  accentDark: '#00C853',
  accentLight: '#69F0AE',
  accentBg: 'rgba(0, 230, 118, 0.08)',
  accentBorder: 'rgba(0, 230, 118, 0.25)',

  // Cheat Day — Amber
  amber: '#FFB300',
  amberDark: '#FF8F00',
  amberLight: '#FFD54F',
  amberBg: 'rgba(255, 179, 0, 0.08)',
  amberBorder: 'rgba(255, 179, 0, 0.25)',

  // Macro colors
  macroCalories: '#FF5252',
  macroProtein: '#B388FF',
  macroCarbs: '#FFB300',
  macroFat: '#69F0AE',

  // Verdict badges
  topPick: '#00E676',
  goodFit: '#64B5F6',
  skip: '#FF5252',

  // Status
  success: '#00E676',
  warning: '#FFB300',
  error: '#FF5252',
  info: '#64B5F6',

  // Gradients
  gradientStart: '#0A0E17',
  gradientEnd: '#141927',
  accentGradientStart: '#00E676',
  accentGradientEnd: '#00B0FF',
};

const lightTheme = {
  bg: '#FFFFFF',
  bgCard: '#FFFFFF',
  bgCardAlt: '#FFFFFF',
  bgInput: '#F5F5F5',
  bgModal: '#FFFFFF',
  border: '#EAEAEA',
  borderLight: '#F0F0F0',

  textPrimary: '#1B2430',
  textSecondary: '#47566B',
  textMuted: '#7A879F',
  textInverse: '#F5F7FB',

  accent: '#00A853',
  accentDark: '#008C43',
  accentLight: '#5BE39E',
  accentBg: 'rgba(0, 168, 83, 0.12)',
  accentBorder: 'rgba(0, 168, 83, 0.18)',

  amber: '#FFB300',
  amberDark: '#E39B00',
  amberLight: '#FFD54F',
  amberBg: 'rgba(255, 179, 0, 0.12)',
  amberBorder: 'rgba(255, 179, 0, 0.2)',

  macroCalories: '#FF5A5A',
  macroProtein: '#8A66FF',
  macroCarbs: '#FFB300',
  macroFat: '#37C98D',

  topPick: '#00A853',
  goodFit: '#3B82F6',
  skip: '#EF4444',

  success: '#00A853',
  warning: '#FFB300',
  error: '#EF4444',
  info: '#3B82F6',

  gradientStart: '#F5F7FB',
  gradientEnd: '#EAF0FF',
  accentGradientStart: '#00A853',
  accentGradientEnd: '#3B82F6',
};

export const Colors: Record<string, string> = { ...darkTheme };

export const setThemeMode = (mode: ThemeMode) => {
  const palette = mode === 'light' ? lightTheme : darkTheme;
  Object.keys(Colors).forEach((key) => delete (Colors as Record<string, string>)[key]);
  Object.assign(Colors, palette);
};

export const CheatDayColors = {
  accent: '#FFB300',
  accentDark: '#FF8F00',
  accentLight: '#FFD54F',
  accentBg: 'rgba(255, 179, 0, 0.08)',
  accentBorder: 'rgba(255, 179, 0, 0.25)',
  topPick: '#FFB300',
};
