import { createTRPCReact } from "@trpc/react-query";
import { createTRPCClient, httpLink } from "@trpc/client";
import type { AppRouter } from "@/backend/trpc/app-router";
import superjson from "superjson";
import AsyncStorage from "@react-native-async-storage/async-storage";

export const trpc = createTRPCReact<AppRouter>();

const getBaseUrl = () => {
  const normalize = (url: string) => url.replace(/\/$/, '').replace(/\/(api(\/trpc)?)$/, '');

  const rawUrl = process.env.EXPO_PUBLIC_RORK_API_BASE_URL ?? process.env.API_BASE_URL;
  if (rawUrl) {
    return normalize(rawUrl);
  }
  if (typeof window !== "undefined" && window.location?.origin) {
    return window.location.origin;
  }
  return "http://127.0.0.1:3000";
};

const baseUrl = getBaseUrl();

async function getAuthHeaders(): Promise<Record<string, string>> {
  const headers: Record<string, string> = {};
  try {
    const token = await AsyncStorage.getItem('authToken');
    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    }
    const studioId = await AsyncStorage.getItem('studioId');
    if (studioId) {
      headers['X-Studio-Id'] = studioId;
    }
  } catch {
    // AsyncStorage not available
  }
  return headers;
}

// React Query client for React components
export const trpcReactClient = trpc.createClient({
  links: [
    httpLink({
      url: `${baseUrl}/api/trpc`,
      transformer: superjson,
      headers: getAuthHeaders,
    }),
  ],
});

// Vanilla client for non-React usage
export const trpcClient = createTRPCClient<AppRouter>({
  links: [
    httpLink({
      url: `${baseUrl}/api/trpc`,
      transformer: superjson,
      headers: getAuthHeaders,
    }),
  ],
});
