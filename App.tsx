/**
 * DRS Music Mobile App
 * A React Native music streaming application
 */
import 'react-native-gesture-handler';
import React from 'react';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { LogBox } from 'react-native';
import { AppNavigator } from './src/navigation/AppNavigator';
import { AudioPlayer } from './src/components/AudioPlayer';
import { NotificationBanner } from './src/components/NotificationBanner';

// Ignore specific warnings
LogBox.ignoreLogs([
  'ViewPropTypes will be removed',
  'ColorPropType will be removed',
]);

function App(): React.JSX.Element {
  return (
    <SafeAreaProvider>
      <AppNavigator />
      {/* Hidden audio player component */}
      <AudioPlayer />
      {/* Notification banner for broadcast notifications */}
      <NotificationBanner />
    </SafeAreaProvider>
  );
}

export default App;
