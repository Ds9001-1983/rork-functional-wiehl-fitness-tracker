import type { Router } from 'expo-router';

// Navigiert zurück, wenn die History es erlaubt — sonst Fallback zur Startseite.
// Verhindert No-Op-Taps auf Back-Buttons in deep-link gestarteten Screens
// (z.B. via Push-Notification direkt geöffnet).
export function safeBack(router: Router, fallback: string = '/'): void {
  if (router.canGoBack()) {
    router.back();
  } else {
    // expo-router 6 erwartet bei replace() den href als Parameter, Cast hier statisch.
    router.replace(fallback as never);
  }
}
