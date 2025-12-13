import React, { useEffect, useState, useRef } from 'react';
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
import { useNavigation, CommonActions } from '@react-navigation/native';
import Icon from 'react-native-vector-icons/Feather';
import LinearGradient from 'react-native-linear-gradient';
import {
  COLORS,
  SPACING,
  FONT_SIZES,
  BORDER_RADIUS,
  DIMENSIONS as DIMS,
} from '../constants/theme';
import { useMusicStore } from '../store/useMusicStore';
import { usePlayerStore } from '../store/usePlayerStore';
import { useOfflineMusicStore } from '../store/useOfflineMusicStore';
import { useThemeStore } from '../store/useThemeStore';
import { useAuthStore } from '../store/useAuthStore';
import { Song } from '../types';
import { getFullImageUrl, useBackendStore } from '../config';
import ProfileHeader from '../components/ProfileHeader';

const { width: SCREEN_WIDTH } = Dimensions.get('window');
const CARD_WIDTH = (SCREEN_WIDTH - SPACING.lg * 2 - SPACING.md) / 2;

// Login Banner Component for unauthenticated users
const LoginBanner = ({ 
  themeColors, 
  onLogin 
}: { 
  themeColors: { primary: string }; 
  onLogin: () => void;
}) => {
  return (
    <LinearGradient
      colors={[themeColors.primary + '40', themeColors.primary + '10']}
      start={{ x: 0, y: 0 }}
      end={{ x: 1, y: 0 }}
      style={styles.loginBanner}
    >
      <View style={styles.loginBannerContent}>
        <View style={styles.loginBannerIcon}>
          <Icon name="user" size={24} color={themeColors.primary} />
        </View>
        <View style={styles.loginBannerText}>
          <Text style={styles.loginBannerTitle}>Sign in to unlock all features</Text>
          <Text style={styles.loginBannerSubtitle}>
            Like songs, sync playlists, and more
          </Text>
        </View>
      </View>
      <TouchableOpacity
        style={[styles.loginBannerButton, { backgroundColor: themeColors.primary }]}
        onPress={onLogin}
      >
        <Text style={styles.loginBannerButtonText}>Sign In</Text>
        <Icon name="arrow-right" size={16} color="#fff" />
      </TouchableOpacity>
    </LinearGradient>
  );
};

