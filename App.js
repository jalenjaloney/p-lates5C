import 'react-native-gesture-handler';
import React from 'react';
import { ActivityIndicator, View, StyleSheet } from 'react-native';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { Ionicons } from '@expo/vector-icons';
import { StatusBar } from 'expo-status-bar';

import { AuthContextProvider, UserAuth } from './src/context/AuthContext';
import SigninScreen from './src/screens/SigninScreen';
import SignupScreen from './src/screens/SignupScreen';
import DashboardScreen from './src/screens/DashboardScreen';
import DishDetailScreen from './src/screens/DishDetailScreen';
import VerifyEmailScreen from './src/screens/VerifyEmailScreen';
import ProfileScreen from './src/screens/ProfileScreen';
import SearchScreen from './src/screens/SearchScreen';
import UserProfileScreen from './src/screens/UserProfileScreen';
import HomeSnapshotScreen from './src/screens/HomeSnapshotScreen';

const Stack = createNativeStackNavigator();
const Tab = createBottomTabNavigator();

function MainTabs() {
  const { session } = UserAuth();

  return (
    <Tab.Navigator
      screenOptions={({ route }) => ({
        headerShown: false,
        tabBarActiveTintColor: '#2563eb',
        tabBarInactiveTintColor: '#6b7280',
        tabBarLabelStyle: { fontWeight: '600' },
        tabBarStyle: { paddingVertical: 6, height: 64 },
        tabBarIcon: ({ color, size }) => {
          const iconMap = {
            Home: 'home',
            Menus: 'restaurant',
            Search: 'search',
            Profile: session ? 'person-circle' : 'log-in',
          };
          const name = iconMap[route.name] || 'ellipse';
          return <Ionicons name={name} color={color} size={size} />;
        },
      })}
    >
      <Tab.Screen name="Home" component={HomeSnapshotScreen} />
      <Tab.Screen name="Menus" component={DashboardScreen} />
      <Tab.Screen name="Search" component={SearchScreen} />
      <Tab.Screen
        name="Profile"
        component={ProfileScreen}
        options={{ tabBarLabel: session ? 'Profile' : 'Sign in' }}
        listeners={({ navigation }) => ({
          tabPress: (e) => {
            if (!session) {
              e.preventDefault();
              navigation.navigate('Signin');
            }
          },
        })}
      />
    </Tab.Navigator>
  );
}

function RootNavigator() {
  const { session } = UserAuth();

  if (session === undefined) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator size="large" color="#2563eb" />
      </View>
    );
  }

  return (
    <Stack.Navigator initialRouteName="MainTabs">
      <Stack.Screen name="MainTabs" component={MainTabs} options={{ headerShown: false }} />
      <Stack.Screen name="Signin" component={SigninScreen} options={{ title: 'Sign in', headerShown: false }} />
      <Stack.Screen name="Signup" component={SignupScreen} options={{ title: 'Sign up' }} />
      <Stack.Screen name="VerifyEmail" component={VerifyEmailScreen} options={{ title: 'Verify email' }} />
      <Stack.Screen name="DishDetail" component={DishDetailScreen} options={{ title: 'Dish details' }} />
      <Stack.Screen name="UserProfile" component={UserProfileScreen} options={{ title: 'User profile' }} />
    </Stack.Navigator>
  );
}

export default function App() {
  return (
    <AuthContextProvider>
      <NavigationContainer>
        <StatusBar style="dark" />
        <RootNavigator />
      </NavigationContainer>
    </AuthContextProvider>
  );
}

const styles = StyleSheet.create({
  centered: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
