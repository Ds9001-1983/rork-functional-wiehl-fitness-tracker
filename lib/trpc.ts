import { createTRPCReact } from "@trpc/react-query";
import { createTRPCClient, httpLink } from "@trpc/client";
import type { AppRouter } from "@/backend/trpc/app-router";
import superjson from "superjson";

export const trpc = createTRPCReact<AppRouter>();

const getBaseUrl = () => {
  const envUrl = process.env.EXPO_PUBLIC_RORK_API_BASE_URL ?? process.env.API_BASE_URL;
  if (envUrl) {
    console.log('[tRPC] Using env URL:', envUrl);
    return envUrl;
  }
  if (typeof window !== "undefined" && window.location?.origin) {
    console.log('[tRPC] Using window origin:', window.location.origin);
    return window.location.origin;
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