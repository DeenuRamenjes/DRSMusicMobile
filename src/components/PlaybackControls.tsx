import React, { useRef, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Image,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import Icon from 'react-native-vector-icons/Feather';
import { COLORS, SPACING, FONT_SIZES, BORDER_RADIUS, DIMENSIONS } from '../constants/theme';
import { usePlayerStore } from '../store/usePlayerStore';
import { useMusicStore } from '../store/useMusicStore';
import { useThemeStore } from '../store/useThemeStore';
import { getFullImageUrl } from '../config';

// Flag to prevent multiple initializations
let hasInitializedPlayer = false;

export const PlaybackControls = () => {
  const navigation = useNavigation();
  const progressRef = useRef<View>(null);

  const {
    currentSong,
    isPlaying,
    currentTime,
    duration,
    togglePlayPause,
    playNext,
    playPrevious,
    seekTo,
    restoreLastSong,
    setQueue,
  } = usePlayerStore();

  const { songs } = useMusicStore();
  const { colors: themeColors, compactMode } = useThemeStore();

  // Restore last song on mount (if any)
  useEffect(() => {
    const initializePlayer = async () => {
      // Only initialize once
      if (hasInitializedPlayer) return;
      hasInitializedPlayer = true;

      // Try to restore the last song (for display only, not playing)
      await restoreLastSong();
    };

    initializePlayer();
  }, []);

  // Set queue when songs are loaded (but don't auto-select a song)
  useEffect(() => {
    if (songs.length > 0) {
      const state = usePlayerStore.getState();
      // Only set the queue if it's empty
      if (state.queue.length === 0) {
        setQueue(songs);
      }
    }
  }, [songs.length]);
  
  const handleOpenSongDetail = () => {
    if (!currentSong) return;
    (navigation as any).navigate('SongDetail', { songId: currentSong._id });
  };

  const handleProgressPress = (event: any) => {
    if (!duration) return;
    progressRef.current?.measure((x, y, width, height, pageX, pageY) => {
      const touchX = event.nativeEvent.pageX - pageX;
      const newTime = (touchX / width) * duration;
      seekTo(Math.max(0, Math.min(newTime, duration)));
    });
  };

  // Show nothing if no song (will auto-load soon)
  if (!currentSong) {
    return null;
  }

  const progressPercent = duration ? (currentTime / duration) * 100 : 0;

  return (
    <View style={styles.container}>
      {/* Progress Bar - at top of controls */}
      <TouchableOpacity
        ref={progressRef}
        style={styles.progressBarContainer}
        onPress={handleProgressPress}
        activeOpacity={1}
      >
        <View style={styles.progressBarBackground}>
          <View style={[styles.progressBarFill, { width: `${progressPercent}%`, backgroundColor: themeColors.primary }]} />
        </View>
      </TouchableOpacity>

      <View style={styles.content}>
        {/* Left: Song Info */}
        <TouchableOpacity
          onPress={handleOpenSongDetail}
          style={styles.songInfo}
          activeOpacity={0.7}
        >
          <View style={styles.imageContainer}>
            {currentSong.imageUrl ? (
              <Image
                source={{ uri: getFullImageUrl(currentSong.imageUrl) }}
                style={styles.albumArt}
              />
            ) : (
              <View style={[styles.albumArt, styles.albumArtPlaceholder]}>
                <Icon name="music" size={20} color={COLORS.textMuted} />
              </View>
            )}
          </View>
          <View style={styles.songDetails}>
            <Text style={styles.songTitle} numberOfLines={1}>
              {currentSong.title}
            </Text>
            <Text style={styles.songArtist} numberOfLines={1}>
              {currentSong.artist}
            </Text>
          </View>
        </TouchableOpacity>

        {/* Center: Playback Controls */}
        <View style={styles.controls}>
          <View style={styles.controlButtons}>

            {/* Previous */}
            <TouchableOpacity
              onPress={playPrevious}
              style={styles.controlButton}
              activeOpacity={0.7}
            >
              <Icon name="skip-back" size={22} color={COLORS.textPrimary} />
            </TouchableOpacity>

            {/* Play/Pause */}
            <TouchableOpacity
              onPress={togglePlayPause}
              style={[styles.playButton, { backgroundColor: themeColors.primary }]}
              activeOpacity={0.8}
            >
              <Icon 
                name={isPlaying ? 'pause' : 'play'} 
                size={22} 
                color={COLORS.textPrimary}
                style={!isPlaying && styles.playIconOffset}
              />
            </TouchableOpacity>

            {/* Next */}
            <TouchableOpacity
              onPress={playNext}
              style={styles.controlButton}
              activeOpacity={0.7}
            >
              <Icon name="skip-forward" size={22} color={COLORS.textPrimary} />
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    height: DIMENSIONS.playbackHeight,
    backgroundColor: 'rgba(24, 24, 27, 0.95)',
    borderTopWidth: 1,
    borderTopColor: COLORS.border,
  },
  progressBarContainer: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    height: 3,
    zIndex: 10,
  },
  progressBarBackground: {
    height: 3,
    backgroundColor: COLORS.zinc700,
  },
  progressBarFill: {
    height: 3,
    backgroundColor: COLORS.primary,
  },
  content: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: SPACING.md,
    paddingTop: 3,
  },
  songInfo: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.md,
    minWidth: 0,
  },
  imageContainer: {
    position: 'relative',
  },
  albumArt: {
    width: 48,
    height: 48,
    borderRadius: BORDER_RADIUS.md,
  },
  albumArtPlaceholder: {
    backgroundColor: COLORS.zinc800,
    justifyContent: 'center',
    alignItems: 'center',
  },
  songDetails: {
    flex: 1,
    minWidth: 0,
  },
  songTitle: {
    fontSize: FONT_SIZES.md,
    fontWeight: '600',
    color: COLORS.textPrimary,
  },
  songArtist: {
    fontSize: FONT_SIZES.sm,
    color: COLORS.textMuted,
    marginTop: 2,
  },
  controls: {
    flexShrink: 0,
    marginHorizontal: SPACING.sm,
  },
  controlButtons: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.sm,
  },
  controlButton: {
    padding: SPACING.sm,
  },
  playButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: COLORS.primary,
    justifyContent: 'center',
    alignItems: 'center',
  },
  playIconOffset: {
    marginLeft: 2,
  },
  rightControls: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.xs,
  },
  likeButton: {
    padding: SPACING.sm,
  },
  expandButton: {
    padding: SPACING.sm,
  },
});

export default PlaybackControls;
