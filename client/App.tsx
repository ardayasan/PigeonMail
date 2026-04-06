/**
 * App.tsx — Root of the React Native Pigeon Mail client.
 *
 * Navigation structure:
 *   AuthProvider + MailboxProvider
 *   └── NavigationContainer
 *       ├── Auth Stack  (signed out): Login → Register
 *       └── Drawer Navigator (signed in):
 *             Drawer content = web-style sidebar
 *             Main screen = InboxScreen (with stack: → Message, → Compose)
 */

import { createDrawerNavigator } from '@react-navigation/drawer';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { StatusBar } from 'expo-status-bar';
import React, { useCallback } from 'react';
import { ActivityIndicator, View } from 'react-native';

import DrawerContent from './src/components/DrawerContent';
import { AuthProvider, useAuth } from './src/context/AuthContext';
import { MailboxProvider, useMailbox, MailboxId } from './src/context/MailboxContext';
import ComposeScreen from './src/screens/ComposeScreen';
import InboxScreen from './src/screens/InboxScreen';
import LoginScreen from './src/screens/LoginScreen';
import MessageScreen from './src/screens/MessageScreen';
import RegisterScreen from './src/screens/RegisterScreen';

/* ── Stack inside drawer (Inbox → Message / Compose) ── */
const AppStack = createNativeStackNavigator();

function AppStackNavigator() {
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

/* ── Drawer navigator wrapping the stack ── */
const Drawer = createDrawerNavigator();

function DrawerNavigator() {
  const { activeMailbox, activeCategory, inboxCount, setMailbox, setCategory } = useMailbox();

  const handleCompose = useCallback((navigation: any) => {
    navigation.navigate('Inbox', { screen: 'Compose' });
  }, []);

  return (
    <Drawer.Navigator
      screenOptions={{
        headerShown: false,
        drawerStyle: { width: 240 },
        overlayColor: 'rgba(0,0,0,0.5)',
        swipeEdgeWidth: 40,
      }}
      drawerContent={(props) => (
        <DrawerContent
          {...props}
          activeMailbox={activeMailbox}
          activeCategory={activeCategory}
          inboxCount={inboxCount}
          onSelectMailbox={(id: MailboxId) => setMailbox(id)}
          onSelectCategory={(cat: string) => setCategory(cat)}
        />
      )}
    >
      <Drawer.Screen name="Main" component={AppStackNavigator} />
    </Drawer.Navigator>
  );
}

/* ── Auth stack ── */
const AuthStack = createNativeStackNavigator();

function AuthNavigator() {
  return (
    <AuthStack.Navigator screenOptions={{ headerShown: false }}>
      <AuthStack.Screen name="Login" component={LoginScreen} />
      <AuthStack.Screen name="Register" component={RegisterScreen} />
    </AuthStack.Navigator>
  );
}

/* ── Root router ── */
function RootNavigator() {
  const { token, isLoading } = useAuth();

  if (isLoading) {
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#0D0D12' }}>
        <ActivityIndicator size="large" color="#4F46E5" />
      </View>
    );
  }

  return token ? (
    <MailboxProvider>
      <DrawerNavigator />
    </MailboxProvider>
  ) : (
    <AuthNavigator />
  );
}

/* ── App entry point ── */
export default function App() {
  return (
    <AuthProvider>
      <NavigationContainer>
        <StatusBar style="light" />
        <RootNavigator />
      </NavigationContainer>
    </AuthProvider>
  );
}
