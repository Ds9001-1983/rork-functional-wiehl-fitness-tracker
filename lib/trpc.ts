import { createTRPCReact } from "@trpc/react-query";
import { createTRPCClient, httpLink } from "@trpc/client";
import type { AppRouter } from "@/backend/trpc/app-router";
import superjson from "superjson";

export const trpc = createTRPCReact<AppRouter>();

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

// React Query client for React components
export const trpcReactClient = trpc.createClient({
  links: [
    httpLink({
      url: `${baseUrl}/api/trpc`,
      transformer: superjson,
      headers: () => {
        console.log('[tRPC] Making React request to:', `${baseUrl}/api/trpc`);
        return {};
      },
    }),
  ],
});

// Vanilla client for non-React usage
export const trpcClient = createTRPCClient<AppRouter>({
  links: [
    httpLink({
      url: `${baseUrl}/api/trpc`,
      transformer: superjson,
      headers: () => {
        console.log('[tRPC] Making vanilla request to:', `${baseUrl}/api/trpc`);
        return {};
      },
    }),
  ],
});