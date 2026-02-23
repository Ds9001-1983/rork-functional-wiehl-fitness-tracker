import { useStudio } from './use-studio';
import { Colors as DefaultColors } from '@/constants/colors';

/**
 * Returns studio-branded colors. Use `const Colors = useColors()` inside
 * components to shadow the static Colors import so all accent/primary
 * references automatically pick up the current studio branding.
 *
 * Falls back to DefaultColors when StudioProvider hasn't loaded yet.
 */
export function useColors() {
  try {
    const { studioColors } = useStudio();
    return studioColors;
  } catch {
    return DefaultColors;
  }
}

export type ThemedColors = ReturnType<typeof useColors>;
