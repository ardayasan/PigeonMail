/**
 * App.tsx — Root of the React Native mail client.
 *
 * Navigation structure:
 *   AuthProvider
 *   └── NavigationContainer
 *       ├── Auth stack  (when signed out): Login → Register
 *       └── App stack   (when signed in):  Inbox → Message, Compose
 */

import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { StatusBar } from 'expo-status-bar';
import React from 'react';
import { ActivityIndicator, View } from 'react-native';

import { AuthProvider, useAuth } from './src/context/AuthContext';
import ComposeScreen from './src/screens/ComposeScreen';
import InboxScreen from './src/screens/InboxScreen';
import LoginScreen from './src/screens/LoginScreen';
import MessageScreen from './src/screens/MessageScreen';
import RegisterScreen from './src/screens/RegisterScreen';

const AuthStack = createNativeStackNavigator();
const AppStack = createNativeStackNavigator();

function AuthNavigator() {
  return (
    <AuthStack.Navigator screenOptions={{ headerShown: false }}>
      <AuthStack.Screen name="Login" component={LoginScreen} />
      <AuthStack.Screen name="Register" component={RegisterScreen} />
    </AuthStack.Navigator>
  );
}

function AppNavigator() {
  return (
    <AppStack.Navigator screenOptions={{ headerShown: false }}>
      <AppStack.Screen name="Inbox" component={InboxScreen} />
      <AppStack.Screen name="Message" component={MessageScreen} />
      <AppStack.Screen
        name="Compose"
        component={ComposeScreen}
        options={{ presentation: 'modal' }}
      />
    </AppStack.Navigator>
  );
}

function RootNavigator() {
  const { token, isLoading } = useAuth();

  if (isLoading) {
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
        <ActivityIndicator size="large" color="#1a73e8" />
      </View>
    );
  }

  return token ? <AppNavigator /> : <AuthNavigator />;
}

export default function App() {
  return (
    <AuthProvider>
      <NavigationContainer>
        <StatusBar style="dark" />
        <RootNavigator />
      </NavigationContainer>
    </AuthProvider>
  );
}
