export const Colors = {
  primary: '#000000',
  secondary: '#FFFFFF',
  accent: '#FF6B35',
  success: '#4CAF50',
  warning: '#FFC107',
  error: '#F44336',
  
  background: '#0A0A0A',
  surface: '#1A1A1A',
  surfaceLight: '#2A2A2A',
  
  text: '#FFFFFF',
  textSecondary: '#B0B0B0',
  textMuted: '#808080',
  
  border: '#333333',
  borderLight: '#404040',
  
  tabBar: '#000000',
  tabBarInactive: '#666666',
  tabBarActive: '#FF6B35',
} as const;

export const Brand = {
  logoUrl: 'https://functional-wiehl.de/wp-content/uploads/2023/01/Functional-Wiehl-Logo-WEISS-TRANS-SCHMAL.png',
} as const;

export const Spacing = {
  xs: 4,
  sm: 8,
  md: 16,
  lg: 24,
  xl: 32,
  xxl: 48,
} as const;

export const BorderRadius = {
  sm: 8,
  md: 12,
  lg: 16,
  xl: 24,
  full: 9999,
} as const;

// Farb-Palette für Admin-Kurs-Farbwahl.
// 10 visuell gut unterscheidbare Farben, passen zum Dark-Theme.
export const CoursePalette: readonly { name: string; value: string }[] = [
  { name: 'Orange', value: '#FF6B35' },
  { name: 'Rot',    value: '#E53935' },
  { name: 'Rosa',   value: '#EC407A' },
  { name: 'Lila',   value: '#AB47BC' },
  { name: 'Blau',   value: '#1E88E5' },
  { name: 'Türkis', value: '#26C6DA' },
  { name: 'Grün',   value: '#43A047' },
  { name: 'Oliv',   value: '#9E9D24' },
  { name: 'Gelb',   value: '#FBC02D' },
  { name: 'Grau',   value: '#78909C' },
] as const;

export const DEFAULT_COURSE_COLOR = CoursePalette[0].value;