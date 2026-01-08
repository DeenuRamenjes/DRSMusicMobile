import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Image,
  FlatList,
  ActivityIndicator,
  ScrollView,
  Dimensions,
} from 'react-native';
import LinearGradient from 'react-native-linear-gradient';
import { useNavigation, useRoute } from '@react-navigation/native';
import Icon from 'react-native-vector-icons/Feather';
import { COLORS, SPACING, FONT_SIZES, BORDER_RADIUS, DIMENSIONS as DIMS } from '../constants/theme';
import { useMusicStore } from '../store/useMusicStore';
import { usePlayerStore } from '../store/usePlayerStore';
import { useThemeStore } from '../store/useThemeStore';
import { Song, Album } from '../types';
import { getFullImageUrl } from '../config';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

const formatDuration = (duration: number) => {
  const minutes = Math.floor(duration / 60);
  const seconds = duration % 60;
  return `${minutes}:${seconds < 10 ? '0' : ''}${seconds}`;
};

// Album Card Component
const AlbumCard = ({ album, onPress }: { album: Album; onPress: () => void }) => {
  const { currentSong, isPlaying } = usePlayerStore();
  const { colors: themeColors, dimensions: themeDimensions, compactMode } = useThemeStore();
  const isCurrentAlbumPlaying = album.songs?.some(s => s._id === currentSong?._id) && isPlaying;

  return (
    <TouchableOpacity
      style={styles.albumCard}
      onPress={onPress}
      activeOpacity={0.8}
    >
      <View style={styles.albumImageContainer}>
        <Image
          source={{ uri: getFullImageUrl(album.imageUrl) }}
          style={styles.albumImage}
        />
        <View style={[styles.albumPlayButton, { backgroundColor: themeColors.primary }]}>
          <Icon
            name={isCurrentAlbumPlaying ? 'pause' : 'play'}
            size={16}
            color="#fff"
            style={!isCurrentAlbumPlaying && { marginLeft: 2 }}
          />
        </View>
      </View>
      <Text style={styles.albumTitle} numberOfLines={1}>{album.title}</Text>
      <Text style={styles.albumArtist} numberOfLines={1}>{album.artist}</Text>
    </TouchableOpacity>
  );
};

