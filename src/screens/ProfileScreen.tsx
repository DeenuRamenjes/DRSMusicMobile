import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Image,
  TouchableOpacity,
  ActivityIndicator,
} from 'react-native';
import LinearGradient from 'react-native-linear-gradient';
import { useNavigation } from '@react-navigation/native';
import { COLORS, SPACING, FONT_SIZES, BORDER_RADIUS, DIMENSIONS } from '../constants/theme';
import { useMusicStore } from '../store/useMusicStore';
import { usePlayerStore } from '../store/usePlayerStore';
import { useAuthStore } from '../store/useAuthStore';
import { Song } from '../types';

// Helper to get full image URL
const getFullImageUrl = (imageUrl: string) => {
  if (!imageUrl) return '';
  if (imageUrl.startsWith('http')) return imageUrl;
  return `http://192.168.1.40:5000${imageUrl}`;
};

// Stat Card Component
const StatCard = ({ 
  icon, 
  value, 
  label, 
  color 
}: { 
  icon: string; 
  value: string | number; 
  label: string; 
  color: string;
}) => {
  const colorStyles: Record<string, { gradient: string[] }> = {
    emerald: { gradient: ['rgba(16, 185, 129, 0.2)', 'rgba(5, 150, 105, 0.05)'] },
    blue: { gradient: ['rgba(59, 130, 246, 0.2)', 'rgba(37, 99, 235, 0.05)'] },
    pink: { gradient: ['rgba(236, 72, 153, 0.2)', 'rgba(219, 39, 119, 0.05)'] },
    purple: { gradient: ['rgba(168, 85, 247, 0.2)', 'rgba(139, 92, 246, 0.05)'] },
  };

  const textColors: Record<string, string> = {
    emerald: '#34d399',
    blue: '#60a5fa',
    pink: '#f472b6',
    purple: '#c084fc',
  };

  return (
    <LinearGradient
      colors={colorStyles[color]?.gradient || colorStyles.emerald.gradient}
      style={styles.statCard}
    >
      <View style={styles.statContent}>
        <Text style={styles.statIcon}>{icon}</Text>
        <Text style={[styles.statValue, { color: textColors[color] || textColors.emerald }]}>
          {value}
        </Text>
      </View>
      <Text style={styles.statLabel}>{label}</Text>
    </LinearGradient>
  );
};

