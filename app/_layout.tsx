import { DarkTheme, DefaultTheme, ThemeProvider } from '@react-navigation/native';
import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import 'react-native-reanimated';
import { ActivityIndicator, View } from 'react-native';

import { useColorScheme } from '@/hooks/use-color-scheme';
import { AuthContextProvider, UserAuth } from '../src/context/AuthContext';

export const unstable_settings = {
  anchor: '(tabs)',
};

function RootStack() {
  const colorScheme = useColorScheme();
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
    <ThemeProvider value={colorScheme === 'dark' ? DarkTheme : DefaultTheme}>
      <Stack>
        {isAuthed ? (
          <>
            <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
            <Stack.Screen name="modal" options={{ presentation: 'modal', title: 'Modal' }} />
            <Stack.Screen
              name="social"
              options={() => ({ title: 'Social', headerBackTitleVisible: false })}
            />
          </>
        ) : (
          <>
            <Stack.Screen name="signin" options={{ title: 'Sign in' }} />
            <Stack.Screen name="signup" options={{ title: 'Sign up' }} />
          </>
        )}
      </Stack>
      <StatusBar style="auto" />
    </ThemeProvider>
  );
}

export default function RootLayout() {
  return (
    <AuthContextProvider>
      <RootStack />
    </AuthContextProvider>
  );
}
