import { Tabs, Redirect } from "expo-router";
import { Users, ClipboardList, User, MessageSquare, Bell, Calendar } from "lucide-react-native";
import React, { useState, useEffect, useCallback } from "react";
import { View, Text, TouchableOpacity } from "react-native";
import { useRouter } from "expo-router";
import { useColors } from "@/hooks/use-colors";
import { useAuth } from "@/hooks/use-auth";
import { trpcClient } from "@/lib/trpc";
import LoadingScreen from "@/components/LoadingScreen";

function TrainerHeaderRight() {
  const [chatUnread, setChatUnread] = useState(0);
  const [unreadCount, setUnreadCount] = useState(0);
  const Colors = useColors();
  const router = useRouter();

  const loadCounts = useCallback(async () => {
    try {
      const c = await trpcClient.chat.unreadCount.query();
      setChatUnread(typeof c === 'number' ? c : (c as any)?.count || 0);
    } catch {}
    try {
      const n = await trpcClient.notifications.unreadCount.query();
      setUnreadCount(typeof n === 'number' ? n : (n as any)?.count || 0);
    } catch {}
  }, []);

  useEffect(() => {
    loadCounts();
    const interval = setInterval(loadCounts, 15000);
    return () => clearInterval(interval);
  }, [loadCounts]);

  return (
    <View style={{ flexDirection: 'row', alignItems: 'center' }}>
      <TouchableOpacity
        onPress={() => router.push('/chat' as any)}
        style={{ marginRight: 12, position: 'relative' }}
      >
        <MessageSquare size={22} color={Colors.text} />
        {chatUnread > 0 && (
          <View style={{
            position: 'absolute', top: -4, right: -6, backgroundColor: Colors.accent,
            borderRadius: 9999, minWidth: 16, height: 16, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 3,
          }}>
            <Text style={{ color: '#FFFFFF', fontSize: 10, fontWeight: '700' }}>{chatUnread > 9 ? '9+' : chatUnread}</Text>
          </View>
        )}
      </TouchableOpacity>
      <TouchableOpacity
        onPress={() => router.push('/notifications')}
        style={{ marginRight: 16, position: 'relative' }}
      >
        <Bell size={22} color={Colors.text} />
        {unreadCount > 0 && (
          <View style={{
            position: 'absolute', top: -4, right: -6, backgroundColor: Colors.accent,
            borderRadius: 9999, minWidth: 16, height: 16, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 3,
          }}>
            <Text style={{ color: '#FFFFFF', fontSize: 10, fontWeight: '700' }}>{unreadCount > 9 ? '9+' : unreadCount}</Text>
          </View>
        )}
      </TouchableOpacity>
    </View>
  );
}

export default function TrainerTabLayout() {
  const { isAuthenticated, isLoading, user } = useAuth();
  const Colors = useColors();

  if (isLoading) return <LoadingScreen />;
  if (!isAuthenticated) return <Redirect href="/login" />;
  if (user?.role !== 'trainer' && user?.role !== 'admin') return <Redirect href="/(tabs)" />;

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
        headerRight: () => <TrainerHeaderRight />,
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: "Kunden",
          tabBarIcon: ({ color }) => <Users size={24} color={color} />,
        }}
      />
      <Tabs.Screen
        name="plans"
        options={{
          title: "Trainingspläne",
          tabBarIcon: ({ color }) => <ClipboardList size={24} color={color} />,
        }}
      />
      <Tabs.Screen
        name="kurse"
        options={{
          title: "Kurse",
          tabBarIcon: ({ color }) => <Calendar size={24} color={color} />,
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