export const ProfileScreen = () => {
  const navigation = useNavigation();
  const { albums, likedSongs, likedSongsLoading, likedSongsInitialized, fetchLikedSongs } = useMusicStore();
  const { currentSong, isPlaying, playSong, pauseSong } = usePlayerStore();
  const { user, isAuthenticated } = useAuthStore();
  
  const [stats, setStats] = useState({
    totalSongs: 0,
    totalAlbums: 0,
    likedCount: 0,
    listeningTime: 0,
  });

  useEffect(() => {
    if (!likedSongsInitialized && !likedSongsLoading) {
      fetchLikedSongs();
    }
  }, [likedSongsInitialized, likedSongsLoading]);

  useEffect(() => {
    let totalListeningMinutes = 0;
    likedSongs.forEach(song => {
      if (song.duration) {
        totalListeningMinutes += Math.floor(song.duration / 60);
      }
    });
    
    setStats({
      totalSongs: albums.reduce((acc, album) => acc + (album.songs?.length || 0), 0),
      totalAlbums: albums.length,
      likedCount: likedSongs.length,
      listeningTime: totalListeningMinutes,
    });
  }, [albums, likedSongs]);

  const handlePlaySong = (song: Song) => {
    if (currentSong?._id === song._id) {
      if (isPlaying) pauseSong();
      else playSong(song);
    } else {
      playSong(song);
    }
  };

  if (!isAuthenticated || !user) {
    return (
      <View style={styles.notSignedInContainer}>
        <View style={styles.placeholderAvatar}>
          <Text style={styles.placeholderAvatarIcon}>👤</Text>
        </View>
        <Text style={styles.notSignedInText}>Please sign in to view your profile</Text>
      </View>
    );
  }

  return (
    <ScrollView 
      style={styles.container}
      contentContainerStyle={styles.contentContainer}
      showsVerticalScrollIndicator={false}
    >
      {/* Hero Section with Profile */}
      <View style={styles.heroSection}>
        {/* Gradient Background */}
        <LinearGradient
          colors={['rgba(16, 185, 129, 0.3)', 'rgba(6, 78, 59, 0.2)', 'transparent']}
          style={styles.heroGradient}
        />
        
        {/* Profile Header */}
        <View style={styles.profileHeader}>
          {/* Avatar */}
          <View style={styles.avatarContainer}>
            <View style={styles.avatarRing}>
              {user.imageUrl ? (
                <Image
                  source={{ uri: user.imageUrl }}
                  style={styles.avatar}
                />
              ) : (
                <View style={[styles.avatar, styles.avatarPlaceholder]}>
                  <Text style={styles.avatarIcon}>👤</Text>
                </View>
              )}
            </View>
            {/* Online Status */}
            <View style={styles.onlineIndicator} />
          </View>

          {/* Profile Info */}
          <View style={styles.profileInfo}>
            <Text style={styles.profileLabel}>Profile</Text>
            <Text style={styles.profileName}>{user.fullName || user.username || 'Music Lover'}</Text>
            <View style={styles.profileMeta}>
              <View style={styles.metaItem}>
                <Text style={styles.metaIcon}>✉️</Text>
                <Text style={styles.metaText}>{user.emailAddress}</Text>
              </View>
              <View style={styles.metaItem}>
                <Text style={styles.metaIcon}>📅</Text>
                <Text style={styles.metaText}>
                  Joined {new Date(user.createdAt || Date.now()).toLocaleDateString('en-US', { month: 'short', year: 'numeric' })}
                </Text>
              </View>

            </View>
          </View>
        </View>

        {/* Stats Cards */}
        <View style={styles.statsGrid}>
          <StatCard icon="🎵" value={stats.totalSongs} label="Songs" color="emerald" />
          <StatCard icon="💿" value={stats.totalAlbums} label="Albums" color="blue" />
          <StatCard icon="❤️" value={stats.likedCount} label="Liked" color="pink" />
          <StatCard icon="⏱" value={`${stats.listeningTime}m`} label="Listen Time" color="purple" />
        </View>
      </View>

      {/* Currently Playing */}
      {currentSong && (
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionIcon}>📈</Text>
            <Text style={styles.sectionTitle}>Now Playing</Text>
          </View>
          <View style={styles.nowPlayingCard}>
            <TouchableOpacity
              style={styles.nowPlayingContent}
              onPress={() => handlePlaySong(currentSong)}
              activeOpacity={0.8}
            >
              <View style={styles.nowPlayingImageContainer}>
                <Image
                  source={{ uri: getFullImageUrl(currentSong.imageUrl) }}
                  style={styles.nowPlayingImage}
                />
                <View style={styles.nowPlayingOverlay}>
                  <Text style={styles.nowPlayingPlayIcon}>
                    {isPlaying ? '⏸' : '▶'}
                  </Text>
                </View>
              </View>
              <View style={styles.nowPlayingInfo}>
                <Text style={styles.nowPlayingTitle} numberOfLines={1}>
                  {currentSong.title}
                </Text>
                <Text style={styles.nowPlayingArtist} numberOfLines={1}>
                  {currentSong.artist}
                </Text>
                {isPlaying && (
                  <View style={styles.playingStatus}>
                    <View style={styles.playingBars}>
                      <View style={[styles.playingBar, { height: 16 }]} />
                      <View style={[styles.playingBar, { height: 12 }]} />
                      <View style={[styles.playingBar, { height: 20 }]} />
                    </View>
                    <Text style={styles.playingText}>Playing</Text>
                  </View>
                )}
              </View>
            </TouchableOpacity>
          </View>
        </View>
      )}

      {/* Liked Songs */}
      <View style={styles.section}>
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionIcon}>❤️</Text>
          <Text style={styles.sectionTitle}>Liked Songs</Text>
          {likedSongs.length > 4 && (
            <TouchableOpacity>
              <Text style={styles.seeAllText}>See all</Text>
            </TouchableOpacity>
          )}
        </View>
        
        {likedSongs.length === 0 ? (
          <View style={styles.emptyState}>
            <Text style={styles.emptyIcon}>❤️</Text>
            <Text style={styles.emptyTitle}>No liked songs yet</Text>
            <Text style={styles.emptySubtitle}>Songs you like will appear here</Text>
          </View>
        ) : (
          <View style={styles.likedSongsGrid}>
            {likedSongs.slice(0, 4).map((song) => (
              <TouchableOpacity
                key={song._id}
                style={styles.likedSongItem}
                onPress={() => handlePlaySong(song)}
                activeOpacity={0.7}
              >
                <View style={styles.likedSongImageContainer}>
                  <Image
                    source={{ uri: getFullImageUrl(song.imageUrl) }}
                    style={styles.likedSongImage}
                  />
                  <View style={styles.likedSongOverlay}>
                    <Text style={styles.likedSongPlayIcon}>
                      {currentSong?._id === song._id && isPlaying ? '⏸' : '▶'}
                    </Text>
                  </View>
                </View>
                <View style={styles.likedSongInfo}>
                  <Text
                    style={[
                      styles.likedSongTitle,
                      currentSong?._id === song._id && styles.likedSongTitleActive,
                    ]}
                    numberOfLines={1}
                  >
                    {song.title}
                  </Text>
                  <Text style={styles.likedSongArtist} numberOfLines={1}>
                    {song.artist}
                  </Text>
                </View>
                {currentSong?._id === song._id && isPlaying && (
                  <View style={styles.likedSongPlaying}>
                    <View style={[styles.smallBar, { height: 12 }]} />
                    <View style={[styles.smallBar, { height: 8 }]} />
                    <View style={[styles.smallBar, { height: 12 }]} />
                  </View>
                )}
              </TouchableOpacity>
            ))}
          </View>
        )}
      </View>

      {/* Your Library */}
      <View style={styles.section}>
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionIcon}>💿</Text>
          <Text style={styles.sectionTitle}>Your Library</Text>
          <TouchableOpacity onPress={() => navigation.navigate('Home' as never)}>
            <Text style={styles.seeAllText}>Browse all</Text>
          </TouchableOpacity>
        </View>
        
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.libraryScrollContent}
        >
          {albums.slice(0, 5).map((album) => (
            <TouchableOpacity
              key={album._id}
              style={styles.libraryCard}
              activeOpacity={0.8}
            >
              <View style={styles.libraryImageContainer}>
                <Image
                  source={{ uri: getFullImageUrl(album.imageUrl) }}
                  style={styles.libraryImage}
                />
                <View style={styles.libraryPlayButton}>
                  <Text style={styles.libraryPlayIcon}>▶</Text>
                </View>
              </View>
              <Text style={styles.libraryTitle} numberOfLines={1}>{album.title}</Text>
              <Text style={styles.libraryArtist} numberOfLines={1}>{album.artist}</Text>
            </TouchableOpacity>
          ))}
        </ScrollView>
      </View>

      {/* Bottom spacing */}
      <View style={{ height: DIMENSIONS.playbackHeight + SPACING.xxl }} />
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  contentContainer: {
    paddingBottom: SPACING.xxl,
  },
  notSignedInContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: COLORS.background,
  },
  placeholderAvatar: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: COLORS.zinc800,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: SPACING.lg,
  },
  placeholderAvatarIcon: {
    fontSize: 40,
  },
  notSignedInText: {
    fontSize: FONT_SIZES.md,
    color: COLORS.textMuted,
  },

  // Hero Section
  heroSection: {
    position: 'relative',
    paddingBottom: SPACING.xl,
  },
  heroGradient: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    height: 320,
  },

  // Profile Header
  profileHeader: {
    alignItems: 'center',
    paddingHorizontal: SPACING.lg,
    paddingTop: SPACING.xl,
    marginBottom: SPACING.xl,
  },
  avatarContainer: {
    position: 'relative',
    marginBottom: SPACING.lg,
  },
  avatarRing: {
    width: 144,
    height: 144,
    borderRadius: 72,
    borderWidth: 4,
    borderColor: 'rgba(255, 255, 255, 0.1)',
    overflow: 'hidden',
  },
  avatar: {
    width: '100%',
    height: '100%',
  },
  avatarPlaceholder: {
    backgroundColor: COLORS.zinc800,
    justifyContent: 'center',
    alignItems: 'center',
  },
  avatarIcon: {
    fontSize: 64,
  },
  onlineIndicator: {
    position: 'absolute',
    bottom: 8,
    right: 8,
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: COLORS.primary,
    borderWidth: 4,
    borderColor: COLORS.background,
  },
  profileInfo: {
    alignItems: 'center',
  },
  profileLabel: {
    fontSize: FONT_SIZES.sm,
    fontWeight: '500',
    color: COLORS.textMuted,
    textTransform: 'uppercase',
    letterSpacing: 1,
    marginBottom: SPACING.xs,
  },
  profileName: {
    fontSize: FONT_SIZES.display,
    fontWeight: 'bold',
    color: COLORS.textPrimary,
    marginBottom: SPACING.md,
    textAlign: 'center',
  },
  profileMeta: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'center',
    gap: SPACING.lg,
  },
  metaItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.xs,
  },
  metaIcon: {
    fontSize: 14,
  },
  metaText: {
    fontSize: FONT_SIZES.md,
    color: COLORS.textMuted,
  },


  // Stats Grid
  statsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    paddingHorizontal: SPACING.lg,
    gap: SPACING.md,
  },
  statCard: {
    width: '47%',
    borderRadius: BORDER_RADIUS.xxl,
    padding: SPACING.lg,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.05)',
  },
  statContent: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.sm,
    marginBottom: SPACING.xs,
  },
  statIcon: {
    fontSize: 20,
  },
  statValue: {
    fontSize: FONT_SIZES.heading,
    fontWeight: 'bold',
    color: COLORS.textPrimary,
  },
  statLabel: {
    fontSize: FONT_SIZES.md,
    color: COLORS.textMuted,
  },

  // Sections
  section: {
    paddingHorizontal: SPACING.lg,
    marginTop: SPACING.xxl,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: SPACING.lg,
    gap: SPACING.sm,
  },
  sectionIcon: {
    fontSize: 20,
  },
  sectionTitle: {
    flex: 1,
    fontSize: FONT_SIZES.xl,
    fontWeight: 'bold',
    color: COLORS.textPrimary,
  },
  seeAllText: {
    fontSize: FONT_SIZES.md,
    color: COLORS.textMuted,
  },

  // Now Playing
  nowPlayingCard: {
    backgroundColor: 'rgba(39, 39, 42, 0.8)',
    borderRadius: BORDER_RADIUS.xxl,
    padding: SPACING.lg,
    borderWidth: 1,
    borderColor: 'rgba(63, 63, 70, 0.3)',
  },
  nowPlayingContent: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.lg,
  },
  nowPlayingImageContainer: {
    position: 'relative',
  },
  nowPlayingImage: {
    width: 96,
    height: 96,
    borderRadius: BORDER_RADIUS.xl,
  },
  nowPlayingOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.4)',
    borderRadius: BORDER_RADIUS.xl,
    justifyContent: 'center',
    alignItems: 'center',
    opacity: 0,
  },
  nowPlayingPlayIcon: {
    fontSize: 36,
    color: COLORS.textPrimary,
  },
  nowPlayingInfo: {
    flex: 1,
    minWidth: 0,
  },
  nowPlayingTitle: {
    fontSize: FONT_SIZES.xl,
    fontWeight: '600',
    color: COLORS.textPrimary,
  },
  nowPlayingArtist: {
    fontSize: FONT_SIZES.md,
    color: COLORS.textMuted,
    marginTop: 4,
  },
  playingStatus: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.sm,
    marginTop: SPACING.sm,
  },
  playingBars: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    gap: 2,
  },
  playingBar: {
    width: 4,
    backgroundColor: COLORS.primary,
    borderRadius: 2,
  },
  playingText: {
    fontSize: FONT_SIZES.md,
    fontWeight: '500',
    color: COLORS.primary,
  },

  // Empty State
  emptyState: {
    alignItems: 'center',
    paddingVertical: SPACING.huge,
  },
  emptyIcon: {
    fontSize: 48,
    opacity: 0.3,
    marginBottom: SPACING.md,
  },
  emptyTitle: {
    fontSize: FONT_SIZES.lg,
    fontWeight: '500',
    color: COLORS.textPrimary,
    marginBottom: SPACING.xs,
  },
  emptySubtitle: {
    fontSize: FONT_SIZES.md,
    color: COLORS.textMuted,
  },

  // Liked Songs Grid
  likedSongsGrid: {
    gap: SPACING.sm,
  },
  likedSongItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.md,
    padding: SPACING.md,
    borderRadius: BORDER_RADIUS.xl,
    backgroundColor: 'rgba(39, 39, 42, 0.3)',
  },
  likedSongImageContainer: {
    position: 'relative',
  },
  likedSongImage: {
    width: 48,
    height: 48,
    borderRadius: BORDER_RADIUS.lg,
  },
  likedSongOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    borderRadius: BORDER_RADIUS.lg,
    justifyContent: 'center',
    alignItems: 'center',
    opacity: 0,
  },
  likedSongPlayIcon: {
    fontSize: 20,
    color: COLORS.textPrimary,
  },
  likedSongInfo: {
    flex: 1,
    minWidth: 0,
  },
  likedSongTitle: {
    fontSize: FONT_SIZES.md,
    fontWeight: '500',
    color: COLORS.textPrimary,
  },
  likedSongTitleActive: {
    color: COLORS.primary,
  },
  likedSongArtist: {
    fontSize: FONT_SIZES.sm,
    color: COLORS.textMuted,
    marginTop: 2,
  },
  likedSongPlaying: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    gap: 2,
  },
  smallBar: {
    width: 2,
    backgroundColor: COLORS.primary,
    borderRadius: 1,
  },

  // Library
  libraryScrollContent: {
    gap: SPACING.md,
    paddingRight: SPACING.lg,
  },
  libraryCard: {
    width: 140,
    backgroundColor: 'rgba(39, 39, 42, 0.3)',
    borderRadius: BORDER_RADIUS.xl,
    padding: SPACING.md,
  },
  libraryImageContainer: {
    position: 'relative',
    marginBottom: SPACING.md,
  },
  libraryImage: {
    width: '100%',
    aspectRatio: 1,
    borderRadius: BORDER_RADIUS.lg,
  },
  libraryPlayButton: {
    position: 'absolute',
    bottom: SPACING.sm,
    right: SPACING.sm,
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: COLORS.primary,
    justifyContent: 'center',
    alignItems: 'center',
    opacity: 0,
  },
  libraryPlayIcon: {
    fontSize: 18,
    color: COLORS.background,
    marginLeft: 2,
  },
  libraryTitle: {
    fontSize: FONT_SIZES.md,
    fontWeight: '600',
    color: COLORS.textPrimary,
  },
  libraryArtist: {
    fontSize: FONT_SIZES.sm,
    color: COLORS.textMuted,
    marginTop: 2,
  },
});
