import { DarkTheme, DefaultTheme, ThemeProvider as NavThemeProvider } from '@react-navigation/native';
import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import 'react-native-reanimated';
import { ActivityIndicator, View } from 'react-native';
import { useFonts } from 'expo-font';
import * as SplashScreen from 'expo-splash-screen';
import {
  Inter_400Regular,
  Inter_500Medium,
  Inter_600SemiBold,
} from '@expo-google-fonts/inter';
import {
  InterTight_700Bold,
  InterTight_800ExtraBold,
} from '@expo-google-fonts/inter-tight';
import { IBMPlexMono_400Regular } from '@expo-google-fonts/ibm-plex-mono';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { useEffect } from 'react';

import { AuthContextProvider, UserAuth } from '../src/context/AuthContext';
import { ThemeProvider } from '../providers/ThemeProvider';

// Keep splash screen visible while fonts load
SplashScreen.preventAutoHideAsync();

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 5 * 60 * 1000, // 5 minutes
      gcTime: 10 * 60 * 1000, // 10 minutes (formerly cacheTime)
    },
  },
});

function RootStack() {
  const colorScheme = 'light';
  const { session } = UserAuth();

  if (session === undefined) {
    return (
      <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
        <ActivityIndicator size="large" color="#2563eb" />
      </View>
    );
  }

  const isAuthed = !!session;

  return (
    <NavThemeProvider value={colorScheme === 'dark' ? DarkTheme : DefaultTheme}>
      <Stack screenOptions={{ headerShown: false }}>
        {isAuthed ? (
          <>
            <Stack.Screen name="(tabs)" />
            <Stack.Screen name="favorites" options={{ presentation: 'modal', title: 'Favorites', headerShown: true }} />
            <Stack.Screen
              name="social"
              options={() => ({ title: 'Social', headerBackTitleVisible: false, headerShown: true })}
            />
          </>
        ) : (
          <>
            <Stack.Screen name="signin" options={{ title: 'Sign in', headerShown: true }} />
            <Stack.Screen name="signup" options={{ title: 'Sign up', headerShown: true }} />
          </>
        )}
      </Stack>
      <StatusBar style="auto" />
    </NavThemeProvider>
  );
}

export default function RootLayout() {
  const [fontsLoaded, fontError] = useFonts({
    Inter_400Regular,
    Inter_500Medium,
    Inter_600SemiBold,
    InterTight_700Bold,
    InterTight_800ExtraBold,
    IBMPlexMono_400Regular,
  });

  useEffect(() => {
    if (fontsLoaded || fontError) {
      SplashScreen.hideAsync();
    }
  }, [fontsLoaded, fontError]);

  if (!fontsLoaded && !fontError) {
    return null;
  }

  return (
    <QueryClientProvider client={queryClient}>
      <ThemeProvider>
        <AuthContextProvider>
          <RootStack />
        </AuthContextProvider>
      </ThemeProvider>
    </QueryClientProvider>
  );
}
