import React from 'react';
import { NavigationContainer, DefaultTheme } from '@react-navigation/native';
import { createStackNavigator } from '@react-navigation/stack';
import { AppProvider, useApp } from './src/context/AppContext';
import AuthScreen from './src/screens/AuthScreen';
import AIWizardScreen from './src/screens/AIWizardScreen';
import ScannerScreen from './src/screens/ScannerScreen';
import ResultsScreen from './src/screens/ResultsScreen';
import ChatScreen from './src/screens/ChatScreen';
import CompareScreen from './src/screens/CompareScreen';
import MainTabs from './src/navigation/MainTabs';

const Stack = createStackNavigator();

const DarkTheme = {
  ...DefaultTheme,
  dark: true,
  colors: {
    ...DefaultTheme.colors,
    primary: '#00E676',
    background: '#000000',
    card: '#000000',
    text: '#F0F2F8',
    border: '#1F1F1F',
    notification: '#00E676',
  },
};

const LightTheme = {
  ...DefaultTheme,
  dark: false,
  colors: {
    ...DefaultTheme.colors,
    primary: '#00A853',
    background: '#FFFFFF',
    card: '#FFFFFF',
    text: '#1B2430',
    border: '#EAEAEA',
    notification: '#00A853',
  },
};

function AppNavigator() {
  const { isAuthenticated, profile, themeMode } = useApp();
  const navigatorTheme = themeMode === 'light' ? LightTheme : DarkTheme;
  const appBg = themeMode === 'light' ? '#FFFFFF' : '#000000';

  return (
    <NavigationContainer theme={navigatorTheme}>
      <Stack.Navigator
        screenOptions={{
          headerShown: false,
          cardStyle: { backgroundColor: appBg },
        }}
      >
        {!isAuthenticated ? (
          <Stack.Screen name="Auth" component={AuthScreen} />
        ) : !profile.onboardingComplete ? (
          <Stack.Screen name="AIWizard" component={AIWizardScreen} />
        ) : (
          <>
            <Stack.Screen name="Main" component={MainTabs} />
            <Stack.Screen
              name="Scanner"
              component={ScannerScreen}
              options={{ presentation: 'modal' }}
            />
            <Stack.Screen name="Results" component={ResultsScreen} />
            <Stack.Screen name="Compare" component={CompareScreen} />
            <Stack.Screen name="Chat" component={ChatScreen} />
          </>
        )}
      </Stack.Navigator>
    </NavigationContainer>
  );
}

export default function App() {
  return (
    <AppProvider>
      <AppNavigator />
    </AppProvider>
  );
}
