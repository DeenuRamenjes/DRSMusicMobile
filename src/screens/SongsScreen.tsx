import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Image,
  FlatList,
  ActivityIndicator,
  Dimensions,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import LinearGradient from 'react-native-linear-gradient';
import { COLORS, SPACING, FONT_SIZES, BORDER_RADIUS, DIMENSIONS as DIMS } from '../constants/theme';
import { useMusicStore } from '../store/useMusicStore';
import { usePlayerStore } from '../store/usePlayerStore';
import { Song } from '../types';

const { width: SCREEN_WIDTH } = Dimensions.get('window');
const GRID_CARD_WIDTH = (SCREEN_WIDTH - SPACING.lg * 2 - SPACING.md) / 2;

// Helper to get full image URL
const getFullImageUrl = (imageUrl: string) => {
  if (!imageUrl) return '';
  if (imageUrl.startsWith('http')) return imageUrl;
  return `http://192.168.1.40:5000${imageUrl}`;
};

const formatDuration = (seconds: number) => {
  const minutes = Math.floor(seconds / 60);
  const remainingSeconds = seconds % 60;
  return `${minutes}:${remainingSeconds.toString().padStart(2, '0')}`;
};

export const SongsScreen = () => {
  const navigation = useNavigation();
  const { songs, isLoading, fetchSongs } = useMusicStore();
  const { currentSong, isPlaying, playSong, pauseSong, setQueue } = usePlayerStore();
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
  const [filteredSongs, setFilteredSongs] = useState<Song[]>([]);

  useEffect(() => {
    fetchSongs();
  }, []);

  useEffect(() => {
    if (songs.length > 0) {
      setQueue(songs);
      setFilteredSongs(songs);
    }
  }, [songs]);

  const handlePlayPause = (song: Song) => {
    if (currentSong?._id === song._id) {
      if (isPlaying) {
        pauseSong();
      } else {
        playSong(song);
      }
    } else {
      playSong(song);
    }
  };

  // Grid View Item
  const renderGridItem = ({ item: song }: { item: Song }) => {
    const isCurrentSong = currentSong?._id === song._id;

    return (
      <TouchableOpacity
        style={styles.gridCard}
        onPress={() => handlePlayPause(song)}
        activeOpacity={0.8}
      >
        <View style={styles.gridImageContainer}>
          <Image
            source={{ uri: getFullImageUrl(song.imageUrl) }}
            style={styles.gridImage}
          />
          {/* Like Badge */}
          {song.isLiked && (
            <View style={styles.likeBadge}>
              <Text style={styles.likeBadgeIcon}>❤️</Text>
            </View>
          )}
          {/* Play Button */}
          <TouchableOpacity
            style={[
              styles.gridPlayButton,
              isCurrentSong && isPlaying && styles.gridPlayButtonActive,
            ]}
            onPress={() => handlePlayPause(song)}
          >
            <Text style={styles.gridPlayIcon}>
              {isCurrentSong && isPlaying ? '⏸' : '▶'}
            </Text>
          </TouchableOpacity>
          {/* Active indicator */}
          {isCurrentSong && (
            <View style={styles.activeIndicator}>
              <View style={[styles.bar, { height: 16 }]} />
              <View style={[styles.bar, { height: 12 }]} />
              <View style={[styles.bar, { height: 20 }]} />
            </View>
          )}
        </View>
        <Text
          style={[styles.gridTitle, isCurrentSong && styles.gridTitleActive]}
          numberOfLines={1}
        >
          {song.title}
        </Text>
        <Text style={styles.gridArtist} numberOfLines={1}>
          {song.artist}
        </Text>
      </TouchableOpacity>
    );
  };

  // List View Item
  const renderListItem = ({ item: song, index }: { item: Song; index: number }) => {
    const isCurrentSong = currentSong?._id === song._id;

    return (
      <TouchableOpacity
        style={styles.listItem}
        onPress={() => handlePlayPause(song)}
        activeOpacity={0.7}
      >
        {/* Number / Play indicator */}
        <View style={styles.listNumber}>
          {isCurrentSong && isPlaying ? (
            <View style={styles.playingIndicator}>
              <View style={[styles.playingBar, { height: 12 }]} />
              <View style={[styles.playingBar, { height: 8 }]} />
              <View style={[styles.playingBar, { height: 12 }]} />
            </View>
          ) : (
            <Text style={styles.listNumberText}>{index + 1}</Text>
          )}
        </View>

        {/* Song Info */}
        <View style={styles.listSongInfo}>
          <View style={styles.listImageContainer}>
            <Image
              source={{ uri: getFullImageUrl(song.imageUrl) }}
              style={styles.listImage}
            />
            {song.isLiked && (
              <Text style={styles.listLikeIcon}>❤️</Text>
            )}
          </View>
          <View style={styles.listTextContainer}>
            <Text
              style={[styles.listTitle, isCurrentSong && styles.listTitleActive]}
              numberOfLines={1}
            >
              {song.title}
            </Text>
            <Text style={styles.listArtistMobile} numberOfLines={1}>
              {song.artist}
            </Text>
          </View>
        </View>

        {/* Duration */}
        <Text style={styles.listDuration}>{formatDuration(song.duration)}</Text>
      </TouchableOpacity>
    );
  };

  if (isLoading) {
    return (
      <View style={styles.container}>
        {/* Hero Header with loading */}
        <LinearGradient
          colors={['rgba(147, 51, 234, 0.2)', 'rgba(88, 28, 135, 0.1)', 'transparent']}
          style={styles.heroGradient}
        />
        <View style={styles.headerContainer}>
          <Text style={styles.headerTitle}>All Songs</Text>
        </View>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={COLORS.primary} />
        </View>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {/* Hero Header */}
      <View style={styles.heroContainer}>
        <LinearGradient
          colors={['rgba(147, 51, 234, 0.2)', 'rgba(88, 28, 135, 0.1)', 'transparent']}
          style={styles.heroGradient}
        />
        <View style={styles.headerContainer}>
          <Text style={styles.headerTitle}>All Songs</Text>
          
          {/* View Toggle */}
          <View style={styles.viewToggle}>
            <TouchableOpacity
              style={[styles.toggleButton, viewMode === 'grid' && styles.toggleButtonActive]}
              onPress={() => setViewMode('grid')}
            >
              <Text style={styles.toggleIcon}>⊞</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.toggleButton, viewMode === 'list' && styles.toggleButtonActive]}
              onPress={() => setViewMode('list')}
            >
              <Text style={styles.toggleIcon}>☰</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>

      {/* Songs Content */}
      {filteredSongs.length === 0 ? (
        <View style={styles.emptyContainer}>
          <Text style={styles.emptyIcon}>🎵</Text>
          <Text style={styles.emptyTitle}>No songs found</Text>
          <Text style={styles.emptySubtitle}>Try a different search term</Text>
        </View>
      ) : viewMode === 'grid' ? (
        <FlatList
          key="grid-view"
          data={filteredSongs}
          renderItem={renderGridItem}
          keyExtractor={(item) => item._id}
          numColumns={2}
          contentContainerStyle={styles.gridContainer}
          columnWrapperStyle={styles.gridRow}
          showsVerticalScrollIndicator={false}
        />
      ) : (
        <View style={styles.listContainer}>
          {/* List Header */}
          <View style={styles.listHeader}>
            <Text style={styles.listHeaderNumber}>#</Text>
            <Text style={styles.listHeaderTitle}>Title</Text>
            <Text style={styles.listHeaderDuration}>⏱</Text>
          </View>
          
          <FlatList
            key="list-view"
            data={filteredSongs}
            renderItem={renderListItem}
            keyExtractor={(item) => item._id}
            contentContainerStyle={styles.listContent}
            showsVerticalScrollIndicator={false}
          />
        </View>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },

  // Hero Header
  heroContainer: {
    position: 'relative',
    paddingBottom: SPACING.lg,
  },
  heroGradient: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    height: 200,
  },
  headerContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: SPACING.lg,
    paddingVertical: SPACING.lg,
  },
  headerTitle: {
    fontSize: FONT_SIZES.title,
    fontWeight: 'bold',
    color: COLORS.textPrimary,
  },

  // View Toggle
  viewToggle: {
    flexDirection: 'row',
    backgroundColor: 'rgba(39, 39, 42, 0.6)',
    borderRadius: BORDER_RADIUS.md,
    borderWidth: 1,
    borderColor: 'rgba(63, 63, 70, 0.3)',
  },
  toggleButton: {
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.sm,
    borderRadius: BORDER_RADIUS.sm,
  },
  toggleButtonActive: {
    backgroundColor: COLORS.zinc700,
  },
  toggleIcon: {
    fontSize: 16,
    color: COLORS.textMuted,
  },

  // Grid View
  gridContainer: {
    paddingHorizontal: SPACING.lg,
    paddingBottom: DIMS.playbackHeight + SPACING.xxl,
  },
  gridRow: {
    justifyContent: 'space-between',
  },
  gridCard: {
    width: GRID_CARD_WIDTH,
    marginBottom: SPACING.md,
    backgroundColor: 'rgba(39, 39, 42, 0.2)',
    borderRadius: BORDER_RADIUS.xl,
    padding: SPACING.md,
  },
  gridImageContainer: {
    width: '100%',
    aspectRatio: 1,
    borderRadius: BORDER_RADIUS.lg,
    overflow: 'hidden',
    marginBottom: SPACING.sm,
    position: 'relative',
  },
  gridImage: {
    width: '100%',
    height: '100%',
  },
  likeBadge: {
    position: 'absolute',
    top: SPACING.sm,
    right: SPACING.sm,
    width: 28,
    height: 28,
    backgroundColor: 'rgba(0, 0, 0, 0.6)',
    borderRadius: 14,
    justifyContent: 'center',
    alignItems: 'center',
  },
  likeBadgeIcon: {
    fontSize: 14,
  },
  gridPlayButton: {
    position: 'absolute',
    bottom: SPACING.sm,
    right: SPACING.sm,
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: COLORS.primary,
    justifyContent: 'center',
    alignItems: 'center',
  },
  gridPlayButtonActive: {
    backgroundColor: COLORS.primary,
  },
  gridPlayIcon: {
    fontSize: 20,
    color: COLORS.background,
    marginLeft: 2,
  },
  activeIndicator: {
    position: 'absolute',
    bottom: SPACING.sm,
    left: SPACING.sm,
    flexDirection: 'row',
    alignItems: 'flex-end',
    gap: 2,
  },
  bar: {
    width: 4,
    backgroundColor: COLORS.primary,
    borderRadius: 2,
  },
  gridTitle: {
    fontSize: FONT_SIZES.md,
    fontWeight: '600',
    color: COLORS.textPrimary,
    marginBottom: 2,
  },
  gridTitleActive: {
    color: COLORS.primary,
  },
  gridArtist: {
    fontSize: FONT_SIZES.sm,
    color: COLORS.textMuted,
  },

  // List View
  listContainer: {
    flex: 1,
    backgroundColor: 'rgba(39, 39, 42, 0.2)',
    marginHorizontal: SPACING.lg,
    borderRadius: BORDER_RADIUS.xl,
    overflow: 'hidden',
  },
  listHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: SPACING.lg,
    paddingVertical: SPACING.md,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(63, 63, 70, 0.3)',
  },
  listHeaderNumber: {
    width: 40,
    textAlign: 'center',
    fontSize: FONT_SIZES.sm,
    color: COLORS.textMuted,
    textTransform: 'uppercase',
  },
  listHeaderTitle: {
    flex: 1,
    fontSize: FONT_SIZES.sm,
    color: COLORS.textMuted,
    textTransform: 'uppercase',
  },
  listHeaderDuration: {
    width: 48,
    textAlign: 'center',
    fontSize: FONT_SIZES.md,
    color: COLORS.textMuted,
  },
  listContent: {
    paddingBottom: DIMS.playbackHeight + SPACING.xxl,
  },
  listItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: SPACING.lg,
    paddingVertical: SPACING.sm,
  },
  listNumber: {
    width: 40,
    alignItems: 'center',
    justifyContent: 'center',
  },
  listNumberText: {
    fontSize: FONT_SIZES.md,
    color: COLORS.textMuted,
  },
  playingIndicator: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    gap: 2,
  },
  playingBar: {
    width: 2,
    backgroundColor: COLORS.primary,
    borderRadius: 1,
  },
  listSongInfo: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.md,
    minWidth: 0,
  },
  listImageContainer: {
    position: 'relative',
  },
  listImage: {
    width: 40,
    height: 40,
    borderRadius: BORDER_RADIUS.sm,
  },
  listLikeIcon: {
    position: 'absolute',
    top: -4,
    right: -4,
    fontSize: 12,
  },
  listTextContainer: {
    flex: 1,
    minWidth: 0,
  },
  listTitle: {
    fontSize: FONT_SIZES.md,
    fontWeight: '500',
    color: COLORS.textPrimary,
  },
  listTitleActive: {
    color: COLORS.primary,
  },
  listArtistMobile: {
    fontSize: FONT_SIZES.sm,
    color: COLORS.textMuted,
    marginTop: 2,
  },
  listDuration: {
    width: 48,
    textAlign: 'center',
    fontSize: FONT_SIZES.md,
    color: COLORS.textMuted,
  },

  // Empty State
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingBottom: 100,
  },
  emptyIcon: {
    fontSize: 64,
    marginBottom: SPACING.lg,
  },
  emptyTitle: {
    fontSize: FONT_SIZES.xl,
    fontWeight: '600',
    color: COLORS.textPrimary,
    marginBottom: SPACING.sm,
  },
  emptySubtitle: {
    fontSize: FONT_SIZES.md,
    color: COLORS.textMuted,
  },
});
