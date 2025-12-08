import React, { useEffect } from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createStackNavigator } from '@react-navigation/stack';
import { StatusBar, ActivityIndicator, View, Text, StyleSheet } from 'react-native';

import { LandingScreen } from '../screens/LandingScreen';
import { MainLayout } from '../screens/MainLayout';
import { SongDetailScreen } from '../screens/SongDetailScreen';
import { ChatScreen } from '../screens/ChatScreen';
import { useAuthStore } from '../store/useAuthStore';
import { useThemeStore } from '../store/useThemeStore';
import { COLORS } from '../constants/theme';

const Stack = createStackNavigator();

// Main App Navigator
export const AppNavigator = () => {
  const { isAuthenticated, isLoading, checkAuth } = useAuthStore();
  const { loadTheme } = useThemeStore();

  useEffect(() => {
    checkAuth();
    loadTheme(); // Load theme settings from storage
  }, []);

  if (isLoading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={COLORS.primary} />
        <Text style={styles.loadingText}>Loading...</Text>
      </View>
    );
  }

  return (
    <NavigationContainer>
      <StatusBar barStyle="light-content" backgroundColor="transparent" translucent />
      <Stack.Navigator
        screenOptions={{
          headerShown: false,
          cardStyle: { backgroundColor: COLORS.background },
          gestureEnabled: true,
        }}
        initialRouteName={isAuthenticated ? 'MainLayout' : 'Landing'}
      >
        <Stack.Screen 
          name="Landing" 
          component={LandingScreen}
          options={{ animationTypeForReplace: 'pop' }}
        />
        <Stack.Screen name="MainLayout" component={MainLayout} />
        <Stack.Screen 
          name="SongDetail" 
          component={SongDetailScreen}
          options={{
            presentation: 'modal',
            gestureDirection: 'vertical',
          }}
        />
        <Stack.Screen 
          name="Chat" 
          component={ChatScreen}
          options={{
            gestureDirection: 'horizontal',
          }}
        />
      </Stack.Navigator>
    </NavigationContainer>
  );
};

const styles = StyleSheet.create({
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: COLORS.background,
  },
  loadingText: {
    color: COLORS.textMuted,
    marginTop: 12,
    fontSize: 14,
  },
});