// Featured Section Component - Horizontal cards like web app
const FeaturedSection = () => {
  const navigation = useNavigation();
  const { featuredSongs, isLoading, error } = useMusicStore();
  const { currentSong, isPlaying, playSong, pauseSong, playAlbum } =
    usePlayerStore();
  const { colors: themeColors } = useThemeStore();

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
          {[1, 2].map(i => (
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
          <TouchableOpacity
            onPress={() => navigation.navigate('Songs' as never)}
          >
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
              <Text style={styles.featuredTitle} numberOfLines={1}>
                {song.title}
              </Text>
              <Text style={styles.featuredArtist} numberOfLines={1}>
                {song.artist}
              </Text>
            </View>
            <TouchableOpacity
              style={[
                styles.featuredPlayButton,
                { backgroundColor: themeColors.primary },
              ]}
              onPress={() => handlePlayPress(song, index)}
            >
              <Icon
                name={
                  currentSong?._id === song._id && isPlaying ? 'pause' : 'play'
                }
                size={20}
                color="#fff"
                style={
                  !(currentSong?._id === song._id && isPlaying) && {
                    marginLeft: 2,
                  }
                }
              />
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

const SectionGrid = ({
  title,
  songs,
  isLoading,
  viewAllPath,
}: SectionGridProps) => {
  const navigation = useNavigation();
  const { currentSong, isPlaying, playSong, pauseSong, playAlbum } =
    usePlayerStore();
  const { colors: themeColors } = useThemeStore();

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
          {[1, 2, 3, 4].map(i => (
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
                style={[
                  styles.gridPlayButton,
                  { backgroundColor: themeColors.primary },
                ]}
                onPress={() => handlePlayPress(song, index)}
              >
                <Icon
                  name={
                    currentSong?._id === song._id && isPlaying
                      ? 'pause'
                      : 'play'
                  }
                  size={16}
                  color="#fff"
                  style={
                    !(currentSong?._id === song._id && isPlaying) && {
                      marginLeft: 2,
                    }
                  }
                />
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

// Offline Mode View Component
const OfflineModeView = () => {
  const {
    downloadedSongs,
    deviceSongs,
    isScanning,
    scanDeviceMusic,
    loadDownloadedSongs,
  } = useOfflineMusicStore();
  const { currentSong, isPlaying } = usePlayerStore();
  const { colors: themeColors } = useThemeStore();
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');

  const allOfflineSongs = [...downloadedSongs, ...deviceSongs];

  useEffect(() => {
    loadDownloadedSongs();
  }, []);

  const handlePlaySong = (song: any, index: number) => {
    // Prepare all songs with proper file:// URLs
    const queueSongs = allOfflineSongs.map(s => ({
      ...s,
      audioUrl: s.localPath
        ? s.localPath.startsWith('file://')
          ? s.localPath
          : `file://${s.localPath}`
        : s.audioUrl,
    }));

    // Use playAlbum to set queue and play atomically
    const { playAlbum } = usePlayerStore.getState();
    playAlbum(queueSongs as any, index);
  };

  const renderGridItem = (song: any, index: number) => {
    const isCurrentSong = currentSong?._id === song._id;
    return (
      <TouchableOpacity
        key={song._id}
        style={[
          styles.offlineGridItem,
          isCurrentSong && styles.offlineGridItemActive,
        ]}
        onPress={() => handlePlaySong(song, index)}
      >
        <View style={styles.offlineGridImage}>
          {song.imageUrl ? (
            <Image
              source={{ uri: getFullImageUrl(song.imageUrl) }}
              style={styles.offlineGridImageContent}
            />
          ) : (
            <View style={styles.offlineGridPlaceholder}>
              <Icon name="music" size={32} color={COLORS.textMuted} />
            </View>
          )}
          <View style={styles.offlinePlayOverlay}>
            <Icon
              name={isCurrentSong && isPlaying ? 'pause' : 'play'}
              size={20}
              color="#fff"
            />
          </View>
        </View>
        <Text style={styles.offlineGridTitle} numberOfLines={1}>
          {song.title}
        </Text>
        <Text style={styles.offlineGridArtist} numberOfLines={1}>
          {song.artist}
        </Text>
      </TouchableOpacity>
    );
  };

  const renderListItem = (song: any, index: number) => {
    const isCurrentSong = currentSong?._id === song._id;
    return (
      <TouchableOpacity
        key={song._id}
        style={[
          styles.offlineListItem,
          isCurrentSong && styles.offlineListItemActive,
        ]}
        onPress={() => handlePlaySong(song, index)}
      >
        <View style={styles.offlineListImage}>
          {song.imageUrl ? (
            <Image
              source={{ uri: getFullImageUrl(song.imageUrl) }}
              style={styles.offlineListImageContent}
            />
          ) : (
            <View style={styles.offlineListPlaceholder}>
              <Icon name="music" size={24} color={COLORS.textMuted} />
            </View>
          )}
        </View>
        <View style={styles.offlineListInfo}>
          <Text
            style={[
              styles.offlineListTitle,
              isCurrentSong && { color: themeColors.primary },
            ]}
            numberOfLines={1}
          >
            {song.title}
          </Text>
          <Text style={styles.offlineListArtist} numberOfLines={1}>
            {song.artist}
          </Text>
        </View>
        <TouchableOpacity
          style={styles.offlineListPlay}
          onPress={() => handlePlaySong(song, index)}
        >
          <Icon
            name={isCurrentSong && isPlaying ? 'pause' : 'play'}
            size={20}
            color={themeColors.primary}
          />
        </TouchableOpacity>
      </TouchableOpacity>
    );
  };

  return (
    <View style={styles.screenContainer}>
      {/* Header */}
      <View style={styles.offlineHeader}>
        <Text style={styles.offlineTitle}>Offline Music</Text>
        <View style={styles.offlineHeaderActions}>
          {/* View Mode Toggle */}
          <View style={styles.viewModeToggle}>
            <TouchableOpacity
              style={[
                styles.viewModeBtn,
                viewMode === 'grid' && styles.viewModeBtnActive,
              ]}
              onPress={() => setViewMode('grid')}
            >
              <Icon
                name="grid"
                size={18}
                color={
                  viewMode === 'grid' ? themeColors.primary : COLORS.textMuted
                }
              />
            </TouchableOpacity>
            <TouchableOpacity
              style={[
                styles.viewModeBtn,
                viewMode === 'list' && styles.viewModeBtnActive,
              ]}
              onPress={() => setViewMode('list')}
            >
              <Icon
                name="list"
                size={18}
                color={
                  viewMode === 'list' ? themeColors.primary : COLORS.textMuted
                }
              />
            </TouchableOpacity>
          </View>
        </View>
      </View>

      {/* Scan Button */}
      <TouchableOpacity
        style={styles.scanButton}
        onPress={() => scanDeviceMusic()}
        disabled={isScanning}
      >
        {isScanning ? (
          <ActivityIndicator size="small" color={themeColors.primary} />
        ) : (
          <Icon name="search" size={18} color={themeColors.primary} />
        )}
        <Text style={styles.scanButtonText}>
          {isScanning ? 'Scanning...' : 'Scan for Music'}
        </Text>
      </TouchableOpacity>

      {/* Song Count */}
      <Text style={styles.offlineSongCount}>
        {downloadedSongs.length} downloaded • {deviceSongs.length} from device
      </Text>

      {/* Content */}
      {allOfflineSongs.length === 0 ? (
        <View style={styles.offlineEmpty}>
          <Icon name="music" size={64} color={COLORS.textMuted} />
          <Text style={styles.offlineEmptyTitle}>No Offline Songs</Text>
          <Text style={styles.offlineEmptyText}>
            Download songs or scan your device for local music files
          </Text>
        </View>
      ) : (
        <ScrollView
          contentContainerStyle={
            viewMode === 'grid'
              ? styles.offlineGridContainer
              : styles.offlineListContainer
          }
          showsVerticalScrollIndicator={false}
        >
          {viewMode === 'grid'
            ? allOfflineSongs.map((song, index) => renderGridItem(song, index))
            : allOfflineSongs.map((song, index) => renderListItem(song, index))}
          <View style={{ height: DIMS.playbackHeight + SPACING.xl }} />
        </ScrollView>
      )}
    </View>
  );
};

// Main HomeScreen Component
export const HomeScreen = () => {
  const navigation = useNavigation();
  const [refreshing, setRefreshing] = useState(false);
  const {
    fetchFeaturedSongs,
    fetchMadeForYouSongs,
    fetchTrendingSongs,
    fetchLikedSongs,
    madeForYouSongs,
    featuredSongs,
    trendingSongs,
    likedSongs,
    likedSongsLoading,
    likedSongsInitialized,
    error,
  } = useMusicStore();

  const { currentSong, setQueue, queue } =
    usePlayerStore();
  const { isOfflineMode, downloadedSongs } = useOfflineMusicStore();
  const { colors: themeColors } = useThemeStore();
  const { isAuthenticated } = useAuthStore();
  const { selectedServerId } = useBackendStore();

  // Track previous server to detect changes
  const prevServerRef = useRef(selectedServerId);

  const handleLogin = () => {
    navigation.dispatch(
      CommonActions.reset({
        index: 0,
        routes: [{ name: 'Landing' as never }],
      })
    );
  };

  // Local loading state for initial load - prevents flicker from parallel fetches
  const [initialLoading, setInitialLoading] = useState(true);
  const [hasFetchedOnce, setHasFetchedOnce] = useState(false);

  // Refetch when server changes or connection is restored
  useEffect(() => {
    // Skip fetching if in offline mode
    if (isOfflineMode) {
      setInitialLoading(false);
      return;
    }

    // Check if server changed
    const serverChanged = prevServerRef.current !== selectedServerId;
    if (serverChanged) {
      prevServerRef.current = selectedServerId;
      setInitialLoading(true); // Reset loading when server changes
      setHasFetchedOnce(false); // Allow refetch
    }

    // Don't refetch if we already fetched for this server (unless server changed)
    if (hasFetchedOnce && !serverChanged) {
      setInitialLoading(false);
      return;
    }

    // Timeout to ensure we don't get stuck in loading state
    const loadingTimeout = setTimeout(() => {
      if (initialLoading) {
        setInitialLoading(false);
      }
    }, 15000); // 15 second timeout

    const fetchSongs = async () => {
      try {
        await Promise.all([
          likedSongsInitialized ? Promise.resolve() : fetchLikedSongs(),
          fetchFeaturedSongs(),
          fetchMadeForYouSongs(),
          fetchTrendingSongs(),
        ]);
        setHasFetchedOnce(true);
      } catch (error) {
        console.error('Error fetching songs:', error);
      } finally {
        clearTimeout(loadingTimeout);
        setInitialLoading(false);
      }
    };
    
    fetchSongs();

    return () => clearTimeout(loadingTimeout);
  }, [isOfflineMode, selectedServerId]);

  useEffect(() => {
    // In offline mode, use downloaded songs for queue
    if (isOfflineMode && downloadedSongs.length > 0) {
      setQueue(downloadedSongs as any);
      return;
    }

    if (!initialLoading && !isOfflineMode) {
      const allSongs = [
        ...madeForYouSongs,
        ...featuredSongs,
        ...trendingSongs,
        ...likedSongs,
      ];
      const shouldSeedQueue =
        allSongs.length > 0 && !currentSong && queue.length === 0;
      if (shouldSeedQueue) {
        setQueue(allSongs);
      }
    }
  }, [
    initialLoading,
    madeForYouSongs,
    featuredSongs,
    trendingSongs,
    likedSongs,
    setQueue,
    currentSong,
    queue.length,
    isOfflineMode,
    downloadedSongs,
  ]);

  const onRefresh = async () => {
    if (isOfflineMode) return; // Don't refresh in offline mode
    setRefreshing(true);
    await Promise.all([
      fetchFeaturedSongs(),
      fetchMadeForYouSongs(),
      fetchTrendingSongs(),
      fetchLikedSongs(),
    ]);
    setRefreshing(false);
  };

  // Don't show error in offline mode
  if (error && !isOfflineMode) {
    return (
      <View
        style={[styles.errorContainer, { backgroundColor: COLORS.background }]}
      >
        <Text style={styles.errorTitle}>Error loading songs</Text>
        <Text style={styles.errorMessage}>{error}</Text>
        <TouchableOpacity
          style={[styles.retryButton, { backgroundColor: themeColors.primary }]}
          onPress={onRefresh}
        >
          <Text style={styles.retryText}>Retry</Text>
        </TouchableOpacity>
      </View>
    );
  }

  if (initialLoading && !refreshing && !isOfflineMode) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={themeColors.primary} />
      </View>
    );
  }

  // ============= OFFLINE MODE UI =============
  if (isOfflineMode) {
    return <OfflineModeView />;
  }
  // ============= END OFFLINE MODE UI =============

  return (
    <View style={styles.screenContainer}>
      <ProfileHeader/>
      <ScrollView
        style={styles.container}
        contentContainerStyle={styles.contentContainer}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            tintColor={themeColors.primary}
            colors={[themeColors.primary]}
          />
        }
      >
        <>
          {/* Login Banner for unauthenticated users */}
          {!isAuthenticated && (
            <LoginBanner themeColors={themeColors} onLogin={handleLogin} />
          )}

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
            isLoading={initialLoading && madeForYouSongs.length === 0}
          />

          {/* Trending Section */}
          <SectionGrid
            title="Trending"
            songs={trendingSongs}
            isLoading={initialLoading && trendingSongs.length === 0}
          />

          {/* Bottom spacing for playback controls */}
          <View style={{ height: DIMS.playbackHeight + SPACING.xl }} />
        </>
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  screenContainer: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
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
  // Offline Mode Styles
  offlineHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: SPACING.lg,
    paddingVertical: SPACING.md,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.zinc800,
  },
  offlineTitle: {
    fontSize: FONT_SIZES.xl,
    fontWeight: '700',
    color: COLORS.textPrimary,
  },
  offlineHeaderActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.md,
  },
  viewModeToggle: {
    flexDirection: 'row',
    backgroundColor: COLORS.zinc800,
    borderRadius: BORDER_RADIUS.md,
    padding: 2,
  },
  viewModeBtn: {
    padding: SPACING.sm,
    borderRadius: BORDER_RADIUS.sm,
  },
  viewModeBtnActive: {
    backgroundColor: COLORS.zinc700,
  },
  scanButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: SPACING.sm,
    marginHorizontal: SPACING.lg,
    marginTop: SPACING.md,
    paddingVertical: SPACING.md,
    backgroundColor: COLORS.zinc800,
    borderRadius: BORDER_RADIUS.lg,
    borderWidth: 1,
    borderColor: COLORS.primary,
  },
  scanButtonText: {
    color: COLORS.primary,
    fontSize: FONT_SIZES.md,
    fontWeight: '600',
  },
  offlineSongCount: {
    textAlign: 'center',
    color: COLORS.textMuted,
    fontSize: FONT_SIZES.sm,
    marginVertical: SPACING.md,
  },
  offlineEmpty: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: SPACING.xl,
  },
  offlineEmptyTitle: {
    fontSize: FONT_SIZES.lg,
    fontWeight: '600',
    color: COLORS.textPrimary,
    marginTop: SPACING.lg,
  },
  offlineEmptyText: {
    fontSize: FONT_SIZES.md,
    color: COLORS.textMuted,
    textAlign: 'center',
    marginTop: SPACING.sm,
  },
  offlineGridContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    paddingHorizontal: SPACING.md,
    gap: SPACING.md,
  },
  offlineGridItem: {
    width: CARD_WIDTH,
    backgroundColor: COLORS.backgroundCard,
    borderRadius: BORDER_RADIUS.lg,
    padding: SPACING.sm,
    marginBottom: SPACING.sm,
  },
  offlineGridItemActive: {
    borderWidth: 2,
    borderColor: COLORS.primary,
  },
  offlineGridImage: {
    width: '100%',
    aspectRatio: 1,
    borderRadius: BORDER_RADIUS.md,
    overflow: 'hidden',
    marginBottom: SPACING.sm,
  },
  offlineGridImageContent: {
    width: '100%',
    height: '100%',
  },
  offlineGridPlaceholder: {
    width: '100%',
    height: '100%',
    backgroundColor: COLORS.zinc700,
    alignItems: 'center',
    justifyContent: 'center',
  },
  offlinePlayOverlay: {
    position: 'absolute',
    bottom: 8,
    right: 8,
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: COLORS.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  offlineGridTitle: {
    fontSize: FONT_SIZES.md,
    fontWeight: '600',
    color: COLORS.textPrimary,
  },
  offlineGridArtist: {
    fontSize: FONT_SIZES.sm,
    color: COLORS.textMuted,
    marginTop: 2,
  },
  offlineListContainer: {
    paddingHorizontal: SPACING.lg,
  },
  offlineListItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: SPACING.md,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.zinc800,
  },
  offlineListItemActive: {
    backgroundColor: 'rgba(139, 92, 246, 0.1)',
    marginHorizontal: -SPACING.lg,
    paddingHorizontal: SPACING.lg,
    borderRadius: BORDER_RADIUS.md,
    borderBottomWidth: 0,
  },
  offlineListImage: {
    width: 56,
    height: 56,
    borderRadius: BORDER_RADIUS.md,
    overflow: 'hidden',
  },
  offlineListImageContent: {
    width: '100%',
    height: '100%',
  },
  offlineListPlaceholder: {
    width: '100%',
    height: '100%',
    backgroundColor: COLORS.zinc700,
    alignItems: 'center',
    justifyContent: 'center',
  },
  offlineListInfo: {
    flex: 1,
    marginLeft: SPACING.md,
  },
  offlineListTitle: {
    fontSize: FONT_SIZES.md,
    fontWeight: '600',
    color: COLORS.textPrimary,
  },
  offlineListArtist: {
    fontSize: FONT_SIZES.sm,
    color: COLORS.textMuted,
    marginTop: 2,
  },
  offlineListPlay: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: COLORS.zinc800,
    alignItems: 'center',
    justifyContent: 'center',
  },
  // Login Banner Styles
  loginBanner: {
    marginHorizontal: SPACING.lg,
    marginBottom: SPACING.lg,
    borderRadius: BORDER_RADIUS.lg,
    padding: SPACING.md,
    borderWidth: 1,
    borderColor: COLORS.zinc700,
  },
  loginBannerContent: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: SPACING.md,
  },
  loginBannerIcon: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: COLORS.zinc800,
    alignItems: 'center',
    justifyContent: 'center',
  },
  loginBannerText: {
    flex: 1,
    marginLeft: SPACING.md,
  },
  loginBannerTitle: {
    fontSize: FONT_SIZES.md,
    fontWeight: '600',
    color: COLORS.textPrimary,
  },
  loginBannerSubtitle: {
    fontSize: FONT_SIZES.sm,
    color: COLORS.textMuted,
    marginTop: 2,
  },
  loginBannerButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: SPACING.sm,
    paddingHorizontal: SPACING.lg,
    borderRadius: BORDER_RADIUS.md,
    gap: SPACING.xs,
  },
  loginBannerButtonText: {
    fontSize: FONT_SIZES.md,
    fontWeight: '600',
    color: '#fff',
  },
});
