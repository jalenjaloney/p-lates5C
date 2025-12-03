import { Tabs } from "expo-router";
import { FontAwesome5 } from "@expo/vector-icons";

import { HapticTab } from "@/components/haptic-tab";
import { IconSymbol } from "@/components/ui/icon-symbol";
import { Colors } from "@/constants/theme";
import { useColorScheme } from "@/hooks/use-color-scheme";

export default function TabLayout() {
  const colorScheme = useColorScheme();

  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarButton: HapticTab,
        tabBarActiveTintColor: Colors[colorScheme ?? "light"].tint,
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
            <IconSymbol size={28} name="fork.knife" color={color} />
          ),
        }}
      />

      {/* Your single Profile tab — consistent, simple, clean */}
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
