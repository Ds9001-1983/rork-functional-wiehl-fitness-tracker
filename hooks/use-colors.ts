import { Colors as DefaultColors } from '@/constants/colors';

/**
 * Returns the app colors (Functional Wiehl branding).
 * All screens use `const Colors = useColors()` to get the design tokens.
 */
export function useColors() {
  return DefaultColors;
}

export type ThemedColors = typeof DefaultColors;
