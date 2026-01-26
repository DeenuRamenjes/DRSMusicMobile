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
import Icon from 'react-native-vector-icons/Feather';
import { COLORS, SPACING, FONT_SIZES, BORDER_RADIUS, DIMENSIONS } from '../constants/theme';
import { useMusicStore } from '../store/useMusicStore';
import { usePlayerStore } from '../store/usePlayerStore';
import { useAuthStore } from '../store/useAuthStore';
import { useThemeStore } from '../store/useThemeStore';
import { Song, User } from '../types';
import { getFullImageUrl } from '../config';
import axiosInstance from '../api/axios';
import { useRoute, RouteProp } from '@react-navigation/native';

type ProfileRouteParams = {
  Profile: {
    userId?: string;
    userData?: Partial<User>;
  };
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
  const route = useRoute<RouteProp<ProfileRouteParams, 'Profile'>>();
  const { userId: paramUserId, userData: paramUserData } = route.params || {};

  const { albums, likedSongs, likedSongsLoading, likedSongsInitialized, fetchLikedSongs } = useMusicStore();
  const { currentSong, isPlaying, playSong, pauseSong, totalListeningTime, loadListeningTime } = usePlayerStore();
  const { user: authUser, isAuthenticated } = useAuthStore();
  const { colors: themeColors } = useThemeStore();

  const [isAdmin, setIsAdmin] = useState(false);
  const [profileUser, setProfileUser] = useState<Partial<User> | null>(paramUserData || null);
  const [isFetchingProfile, setIsFetchingProfile] = useState(false);
  const [isOwnProfile, setIsOwnProfile] = useState(true);
  const [friendLikedSongs, setFriendLikedSongs] = useState<Song[]>([]);

  const [stats, setStats] = useState({
    totalSongs: 0,
    totalAlbums: 0,
    likedCount: 0,
    totalAppUseTime: 0,
    totalListeningTime: 0,
  });



  useEffect(() => {
    const isMe = !paramUserId || paramUserId === authUser?.googleId || paramUserId === authUser?.id;
    setIsOwnProfile(isMe);

    if (isMe) {
      setProfileUser(authUser);
      const checkAdminStatus = async () => {
        if (!authUser) {
          setIsAdmin(false);
          return;
        }
        try {
          await axiosInstance.get('/admin/check');
          setIsAdmin(true);
        } catch (error) {
          setIsAdmin(false);
        }
      };
      checkAdminStatus();
    } else if (paramUserId) {
      fetchUserProfile(paramUserId);
    }
  }, [paramUserId, authUser]);

  const fetchUserProfile = async (id: string) => {
    setIsFetchingProfile(true);
    try {
      const response = await axiosInstance.get(`/users/${id}`);
      const userData = response.data;
      setProfileUser(userData);

      // Update stats from the fetched user data
      if (userData.stats) {
        setStats(prev => ({
          ...prev,
          likedCount: userData.stats.likedCount || 0,
          totalAppUseTime: userData.stats.totalAppUseTime || 0,
          totalListeningTime: userData.stats.totalListeningTime || 0
        }));
      }

      // If the backend returns likedSongs as actual objects, use them
      // NOTE: Based on backend controller, it returns public profile data
      // If we want songs to show, we might need the backend to populate them or handle them separately
      if (userData.likedSongs && Array.isArray(userData.likedSongs)) {
        // We can temporarily store these in a local state for the friend profile
        setFriendLikedSongs(userData.likedSongs);
      }
    } catch (error) {
      console.error('Error fetching user profile:', error);
    } finally {
      setIsFetchingProfile(false);
    }
  };

  useEffect(() => {
    if (isOwnProfile) {
      if (!likedSongsInitialized && !likedSongsLoading) {
        fetchLikedSongs();
      }
      loadListeningTime();
    }
  }, [likedSongsInitialized, likedSongsLoading, isOwnProfile]);

  useEffect(() => {
    if (isOwnProfile) {
      setStats({
        totalSongs: albums.reduce((acc, album) => acc + (album.songs?.length || 0), 0),
        totalAlbums: albums.length,
        likedCount: likedSongs.length,
        totalAppUseTime: 0, // Will be populated by fetchOwnStats
        totalListeningTime: 0, // Will be populated by fetchOwnStats
      });

      // Special fetch for own stats if needed
      const fetchOwnStats = async () => {
        try {
          const response = await axiosInstance.get(`/users/${authUser?.googleId || authUser?.id}`);
          if (response.data.stats) {
            const backendAppTime = response.data.stats.totalAppUseTime || 0;
            const backendListeningTime = response.data.stats.totalListeningTime || 0;
            setStats(prev => ({
              ...prev,
              totalAppUseTime: backendAppTime,
              totalListeningTime: backendListeningTime
            }));

            // Sync player store total listening time with backend if it's currently 0 or behind
            if (usePlayerStore.getState().totalListeningTime < backendListeningTime) {
              usePlayerStore.getState().setTotalListeningTime(backendListeningTime);
            }
          }
        } catch (e) { }
      };
      fetchOwnStats();
    }
  }, [albums, likedSongs, isOwnProfile, authUser]);

  const handlePlaySong = (song: Song) => {
    if (currentSong?._id === song._id) {
      if (isPlaying) pauseSong();
      else playSong(song);
    } else {
      playSong(song);
    }
  };

  if ((!isAuthenticated || !authUser) && isOwnProfile) {
    return (
      <View style={styles.notSignedInContainer}>
        <View style={styles.placeholderAvatar}>
          <Text style={styles.placeholderAvatarIcon}>👤</Text>
        </View>
        <Text style={styles.notSignedInText}>Please sign in to view your profile</Text>
      </View>
    );
  }

  if (isFetchingProfile && !profileUser) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={themeColors.primary} />
        <Text style={styles.loadingText}>Loading profile...</Text>
      </View>
    );
  }

  if (!profileUser) {
    return (
      <View style={styles.container}>
        <View style={styles.header}>
          <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
            <Icon name="arrow-left" size={24} color={COLORS.textPrimary} />
          </TouchableOpacity>
        </View>
        <View style={styles.emptyState}>
          <Text style={styles.emptyTitle}>User not found</Text>
        </View>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {/* Top Navigation Bar for other users */}
      {!isOwnProfile && (
        <View style={styles.topNavbar}>
          <TouchableOpacity
            onPress={() => navigation.goBack()}
            style={styles.navBackButton}
            activeOpacity={0.7}
          >
            <Icon name="chevron-left" size={28} color={COLORS.textPrimary} />
          </TouchableOpacity>
          <Text style={styles.navTitle} numberOfLines={1}>
            {profileUser.fullName || profileUser.name || profileUser.username || 'Profile'}
          </Text>
          <TouchableOpacity
            onPress={() => (navigation as any).navigate('Chat', { user: profileUser })}
            style={styles.navActionButton}
            activeOpacity={0.7}
          >
            <Icon name="message-circle" size={24} color={COLORS.textPrimary} />
          </TouchableOpacity>
        </View>
      )}

      <ScrollView
        style={styles.container}
        contentContainerStyle={[
          styles.contentContainer,
          !isOwnProfile && { paddingTop: 0 } // Add padding if header is present
        ]}
        showsVerticalScrollIndicator={false}
      >
        {/* Hero Section with Profile */}
        <View style={styles.heroSection}>
          {/* Gradient Background */}
          <LinearGradient
            colors={[`${themeColors.primary}4D`, `${themeColors.primary}1A`, 'transparent']}
            style={styles.heroGradient}
          />

          {/* Profile Header */}
          <View style={styles.profileHeader}>
            {/* Avatar */}
            <View style={styles.avatarContainer}>
              <View style={styles.avatarRing}>
                {(profileUser.imageUrl || profileUser.image) ? (
                  <Image
                    source={{ uri: getFullImageUrl(profileUser.imageUrl || profileUser.image || '') }}
                    style={styles.avatar}
                  />
                ) : (
                  <View style={[styles.avatar, styles.avatarPlaceholder]}>
                    <Text style={styles.avatarIcon}>👤</Text>
                  </View>
                )}
              </View>
              {/* Online Status */}
              {isOwnProfile && (
                <View style={[styles.onlineIndicator, { backgroundColor: themeColors.primary }]} />
              )}
            </View>

            {/* Profile Info */}
            <View style={styles.profileInfo}>
              {(profileUser as any).isAdmin && (
                <Text style={styles.adminText}>Admin</Text>
              )}
              <Text style={styles.profileName}>{profileUser.fullName || profileUser.name || profileUser.username || 'Music Lover'}</Text>
              <View style={styles.profileMeta}>
                {profileUser.username && (
                  <View style={styles.metaItem}>
                    <Text style={styles.metaIcon}>@</Text>
                    <Text style={styles.metaText}>{profileUser.username}</Text>
                  </View>
                )}
                <View style={styles.metaItem}>
                  <Text style={styles.metaIcon}>📅</Text>
                  <Text style={styles.metaText}>
                    Joined {new Date(profileUser.createdAt || Date.now()).toLocaleDateString('en-US', { month: 'short', year: 'numeric' })}
                  </Text>
                </View>
              </View>
            </View>
          </View>

          {/* Stats Cards */}
          <View style={styles.statsGrid}>
            <StatCard icon="🎵" value={stats.totalSongs} label="Songs" color="emerald" />
            <StatCard icon="❤️" value={stats.likedCount} label="Liked" color="pink" />
            <StatCard
              icon="⏱️"
              value={
                stats.totalListeningTime >= 3600
                  ? `${Math.floor(stats.totalListeningTime / 3600)}h`
                  : `${Math.floor(stats.totalListeningTime / 60)}m`
              }
              label="Listening Time"
              color="purple"
            />
            <StatCard
              icon="📱"
              value={
                stats.totalAppUseTime >= 3600
                  ? `${Math.floor(stats.totalAppUseTime / 3600)}h`
                  : `${Math.floor(stats.totalAppUseTime / 60)}m`
              }
              label="App Use"
              color="blue"
            />
          </View>
        </View>

        {/* Currently Playing */}
        {currentSong && (
          <View style={styles.section}>
            <View style={styles.sectionHeader}>
              <Text style={styles.sectionIcon}>🎵</Text>
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
                  <View style={[styles.nowPlayingOverlay, { backgroundColor: themeColors.primary }]}>
                    <Icon
                      name={isPlaying ? 'pause' : 'play'}
                      size={24}
                      color="#fff"
                      style={!isPlaying && { marginLeft: 3 }}
                    />
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
                        <View style={[styles.playingBar, { height: 16, backgroundColor: themeColors.primary }]} />
                        <View style={[styles.playingBar, { height: 12, backgroundColor: themeColors.primary }]} />
                        <View style={[styles.playingBar, { height: 20, backgroundColor: themeColors.primary }]} />
                      </View>
                      <Text style={[styles.playingText, { color: themeColors.primary }]}>Playing</Text>
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
            {isOwnProfile ? (
              likedSongs.length > 4 && (
                <TouchableOpacity>
                  <Text style={styles.seeAllText}>See all</Text>
                </TouchableOpacity>
              )
            ) : (
              friendLikedSongs.length > 4 && (
                <TouchableOpacity>
                  <Text style={styles.seeAllText}>See all</Text>
                </TouchableOpacity>
              )
            )}
          </View>

          {isOwnProfile ? (
            likedSongs.length > 0 ? (
              <View style={styles.likedSongsGrid}>
                {likedSongs.slice(0, 5).map((song) => (
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
                      {currentSong?._id === song._id && (
                        <View style={[styles.likedSongOverlay, { opacity: 1 }]}>
                          <Icon name={isPlaying ? "pause" : "play"} size={20} color="#fff" />
                        </View>
                      )}
                    </View>
                    <View style={styles.likedSongInfo}>
                      <Text
                        style={[styles.likedSongTitle, currentSong?._id === song._id && styles.likedSongTitleActive]}
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
                        <View style={[styles.smallBar, { height: 12, backgroundColor: themeColors.primary }]} />
                        <View style={[styles.smallBar, { height: 8, backgroundColor: themeColors.primary }]} />
                        <View style={[styles.smallBar, { height: 12, backgroundColor: themeColors.primary }]} />
                      </View>
                    )}
                  </TouchableOpacity>
                ))}
              </View>
            ) : (
              <View style={styles.emptyState}>
                <Text style={styles.emptyIcon}>❤️</Text>
                <Text style={styles.emptyTitle}>No liked songs yet</Text>
                <Text style={styles.emptySubtitle}>Songs you like will appear here</Text>
              </View>
            )
          ) : (
            // Friend's liked songs
            friendLikedSongs.length > 0 ? (
              <View style={styles.likedSongsGrid}>
                {friendLikedSongs.slice(0, 5).map((song) => (
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
                      {currentSong?._id === song._id && (
                        <View style={[styles.likedSongOverlay, { opacity: 1 }]}>
                          <Icon name={isPlaying ? "pause" : "play"} size={20} color="#fff" />
                        </View>
                      )}
                    </View>
                    <View style={styles.likedSongInfo}>
                      <Text
                        style={[styles.likedSongTitle, currentSong?._id === song._id && styles.likedSongTitleActive]}
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
                        <View style={[styles.smallBar, { height: 12, backgroundColor: themeColors.primary }]} />
                        <View style={[styles.smallBar, { height: 8, backgroundColor: themeColors.primary }]} />
                        <View style={[styles.smallBar, { height: 12, backgroundColor: themeColors.primary }]} />
                      </View>
                    )}
                  </TouchableOpacity>
                ))}
              </View>
            ) : (
              <View style={styles.emptyState}>
                <Text style={styles.emptyIcon}>🔒</Text>
                <Text style={styles.emptyTitle}>Private Collection</Text>
                <Text style={styles.emptySubtitle}>This user's liked songs are private</Text>
              </View>
            )
          )}
        </View>

        {/* Your Library */}
        {isOwnProfile && (
          <View style={styles.section}>
            <View style={styles.sectionHeader}>
              <Text style={styles.sectionIcon}>💿</Text>
              <Text style={styles.sectionTitle}>Library</Text>
              <TouchableOpacity onPress={() => navigation.navigate('Albums' as never)}>
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
                    <View style={[styles.libraryPlayButton, { backgroundColor: themeColors.primary }]}>
                      <Icon name="play" size={16} color="#fff" style={{ marginLeft: 2 }} />
                    </View>
                  </View>
                  <Text style={styles.libraryTitle} numberOfLines={1}>{album.title}</Text>
                  <Text style={styles.libraryArtist} numberOfLines={1}>{album.artist}</Text>
                </TouchableOpacity>
              ))}
            </ScrollView>
          </View>
        )}

        {/* Bottom spacing */}
        <View style={{ height: DIMENSIONS.playbackHeight + SPACING.xxl }} />
      </ScrollView>
    </View>
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
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: COLORS.background,
  },
  loadingText: {
    marginTop: SPACING.md,
    color: COLORS.textMuted,
    fontSize: FONT_SIZES.md,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: SPACING.md,
    paddingTop: SPACING.xl,
  },
  backButton: {
    padding: SPACING.sm,
  },

  // Top Navbar for other users
  topNavbar: {
    paddingTop: 40, // Account for safe area
    height: 100,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: SPACING.md,
    backgroundColor: 'rgba(9, 9, 11, 0.85)',
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255, 255, 255, 0.1)',
    zIndex: 100,
  },
  navBackButton: {
    width: 40,
    height: 40,
    justifyContent: 'center',
    alignItems: 'flex-start',
  },
  navTitle: {
    flex: 1,
    fontSize: 18,
    fontWeight: 'bold',
    color: COLORS.textPrimary,
    textAlign: 'center',
    marginTop: -5,
  },
  navActionButton: {
    width: 40,
    height: 40,
    justifyContent: 'center',
    alignItems: 'flex-end',
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
    height: 400,
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
  adminText: {
    fontSize: FONT_SIZES.xs,
    fontWeight: '700',
    color: '#fff',
    marginBottom: SPACING.sm,
    borderRadius: BORDER_RADIUS.sm,
    paddingHorizontal: 10,
    paddingVertical: 2,
    backgroundColor: COLORS.primary,
    textTransform: 'uppercase',
    letterSpacing: 1,
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
    fontSize: 32,
    fontWeight: '800',
    color: COLORS.textPrimary,
    marginBottom: SPACING.sm,
    textAlign: 'center',
    letterSpacing: -0.5,
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
