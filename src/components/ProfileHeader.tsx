import React, { useEffect, useState } from 'react';
import { ActivityIndicator, Image, StyleSheet, TouchableOpacity, View, TextInput, Text, Modal, Pressable } from 'react-native';
import Icon from 'react-native-vector-icons/Ionicons';
import FeatherIcon from 'react-native-vector-icons/Feather';
import { COLORS, SPACING, FONT_SIZES, BORDER_RADIUS } from '../constants/theme';
import { useAuthStore } from '../store/useAuthStore';
import { Song } from '../types';
import { useMusicStore } from '../store/useMusicStore';
import { useThemeStore } from '../store/useThemeStore';
import { usePlayerStore } from '../store/usePlayerStore';
import { useNavigation, CommonActions } from '@react-navigation/native';
import { getFullImageUrl } from '../config';

const DRSLogo = require('../assets/DRS.png');

const ProfileHeader = () => {
  const { user, logout, isAuthenticated } = useAuthStore();
  const navigation = useNavigation();
  const [searchQuery, setSearchQuery] = useState('');
  const [searchVisible, setSearchVisible] = useState(false);
  const [searchResults, setSearchResults] = useState<Song[]>([]);
  const [searchLoading, setSearchLoading] = useState(false);
  const [menuVisible, setMenuVisible] = useState(false);
  const { searchSongs } = useMusicStore();
  const { colors: themeColors } = useThemeStore();
  const { currentSong, isPlaying, playSong } = usePlayerStore();

  const handleLogout = () => {
    setMenuVisible(false);
    logout();
    navigation.dispatch(
      CommonActions.reset({
        index: 0,
        routes: [{ name: 'Landing' as never }],
      })
    );
  };

  const handleNavigateToProfile = () => {
    setMenuVisible(false);
    (navigation as any).navigate('Profile');
  };

  const handleNavigateToSettings = () => {
    setMenuVisible(false);
    (navigation as any).navigate('Settings');
  };

  useEffect(() => {
    if (!searchQuery.trim()) {
      setSearchResults([]);
      setSearchLoading(false);
      return;
    }

    setSearchLoading(true);
    const debounceTimer = setTimeout(async () => {
      try {
        const results = await searchSongs(searchQuery.trim());
        setSearchResults(results);
      } catch (error) {
        console.error('Search error:', error);
        setSearchResults([]);
      } finally {
        setSearchLoading(false);
      }
    }, 300);

    return () => clearTimeout(debounceTimer);
  }, [searchQuery, searchSongs]);

  const handleSearchResultPlay = (song: Song, index: number) => {
    if (currentSong?._id === song._id) {
      if (!isPlaying) {
        playSong(song);
      }
      return;
    }
    const { playAlbum } = usePlayerStore.getState();
    playAlbum(searchResults, index);
    (navigation as any).navigate('SongDetail', { songId: song._id });
  };

  return (
    <View style={styles.container}>
      <View style={styles.screenContainer}>
        {/* Top Bar */}
        <View style={styles.topBar}>
          {/* Left: Logo */}
          <View style={styles.topBarLeft}>
            <Image source={DRSLogo} style={styles.logo} resizeMode="contain" />
            <Text style={styles.logoText}>DRS Music</Text>
          </View>

          {/* Right: Search and Profile */}
          <View style={styles.topBarRight}>
            <TouchableOpacity
              style={styles.topBarIcon}
              onPress={() => setSearchVisible(!searchVisible)}
            >
              <Icon name="search" size={22} color={COLORS.textPrimary} />
            </TouchableOpacity>

            <TouchableOpacity 
              style={styles.profileButton}
              onPress={() => setMenuVisible(true)}
            >
              {user?.imageUrl ? (
                <Image source={{ uri: user.imageUrl }} style={styles.profileImage} />
              ) : (
                <View style={styles.profilePlaceholder}>
                  <Icon name="person" size={18} color={COLORS.textMuted} />
                </View>
              )}
            </TouchableOpacity>
          </View>
        </View>

        {/* Search Bar - Expandable */}
        {searchVisible && (
          <View style={styles.searchContainer}>
            <Icon name="search" size={18} color={COLORS.textMuted} style={styles.searchIcon} />
            <TextInput
              style={styles.searchInput}
              placeholder="Search songs, albums, artists..."
              placeholderTextColor={COLORS.textMuted}
              value={searchQuery}
              onChangeText={setSearchQuery}
              autoFocus
            />
            {searchQuery.length > 0 && (
              <TouchableOpacity onPress={() => setSearchQuery('')}>
                <Icon name="close" size={18} color={COLORS.textMuted} />
              </TouchableOpacity>
            )}
          </View>
        )}
      </View>

      {/* Search Results */}
      {searchQuery.trim().length > 0 && (
        <View style={styles.searchResultsContainer}>
          <Text style={styles.searchResultsTitle}>
            Search Results {searchResults.length > 0 ? `(${searchResults.length})` : ''}
          </Text>
          {searchLoading ? (
            <View style={styles.noResultsContainer}>
              <ActivityIndicator size="large" color={themeColors.primary} />
              <Text style={styles.noResultsSubtext}>Searching all songs...</Text>
            </View>
          ) : searchResults.length === 0 ? (
            <View style={styles.noResultsContainer}>
              <Icon name="search" size={48} color={COLORS.textMuted} />
              <Text style={styles.noResultsText}>No songs found for "{searchQuery}"</Text>
              <Text style={styles.noResultsSubtext}>Try searching for something else</Text>
            </View>
          ) : (
            searchResults.map((song, index) => {
              const isCurrentSong = currentSong?._id === song._id;
              const isThisSongPlaying = isCurrentSong && isPlaying;
              return (
                <TouchableOpacity
                  key={song._id}
                  style={[styles.searchResultItem, isCurrentSong && styles.searchResultItemActive]}
                  onPress={() => handleSearchResultPlay(song, index)}
                  activeOpacity={0.7}
                >
                  <Image
                    source={{ uri: getFullImageUrl(song.imageUrl) }}
                    style={styles.searchResultImage}
                  />
                  <View style={styles.searchResultInfo}>
                    <Text
                      style={[styles.searchResultTitle, isCurrentSong && { color: themeColors.primary }]}
                      numberOfLines={1}
                    >
                      {song.title}
                    </Text>
                    <Text style={styles.searchResultArtist} numberOfLines={1}>
                      {song.artist}
                    </Text>
                  </View>
                  <TouchableOpacity
                    style={[styles.searchResultPlayBtn, { backgroundColor: themeColors.primary }]}
                    onPress={() => handleSearchResultPlay(song, index)}
                  >
                    <Icon
                      name={isThisSongPlaying ? 'pause' : 'play'}
                      size={16}
                      color="#fff"
                    />
                  </TouchableOpacity>
                </TouchableOpacity>
              );
            })
          )}
        </View>
      )}

      {/* Profile Menu Modal */}
      <Modal
        visible={menuVisible}
        transparent
        animationType="fade"
        onRequestClose={() => setMenuVisible(false)}
      >
        <Pressable style={styles.menuOverlay} onPress={() => setMenuVisible(false)}>
          <View style={styles.menuContainer}>
            {/* User Info */}
            {isAuthenticated && user && (
              <View style={styles.menuUserInfo}>
                {user.imageUrl ? (
                  <Image source={{ uri: user.imageUrl }} style={styles.menuUserImage} />
                ) : (
                  <View style={styles.menuUserPlaceholder}>
                    <Icon name="person" size={24} color={COLORS.textMuted} />
                  </View>
                )}
                <View style={styles.menuUserText}>
                  <Text style={styles.menuUserName} numberOfLines={1}>
                    {user.name || user.fullName || 'User'}
                  </Text>
                  <Text style={styles.menuUserEmail} numberOfLines={1}>
                    {user.emailAddress || ''}
                  </Text>
                </View>
              </View>
            )}

            {/* Menu Items */}
            <View style={styles.menuItems}>
              <TouchableOpacity 
                style={styles.menuItem}
                onPress={handleNavigateToProfile}
              >
                <FeatherIcon name="user" size={20} color={COLORS.textPrimary} />
                <Text style={styles.menuItemText}>Profile</Text>
                <FeatherIcon name="chevron-right" size={18} color={COLORS.textMuted} />
              </TouchableOpacity>

              <TouchableOpacity 
                style={styles.menuItem}
                onPress={handleNavigateToSettings}
              >
                <FeatherIcon name="settings" size={20} color={COLORS.textPrimary} />
                <Text style={styles.menuItemText}>Settings</Text>
                <FeatherIcon name="chevron-right" size={18} color={COLORS.textMuted} />
              </TouchableOpacity>

              <View style={styles.menuDivider} />

              <TouchableOpacity 
                style={styles.menuItem}
                onPress={handleLogout}
              >
                <FeatherIcon name="log-out" size={20} color="#ef4444" />
                <Text style={[styles.menuItemText, { color: '#ef4444' }]}>Log Out</Text>
              </TouchableOpacity>
            </View>
          </View>
        </Pressable>
      </Modal>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    paddingVertical: SPACING.md,
  },
  screenContainer: {
    backgroundColor: COLORS.background,
  },
  topBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.sm,
    backgroundColor: COLORS.background,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.zinc800,
  },
  topBarLeft: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  topBarRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  logo: {
    width: 32,
    height: 32,
  },
  logoText: {
    fontSize: FONT_SIZES.lg,
    fontWeight: '700',
    color: COLORS.textPrimary,
    marginLeft: SPACING.sm,
  },
  topBarIcon: {
    padding: 8,
  },
  profileButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    overflow: 'hidden',
  },
  profileImage: {
    width: '100%',
    height: '100%',
    borderRadius: 18,
  },
  profilePlaceholder: {
    width: '100%',
    height: '100%',
    borderRadius: 18,
    backgroundColor: COLORS.zinc800,
    justifyContent: 'center',
    alignItems: 'center',
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.zinc800,
    marginHorizontal: SPACING.md,
    marginVertical: SPACING.sm,
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.sm,
    borderRadius: BORDER_RADIUS.lg,
    marginTop: SPACING.md,
  },
  searchIcon: {
    marginRight: SPACING.sm,
  },
  searchInput: {
    flex: 1,
    fontSize: FONT_SIZES.md,
    color: COLORS.textPrimary,
    padding: 4,
  },
  searchResultsContainer: {
    paddingHorizontal: SPACING.lg,
    paddingTop: SPACING.md,
  },
  searchResultsTitle: {
    fontSize: FONT_SIZES.lg,
    fontWeight: '700',
    color: COLORS.textPrimary,
    marginBottom: SPACING.md,
  },
  noResultsContainer: {
    alignItems: 'center',
    paddingVertical: SPACING.xxl,
  },
  noResultsText: {
    fontSize: FONT_SIZES.md,
    color: COLORS.textPrimary,
    marginTop: SPACING.md,
  },
  noResultsSubtext: {
    fontSize: FONT_SIZES.sm,
    color: COLORS.textMuted,
    marginTop: SPACING.xs,
  },
  searchResultItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: SPACING.sm,
    paddingHorizontal: SPACING.sm,
    borderRadius: BORDER_RADIUS.md,
    marginBottom: SPACING.xs,
  },
  searchResultItemActive: {
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
  },
  searchResultImage: {
    width: 48,
    height: 48,
    borderRadius: BORDER_RADIUS.sm,
    backgroundColor: COLORS.zinc800,
  },
  searchResultInfo: {
    flex: 1,
    marginLeft: SPACING.md,
    marginRight: SPACING.md,
  },
  searchResultTitle: {
    fontSize: FONT_SIZES.md,
    fontWeight: '600',
    color: COLORS.textPrimary,
  },
  searchResultArtist: {
    fontSize: FONT_SIZES.sm,
    color: COLORS.textMuted,
    marginTop: 2,
  },
  searchResultPlayBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    justifyContent: 'center',
    alignItems: 'center',
  },
  // Profile Menu Styles
  menuOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.6)',
    justifyContent: 'flex-start',
    alignItems: 'flex-end',
    paddingTop: 80,
    paddingRight: SPACING.md,
  },
  menuContainer: {
    backgroundColor: COLORS.zinc900,
    borderRadius: BORDER_RADIUS.lg,
    minWidth: 220,
    maxWidth: 280,
    borderWidth: 1,
    borderColor: COLORS.zinc700,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
  },
  menuUserInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: SPACING.md,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.zinc700,
  },
  menuUserImage: {
    width: 44,
    height: 44,
    borderRadius: 22,
  },
  menuUserPlaceholder: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: COLORS.zinc700,
    justifyContent: 'center',
    alignItems: 'center',
  },
  menuUserText: {
    flex: 1,
    marginLeft: SPACING.sm,
  },
  menuUserName: {
    fontSize: FONT_SIZES.md,
    fontWeight: '600',
    color: COLORS.textPrimary,
  },
  menuUserEmail: {
    fontSize: FONT_SIZES.xs,
    color: COLORS.textMuted,
    marginTop: 2,
  },
  menuItems: {
    paddingVertical: SPACING.xs,
  },
  menuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: SPACING.sm,
    paddingHorizontal: SPACING.md,
  },
  menuItemText: {
    flex: 1,
    fontSize: FONT_SIZES.md,
    color: COLORS.textPrimary,
    marginLeft: SPACING.sm,
  },
  menuDivider: {
    height: 1,
    backgroundColor: COLORS.zinc700,
    marginVertical: SPACING.xs,
  },
});

export default ProfileHeader;