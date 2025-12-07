import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Image,
  ActivityIndicator,
  RefreshControl,
  Dimensions,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { COLORS, SPACING, FONT_SIZES, BORDER_RADIUS, DIMENSIONS as DIMS } from '../constants/theme';
import { useMusicStore } from '../store/useMusicStore';
import { usePlayerStore } from '../store/usePlayerStore';
import { Song } from '../types';

const { width: SCREEN_WIDTH } = Dimensions.get('window');
const CARD_WIDTH = (SCREEN_WIDTH - SPACING.lg * 2 - SPACING.md) / 2;

// Helper to get full image URL
const getFullImageUrl = (imageUrl: string) => {
  if (!imageUrl) return '';
  if (imageUrl.startsWith('http')) return imageUrl;
  return `http://192.168.1.40:5000${imageUrl}`;
};

// Featured Section Component - Horizontal cards like web app
const FeaturedSection = () => {
  const navigation = useNavigation();
  const { featuredSongs, isLoading, error } = useMusicStore();
  const { currentSong, isPlaying, playSong, pauseSong, playAlbum } = usePlayerStore();

  const playFromFeatured = (song: Song, index: number) => {
    if (currentSong?._id === song._id) {
      if (!isPlaying) {
        playSong(song);
      }
      return;
    }
    playAlbum(featuredSongs, index);
  };

  const handleCardPress = (song: Song, index: number) => {
    playFromFeatured(song, index);
    (navigation as any).navigate('SongDetail', { songId: song._id });
  };

  const handlePlayPress = (song: Song, index: number) => {
    if (currentSong?._id === song._id && isPlaying) {
      pauseSong();
      return;
    }
    playFromFeatured(song, index);
  };

  if (isLoading) {
    return (
      <View style={styles.sectionContainer}>
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>Featured</Text>
        </View>
        <View style={styles.loadingContainer}>
          {[1, 2].map((i) => (
            <View key={i} style={styles.featuredSkeleton}>
              <View style={styles.featuredSkeletonImage} />
              <View style={styles.featuredSkeletonText} />
              <View style={styles.featuredSkeletonTextSmall} />
            </View>
          ))}
        </View>
      </View>
    );
  }

  if (error) {
    return (
      <View style={styles.sectionContainer}>
        <Text style={styles.errorText}>{error}</Text>
      </View>
    );
  }

  if (featuredSongs.length === 0) {
    return (
      <View style={styles.sectionContainer}>
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>Featured</Text>
          <TouchableOpacity onPress={() => navigation.navigate('Songs' as never)}>
            <Text style={styles.viewAllText}>View All</Text>
          </TouchableOpacity>
        </View>
        <Text style={styles.emptyText}>No featured songs available</Text>
      </View>
    );
  }

  return (
    <View style={styles.sectionContainer}>
      <View style={styles.sectionHeader}>
        <Text style={styles.sectionTitle}>Featured</Text>
        <TouchableOpacity onPress={() => navigation.navigate('Songs' as never)}>
          <Text style={styles.viewAllText}>View All</Text>
        </TouchableOpacity>
      </View>
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.featuredScrollContent}
      >
        {featuredSongs.map((song, index) => (
          <TouchableOpacity
            key={song._id}
            style={styles.featuredCard}
            onPress={() => handleCardPress(song, index)}
            activeOpacity={0.8}
          >
            <Image
              source={{ uri: getFullImageUrl(song.imageUrl) }}
              style={styles.featuredImage}
            />
            <View style={styles.featuredInfo}>
              <Text style={styles.featuredTitle} numberOfLines={1}>{song.title}</Text>
              <Text style={styles.featuredArtist} numberOfLines={1}>{song.artist}</Text>
            </View>
            <TouchableOpacity
              style={styles.featuredPlayButton}
              onPress={() => handlePlayPress(song, index)}
            >
              <Text style={styles.featuredPlayIcon}>
                {currentSong?._id === song._id && isPlaying ? '⏸' : '▶'}
              </Text>
            </TouchableOpacity>
          </TouchableOpacity>
        ))}
      </ScrollView>
    </View>
  );
};

// Section Grid Component - Grid of song cards like web app
interface SectionGridProps {
  title: string;
  songs: Song[];
  isLoading: boolean;
  viewAllPath?: string;
}

