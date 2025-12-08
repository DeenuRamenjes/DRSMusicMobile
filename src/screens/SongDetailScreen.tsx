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
import { useNavigation } from '@react-navigation/native';
import Icon from 'react-native-vector-icons/Feather';
import { COLORS, SPACING, FONT_SIZES, BORDER_RADIUS, DIMENSIONS as DIMS } from '../constants/theme';
import { usePlayerStore } from '../store/usePlayerStore';
import { useMusicStore } from '../store/useMusicStore';
import { useThemeStore } from '../store/useThemeStore';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

// Album art sizing based on screen width
const ALBUM_ART_SIZE = Math.min(SCREEN_WIDTH - SPACING.xxl * 2, 320);

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
    seekTo,
  } = usePlayerStore();

  const { likedSongs, likeSong, unlikeSong } = useMusicStore();
  const { colors: themeColors } = useThemeStore();

  const progressPercent = duration > 0 ? (currentTime / duration) * 100 : 0;
  const isSongLiked = currentSong ? likedSongs.some(s => s._id === currentSong._id) : false;

  const formatTime = (seconds: number): string => {
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const handleBack = () => {
    if (navigation.canGoBack()) {
      navigation.goBack();
    } else {
      (navigation as any).reset({
        index: 0,
        routes: [{ name: 'MainLayout' }],
      });
    }
  };

  const handleToggleLike = async () => {
    if (!currentSong) return;
    if (isSongLiked) {
      await unlikeSong(currentSong._id);
    } else {
      await likeSong(currentSong._id);
    }
  };

  if (!currentSong) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.emptyContainer}>
          <Icon name="music" size={64} color={COLORS.textMuted} />
          <Text style={styles.noSongText}>No song playing</Text>
          <TouchableOpacity style={styles.goBackButton} onPress={handleBack}>
            <Text style={styles.goBackText}>Go Back</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  const imageUri = getFullImageUrl(currentSong.imageUrl);

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <StatusBar barStyle="light-content" backgroundColor={COLORS.background} />
      
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={handleBack} style={styles.backButton}>
          <Icon name="chevron-down" size={28} color={COLORS.textPrimary} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>NOW PLAYING</Text>
        <TouchableOpacity style={styles.menuButton}>
          <Icon name="more-vertical" size={24} color={COLORS.textPrimary} />
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
              <Icon name="music" size={64} color={COLORS.textMuted} />
            </View>
          )}
        </View>

        {/* Song Info */}
        <View style={styles.songInfoContainer}>
          <Text style={styles.songTitle} numberOfLines={2}>{currentSong.title}</Text>
          <Text style={styles.songArtist} numberOfLines={1}>{currentSong.artist}</Text>
        </View>

        {/* Progress Bar */}
        <View style={styles.progressSection}>
          <View style={styles.progressBar}>
            <View style={[styles.progressFill, { width: `${progressPercent}%`, backgroundColor: themeColors.primary }]} />
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
            style={styles.secondaryButton}
            onPress={toggleShuffle}
          >
            <Icon 
              name="shuffle" 
              size={22} 
              color={isShuffle ? themeColors.primary : COLORS.textMuted} 
            />
          </TouchableOpacity>

          <TouchableOpacity style={styles.controlButton} onPress={playPrevious}>
            <Icon name="skip-back" size={32} color={COLORS.textPrimary} />
          </TouchableOpacity>

          <TouchableOpacity style={styles.playButton} onPress={togglePlayPause}>
            <Icon 
              name={isPlaying ? 'pause' : 'play'} 
              size={32} 
              color={COLORS.background} 
              style={!isPlaying && styles.playIconOffset}
            />
          </TouchableOpacity>

          <TouchableOpacity style={styles.controlButton} onPress={playNext}>
            <Icon name="skip-forward" size={32} color={COLORS.textPrimary} />
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.secondaryButton}
            onPress={toggleLoop}
          >
            <Icon 
              name="repeat" 
              size={22} 
              color={isLooping ? themeColors.primary : COLORS.textMuted} 
            />
          </TouchableOpacity>
        </View>

        {/* Bottom Actions */}
        <View style={styles.bottomActions}>
          <TouchableOpacity style={styles.actionButton} onPress={handleToggleLike}>
            <Icon 
              name="heart" 
              size={24} 
              color={isSongLiked ? '#f43f5e' : COLORS.textMuted}
              style={isSongLiked && { backgroundColor: 'transparent' }}
            />
          </TouchableOpacity>
          <TouchableOpacity style={styles.actionButton}>
            <Icon name="volume-2" size={24} color={COLORS.textMuted} />
          </TouchableOpacity>
          <TouchableOpacity style={styles.actionButton}>
            <Icon name="list" size={24} color={COLORS.textMuted} />
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
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    gap: SPACING.lg,
  },
  noSongText: {
    color: COLORS.textMuted,
    fontSize: FONT_SIZES.lg,
  },
  goBackButton: {
    paddingHorizontal: SPACING.xl,
    paddingVertical: SPACING.md,
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    borderRadius: BORDER_RADIUS.full,
  },
  goBackText: {
    color: COLORS.textPrimary,
    fontSize: FONT_SIZES.md,
    fontWeight: '500',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: SPACING.lg,
    paddingVertical: SPACING.md,
  },
  backButton: {
    padding: SPACING.sm,
    marginLeft: -SPACING.sm,
  },
  headerTitle: {
    fontSize: FONT_SIZES.md,
    fontWeight: '600',
    color: COLORS.textMuted,
    letterSpacing: 2,
  },
  menuButton: {
    padding: SPACING.sm,
    marginRight: -SPACING.sm,
  },
  content: {
    flex: 1,
  },
  contentContainer: {
    paddingHorizontal: SPACING.xxl,
    paddingBottom: SPACING.xxl,
    alignItems: 'center',
  },
  albumArtContainer: {
    marginTop: SPACING.lg,
    marginBottom: SPACING.xxl,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 25 },
    shadowOpacity: 0.5,
    shadowRadius: 30,
    elevation: 20,
  },
  albumArt: {
    width: ALBUM_ART_SIZE,
    height: ALBUM_ART_SIZE,
    borderRadius: BORDER_RADIUS.xl,
    marginTop: SPACING.xxxl,
  },
  albumArtPlaceholder: {
    backgroundColor: COLORS.zinc800,
    justifyContent: 'center',
    alignItems: 'center',
  },
  songInfoContainer: {
    width: '100%',
    alignItems: 'center',
    marginBottom: SPACING.xxxl,
  },
  songTitle: {
    fontSize: 28,
    fontWeight: 'bold',
    color: COLORS.textPrimary,
    height:80,
    textAlign: 'center',
    marginBottom: SPACING.sm,
  },
  songArtist: {
    fontSize: FONT_SIZES.lg,
    color: COLORS.textMuted,
    textAlign: 'center',
  },
  progressSection: {
    width: '100%',
    marginTop: SPACING.xxxl,
    marginBottom: SPACING.xxl,
  },
  progressBar: {
    height: 6,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    borderRadius: 3,
    position: 'relative',
  },
  progressFill: {
    height: '100%',
    backgroundColor: COLORS.primary,
    borderRadius: 3,
  },
  progressHandle: {
    position: 'absolute',
    top: -5,
    width: 16,
    height: 16,
    backgroundColor: COLORS.textPrimary,
    borderRadius: 8,
    marginLeft: -8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
    elevation: 4,
  },
  timeContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: SPACING.sm,
  },
  timeText: {
    fontSize: FONT_SIZES.sm,
    color: COLORS.textMuted,
    fontWeight: '500',
  },
  mainControls: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: SPACING.lg,
    marginBottom: SPACING.xxl,
    width: '100%',
  },
  secondaryButton: {
    padding: SPACING.md,
  },
  controlButton: {
    padding: SPACING.sm,
  },
  playButton: {
    width: 72,
    height: 72,
    borderRadius: 36,
    backgroundColor: COLORS.textPrimary,
    justifyContent: 'center',
    alignItems: 'center',
    marginHorizontal: SPACING.md,
    shadowColor: '#fff',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.2,
    shadowRadius: 20,
    elevation: 10,
  },
  playIconOffset: {
    marginLeft: 4,
  },
  bottomActions: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: SPACING.xxl,
    width: '100%',
  },
  actionButton: {
    padding: SPACING.md,
  },
});

export default SongDetailScreen;
