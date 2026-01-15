import { NavigationContainer } from "@react-navigation/native";
import { createStackNavigator } from "@react-navigation/stack";
import { createBottomTabNavigator } from "@react-navigation/bottom-tabs";
import React from "react";
import { View, Text, TouchableOpacity, StyleSheet, ActivityIndicator } from "react-native";
import { MaterialCommunityIcons } from '@expo/vector-icons';
import Home from "./screens/Home";
import Details from "./screens/Details";
import ScanQR from "./screens/ScanQR";
import Profile from "./screens/Profile";
import Settings from "./screens/Settings";
import Explore from "./screens/Explore";
import AuthScreen from "./screens/Auth";
import { AuthProvider, useAuth } from "./context/AuthContext";
import { RentalFlowProvider } from "./hooks/useRentalFlow";

const Stack = createStackNavigator();
const Tab = createBottomTabNavigator();

function ScanTabButton(props) {
  const { onPress, style } = props;
  return (
    <TouchableOpacity
      {...props}
      onPress={onPress}
      style={[tabStyles.centerButtonContainer, style]}
      activeOpacity={0.8}
    >
      <View style={tabStyles.centerButton}>
        <MaterialCommunityIcons name="qrcode-scan" size={28} color="#fff" />
      </View>
    </TouchableOpacity>
  );
}

function Tabs() {
  return (
    <Tab.Navigator
      screenOptions={{
        headerShown: false,
        tabBarShowLabel: false,
        tabBarStyle: tabStyles.tabBar,
      }}
    >
      <Tab.Screen
        name="Ana Sayfa"
        component={Home}
        options={{
          tabBarIcon: ({ focused }) => (
            <View style={[tabStyles.tabItem, focused && tabStyles.tabItemActive]}>
              <MaterialCommunityIcons name="home-outline" size={24} color={focused ? '#0A84FF' : '#222'} />
            </View>
          ),
        }}
      />

      <Tab.Screen
        name="Keşfet"
        component={Explore}
        options={{
          tabBarIcon: ({ focused }) => (
            <View style={[tabStyles.tabItem, focused && tabStyles.tabItemActive]}>
              <MaterialCommunityIcons name="map-search" size={22} color={focused ? '#0A84FF' : '#222'} />
            </View>
          ),
        }}
      />

      <Tab.Screen
        name="Scan"
        component={ScanQR}
        options={{
          tabBarButton: (props) => <ScanTabButton {...props} />,
        }}
      />

      <Tab.Screen
        name="Profil"
        component={Profile}
        options={{
          tabBarIcon: ({ focused }) => (
            <View style={[tabStyles.tabItem, focused && tabStyles.tabItemActive]}>
              <MaterialCommunityIcons name="account-circle-outline" size={24} color={focused ? '#0A84FF' : '#222'} />
            </View>
          ),
        }}
      />

      <Tab.Screen
        name="Ayarlar"
        component={Settings}
        options={{
          tabBarIcon: ({ focused }) => (
            <View style={[tabStyles.tabItem, focused && tabStyles.tabItemActive]}>
              <MaterialCommunityIcons name="cog" size={22} color={focused ? '#0A84FF' : '#222'} />
            </View>
          ),
        }}
      />
    </Tab.Navigator>
  );
}

function RootNavigator() {
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <View style={tabStyles.loadingContainer}>
        <ActivityIndicator size="large" color="#0A84FF" />
      </View>
    );
  }

  if (!user) {
    return <AuthScreen />;
  }

  return (
    <Stack.Navigator>
      <Stack.Screen name="Tabs" component={Tabs} options={{ headerShown: false }} />
      <Stack.Screen name="Detay" component={Details} />
    </Stack.Navigator>
  );
}

export default function App() {
  return (
    <AuthProvider>
      <RentalFlowProvider>
        <NavigationContainer>
          <RootNavigator />
        </NavigationContainer>
      </RentalFlowProvider>
    </AuthProvider>
  );
}

const tabStyles = StyleSheet.create({
  tabBar: {
    height: 88,
    paddingBottom: 16,
    paddingTop: 12,
    backgroundColor: '#fff',
    borderTopWidth: 1,
    borderTopColor: '#e6e6e6',
    overflow: 'visible',
  },
  icon: {
    fontSize: 24,
    color: '#222',
  },
  emojiIcon: {
    fontSize: 28,
    lineHeight: 32,
    height: 32,
    color: '#222',
    // Android-specific tweaks to avoid clipping
    includeFontPadding: false,
    textAlignVertical: 'center',
  },
  iconActive: {
    transform: [{ scale: 1.05 }],
    color: '#0A84FF',
  },
  tabItem: {
    paddingHorizontal: 16,
    paddingVertical: 12,
    minHeight: 52,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: '#e3e3e3',
    backgroundColor: '#fff',
    minWidth: 56,
    alignItems: 'center',
    justifyContent: 'center',
    marginHorizontal: 6,
  },
  tabItemActive: {
    backgroundColor: '#F0F6FF',
    borderColor: '#0A84FF',
  },
  centerButtonContainer: {
    top: -34,
    justifyContent: "center",
    alignItems: "center",
    zIndex: 10,
  },
  centerButton: {
    width: 68,
    height: 68,
    borderRadius: 34,
    backgroundColor: "#0A84FF",
    justifyContent: "center",
    alignItems: "center",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.2,
    shadowRadius: 6,
    elevation: 6,
  },
  centerIcon: {
    fontSize: 28,
    color: "white",
  },
  loadingContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#f8fafc',
  },
});