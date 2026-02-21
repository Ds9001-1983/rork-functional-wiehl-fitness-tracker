import { Tabs, Redirect } from "expo-router";
import { Building2, BarChart3, User } from "lucide-react-native";
import React from "react";
import { useColors } from "@/hooks/use-colors";
import { useAuth } from "@/hooks/use-auth";
import LoadingScreen from "@/components/LoadingScreen";

export default function SuperadminTabLayout() {
  const { isAuthenticated, isLoading, user } = useAuth();
  const Colors = useColors();

  if (isLoading) return <LoadingScreen />;
  if (!isAuthenticated) return <Redirect href="/login" />;
  if (user?.role !== 'superadmin') return <Redirect href="/(tabs)" />;

  return (
    <Tabs
      screenOptions={{
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
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: "Studios",
          tabBarIcon: ({ color }) => <Building2 size={24} color={color} />,
        }}
      />
      <Tabs.Screen
        name="stats"
        options={{
          title: "Uebersicht",
          tabBarIcon: ({ color }) => <BarChart3 size={24} color={color} />,
        }}
      />
      <Tabs.Screen
        name="profile"
        options={{
          title: "Profil",
          tabBarIcon: ({ color }) => <User size={24} color={color} />,
        }}
      />
    </Tabs>
  );
}
