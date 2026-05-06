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
import { ExercisesProvider } from "@/hooks/use-exercises";
import { ErrorBoundary } from "@/components/ErrorBoundary";
import { trpc, trpcReactClient } from "@/lib/trpc";
import { useNotifications } from "@/hooks/use-notifications";

SplashScreen.preventAutoHideAsync();

const queryClient = new QueryClient();

const DEFAULT_SCREEN_OPTIONS = {
  headerBackTitle: "Zurück",
  headerStyle: { backgroundColor: '#000000' },
  headerTintColor: '#FFFFFF',
} as const;

const HIDDEN_HEADER = { headerShown: false } as const;
const OPT_ACTIVE_WORKOUT = { title: 'Aktives Workout' } as const;
const OPT_TRAINER = { title: 'Trainer Center' } as const;
const OPT_CHANGE_PW = { title: 'Passwort ändern' } as const;
const OPT_CUSTOMER_MGMT = { title: 'Kundenverwaltung' } as const;
const OPT_TRAINING_UNITS = { title: 'Trainingseinheiten auswählen' } as const;
const OPT_MY_BOOKINGS = { title: 'Meine Buchungen' } as const;
const OPT_TRAINER_COURSES = { title: 'Meine Kurse' } as const;
const OPT_TRAINER_PARTICIPANTS = { title: 'Teilnehmer' } as const;
const OPT_ADMIN_COURSES = { title: 'Kursverwaltung' } as const;
const OPT_ADMIN_COURSE_DETAIL = { title: 'Kurs' } as const;
const OPT_ADMIN_PENALTIES = { title: 'No-Show Verwaltung' } as const;
const OPT_ADMIN_EXERCISES = { title: 'Übungsverwaltung' } as const;

function NotificationsBootstrap({ children }: { children: React.ReactNode }) {
  const { user } = useAuth();
  useNotifications(user?.id ?? null);
  return <>{children}</>;
}

function RootLayoutNav() {
  const { isLoading } = useAuth();

  if (isLoading) {
    return null;
  }

  return (
    <Stack screenOptions={DEFAULT_SCREEN_OPTIONS}>
      <Stack.Screen name="index" options={HIDDEN_HEADER} />
      <Stack.Screen name="login" options={HIDDEN_HEADER} />
      <Stack.Screen name="(tabs)" options={HIDDEN_HEADER} />
      <Stack.Screen name="(trainer-tabs)" options={HIDDEN_HEADER} />
      <Stack.Screen name="(admin-tabs)" options={HIDDEN_HEADER} />
      <Stack.Screen name="active-workout" options={OPT_ACTIVE_WORKOUT} />
      <Stack.Screen name="trainer" options={OPT_TRAINER} />
      <Stack.Screen name="change-password" options={OPT_CHANGE_PW} />
      <Stack.Screen name="customer-management" options={OPT_CUSTOMER_MGMT} />
      <Stack.Screen name="training-units-selection" options={OPT_TRAINING_UNITS} />
      <Stack.Screen name="my-bookings" options={OPT_MY_BOOKINGS} />
      <Stack.Screen name="trainer-courses" options={OPT_TRAINER_COURSES} />
      <Stack.Screen name="trainer-course-participants" options={OPT_TRAINER_PARTICIPANTS} />
      <Stack.Screen name="admin-courses" options={OPT_ADMIN_COURSES} />
      <Stack.Screen name="admin-course-detail" options={OPT_ADMIN_COURSE_DETAIL} />
      <Stack.Screen name="admin-penalties" options={OPT_ADMIN_PENALTIES} />
      <Stack.Screen name="admin-exercises" options={OPT_ADMIN_EXERCISES} />
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
                    <ExercisesProvider>
                      <ErrorBoundary>
                        <NotificationsBootstrap>
                          <RootLayoutNav />
                        </NotificationsBootstrap>
                      </ErrorBoundary>
                    </ExercisesProvider>
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
