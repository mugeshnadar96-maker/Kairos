// Persistent bottom navigation — Home, Cook at Home, Scan (center action),
// History, and Profile are always one tap away. Scanner/Results/Chat/Compare
// stay as stack screens pushed on top (they need scan context and hide the
// tab bar while active), matching the existing modal presentation for Scanner.
import React from 'react';
import { View, TouchableOpacity, StyleSheet } from 'react-native';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { Ionicons } from '@expo/vector-icons';
import HomeScreen from '../screens/HomeScreen';
import CookAtHomeScreen from '../screens/CookAtHomeScreen';
import HistoryScreen from '../screens/HistoryScreen';
import OnboardingScreen from '../screens/OnboardingScreen';
import { Colors } from '../theme/colors';

const Tab = createBottomTabNavigator();

// The center tab never actually renders — tabPress is intercepted below to
// push the Scanner modal instead, so this is just a placeholder route.
function ScanPlaceholder() { return null; }

function ScanTabButton({ onPress }: { onPress?: (e: any) => void }) {
  return (
    <TouchableOpacity style={tabStyles.scanBtnWrap} onPress={onPress} activeOpacity={0.85}>
      <View style={tabStyles.scanBtn}>
        <Ionicons name="camera" size={24} color={Colors.bg} />
      </View>
    </TouchableOpacity>
  );
}

export default function MainTabs() {
  return (
    <Tab.Navigator
      initialRouteName="Home"
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: Colors.accent,
        tabBarInactiveTintColor: Colors.textMuted,
        tabBarStyle: {
          backgroundColor: Colors.bg,
          borderTopColor: Colors.border,
          borderTopWidth: 1,
          height: 62,
          paddingBottom: 8,
          paddingTop: 6,
        },
        tabBarLabelStyle: { fontSize: 11, fontWeight: '600' },
      }}
    >
      <Tab.Screen
        name="Home"
        component={HomeScreen}
        options={{ tabBarIcon: ({ color, size }) => <Ionicons name="home" size={size} color={color} /> }}
      />
      <Tab.Screen
        name="CookAtHome"
        component={CookAtHomeScreen}
        options={{ title: 'Cook', tabBarIcon: ({ color, size }) => <Ionicons name="flame" size={size} color={color} /> }}
      />
      <Tab.Screen
        name="ScanTab"
        component={ScanPlaceholder}
        options={{
          title: '',
          tabBarIcon: () => null,
          tabBarButton: (props) => <ScanTabButton onPress={props.onPress} />,
        }}
        listeners={({ navigation }) => ({
          tabPress: (e) => {
            e.preventDefault();
            navigation.navigate('Scanner', { scanType: 'menu' });
          },
        })}
      />
      <Tab.Screen
        name="History"
        component={HistoryScreen}
        options={{ tabBarIcon: ({ color, size }) => <Ionicons name="time" size={size} color={color} /> }}
      />
      <Tab.Screen
        name="Profile"
        component={OnboardingScreen}
        options={{ tabBarIcon: ({ color, size }) => <Ionicons name="person" size={size} color={color} /> }}
      />
    </Tab.Navigator>
  );
}

const tabStyles = StyleSheet.create({
  scanBtnWrap: { flex: 1, top: -16, justifyContent: 'center', alignItems: 'center' },
  scanBtn: {
    width: 52, height: 52, borderRadius: 26, backgroundColor: Colors.accent,
    justifyContent: 'center', alignItems: 'center',
    shadowColor: '#000', shadowOpacity: 0.3, shadowRadius: 6, shadowOffset: { width: 0, height: 3 }, elevation: 5,
  },
});
