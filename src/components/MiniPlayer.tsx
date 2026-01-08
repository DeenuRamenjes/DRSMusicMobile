import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Image,
} from 'react-native';
import { useNavigation, NavigationProp } from '@react-navigation/native';
import Icon from 'react-native-vector-icons/Feather';
import { COLORS, SPACING, FONT_SIZES, BORDER_RADIUS, SHADOWS } from '../constants/theme';
import { usePlayerStore } from '../store/usePlayerStore';
import { RootStackParamList } from '../types';
import { getFullImageUrl } from '../config';

export const MiniPlayer = () => {
  const navigation = useNavigation<NavigationProp<RootStackParamList>>();
  const {
    currentSong,
    isPlaying,
    togglePlayPause,
    playNext,
    currentTime,
    duration,
  } = usePlayerStore();

  if (!currentSong) return null;

  const progress = duration > 0 ? (currentTime / duration) * 100 : 0;

  return (
    <TouchableOpacity
      style={styles.container}
      activeOpacity={0.95}
    >
      {/* Progress bar */}
      <View style={styles.progressContainer}>
        <View style={[styles.progressBar, { width: `${progress}%` }]} />
      </View>

      <View style={styles.content}>
        {/* Song info */}
        <View style={styles.songInfo}>
          <Image
            source={{ uri: getFullImageUrl(currentSong.imageUrl) }}
            style={styles.albumArt}
          />
          <View style={styles.textContainer}>
            <Text style={styles.title} numberOfLines={1}>{currentSong.title}</Text>
            <Text style={styles.artist} numberOfLines={1}>{currentSong.artist}</Text>
          </View>
        </View>

        {/* Controls */}
        <View style={styles.controls}>
          <TouchableOpacity
            style={styles.controlButton}
            onPress={togglePlayPause}
          >
            <Icon
              name={isPlaying ? 'pause' : 'play'}
              size={24}
              color={COLORS.textPrimary}
              style={!isPlaying && { marginLeft: 2 }}
            />
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.controlButton}
            onPress={playNext}
          >
            <Icon name="skip-forward" size={22} color={COLORS.textPrimary} />
          </TouchableOpacity>
        </View>
      </View>
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    bottom: 60,
    left: SPACING.md,
    right: SPACING.md,
    backgroundColor: COLORS.backgroundCard,
    borderRadius: BORDER_RADIUS.lg,
    overflow: 'hidden',
    ...SHADOWS.lg,
  },
  progressContainer: {
    height: 3,
    backgroundColor: COLORS.backgroundTertiary,
  },
  progressBar: {
    height: '100%',
    backgroundColor: COLORS.primary,
  },
  content: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: SPACING.md,
  },
  songInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  albumArt: {
    width: 48,
    height: 48,
    borderRadius: BORDER_RADIUS.sm,
    marginRight: SPACING.md,
    backgroundColor: COLORS.backgroundSecondary,
  },
  textContainer: {
    flex: 1,
    marginRight: SPACING.md,
  },
  title: {
    fontSize: FONT_SIZES.md,
    fontWeight: '600',
    color: COLORS.textPrimary,
  },
  artist: {
    fontSize: FONT_SIZES.sm,
    color: COLORS.textMuted,
    marginTop: 2,
  },
  controls: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.xs,
  },
  controlButton: {
    width: 44,
    height: 44,
    justifyContent: 'center',
    alignItems: 'center',
  },
});