const SectionGrid = ({ title, songs, isLoading, viewAllPath }: SectionGridProps) => {
  const navigation = useNavigation();
  const { currentSong, isPlaying, playSong, pauseSong, playAlbum } = usePlayerStore();
  
  const maxVisibleCards = 4; // 2x2 grid on mobile
  const visibleSongs = songs.slice(0, maxVisibleCards);

  const playFromSection = (song: Song, index: number) => {
    if (currentSong?._id === song._id) {
      if (!isPlaying) {
        playSong(song);
      }
      return;
    }
    playAlbum(songs, index);
  };

  const handleCardPress = (song: Song, index: number) => {
    playFromSection(song, index);
    (navigation as any).navigate('SongDetail', { songId: song._id });
  };

  const handlePlayPress = (song: Song, index: number) => {
    if (currentSong?._id === song._id && isPlaying) {
      pauseSong();
      return;
    }
    playFromSection(song, index);
  };

  if (isLoading) {
    return (
      <View style={styles.sectionContainer}>
        <Text style={styles.sectionTitle}>{title}</Text>
        <View style={styles.gridContainer}>
          {[1, 2, 3, 4].map((i) => (
            <View key={i} style={styles.gridSkeleton}>
              <View style={styles.gridSkeletonImage} />
              <View style={styles.gridSkeletonText} />
              <View style={styles.gridSkeletonTextSmall} />
            </View>
          ))}
        </View>
      </View>
    );
  }

  if (visibleSongs.length === 0) {
    return (
      <View style={styles.sectionContainer}>
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>{title}</Text>
          {viewAllPath && (
            <TouchableOpacity>
              <Text style={styles.viewAllText}>View All</Text>
            </TouchableOpacity>
          )}
        </View>
        <Text style={styles.emptyText}>No songs available</Text>
      </View>
    );
  }

  return (
    <View style={styles.sectionContainer}>
      <View style={styles.sectionHeader}>
        <Text style={styles.sectionTitle}>{title}</Text>
        {viewAllPath && (
          <TouchableOpacity>
            <Text style={styles.viewAllText}>View All</Text>
          </TouchableOpacity>
        )}
      </View>
      <View style={styles.gridContainer}>
        {visibleSongs.map((song, index) => (
          <TouchableOpacity
            key={song._id}
            style={styles.gridCard}
            onPress={() => handleCardPress(song, index)}
            activeOpacity={0.8}
          >
            <View style={styles.gridImageContainer}>
              <Image
                source={{ uri: getFullImageUrl(song.imageUrl) }}
                style={styles.gridImage}
              />
              {/* Liked Badge */}
              {song.isLiked && (
                <View style={styles.likedBadge}>
                  <Text style={styles.likedBadgeIcon}>❤️</Text>
                  <Text style={styles.likedBadgeText}>Liked</Text>
                </View>
              )}
              {/* Play Button */}
              <TouchableOpacity
                style={styles.gridPlayButton}
                onPress={() => handlePlayPress(song, index)}
              >
                <Text style={styles.gridPlayIcon}>
                  {currentSong?._id === song._id && isPlaying ? '⏸' : '▶'}
                </Text>
              </TouchableOpacity>
              {/* Active indicator */}
              {currentSong?._id === song._id && (
                <View style={styles.activeIndicator}>
                  <View style={[styles.bar, { height: 8 }]} />
                  <View style={[styles.bar, { height: 12 }]} />
                  <View style={[styles.bar, { height: 10 }]} />
                </View>
              )}
            </View>
            <Text
              style={[
                styles.gridTitle,
                currentSong?._id === song._id && styles.gridTitleActive,
              ]}
              numberOfLines={1}
            >
              {song.title}
            </Text>
            <Text style={styles.gridArtist} numberOfLines={1}>
              {song.artist}
            </Text>
          </TouchableOpacity>
        ))}
      </View>
    </View>
  );
};

