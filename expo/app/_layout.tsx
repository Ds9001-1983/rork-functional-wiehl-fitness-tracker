import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Stack } from "expo-router";
import * as SplashScreen from "expo-splash-screen";
import React, { useEffect } from "react";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import { SafeAreaProvider } from "react-native-safe-area-context";
import { AuthProvider, useAuth } from "@/hooks/use-auth";
import { WorkoutProvider } from "@/hooks/use-workouts";
import { ClientsProvider } from "@/hooks/use-clients";
import { CoursesProvider } from "@/hooks/use-courses";
import { ErrorBoundary } from "@/components/ErrorBoundary";
import { trpc, trpcReactClient } from "@/lib/trpc";
import { useNotifications } from "@/hooks/use-notifications";

SplashScreen.preventAutoHideAsync();

const queryClient = new QueryClient();

function RootLayoutNav() {
  const { isAuthenticated, isLoading, user } = useAuth();
  useNotifications(user?.id ?? null);

  console.log('🔄 RootLayoutNav - isAuthenticated:', isAuthenticated, 'isLoading:', isLoading);
  
  if (isLoading) {
    return null; // Show loading or splash screen
  }
  
  // Kunden mit ungeändertem Starter-Passwort zur Passwort-Änderung weiterleiten
  const needsPasswordChange = isAuthenticated && user?.role === 'client' && user?.passwordChanged === false;

  const initialRoute = !isAuthenticated ? "login"
    : needsPasswordChange ? "change-password"
    : user?.role === 'admin' ? "(admin-tabs)"
    : user?.role === 'trainer' ? "(trainer-tabs)"
    : "(tabs)";

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
      <Stack.Screen name="my-bookings" options={{ title: 'Meine Buchungen' }} />
      <Stack.Screen name="trainer-courses" options={{ title: 'Meine Kurse' }} />
      <Stack.Screen name="trainer-course-participants" options={{ title: 'Teilnehmer' }} />
      <Stack.Screen name="admin-courses" options={{ title: 'Kursverwaltung' }} />
      <Stack.Screen name="admin-course-detail" options={{ title: 'Kurs' }} />
      <Stack.Screen name="admin-penalties" options={{ title: 'No-Show Verwaltung' }} />
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
          <SafeAreaProvider>
            <AuthProvider>
              <ClientsProvider>
                <WorkoutProvider>
                  <CoursesProvider>
                    <ErrorBoundary>
                      <RootLayoutNav />
                    </ErrorBoundary>
                  </CoursesProvider>
                </WorkoutProvider>
              </ClientsProvider>
            </AuthProvider>
          </SafeAreaProvider>
        </GestureHandlerRootView>
      </QueryClientProvider>
    </trpc.Provider>
  );
}