import React, { useEffect, useState } from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createStackNavigator } from '@react-navigation/stack';
import { StatusBar, StyleSheet } from 'react-native';

import { LandingScreen } from '../screens/LandingScreen';
import { MainLayout } from '../screens/MainLayout';
import { SongDetailScreen } from '../screens/SongDetailScreen';
import { ChatScreen } from '../screens/ChatScreen';
import { MessagesScreen } from '../screens/MessagesScreen';
import { OfflineMusicScreen } from '../screens/OfflineMusicScreen';
import { AdminScreen } from '../screens/AdminScreen';
import { ManageSongsScreen } from '../screens/ManageSongsScreen';
import { UploadSongScreen } from '../screens/UploadSongScreen';
import { ManageAlbumsScreen } from '../screens/ManageAlbumsScreen';
import { ManageUsersScreen } from '../screens/ManageUsersScreen';
import { CreateAlbumScreen } from '../screens/CreateAlbumScreen';
import { EditAlbumScreen } from '../screens/EditAlbumScreen';
import { EditSongScreen } from '../screens/EditSongScreen';
import { TodoScreen } from '../screens/TodoScreen';
import { AdminAccessScreen } from '../screens/AdminAccessScreen';
import { ConnectionScreen } from '../components/ConnectionScreen';
import { SplashScreen } from '../components/SplashScreen';
import { useAuthStore } from '../store/useAuthStore';
import { useThemeStore } from '../store/useThemeStore';
import { useConnectionStore } from '../store/useConnectionStore';
import { useOfflineMusicStore } from '../store/useOfflineMusicStore';
import { COLORS } from '../constants/theme';

const Stack = createStackNavigator();

