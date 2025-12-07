import React, { useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Image,
  PanResponder,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { COLORS, SPACING, FONT_SIZES, BORDER_RADIUS, DIMENSIONS } from '../constants/theme';
import { usePlayerStore } from '../store/usePlayerStore';
import { useMusicStore } from '../store/useMusicStore';

const formatTime = (time: number) => {
  if (!time || isNaN(time)) return '0:00';
  const minutes = Math.floor(time / 60);
  const seconds = Math.floor(time % 60);
  return `${minutes}:${seconds.toString().padStart(2, '0')}`;
};

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
  } = usePlayerStore();

  const { likedSongs, likeSong, unlikeSong } = useMusicStore();

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

  if (!currentSong) {
    return (
      <View style={styles.emptyContainer}>
        <Text style={styles.emptyText}>No song playing</Text>
      </View>
    );
  }

  const progressPercent = duration ? (currentTime / duration) * 100 : 0;

  // Get full image URL
  const getFullImageUrl = (imageUrl: string) => {
    if (!imageUrl) return '';
    if (imageUrl.startsWith('http')) return imageUrl;
    return `http://192.168.1.40:5000${imageUrl}`;
  };

  return (
    <View style={styles.container}>
      {/* Mobile Progress Bar - Thin line at top */}
      <TouchableOpacity
        ref={progressRef}
        style={styles.progressBarContainer}
        onPress={handleProgressPress}
        activeOpacity={1}
      >
        <View style={styles.progressBarBackground}>
          <View style={[styles.progressBarFill, { width: `${progressPercent}%` }]} />
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
                <Text style={styles.albumArtEmoji}>🎵</Text>
              </View>
            )}
            {/* Expand overlay on hover */}
            <View style={styles.expandOverlay}>
              <Text style={styles.expandIcon}>⤢</Text>
            </View>
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
              <Text style={[styles.controlIcon, isShuffle && styles.controlActive]}>
                ⤮
              </Text>
            </TouchableOpacity>

            {/* Previous */}
            <TouchableOpacity
              onPress={playPrevious}
              style={styles.controlButton}
              activeOpacity={0.7}
            >
              <Text style={styles.prevNextIcon}>⏮</Text>
            </TouchableOpacity>

            {/* Play/Pause */}
            <TouchableOpacity
              onPress={togglePlayPause}
              style={styles.playButton}
              activeOpacity={0.8}
            >
              <Text style={styles.playIcon}>
                {isPlaying ? '⏸' : '▶'}
              </Text>
            </TouchableOpacity>

            {/* Next */}
            <TouchableOpacity
              onPress={playNext}
              style={styles.controlButton}
              activeOpacity={0.7}
            >
              <Text style={styles.prevNextIcon}>⏭</Text>
            </TouchableOpacity>

            {/* Loop */}
            <TouchableOpacity
              onPress={toggleLoop}
              style={styles.controlButton}
              activeOpacity={0.7}
            >
              <Text style={[styles.controlIcon, isLooping && styles.controlActive]}>
                ↻
              </Text>
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
            <Text style={[styles.likeIcon, isSongLiked && styles.likeActive]}>
              {isSongLiked ? '♥' : '♡'}
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            onPress={handleOpenSongDetail}
            style={styles.expandButton}
            activeOpacity={0.7}
          >
            <Text style={styles.expandButtonIcon}>⤢</Text>
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
  emptyContainer: {
    height: DIMENSIONS.playbackHeight,
    backgroundColor: 'rgba(24, 24, 27, 0.95)',
    borderTopWidth: 1,
    borderTopColor: COLORS.border,
    justifyContent: 'center',
    alignItems: 'center',
  },
  emptyText: {
    color: COLORS.textMuted,
    fontSize: FONT_SIZES.md,
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
    backgroundColor: COLORS.textPrimary,
  },
  content: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: SPACING.md,
    paddingTop: 3,
    gap: SPACING.md,
  },
  songInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.md,
    flex: 1,
    minWidth: 0,
  },
  imageContainer: {
    position: 'relative',
  },
  albumArt: {
    width: DIMENSIONS.playbackImageSize,
    height: DIMENSIONS.playbackImageSize,
    borderRadius: BORDER_RADIUS.md,
  },
  albumArtPlaceholder: {
    backgroundColor: COLORS.zinc700,
    justifyContent: 'center',
    alignItems: 'center',
  },
  albumArtEmoji: {
    fontSize: 24,
  },
  expandOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    borderRadius: BORDER_RADIUS.md,
    backgroundColor: 'transparent',
    justifyContent: 'center',
    alignItems: 'center',
  },
  expandIcon: {
    fontSize: 16,
    color: COLORS.textPrimary,
    opacity: 0,
  },
  songDetails: {
    flex: 1,
    minWidth: 0,
  },
  songTitle: {
    fontSize: FONT_SIZES.md,
    fontWeight: '500',
    color: COLORS.textPrimary,
  },
  songArtist: {
    fontSize: FONT_SIZES.sm,
    color: COLORS.textMuted,
    marginTop: 2,
  },
  controls: {
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
  },
  controlButtons: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.sm,
  },
  controlButton: {
    padding: SPACING.sm,
  },
  controlIcon: {
    fontSize: 16,
    color: COLORS.textMuted,
  },
  controlActive: {
    color: COLORS.primary,
  },
  prevNextIcon: {
    fontSize: 20,
    color: COLORS.textMuted,
  },
  playButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: COLORS.textPrimary,
    justifyContent: 'center',
    alignItems: 'center',
  },
  playIcon: {
    fontSize: 18,
    color: COLORS.background,
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
  likeIcon: {
    fontSize: 20,
    color: COLORS.textMuted,
  },
  likeActive: {
    color: COLORS.like,
  },
  expandButton: {
    padding: SPACING.sm,
  },
  expandButtonIcon: {
    fontSize: 20,
    color: COLORS.textMuted,
  },
});
