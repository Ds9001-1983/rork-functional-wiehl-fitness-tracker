import { Tabs, Redirect } from "expo-router";
import { Dumbbell, Calendar, BarChart3, User, BookOpen } from "lucide-react-native";
import React from "react";
import { Colors } from "@/constants/colors";
import { useAuth } from "@/hooks/use-auth";
import LoadingScreen from "@/components/LoadingScreen";

const TAB_SCREEN_OPTIONS = {
  tabBarActiveTintColor: Colors.tabBarActive,
  tabBarInactiveTintColor: Colors.tabBarInactive,
  tabBarStyle: {
    backgroundColor: Colors.tabBar,
    borderTopColor: Colors.border,
  },
  headerStyle: {
    backgroundColor: Colors.primary,
  },
  headerTintColor: Colors.text,
  headerTitleStyle: {
    fontWeight: '600' as const,
  },
} as const;

const TAB_ICONS = {
  index: ({ color }: { color: string }) => <Dumbbell size={24} color={color} />,
  courses: ({ color }: { color: string }) => <BookOpen size={24} color={color} />,
  exercises: ({ color }: { color: string }) => <Calendar size={24} color={color} />,
  stats: ({ color }: { color: string }) => <BarChart3 size={24} color={color} />,
  profile: ({ color }: { color: string }) => <User size={24} color={color} />,
} as const;

const SCREEN_INDEX = { title: "Workout", tabBarIcon: TAB_ICONS.index } as const;
const SCREEN_COURSES = { title: "Kurse", tabBarIcon: TAB_ICONS.courses } as const;
const SCREEN_EXERCISES = { title: "Übungen", tabBarIcon: TAB_ICONS.exercises } as const;
const SCREEN_STATS = { title: "Statistiken", tabBarIcon: TAB_ICONS.stats } as const;
const SCREEN_PROFILE = { title: "Profil", tabBarIcon: TAB_ICONS.profile } as const;

export default function TabLayout() {
  const { isAuthenticated, isLoading } = useAuth();

  if (isLoading) return <LoadingScreen />;
  if (!isAuthenticated) return <Redirect href="/login" />;

  return (
    <Tabs screenOptions={TAB_SCREEN_OPTIONS}>
      <Tabs.Screen name="index" options={SCREEN_INDEX} />
      <Tabs.Screen name="courses" options={SCREEN_COURSES} />
      <Tabs.Screen name="exercises" options={SCREEN_EXERCISES} />
      <Tabs.Screen name="stats" options={SCREEN_STATS} />
      <Tabs.Screen name="profile" options={SCREEN_PROFILE} />
    </Tabs>
  );
}