// Main App Navigator
export const AppNavigator = () => {
  const { isAuthenticated, isLoading, checkAuth } = useAuthStore();
  const { loadTheme } = useThemeStore();
  const { isConnected, checkConnection } = useConnectionStore();
  const { loadDownloadedSongs, setOfflineMode } = useOfflineMusicStore();
  const [initialCheckDone, setInitialCheckDone] = useState(false);
  const [connectionFailed, setConnectionFailed] = useState(false);
  const [useOffline, setUseOffline] = useState(false);
  const [splashAnimationComplete, setSplashAnimationComplete] = useState(false);
  const [authTimedOut, setAuthTimedOut] = useState(false);

  useEffect(() => {
    const init = async () => {
      loadTheme(); // Load theme settings from storage
      loadDownloadedSongs(); // Load offline songs

      // Always check connection to backend
      const connected = await checkConnection();
      setInitialCheckDone(true);
      setConnectionFailed(!connected);

      // If connected, check auth with a timeout
      if (connected) {
        // Safety timeout - if auth takes longer than 15 seconds, force stop loading
        const authTimeout = setTimeout(() => {
          console.warn('Auth timeout reached - forcing loading to stop');
          useAuthStore.getState().setIsLoading(false);
          setAuthTimedOut(true);
        }, 15000); // 15 second timeout

        try {
          await checkAuth();
        } catch (error) {
          console.error('Auth check failed:', error);
        } finally {
          clearTimeout(authTimeout);
        }
      }
    };

    init();
  }, []);

  // Update connection failed state when connection changes
  useEffect(() => {
    if (initialCheckDone && !useOffline) {
      setConnectionFailed(!isConnected);
    }
  }, [isConnected, initialCheckDone, useOffline]);

  // Secondary safety: If isLoading is still true after initial check + animation, force stop after 10s
  useEffect(() => {
    if (initialCheckDone && splashAnimationComplete && isLoading && !useOffline) {
      const safetyTimeout = setTimeout(() => {
        console.warn('Secondary safety timeout - forcing isLoading to false');
        useAuthStore.getState().setIsLoading(false);
      }, 10000); // 10 seconds after splash completes

      return () => clearTimeout(safetyTimeout);
    }
  }, [initialCheckDone, splashAnimationComplete, isLoading, useOffline]);

  const handleGoOffline = () => {
    setUseOffline(true);
    setConnectionFailed(false);
    setInitialCheckDone(true);
    setOfflineMode(true);
  };

  // Wait for initial connection check AND splash animation - show animated splash screen
  if (!initialCheckDone || !splashAnimationComplete) {
    return (
      <>
        <StatusBar barStyle="light-content" backgroundColor="transparent" translucent />
        <SplashScreen
          message={initialCheckDone ? "Ready!" : "Connecting to server..."}
          onAnimationComplete={() => setSplashAnimationComplete(true)}
        />
      </>
    );
  }

  // Show connection screen if connection failed (and not in offline mode)
  if (connectionFailed && !useOffline) {
    return (
      <>
        <StatusBar barStyle="light-content" backgroundColor="transparent" translucent />
        <ConnectionScreen
          onRetry={() => {
            checkConnection().then((connected) => {
              if (connected) {
                setConnectionFailed(false);
                // Check auth with a timeout to prevent infinite loading
                const authTimeout = setTimeout(() => {
                  // If auth takes too long, force set isLoading to false
                  useAuthStore.getState().setIsLoading(false);
                }, 20000); // 20 second timeout for auth

                checkAuth().finally(() => clearTimeout(authTimeout));
              }
            });
          }}
          onOfflinePress={handleGoOffline}
        />
      </>
    );
  }

  // Only show auth loading if we're NOT in offline mode
  if (isLoading && !useOffline) {
    return (
      <>
        <StatusBar barStyle="light-content" backgroundColor="transparent" translucent />
        <SplashScreen message="Signing in..." />
      </>
    );
  }

  // In offline mode, go directly to MainLayout (skip Landing/Login)
  const initialRoute = useOffline ? 'MainLayout' : (isAuthenticated ? 'MainLayout' : 'Landing');

  return (
    <NavigationContainer>
      <StatusBar barStyle="light-content" backgroundColor="transparent" translucent />
      <Stack.Navigator
        screenOptions={{
          headerShown: false,
          cardStyle: { backgroundColor: COLORS.background },
          gestureEnabled: true,
        }}
        initialRouteName={initialRoute}
      >
        <Stack.Screen
          name="Landing"
          component={LandingScreen}
          options={{
            animationTypeForReplace: 'pop',
            // Disable swipe back gesture on landing screen to prevent accidental exit
            gestureEnabled: false,
          }}
        />
        <Stack.Screen
          name="MainLayout"
          component={MainLayout}
          options={{
            // Disable swipe back gesture on main screen to prevent accidental exit
            gestureEnabled: false,
          }}
        />
        <Stack.Screen
          name="SongDetail"
          component={SongDetailScreen}
          options={{
            presentation: 'modal',
            gestureDirection: 'vertical',
          }}
        />
        <Stack.Screen
          name="Messages"
          component={MessagesScreen}
          options={{
            gestureDirection: 'horizontal',
          }}
        />
        <Stack.Screen
          name="Chat"
          component={ChatScreen}
          options={{
            gestureDirection: 'horizontal',
          }}
        />
        <Stack.Screen
          name="OfflineMusic"
          component={OfflineMusicScreen}
          options={{
            gestureDirection: 'horizontal',
          }}
        />
        <Stack.Screen
          name="Admin"
          component={AdminScreen}
          options={{
            gestureDirection: 'horizontal',
          }}
        />
        <Stack.Screen
          name="ManageSongs"
          component={ManageSongsScreen}
          options={{
            gestureDirection: 'horizontal',
          }}
        />
        <Stack.Screen
          name="UploadSong"
          component={UploadSongScreen}
          options={{
            gestureDirection: 'horizontal',
          }}
        />
        <Stack.Screen
          name="ManageAlbums"
          component={ManageAlbumsScreen}
          options={{
            gestureDirection: 'horizontal',
          }}
        />
        <Stack.Screen
          name="ManageUsers"
          component={ManageUsersScreen}
          options={{
            gestureDirection: 'horizontal',
          }}
        />
        <Stack.Screen
          name="CreateAlbum"
          component={CreateAlbumScreen}
          options={{
            gestureDirection: 'horizontal',
          }}
        />
        <Stack.Screen
          name="EditAlbum"
          component={EditAlbumScreen}
          options={{
            gestureDirection: 'horizontal',
          }}
        />
        <Stack.Screen
          name="EditSong"
          component={EditSongScreen}
          options={{
            gestureDirection: 'horizontal',
          }}
        />
        <Stack.Screen
          name="Todo"
          component={TodoScreen}
          options={{
            gestureDirection: 'horizontal',
          }}
        />
        <Stack.Screen
          name="AdminAccess"
          component={AdminAccessScreen}
          options={{
            gestureDirection: 'horizontal',
          }}
        />
      </Stack.Navigator>
    </NavigationContainer>
  );
};

// Empty styles - keeping for potential future use
const styles = StyleSheet.create({});