// Main HomeScreen Component
export const HomeScreen = () => {
  const [refreshing, setRefreshing] = useState(false);
  const {
    fetchFeaturedSongs,
    fetchMadeForYouSongs,
    fetchTrendingSongs,
    fetchLikedSongs,
    isLoading,
    madeForYouSongs,
    featuredSongs,
    trendingSongs,
    likedSongs,
    likedSongsLoading,
    likedSongsInitialized,
    error,
  } = useMusicStore();

  const { currentSong, setQueue, queue } = usePlayerStore();

  useEffect(() => {
    const fetchSongs = async () => {
      try {
        await Promise.all([
          likedSongsInitialized ? Promise.resolve() : fetchLikedSongs(),
          fetchFeaturedSongs(),
          fetchMadeForYouSongs(),
          fetchTrendingSongs(),
        ]);
      } catch (error) {
        console.error('Error fetching songs:', error);
      }
    };
    fetchSongs();
  }, []);

  useEffect(() => {
    if (!isLoading) {
      const allSongs = [
        ...madeForYouSongs,
        ...featuredSongs,
        ...trendingSongs,
        ...likedSongs,
      ];
      const shouldSeedQueue = allSongs.length > 0 && !currentSong && queue.length === 0;
      if (shouldSeedQueue) {
        setQueue(allSongs);
      }
    }
  }, [isLoading, madeForYouSongs, featuredSongs, trendingSongs, likedSongs, setQueue, currentSong, queue.length]);

  const onRefresh = async () => {
    setRefreshing(true);
    await Promise.all([
      fetchFeaturedSongs(),
      fetchMadeForYouSongs(),
      fetchTrendingSongs(),
      fetchLikedSongs(),
    ]);
    setRefreshing(false);
  };

  if (error) {
    return (
      <View style={styles.errorContainer}>
        <Text style={styles.errorTitle}>Error loading songs</Text>
        <Text style={styles.errorMessage}>{error}</Text>
        <TouchableOpacity style={styles.retryButton} onPress={onRefresh}>
          <Text style={styles.retryText}>Retry</Text>
        </TouchableOpacity>
      </View>
    );
  }

  if (isLoading && !refreshing) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={COLORS.primary} />
      </View>
    );
  }

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={styles.contentContainer}
      showsVerticalScrollIndicator={false}
      refreshControl={
        <RefreshControl
          refreshing={refreshing}
          onRefresh={onRefresh}
          tintColor={COLORS.primary}
          colors={[COLORS.primary]}
        />
      }
    >
      {/* Liked Songs Section */}
      <SectionGrid
        title="Liked Songs"
        songs={likedSongs}
        isLoading={likedSongsLoading || !likedSongsInitialized}
        viewAllPath="/likes"
      />

      {/* Featured Section */}
      <FeaturedSection />

      {/* Made For You Section */}
      <SectionGrid
        title="Made For You"
        songs={madeForYouSongs}
        isLoading={isLoading}
      />

      {/* Trending Section */}
      <SectionGrid
        title="Trending"
        songs={trendingSongs}
        isLoading={isLoading}
      />

      {/* Bottom spacing for playback controls */}
      <View style={{ height: DIMS.playbackHeight + SPACING.xl }} />
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  contentContainer: {
    paddingVertical: SPACING.lg,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: COLORS.background,
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: COLORS.background,
    padding: SPACING.xl,
  },
  errorTitle: {
    fontSize: FONT_SIZES.xl,
    fontWeight: '600',
    color: COLORS.error,
    marginBottom: SPACING.sm,
  },
  errorMessage: {
    fontSize: FONT_SIZES.md,
    color: COLORS.textMuted,
    textAlign: 'center',
    marginBottom: SPACING.lg,
  },
  retryButton: {
    paddingHorizontal: SPACING.xl,
    paddingVertical: SPACING.md,
    backgroundColor: COLORS.primary,
    borderRadius: BORDER_RADIUS.full,
  },
  retryText: {
    fontSize: FONT_SIZES.md,
    fontWeight: '600',
    color: COLORS.textPrimary,
  },
  errorText: {
    color: COLORS.error,
    fontSize: FONT_SIZES.lg,
  },
  emptyText: {
    color: COLORS.textMuted,
    fontSize: FONT_SIZES.md,
  },

  // Section styles
  sectionContainer: {
    marginBottom: SPACING.xxl,
    paddingHorizontal: SPACING.lg,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: SPACING.lg,
  },
  sectionTitle: {
    fontSize: FONT_SIZES.title,
    fontWeight: 'bold',
    color: COLORS.textPrimary,
  },
  viewAllText: {
    fontSize: FONT_SIZES.md,
    color: COLORS.textMuted,
  },

  // Featured styles
  featuredScrollContent: {
    paddingRight: SPACING.lg,
    gap: SPACING.md,
  },
  featuredCard: {
    width: SCREEN_WIDTH * 0.7,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.backgroundCard,
    borderRadius: BORDER_RADIUS.lg,
    padding: SPACING.md,
    marginRight: SPACING.md,
    position: 'relative',
  },
  featuredImage: {
    width: 64,
    height: 64,
    borderRadius: BORDER_RADIUS.md,
  },
  featuredInfo: {
    flex: 1,
    marginLeft: SPACING.md,
    marginRight: SPACING.md,
  },
  featuredTitle: {
    fontSize: FONT_SIZES.md,
    fontWeight: '500',
    color: COLORS.textPrimary,
    marginBottom: 2,
  },
  featuredArtist: {
    fontSize: FONT_SIZES.sm,
    color: COLORS.textMuted,
  },
  featuredPlayButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: 'rgba(16, 185, 129, 0.8)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  featuredPlayIcon: {
    fontSize: 16,
    color: COLORS.textPrimary,
  },
  featuredSkeleton: {
    width: SCREEN_WIDTH * 0.7,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.backgroundCard,
    borderRadius: BORDER_RADIUS.lg,
    padding: SPACING.md,
    marginRight: SPACING.md,
  },
  featuredSkeletonImage: {
    width: 64,
    height: 64,
    borderRadius: BORDER_RADIUS.md,
    backgroundColor: COLORS.zinc700,
  },
  featuredSkeletonText: {
    width: 100,
    height: 16,
    backgroundColor: COLORS.zinc700,
    borderRadius: 4,
    marginLeft: SPACING.md,
    marginBottom: SPACING.xs,
  },
  featuredSkeletonTextSmall: {
    width: 60,
    height: 12,
    backgroundColor: COLORS.zinc700,
    borderRadius: 4,
    marginLeft: SPACING.md,
  },

  // Grid styles
  gridContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
  },
  gridCard: {
    width: CARD_WIDTH,
    marginBottom: SPACING.lg,
    backgroundColor: COLORS.backgroundCard,
    borderRadius: BORDER_RADIUS.lg,
    padding: SPACING.md,
  },
  gridImageContainer: {
    width: '100%',
    aspectRatio: 1,
    borderRadius: BORDER_RADIUS.md,
    overflow: 'hidden',
    marginBottom: SPACING.sm,
    position: 'relative',
  },
  gridImage: {
    width: '100%',
    height: '100%',
  },
  likedBadge: {
    position: 'absolute',
    top: SPACING.sm,
    left: SPACING.sm,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(0, 0, 0, 0.4)',
    paddingHorizontal: SPACING.sm,
    paddingVertical: 4,
    borderRadius: BORDER_RADIUS.full,
    gap: 4,
  },
  likedBadgeIcon: {
    fontSize: 10,
  },
  likedBadgeText: {
    fontSize: 11,
    fontWeight: '600',
    color: COLORS.like,
  },
  gridPlayButton: {
    position: 'absolute',
    bottom: SPACING.sm,
    right: SPACING.sm,
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: COLORS.primary,
    justifyContent: 'center',
    alignItems: 'center',
  },
  gridPlayIcon: {
    fontSize: 18,
    color: COLORS.background,
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
  gridSkeleton: {
    width: CARD_WIDTH,
    marginBottom: SPACING.lg,
    backgroundColor: COLORS.backgroundCard,
    borderRadius: BORDER_RADIUS.lg,
    padding: SPACING.md,
  },
  gridSkeletonImage: {
    width: '100%',
    aspectRatio: 1,
    borderRadius: BORDER_RADIUS.md,
    backgroundColor: COLORS.zinc700,
    marginBottom: SPACING.sm,
  },
  gridSkeletonText: {
    width: '75%',
    height: 16,
    backgroundColor: COLORS.zinc700,
    borderRadius: 4,
    marginBottom: SPACING.xs,
  },
  gridSkeletonTextSmall: {
    width: '50%',
    height: 12,
    backgroundColor: COLORS.zinc700,
    borderRadius: 4,
  },
});
