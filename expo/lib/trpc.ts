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

  const rawUrl = process.env.EXPO_PUBLIC_RORK_API_BASE_URL ?? process.env.API_BASE_URL;
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

const linkConfig = {
  url: `${baseUrl}/api/trpc`,
  transformer: superjson,
  async headers() {
    return await getAuthHeaders();
  },
} as const;

// React Query client for React components
export const trpcReactClient = trpc.createClient({
  links: [httpLink(linkConfig)],
});

// Vanilla client for non-React usage
export const trpcClient = createTRPCClient<AppRouter>({
  links: [httpLink(linkConfig)],
});