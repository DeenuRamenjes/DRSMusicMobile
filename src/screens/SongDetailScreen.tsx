import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Image,
  ScrollView,
  Dimensions,
  StatusBar,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation, useRoute, RouteProp } from '@react-navigation/native';
import { COLORS, SPACING, FONT_SIZES, BORDER_RADIUS, DIMENSIONS } from '../constants/theme';
import { usePlayerStore } from '../store/usePlayerStore';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

// Album art sizing based on screen width
const ALBUM_ART_SIZE = Math.min(SCREEN_WIDTH - SPACING.xxl * 2, DIMENSIONS.albumArtMobile);

// Helper to get full image URL
const getFullImageUrl = (imageUrl: string) => {
  if (!imageUrl) return '';
  if (imageUrl.startsWith('http')) return imageUrl;
  return `http://192.168.1.40:5000${imageUrl}`;
};

export const SongDetailScreen = () => {
  const navigation = useNavigation();
  const {
    currentSong,
    isPlaying,
    togglePlayPause,
    playNext,
    playPrevious,
    currentTime,
    duration,
    isShuffle,
    isLooping,
    toggleShuffle,
    toggleLoop,
  } = usePlayerStore();

  const progressPercent = duration > 0 ? (currentTime / duration) * 100 : 0;

  const formatTime = (seconds: number): string => {
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const handleBack = () => {
    if (navigation.canGoBack()) {
      navigation.goBack();
    } else {
      // If we can't go back, navigate to MainLayout
      (navigation as any).reset({
        index: 0,
        routes: [{ name: 'MainLayout' }],
      });
    }
  };

  if (!currentSong) {
    return (
      <View style={styles.container}>
        <Text style={styles.noSongText}>No song playing</Text>
      </View>
    );
  }

  const imageUri = getFullImageUrl(currentSong.imageUrl);

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <StatusBar barStyle="light-content" backgroundColor={COLORS.background} />
      
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={handleBack} style={styles.backButton}>
          <Text style={styles.backIcon}>‹</Text>
          <Text style={styles.backText}>Back</Text>
        </TouchableOpacity>
        <Text style={styles.headerTitle}>NOW PLAYING</Text>
        <TouchableOpacity style={styles.menuButton}>
          <Text style={styles.menuIcon}>⋮</Text>
        </TouchableOpacity>
      </View>

      <ScrollView
        style={styles.content}
        contentContainerStyle={styles.contentContainer}
        showsVerticalScrollIndicator={false}
      >
        {/* Album Art */}
        <View style={styles.albumArtContainer}>
          {imageUri ? (
            <Image
              source={{ uri: imageUri }}
              style={styles.albumArt}
            />
          ) : (
            <View style={[styles.albumArt, styles.albumArtPlaceholder]}>
              <Text style={styles.albumArtEmoji}>♪</Text>
            </View>
          )}
        </View>

        {/* Now Playing Label (Mobile) */}
        <Text style={styles.nowPlayingLabel}>NOW PLAYING</Text>

        {/* Song Info */}
        <Text style={styles.songTitle}>{currentSong.title}</Text>
        <Text style={styles.songArtist}>{currentSong.artist}</Text>

        {/* Progress Bar */}
        <View style={styles.progressSection}>
          <View style={styles.progressBar}>
            <View style={[styles.progressFill, { width: `${progressPercent}%` }]} />
            <View style={[styles.progressHandle, { left: `${progressPercent}%` }]} />
          </View>
          <View style={styles.timeContainer}>
            <Text style={styles.timeText}>{formatTime(currentTime)}</Text>
            <Text style={styles.timeText}>{formatTime(duration)}</Text>
          </View>
        </View>

        {/* Main Controls */}
        <View style={styles.mainControls}>
          <TouchableOpacity
            style={[styles.secondaryButton, isShuffle && styles.activeButton]}
            onPress={toggleShuffle}
          >
            <Text style={[styles.secondaryIcon, isShuffle && styles.activeIcon]}>⤮</Text>
          </TouchableOpacity>

          <TouchableOpacity style={styles.controlButton} onPress={playPrevious}>
            <Text style={styles.controlIcon}>⏮</Text>
          </TouchableOpacity>

          <TouchableOpacity style={styles.playButton} onPress={togglePlayPause}>
            <Text style={styles.playButtonIcon}>{isPlaying ? '❚❚' : '▶'}</Text>
          </TouchableOpacity>

          <TouchableOpacity style={styles.controlButton} onPress={playNext}>
            <Text style={styles.controlIcon}>⏭</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.secondaryButton, isLooping && styles.activeButton]}
            onPress={toggleLoop}
          >
            <Text style={[styles.secondaryIcon, isLooping && styles.activeIcon]}>↻</Text>
          </TouchableOpacity>
        </View>

        {/* Bottom Actions */}
        <View style={styles.bottomActions}>
          <TouchableOpacity style={styles.actionButton}>
            <Text style={styles.actionIcon}>♡</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.actionButton}>
            <Text style={styles.actionIcon}>🔊</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.actionButton}>
            <Text style={styles.actionIcon}>☰</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  noSongText: {
    color: COLORS.textMuted,
    textAlign: 'center',
    marginTop: 100,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: SPACING.lg,
    paddingVertical: SPACING.md,
  },
  backButton: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  backIcon: {
    fontSize: 20,
    color: COLORS.primary,
    marginRight: SPACING.xs,
  },
  backText: {
    fontSize: FONT_SIZES.md,
    color: COLORS.primary,
    fontWeight: '500',
  },
  headerTitle: {
    fontSize: FONT_SIZES.xs,
    fontWeight: '600',
    color: COLORS.textMuted,
    letterSpacing: 2,
  },
  menuButton: {
    width: 40,
    height: 40,
    justifyContent: 'center',
    alignItems: 'center',
  },
  menuIcon: {
    fontSize: 24,
    color: COLORS.textMuted,
  },
  content: {
    flex: 1,
  },
  contentContainer: {
    alignItems: 'center',
    paddingHorizontal: SPACING.xxl,
    paddingBottom: SPACING.xxl,
  },
  albumArtContainer: {
    marginTop: SPACING.xl,
    marginBottom: SPACING.xxl,
  },
  albumArt: {
    width: ALBUM_ART_SIZE,
    height: ALBUM_ART_SIZE,
    borderRadius: BORDER_RADIUS.xl,
  },
  albumArtPlaceholder: {
    backgroundColor: COLORS.backgroundTertiary,
    justifyContent: 'center',
    alignItems: 'center',
  },
  albumArtEmoji: {
    fontSize: 80,
  },
  nowPlayingLabel: {
    fontSize: FONT_SIZES.xs,
    fontWeight: '500',
    color: COLORS.textDim,
    letterSpacing: 3,
    marginBottom: SPACING.md,
  },
  songTitle: {
    fontSize: FONT_SIZES.title,
    fontWeight: 'bold',
    color: COLORS.textPrimary,
    textAlign: 'center',
    marginBottom: SPACING.sm,
  },
  songArtist: {
    fontSize: FONT_SIZES.xl,
    color: COLORS.textMuted,
    textAlign: 'center',
    marginBottom: SPACING.xxl,
  },
  progressSection: {
    width: '100%',
    marginBottom: SPACING.xxl,
  },
  progressBar: {
    height: 4,
    backgroundColor: COLORS.backgroundTertiary,
    borderRadius: 2,
    position: 'relative',
  },
  progressFill: {
    height: '100%',
    backgroundColor: COLORS.textPrimary,
    borderRadius: 2,
  },
  progressHandle: {
    position: 'absolute',
    top: -4,
    width: 12,
    height: 12,
    borderRadius: 6,
    backgroundColor: COLORS.textPrimary,
    marginLeft: -6,
  },
  timeContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: SPACING.sm,
  },
  timeText: {
    fontSize: FONT_SIZES.sm,
    color: COLORS.textMuted,
  },
  mainControls: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: SPACING.lg,
    marginBottom: SPACING.xxl,
  },
  secondaryButton: {
    width: 40,
    height: 40,
    justifyContent: 'center',
    alignItems: 'center',
  },
  secondaryIcon: {
    fontSize: 20,
    opacity: 0.6,
    color: COLORS.textMuted,
  },
  activeButton: {
    opacity: 1,
  },
  activeIcon: {
    color: COLORS.primary,
    opacity: 1,
  },
  controlButton: {
    width: 48,
    height: 48,
    justifyContent: 'center',
    alignItems: 'center',
  },
  controlIcon: {
    fontSize: 28,
  },
  playButton: {
    width: DIMENSIONS.playButtonLarge,
    height: DIMENSIONS.playButtonLarge,
    borderRadius: DIMENSIONS.playButtonLarge / 2,
    backgroundColor: COLORS.textPrimary,
    justifyContent: 'center',
    alignItems: 'center',
  },
  playButtonIcon: {
    fontSize: 28,
  },
  bottomActions: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: SPACING.xxxl,
  },
  actionButton: {
    width: 48,
    height: 48,
    justifyContent: 'center',
    alignItems: 'center',
  },
  actionIcon: {
    fontSize: 24,
  },
});
