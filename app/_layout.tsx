import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Stack } from "expo-router";
import * as SplashScreen from "expo-splash-screen";
import React, { useEffect } from "react";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import { AuthProvider, useAuth } from "@/hooks/use-auth";
import { WorkoutProvider } from "@/hooks/use-workouts";
import { ClientsProvider } from "@/hooks/use-clients";
import { GamificationProvider } from "@/hooks/use-gamification";
import { ErrorBoundary } from "@/components/ErrorBoundary";
import { trpc, trpcReactClient } from "@/lib/trpc";
import LoadingScreen from "@/components/LoadingScreen";

SplashScreen.preventAutoHideAsync();

const queryClient = new QueryClient();

function getInitialRoute(role?: string): string {
  switch (role) {
    case 'admin': return '(admin-tabs)';
    case 'trainer': return '(trainer-tabs)';
    default: return '(tabs)';
  }
}

function RootLayoutNav() {
  const { isAuthenticated, isLoading, user } = useAuth();

  if (isLoading) {
    return <LoadingScreen />;
  }

  const initialRoute = isAuthenticated ? getInitialRoute(user?.role) : 'login';

  return (
    <Stack
      initialRouteName={initialRoute}
      screenOptions={{
        headerBackTitle: "Zurück",
        headerStyle: {
          backgroundColor: '#000000',
        },
        headerTintColor: '#FFFFFF',
      }}
    >
      <Stack.Screen name="index" options={{ headerShown: false }} />
      <Stack.Screen name="login" options={{ headerShown: false }} />
      <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
      <Stack.Screen name="(trainer-tabs)" options={{ headerShown: false }} />
      <Stack.Screen name="(admin-tabs)" options={{ headerShown: false }} />
      <Stack.Screen name="active-workout" options={{ title: 'Aktives Workout' }} />
      <Stack.Screen name="trainer" options={{ title: 'Trainer Center' }} />
      <Stack.Screen name="change-password" options={{ title: 'Passwort ändern' }} />
      <Stack.Screen name="schedule-training" options={{ title: 'Training planen' }} />
      <Stack.Screen name="customer-management" options={{ title: 'Kundenverwaltung' }} />
      <Stack.Screen name="training-units-selection" options={{ title: 'Trainingseinheiten auswählen' }} />
      <Stack.Screen name="routines" options={{ title: 'Routinen' }} />
      <Stack.Screen name="workout-detail/[id]" options={{ title: 'Workout Details' }} />
    </Stack>
  );
}

export default function RootLayout() {
  useEffect(() => {
    SplashScreen.hideAsync();
  }, []);

  return (
    <trpc.Provider client={trpcReactClient} queryClient={queryClient}>
      <QueryClientProvider client={queryClient}>
        <GestureHandlerRootView style={{ flex: 1 }}>
          <AuthProvider>
            <ClientsProvider>
              <WorkoutProvider>
                <GamificationProvider>
                  <ErrorBoundary>
                    <RootLayoutNav />
                  </ErrorBoundary>
                </GamificationProvider>
              </WorkoutProvider>
            </ClientsProvider>
          </AuthProvider>
        </GestureHandlerRootView>
      </QueryClientProvider>
    </trpc.Provider>
  );
}
