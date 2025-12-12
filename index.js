/**
 * @format
 */

import { AppRegistry } from 'react-native';
import TrackPlayer from 'react-native-track-player';
import App from './App';
import { name as appName } from './app.json';
import playbackService from './src/utils/trackPlayerService';

// Register the app component
AppRegistry.registerComponent(appName, () => App);

// Register the TrackPlayer playback service
TrackPlayer.registerPlaybackService(() => playbackService);
