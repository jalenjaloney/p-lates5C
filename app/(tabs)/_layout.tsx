import { Tabs } from "expo-router";
import { FontAwesome5 } from "@expo/vector-icons";

import { HapticTab } from "@/components/haptic-tab";
import { IconSymbol } from "@/components/ui/icon-symbol";
import { tokens } from "@/constants/tokens";
import { useTheme } from "@/hooks/useTheme";

export default function TabLayout() {
  const { colors } = useTheme();

  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarButton: HapticTab,
        tabBarActiveTintColor: colors.ink,
        tabBarInactiveTintColor: colors.inkMuted,
        tabBarStyle: {
          height: 68,
          backgroundColor: colors.surface,
          borderTopWidth: 1,
          borderTopColor: colors.border,
          paddingTop: tokens.space.xs,
          paddingBottom: tokens.space.xs,
        },
        tabBarLabelStyle: {
          fontSize: tokens.fontSize.tiny,
          letterSpacing: tokens.letterSpacing.wide,
          fontWeight: "700",
          fontFamily: tokens.font.body,
        },
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: "Home",
          tabBarIcon: ({ color }) => (
            <IconSymbol size={28} name="house.fill" color={color} />
          ),
        }}
      />

      <Tabs.Screen
        name="menus"
        options={{
          title: "Menus",
          tabBarIcon: ({ color }) => (
            <FontAwesome5 name="book-open" size={22} color={color} />
          ),
        }}
      />

      <Tabs.Screen
        name="profile"
        options={{
          title: "Profile",
          tabBarIcon: ({ color }) => (
            <FontAwesome5 name="user-alt" size={22} color={color} />
          ),
        }}
      />
    </Tabs>
  );
}