// Album Detail View
const AlbumDetail = ({ album, onBack }: { album: Album; onBack: () => void }) => {
  const { currentSong, isPlaying, playAlbum, pauseSong } = usePlayerStore();
  const { fetchAlbumById, currentAlbum, isLoading } = useMusicStore();
  const { colors: themeColors } = useThemeStore();

  const SONGS_PER_PAGE = 14;

  useEffect(() => {
    fetchAlbumById(album._id, 1, SONGS_PER_PAGE);
  }, [album._id]);

  const { isLoadingMoreAlbumSongs, hasMoreAlbumSongs, currentAlbumPage } = useMusicStore();

  const handleLoadMore = () => {
    if (hasMoreAlbumSongs && !isLoading && !isLoadingMoreAlbumSongs) {
      fetchAlbumById(album._id, currentAlbumPage + 1, SONGS_PER_PAGE);
    }
  };

  const renderFooter = () => {
    if (!isLoadingMoreAlbumSongs) return null;
    return (
      <View style={styles.footerLoader}>
        <ActivityIndicator size="small" color={themeColors.primary} />
      </View>
    );
  };

  const displayAlbum = currentAlbum || album;

  const handlePlaySong = (index: number) => {
    if (!displayAlbum?.songs) return;
    playAlbum(displayAlbum.songs, index);
  };

  const handlePlayAlbum = () => {
    if (!displayAlbum?.songs) return;

    const currentIndex = displayAlbum.songs.findIndex((song) => song._id === currentSong?._id);
    if (currentIndex !== -1) {
      if (isPlaying) {
        pauseSong();
      } else {
        playAlbum(displayAlbum.songs, currentIndex);
      }
    } else {
      playAlbum(displayAlbum.songs, 0);
    }
  };

  const isCurrentAlbumPlaying = displayAlbum?.songs?.some(s => s._id === currentSong?._id) && isPlaying;

  if (isLoading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={themeColors.primary} />
      </View>
    );
  }

  const renderHeader = () => (
    <View style={styles.detailContent}>
      {/* Album Header */}
      <View style={styles.detailHeader}>
        <TouchableOpacity onPress={onBack} style={styles.backButton}>
          <Icon name="chevron-left" size={24} color={COLORS.textPrimary} />
        </TouchableOpacity>
      </View>

      {/* Album Info */}
      <View style={styles.albumInfoSection}>
        <Image
          source={{ uri: getFullImageUrl(displayAlbum?.imageUrl || '') }}
          style={styles.detailAlbumImage}
        />
        <Text style={styles.detailAlbumTitle}>{displayAlbum?.title}</Text>
        <Text style={styles.detailAlbumArtist}>
          {displayAlbum?.artist} • {displayAlbum?.totalSongs || displayAlbum?.songs?.length || 0} songs • {displayAlbum?.releaseYear}
        </Text>
      </View>

      {/* Play Button */}
      <View style={styles.playButtonContainer}>
        <TouchableOpacity
          style={[styles.mainPlayButton, { backgroundColor: themeColors.primary }]}
          onPress={handlePlayAlbum}
          activeOpacity={0.8}
        >
          <Icon
            name={isCurrentAlbumPlaying ? 'pause' : 'play'}
            size={28}
            color={COLORS.background}
            style={!isCurrentAlbumPlaying && { marginLeft: 3 }}
          />
        </TouchableOpacity>
      </View>

      {/* Table Header */}
      <View style={styles.songsHeader}>
        <Text style={styles.headerNumber}>#</Text>
        <Text style={styles.songsHeaderTitle}>Title</Text>
        <Text style={styles.songsHeaderDuration}>⏱</Text>
      </View>
    </View>
  );

  const renderSongItem = ({ item: song, index }: { item: Song; index: number }) => {
    const isCurrentSong = currentSong?._id === song._id;

    return (
      <TouchableOpacity
        style={styles.songRow}
        onPress={() => handlePlaySong(index)}
        activeOpacity={0.7}
      >
        <View style={styles.songNumber}>
          {isCurrentSong && isPlaying ? (
            <Text style={[styles.playingNote, { color: themeColors.primary }]}>♫</Text>
          ) : (
            <Text style={styles.songNumberText}>{index + 1}</Text>
          )}
        </View>
        <View style={styles.songInfo}>
          <Image
            source={{ uri: getFullImageUrl(song.imageUrl) }}
            style={styles.songImage}
          />
          <View style={styles.songTextContainer}>
            <Text
              style={[styles.songTitle, isCurrentSong && { color: themeColors.primary }]}
              numberOfLines={1}
            >
              {song.title}
            </Text>
            <Text style={styles.songArtist} numberOfLines={1}>
              {song.artist}
            </Text>
            {song.isLiked && (
              <View style={styles.likedIndicator}>
                <Text style={styles.likedIcon}>❤️</Text>
              </View>
            )}
          </View>
        </View>
        <Text style={styles.songDuration}>{formatDuration(song.duration)}</Text>
      </TouchableOpacity>
    );
  };

  return (
    <View style={styles.detailContainer}>
      {/* Background Gradient */}
      <LinearGradient
        colors={[`${themeColors.primary}CC`, 'rgba(0, 0, 0, 0.8)', COLORS.background]}
        style={styles.detailGradient}
      />

      <FlatList
        style={styles.detailScroll}
        data={displayAlbum?.songs || []}
        renderItem={renderSongItem}
        keyExtractor={(item, index) => `${item._id}-${index}`}
        ListHeaderComponent={renderHeader}
        ListFooterComponent={() => (
          <>
            {renderFooter()}
            <View style={{ height: DIMS.playbackHeight + SPACING.xxl }} />
          </>
        )}
        onEndReached={handleLoadMore}
        onEndReachedThreshold={0.5}
        showsVerticalScrollIndicator={false}
      />
    </View>
  );
};

