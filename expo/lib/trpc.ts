import { createTRPCReact } from "@trpc/react-query";
import { createTRPCClient, httpLink } from "@trpc/client";
import type { AppRouter } from "@/backend/trpc/app-router";
import superjson from "superjson";
import AsyncStorage from "@react-native-async-storage/async-storage";

export const trpc = createTRPCReact<AppRouter>();

// Module-level token cache for performance
let cachedToken: string | null = null;

export function setCachedToken(token: string | null) {
  cachedToken = token;
}

// Auth-Expired-Subscriber: ein Listener wird gefeuert, wenn der Server
// UNAUTHORIZED zurückgibt (z.B. JWT abgelaufen / Secret rotiert).
// Konsumenten registrieren sich via onAuthExpired und triggern dann z.B. logout + redirect.
type AuthExpiredListener = () => void;
const authExpiredListeners = new Set<AuthExpiredListener>();
let authExpiredDebounceTimer: ReturnType<typeof setTimeout> | null = null;

export function onAuthExpired(listener: AuthExpiredListener): void {
  authExpiredListeners.add(listener);
}

export function offAuthExpired(listener: AuthExpiredListener): void {
  authExpiredListeners.delete(listener);
}

function notifyAuthExpired() {
  // Debounce, damit bei einer Salve paralleler Requests (5x leerer Liste laden)
  // der Logout nur 1x ausgelöst wird.
  if (authExpiredDebounceTimer) return;
  authExpiredDebounceTimer = setTimeout(() => {
    authExpiredDebounceTimer = null;
    authExpiredListeners.forEach((l) => {
      try { l(); } catch (e) { console.warn('[tRPC] authExpired listener threw', e); }
    });
  }, 250);
}

async function getAuthHeaders(): Promise<Record<string, string>> {
  try {
    const token = cachedToken || await AsyncStorage.getItem('authToken');
    if (token) {
      return { Authorization: `Bearer ${token}` };
    }
  } catch {
    // Ignore errors reading token
  }
  return {};
}

const getBaseUrl = () => {
  // Normalize function to remove trailing slashes and /api paths
  const normalize = (url: string) => url.replace(/\/$/, '').replace(/\/(api(\/trpc)?)$/, '');

  const rawUrl = process.env.EXPO_PUBLIC_API_BASE_URL ?? process.env.API_BASE_URL;
  if (rawUrl) {
    const normalized = normalize(rawUrl);
    console.log('[tRPC] Using normalized env URL:', rawUrl, '->', normalized);
    return normalized;
  }
  if (typeof window !== "undefined" && window.location?.origin) {
    const origin = window.location.origin;
    console.log('[tRPC] Using window origin:', origin);
    return origin;
  }
  console.log('[tRPC] Using fallback URL: http://127.0.0.1:3000');
  return "http://127.0.0.1:3000";
};

const baseUrl = getBaseUrl();
console.log('[tRPC] Creating client with base URL:', baseUrl);
console.log('[tRPC] Full tRPC URL:', `${baseUrl}/api/trpc`);

// Custom fetch: nach jedem Response prüfen, ob UNAUTHORIZED.
// HTTP 401 ODER tRPC-Error-Body mit code === 'UNAUTHORIZED' → Listener feuern.
// Wir clonen die Response um den Body lesen zu können, ohne das Original zu konsumieren.
// Bewusst nicht als `typeof fetch` annotiert, weil Bun Type-Extensions enthält die in RN nicht relevant sind.
const authAwareFetch = async (input: RequestInfo | URL, init?: RequestInit): Promise<Response> => {
  const response = await fetch(input, init);
  if (response.status === 401) {
    setCachedToken(null);
    notifyAuthExpired();
    return response;
  }
  // tRPC packt UNAUTHORIZED in 200/4xx mit JSON-Body. Nur bei JSON checken.
  const contentType = response.headers.get('content-type') ?? '';
  if (contentType.includes('application/json')) {
    try {
      const clone = response.clone();
      const data = await clone.json();
      const items = Array.isArray(data) ? data : [data];
      const hasUnauth = items.some((item) => {
        const code = item?.error?.data?.code ?? item?.error?.code;
        return code === 'UNAUTHORIZED';
      });
      if (hasUnauth) {
        setCachedToken(null);
        notifyAuthExpired();
      }
    } catch {
      // Body nicht lesbar oder kein JSON-Array — ignorieren.
    }
  }
  return response;
};

const linkConfig = {
  url: `${baseUrl}/api/trpc`,
  transformer: superjson,
  async headers() {
    return await getAuthHeaders();
  },
  fetch: authAwareFetch,
} as const;

// React Query client for React components
export const trpcReactClient = trpc.createClient({
  links: [httpLink(linkConfig)],
});

// Vanilla client for non-React usage
export const trpcClient = createTRPCClient<AppRouter>({
  links: [httpLink(linkConfig)],
});
