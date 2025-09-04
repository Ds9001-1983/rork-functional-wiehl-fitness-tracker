import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Stack } from "expo-router";
import * as SplashScreen from "expo-splash-screen";
import React, { useEffect } from "react";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import { AuthProvider, useAuth } from "@/hooks/use-auth";
import { WorkoutProvider } from "@/hooks/use-workouts";
import { ClientsProvider } from "@/hooks/use-clients";
import { ErrorBoundary } from "@/components/ErrorBoundary";
import { trpc, trpcClient } from "@/lib/trpc";

SplashScreen.preventAutoHideAsync();

const queryClient = new QueryClient();

function RootLayoutNav() {
  const { isAuthenticated, isLoading } = useAuth();
  
  console.log('🔄 RootLayoutNav - isAuthenticated:', isAuthenticated, 'isLoading:', isLoading);
  
  if (isLoading) {
    return null; // Show loading or splash screen
  }
  
  return (
    <Stack 
      initialRouteName={isAuthenticated ? "(tabs)" : "login"}
      screenOptions={{ 
        headerBackTitle: "Zurück",
        headerStyle: {
          backgroundColor: '#000000',
        },
        headerTintColor: '#FFFFFF',
      }}
    >
      <Stack.Screen name="login" options={{ headerShown: false }} />
      <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
      <Stack.Screen name="active-workout" options={{ title: 'Aktives Workout' }} />
      <Stack.Screen name="trainer" options={{ title: 'Trainer Center' }} />
      <Stack.Screen name="change-password" options={{ title: 'Passwort ändern' }} />
      <Stack.Screen name="schedule-training" options={{ title: 'Training planen' }} />
      <Stack.Screen name="customer-management" options={{ title: 'Kundenverwaltung' }} />
      <Stack.Screen name="training-units-selection" options={{ title: 'Trainingseinheiten auswählen' }} />
    </Stack>
  );
}

export default function RootLayout() {
  useEffect(() => {
    SplashScreen.hideAsync();
  }, []);

  return (
    <trpc.Provider client={trpcClient} queryClient={queryClient}>
      <QueryClientProvider client={queryClient}>
        <GestureHandlerRootView style={{ flex: 1 }}>
          <AuthProvider>
            <ClientsProvider>
              <WorkoutProvider>
                <ErrorBoundary>
                  <RootLayoutNav />
                </ErrorBoundary>
              </WorkoutProvider>
            </ClientsProvider>
          </AuthProvider>
        </GestureHandlerRootView>
      </QueryClientProvider>
    </trpc.Provider>
  );
}