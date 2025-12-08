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

const formatTime = (time: number) => {
  if (!time || isNaN(time)) return '0:00';
  const minutes = Math.floor(time / 60);
  const seconds = Math.floor(time % 60);
  return `${minutes}:${seconds.toString().padStart(2, '0')}`;
};

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
    isShuffle,
    isLooping,
    togglePlayPause,
    playNext,
    playPrevious,
    toggleShuffle,
    toggleLoop,
    seekTo,
    setCurrentSong,
    restoreLastSong,
    setQueue,
  } = usePlayerStore();

  const { songs, likedSongs, likeSong, unlikeSong, fetchSongs } = useMusicStore();
  const { colors: themeColors, compactMode } = useThemeStore();

  // Restore last song or load a random song on mount
  useEffect(() => {
    const initializePlayer = async () => {
      // Only initialize once
      if (hasInitializedPlayer) return;
      hasInitializedPlayer = true;

      // First try to restore the last song
      await restoreLastSong();
      
      // Check if we have a current song now
      const state = usePlayerStore.getState();
      if (state.currentSong) {
        // We restored a song, done
        return;
      }

      // No last song, wait for songs to load and set a random one
      // This will be triggered by the songs.length dependency below
    };

    initializePlayer();
  }, []);

  // Once songs are loaded, if no current song, set a random one (without playing)
  useEffect(() => {
    const setRandomSongIfNeeded = () => {
      const state = usePlayerStore.getState();
      
      // Only set if no song is loaded and we have songs
      if (!state.currentSong && songs.length > 0 && hasInitializedPlayer) {
        const randomIndex = Math.floor(Math.random() * songs.length);
        const randomSong = songs[randomIndex];
        if (randomSong && randomSong.audioUrl) {
          setQueue(songs);
          setCurrentSong(randomSong); // This sets without playing
        }
      }
    };

    if (songs.length > 0) {
      setRandomSongIfNeeded();
    } else if (!songs.length) {
      // Fetch songs if not loaded yet
      fetchSongs();
    }
  }, [songs.length]);

  const isSongLiked = currentSong ? likedSongs.some(s => s._id === currentSong._id) : false;

  const handleOpenSongDetail = () => {
    if (!currentSong) return;
    (navigation as any).navigate('SongDetail', { songId: currentSong._id });
  };

  const handleToggleLike = async () => {
    if (!currentSong) return;
    if (isSongLiked) {
      await unlikeSong(currentSong._id);
    } else {
      await likeSong(currentSong._id);
    }
  };

  const handleProgressPress = (event: any) => {
    if (!duration) return;
    progressRef.current?.measure((x, y, width, height, pageX, pageY) => {
      const touchX = event.nativeEvent.pageX - pageX;
      const newTime = (touchX / width) * duration;
      seekTo(Math.max(0, Math.min(newTime, duration)));
    });
  };

  // Get full image URL
  const getFullImageUrl = (imageUrl: string) => {
    if (!imageUrl) return '';
    if (imageUrl.startsWith('http')) return imageUrl;
    return `http://192.168.1.40:5000${imageUrl}`;
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
            {/* Shuffle */}
            <TouchableOpacity
              onPress={toggleShuffle}
              style={styles.controlButton}
              activeOpacity={0.7}
            >
              <Icon 
                name="shuffle" 
                size={18} 
                color={isShuffle ? themeColors.primary : COLORS.textMuted} 
              />
            </TouchableOpacity>

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

            {/* Loop */}
            <TouchableOpacity
              onPress={toggleLoop}
              style={styles.controlButton}
              activeOpacity={0.7}
            >
              <Icon 
                name="repeat" 
                size={18} 
                color={isLooping ? themeColors.primary : COLORS.textMuted} 
              />
            </TouchableOpacity>
          </View>
        </View>

        {/* Right: Like and Expand */}
        <View style={styles.rightControls}>
          <TouchableOpacity
            onPress={handleToggleLike}
            style={styles.likeButton}
            activeOpacity={0.7}
          >
            <Icon 
              name="heart" 
              size={20} 
              color={isSongLiked ? '#f43f5e' : COLORS.textMuted} 
            />
          </TouchableOpacity>

          <TouchableOpacity
            onPress={handleOpenSongDetail}
            style={styles.expandButton}
            activeOpacity={0.7}
          >
            <Icon name="maximize-2" size={18} color={COLORS.textMuted} />
          </TouchableOpacity>
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