// Main Albums Screen
export const AlbumsScreen = () => {
  const navigation = useNavigation();
  const { albums, isLoading, fetchAlbums, pendingAlbumId, clearPendingAlbumId } = useMusicStore();
  const { colors: themeColors } = useThemeStore();
  const [selectedAlbum, setSelectedAlbum] = useState<Album | null>(null);

  useEffect(() => {
    fetchAlbums();
  }, []);

  // Handle pending album navigation from sidebar
  useEffect(() => {
    if (pendingAlbumId && albums.length > 0) {
      const album = albums.find(a => a._id === pendingAlbumId);
      if (album) {
        setSelectedAlbum(album);
        clearPendingAlbumId();
      }
    }
  }, [pendingAlbumId, albums]);

  const handleAlbumPress = (album: Album) => {
    setSelectedAlbum(album);
  };

  const handleBack = () => {
    setSelectedAlbum(null);
  };

  // Show album detail if an album is selected
  if (selectedAlbum) {
    return <AlbumDetail album={selectedAlbum} onBack={handleBack} />;
  }

  if (isLoading) {
    return (
      <View style={styles.container}>
        <View style={styles.header}>
          <Text style={styles.headerTitle}>Albums</Text>
        </View>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={themeColors.primary} />
        </View>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {/* Hero Header */}
      <View style={styles.heroContainer}>
        <LinearGradient
          colors={[`${themeColors.primary}33`, `${themeColors.primary}1A`, 'transparent']}
          style={styles.heroGradient}
        />
        <View style={styles.header}>
          <Text style={styles.headerTitle}>Albums</Text>
          <Text style={styles.albumCount}>{albums.length} albums</Text>
        </View>
      </View>

      {/* Albums Grid */}
      <FlatList
        data={albums}
        renderItem={({ item }) => (
          <AlbumCard album={item} onPress={() => handleAlbumPress(item)} />
        )}
        keyExtractor={(item) => item._id}
        numColumns={2}
        contentContainerStyle={styles.albumsGrid}
        columnWrapperStyle={styles.gridRow}
        showsVerticalScrollIndicator={false}
      />
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
    backgroundColor: COLORS.background,
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
  header: {
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
  albumCount: {
    fontSize: FONT_SIZES.md,
    color: COLORS.textMuted,
  },

  // Albums Grid
  albumsGrid: {
    paddingHorizontal: SPACING.lg,
    paddingBottom: DIMS.playbackHeight + SPACING.xxl,
  },
  gridRow: {
    justifyContent: 'space-between',
  },

  // Album Card
  albumCard: {
    width: (SCREEN_WIDTH - SPACING.lg * 2 - SPACING.md) / 2,
    marginBottom: SPACING.lg,
    backgroundColor: 'rgba(39, 39, 42, 0.3)',
    borderRadius: BORDER_RADIUS.xl,
    padding: SPACING.md,
  },
  albumImageContainer: {
    position: 'relative',
    marginBottom: SPACING.md,
  },
  albumImage: {
    width: '100%',
    aspectRatio: 1,
    borderRadius: BORDER_RADIUS.lg,
  },
  albumPlayButton: {
    position: 'absolute',
    bottom: SPACING.sm,
    right: SPACING.sm,
    width: 36,
    height: 36,
    borderRadius: 18,
    justifyContent: 'center',
    alignItems: 'center',
    opacity: 0.95,
  },
  albumTitle: {
    fontSize: FONT_SIZES.md,
    fontWeight: '600',
    color: COLORS.textPrimary,
    marginBottom: 2,
  },
  albumArtist: {
    fontSize: FONT_SIZES.sm,
    color: COLORS.textMuted,
  },

  // Album Detail
  detailContainer: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  detailScroll: {
    flex: 1,
  },
  detailGradient: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    height: 150,
  },
  detailContent: {
    position: 'relative',
  },
  detailHeader: {
    paddingHorizontal: SPACING.lg,
    paddingTop: SPACING.lg,
  },
  backButton: {
    width: 30,
    height: 30,
    justifyContent: 'center',
    alignItems: 'center',
  },
  backIcon: {
    fontSize: 12,
    color: COLORS.textPrimary,
  },

  // Album Info
  albumInfoSection: {
    alignItems: 'center',
    paddingHorizontal: SPACING.lg,
    paddingTop: SPACING.xl,
    paddingBottom: SPACING.xl,
  },
  detailAlbumImage: {
    width: SCREEN_WIDTH - SPACING.lg * 4,
    aspectRatio: 1,
    borderRadius: BORDER_RADIUS.xxxl || 24,
  },
  detailAlbumTitle: {
    fontSize: 36,
    fontWeight: 'bold',
    color: COLORS.textPrimary,
    textAlign: 'center',
    marginTop: SPACING.lg,
  },
  detailAlbumMeta: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: SPACING.sm,
    gap: SPACING.sm,
  },
  detailAlbumArtist: {
    fontSize: FONT_SIZES.md,
    fontWeight: '500',
    color: COLORS.textPrimary,
  },
  detailMetaSeparator: {
    fontSize: FONT_SIZES.md,
    color: COLORS.textMuted,
  },
  detailAlbumInfo: {
    fontSize: FONT_SIZES.md,
    color: COLORS.textMuted,
  },

  // Play Button
  playButtonContainer: {
    flexDirection: 'row',
    paddingHorizontal: SPACING.lg,
    paddingBottom: SPACING.lg,
  },
  mainPlayButton: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: COLORS.primary,
    justifyContent: 'center',
    alignItems: 'center',
  },
  mainPlayIcon: {
    fontSize: 28,
    color: COLORS.background,
    marginLeft: 2,
  },

  // Songs Container
  songsContainer: {
    backgroundColor: 'rgba(0, 0, 0, 0.2)',
  },
  songsHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: SPACING.xl,
    paddingVertical: SPACING.md,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255, 255, 255, 0.05)',
  },
  headerNumber: {
    width: 32,
    fontSize: FONT_SIZES.sm,
    color: COLORS.textMuted,
    textAlign: 'center',
  },
  songsHeaderTitle: {
    flex: 1,
    fontSize: FONT_SIZES.sm,
    color: COLORS.textMuted,
    textTransform: 'uppercase',
  },
  songsHeaderDuration: {
    width: 40,
    fontSize: FONT_SIZES.sm,
    color: COLORS.textMuted,
    textAlign: 'center',
  },
  songRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: SPACING.lg,
    paddingVertical: SPACING.md,
  },
  songNumber: {
    width: 32,
    alignItems: 'center',
    justifyContent: 'center',
  },
  songNumberText: {
    fontSize: FONT_SIZES.md,
    color: COLORS.textMuted,
  },
  playingNote: {
    fontSize: 16,
    color: COLORS.primary,
  },
  songInfo: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.md,
    minWidth: 0,
  },
  songImage: {
    width: 40,
    height: 40,
    borderRadius: BORDER_RADIUS.sm,
  },
  songTextContainer: {
    flex: 1,
    minWidth: 0,
    position: 'relative',
  },
  songTitle: {
    fontSize: FONT_SIZES.md,
    fontWeight: '500',
    color: COLORS.textPrimary,
  },
  songTitleActive: {
    color: COLORS.primary,
  },
  songArtist: {
    fontSize: FONT_SIZES.sm,
    color: COLORS.textMuted,
    marginTop: 2,
  },
  likedIndicator: {
    position: 'absolute',
    top: -8,
    left: -16,
  },
  likedIcon: {
    fontSize: 12,
  },
  songDuration: {
    fontSize: FONT_SIZES.md,
    color: COLORS.textMuted,
    marginLeft: SPACING.md,
  },
  footerLoader: {
    paddingVertical: SPACING.lg,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
