import React, { useEffect, useState } from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createStackNavigator } from '@react-navigation/stack';
import { StatusBar, ActivityIndicator, View, Text, StyleSheet } from 'react-native';

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
import { ConnectionScreen } from '../components/ConnectionScreen';
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

  useEffect(() => {
    const init = async () => {
      loadTheme(); // Load theme settings from storage
      loadDownloadedSongs(); // Load offline songs
      
      // Always check connection to backend
      const connected = await checkConnection();
      setInitialCheckDone(true);
      setConnectionFailed(!connected);
      
      // If connected, check auth
      if (connected) {
        checkAuth();
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

  const handleGoOffline = () => {
    setUseOffline(true);
    setConnectionFailed(false);
    setInitialCheckDone(true);
    setOfflineMode(true);
  };

  // Wait for initial connection check
  if (!initialCheckDone) {
    return (
      <>
        <StatusBar barStyle="light-content" backgroundColor="transparent" translucent />
        <ConnectionScreen 
          onRetry={() => {
            checkConnection().then((connected) => {
              if (connected) {
                setConnectionFailed(false);
                checkAuth();
              }
            });
          }}
          onOfflinePress={handleGoOffline}
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
                checkAuth();
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
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={COLORS.primary} />
        <Text style={styles.loadingText}>Loading...</Text>
      </View>
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
