import { Platform } from 'react-native';

const fontFamily = Platform.select({
  ios: 'System',
  android: 'Roboto',
  default: 'System',
});

export const Typography = {
  h1: {
    fontFamily,
    fontSize: 32,
    fontWeight: '800' as const,
    letterSpacing: -0.5,
  },
  h2: {
    fontFamily,
    fontSize: 24,
    fontWeight: '700' as const,
    letterSpacing: -0.3,
  },
  h3: {
    fontFamily,
    fontSize: 20,
    fontWeight: '600' as const,
    letterSpacing: -0.2,
  },
  body: {
    fontFamily,
    fontSize: 16,
    fontWeight: '400' as const,
    lineHeight: 24,
  },
  bodyMedium: {
    fontFamily,
    fontSize: 16,
    fontWeight: '500' as const,
    lineHeight: 24,
  },
  bodySm: {
    fontFamily,
    fontSize: 14,
    fontWeight: '400' as const,
    lineHeight: 20,
  },
  caption: {
    fontFamily,
    fontSize: 12,
    fontWeight: '500' as const,
    letterSpacing: 0.5,
  },
  label: {
    fontFamily,
    fontSize: 13,
    fontWeight: '600' as const,
    letterSpacing: 0.8,
    textTransform: 'uppercase' as const,
  },
  number: {
    fontFamily,
    fontSize: 28,
    fontWeight: '700' as const,
    letterSpacing: -0.5,
  },
  numberSm: {
    fontFamily,
    fontSize: 18,
    fontWeight: '700' as const,
    letterSpacing: -0.3,
  },
};

export const Spacing = {
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 20,
  xxl: 24,
  xxxl: 32,
};

export const BorderRadius = {
  sm: 8,
  md: 12,
  lg: 16,
  xl: 20,
  full: 9999,
};
