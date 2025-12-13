/**
 * DRS Music Mobile App
 * A React Native music streaming application
 */
import 'react-native-gesture-handler';
import React, { useEffect, useCallback } from 'react';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { LogBox, BackHandler, ToastAndroid, Platform } from 'react-native';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { AppNavigator } from './src/navigation/AppNavigator';
import { AudioPlayer } from './src/components/AudioPlayer';
import { NotificationBanner } from './src/components/NotificationBanner';

// Ignore specific warnings
LogBox.ignoreLogs([
  'ViewPropTypes will be removed',
  'ColorPropType will be removed',
]);

// Track last back press time for double-tap to exit
let lastBackPressed = 0;

function App(): React.JSX.Element {
  // Handle Android back button - require double tap to exit
  const handleBackPress = useCallback(() => {
    const now = Date.now();
    
    // If pressed within 2 seconds, allow exit
    if (now - lastBackPressed < 2000) {
      return false; // Allow default behavior (exit)
    }
    
    // First press - show toast and prevent exit
    lastBackPressed = now;
    if (Platform.OS === 'android') {
      ToastAndroid.show('Press back again to exit', ToastAndroid.SHORT);
    }
    return true; // Prevent default behavior
  }, []);

  useEffect(() => {
    // Only add handler on Android
    if (Platform.OS === 'android') {
      const subscription = BackHandler.addEventListener('hardwareBackPress', handleBackPress);
      return () => subscription.remove();
    }
  }, [handleBackPress]);

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <SafeAreaProvider>
        <AppNavigator />
        {/* Hidden audio player component */}
        <AudioPlayer />
        {/* Notification banner for broadcast notifications */}
        <NotificationBanner />
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}

export default App;
