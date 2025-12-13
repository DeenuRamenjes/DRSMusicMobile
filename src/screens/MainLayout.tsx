import React, { useState, useEffect, useMemo, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Modal,
  Animated,
  StatusBar,
  ScrollView,
  Image,
  Pressable,
} from 'react-native';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { SafeAreaView } from 'react-native-safe-area-context';
import Icon from 'react-native-vector-icons/Feather';
import {
  COLORS,
  SPACING,
  FONT_SIZES,
  BORDER_RADIUS,
  DIMENSIONS,
} from '../constants/theme';
import { HomeScreen } from './HomeScreen';
import { SongsScreen } from './SongsScreen';
import { AlbumsScreen } from './AlbumsScreen';
import { ProfileScreen } from './ProfileScreen';
import { SettingsScreen } from './SettingsScreen';
import { PlaybackControls } from '../components/PlaybackControls';
import { FriendsActivity } from '../components/FriendsActivity';
import { usePlayerStore } from '../store/usePlayerStore';
import { useMusicStore } from '../store/useMusicStore';
import { useAuthStore } from '../store/useAuthStore';
import { useOfflineMusicStore } from '../store/useOfflineMusicStore';
import { useThemeStore } from '../store/useThemeStore';
import { useFriendsStore } from '../store/useFriendsStore';
import { useNavigation } from '@react-navigation/native';
import { getFullImageUrl } from '../config';

const DRSLogo = require('../assets/DRS-Logo.png');

const Tab = createBottomTabNavigator();

// Left Sidebar Component (matching web app)
const LeftSidebar = ({
  onNavigate,
  onOpenFriends,
  onOpenMessages,
  onTabNavigate,
  stackNavigation,
}: {
  onNavigate?: () => void;
  onOpenFriends?: () => void;
  onOpenMessages?: () => void;
  onTabNavigate?: (screen: string) => void;
  stackNavigation?: any;
}) => {
  const { albums, fetchAlbums, isLoading } = useMusicStore();
  const { playAlbum } = usePlayerStore();
  const { unreadCounts } = useFriendsStore();
  
  // Calculate total unread messages
  const totalUnread = Object.values(unreadCounts).reduce((total, count) => total + count, 0);

  // Only fetch albums on mount if not already loaded
  useEffect(() => {
    if (albums.length === 0) {
      fetchAlbums();
    }
  }, []);

  // Navigation items with Feather icon names
  const navItems = [
    { icon: 'home', label: 'Home', screen: 'Home' },
    { icon: 'music', label: 'Songs', screen: 'Songs' },
    { icon: 'disc', label: 'Albums', screen: 'Albums' },
    { icon: 'user', label: 'Profile', screen: 'Profile' },
    { icon: 'settings', label: 'Settings', screen: 'Settings' },
  ];

  const handleNavPress = (screen: string) => {
    // Close sidebar and navigate via callback
    onNavigate?.();
    onTabNavigate?.(screen);
  };

  const handleAlbumPress = async (album: any) => {
    onNavigate?.();
    // Set the pending album ID so AlbumsScreen opens that album
    useMusicStore.getState().setPendingAlbumId(album._id);
    // Navigate to Albums tab
    onTabNavigate?.('Albums');
  };

  const handleViewAllAlbums = () => {
    onNavigate?.();
    // Clear any pending album so we see the full list
    useMusicStore.getState().clearPendingAlbumId();
    onTabNavigate?.('Albums');
  };

  return (
    <View style={styles.sidebar}>
      {/* Navigation Section */}
      <View style={styles.sidebarNav}>
        {navItems.map(item => (
          <TouchableOpacity
            key={item.screen}
            style={styles.navItem}
            onPress={() => handleNavPress(item.screen)}
            activeOpacity={0.7}
          >
            <View style={styles.navItemContent}>
              <Icon name={item.icon} size={20} color={COLORS.textMuted} />
              <Text style={styles.navLabel}>{item.label}</Text>
            </View>
          </TouchableOpacity>
        ))}

        {/* Messages button - Navigate to Messages screen */}
        <TouchableOpacity
          style={styles.navItem}
          onPress={() => {
            onNavigate?.();
            onOpenMessages?.();
          }}
          activeOpacity={0.7}
        >
          <View style={styles.navItemContent}>
            <View style={{ position: 'relative' }}>
              <Icon name="message-circle" size={20} color={COLORS.textMuted} />
              {totalUnread > 0 && (
                <View style={styles.unreadBadge}>
                  <Text style={styles.unreadBadgeText}>
                    {totalUnread > 99 ? '99+' : totalUnread}
                  </Text>
                </View>
              )}
            </View>
            <Text style={styles.navLabel}>Messages</Text>
          </View>
        </TouchableOpacity>

        {/* Friends Activity button */}
        <TouchableOpacity
          style={styles.navItem}
          onPress={() => {
            onNavigate?.();
            onOpenFriends?.();
          }}
          activeOpacity={0.7}
        >
          <View style={styles.navItemContent}>
            <Icon name="users" size={20} color={COLORS.textMuted} />
            <Text style={styles.navLabel}>Friends Activity</Text>
          </View>
        </TouchableOpacity>

        {/* Offline Music button - Navigate to OfflineMusic screen */}
        <TouchableOpacity
          style={styles.navItem}
          onPress={() => {
            onNavigate?.();
            stackNavigation?.navigate('OfflineMusic');
          }}
          activeOpacity={0.7}
        >
          <View style={styles.navItemContent}>
            <Icon name="download-cloud" size={20} color={COLORS.textMuted} />
            <Text style={styles.navLabel}>Offline Music</Text>
          </View>
        </TouchableOpacity>
      </View>

      {/* Divider */}
      <View style={styles.divider} />

      {/* Library Section */}
      <View style={styles.librarySection}>
        <View style={styles.libraryHeader}>
          <View style={styles.libraryTitleContainer}>
            <Text style={styles.libraryIcon}>📚</Text>
            <Text style={styles.libraryTitle}>PLAYLISTS</Text>
          </View>
        </View>

        <ScrollView
          style={styles.albumList}
          showsVerticalScrollIndicator={false}
        >
          {isLoading
            ? // Skeleton loading
              [...Array(5)].map((_, i) => (
                <View key={i} style={styles.albumItemSkeleton}>
                  <View style={styles.albumImageSkeleton} />
                  <View style={styles.albumTextSkeleton}>
                    <View style={styles.albumTitleSkeleton} />
                    <View style={styles.albumSubtitleSkeleton} />
                  </View>
                </View>
              ))
            : albums.map(album => (
                <TouchableOpacity
                  key={album._id}
                  style={styles.albumItem}
                  onPress={() => handleAlbumPress(album)}
                  activeOpacity={0.7}
                >
                  <Image
                    source={{ uri: getFullImageUrl(album.imageUrl) }}
                    style={styles.albumImage}
                  />
                  <View style={styles.albumInfo}>
                    <Text style={styles.albumTitle} numberOfLines={1}>
                      {album.title}
                    </Text>
                    <Text style={styles.albumSubtitle} numberOfLines={1}>
                      Album • {album.artist}
                    </Text>
                  </View>
                </TouchableOpacity>
              ))}
        </ScrollView>
      </View>
    </View>
  );
};

// Custom Tab Bar Component
const CustomTabBar = ({
  state,
  navigation,
  isSidebarOpen,
  setIsSidebarOpen,
  onNavigationReady,
}: any) => {
  // Capture navigation ref on mount
  useEffect(() => {
    if (navigation && onNavigationReady) {
      onNavigationReady(navigation);
    }
  }, [navigation, onNavigationReady]);

  const items = [
    { name: 'Home', icon: '🏠' },
    { name: 'Songs', icon: '🎵' },
    { name: 'Albums', icon: '💿' },
    { name: 'Profile', icon: '👤' },
    { name: 'Settings', icon: '⚙️' },
  ];

  return (
    <View style={styles.tabBar}>
      {items.map((item, index) => {
        const isFocused = state.index === index;

        return (
          <TouchableOpacity
            key={item.name}
            style={styles.tabItem}
            onPress={() => navigation.navigate(item.name)}
            activeOpacity={0.7}
          >
            <Text style={[styles.tabIcon, isFocused && styles.tabIconActive]}>
              {item.icon}
            </Text>
            <Text style={[styles.tabLabel, isFocused && styles.tabLabelActive]}>
              {item.name}
            </Text>
          </TouchableOpacity>
        );
      })}
    </View>
  );
};

// Admin email - only this user can see the admin button
const ADMIN_EMAILS = [
  'demo@drsmusic.com',
  'deenuramenjes29@gmail.com',
  'rohith17r.3@gmail.com',
];

export const MainLayout = () => {
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [isFriendsOpen, setIsFriendsOpen] = useState(false);
  const tabNavigationRef = React.useRef<any>(null);
  const stackNavigation = useNavigation();
  const { fetchAlbums } = useMusicStore();
  const { user } = useAuthStore();
  const { isOfflineMode, setOfflineMode } = useOfflineMusicStore();
  const { colors: themeColors } = useThemeStore();
  const { initSocket, disconnectSocket, unreadCounts } = useFriendsStore();
  const slideAnim = useState(new Animated.Value(-300))[0];

  const isAdmin = ADMIN_EMAILS.includes(user?.emailAddress ?? '');
  
  // Calculate total unread messages
  const totalUnread = Object.values(unreadCounts).reduce((total, count) => total + count, 0);

  // Initialize socket when MainLayout mounts (user is logged in)
  // This ensures users appear online whenever the app is active
  useEffect(() => {
    if (user && !isOfflineMode) {
      const userId = user.clerkId || user.id;
      if (userId) {
        initSocket(userId);
      }
    }

    // Disconnect socket when component unmounts
    return () => {
      disconnectSocket();
    };
  }, [user, isOfflineMode]);

  useEffect(() => {
    if (!isOfflineMode) {
      fetchAlbums();
    }
  }, [isOfflineMode]);

  useEffect(() => {
    Animated.timing(slideAnim, {
      toValue: isSidebarOpen ? 0 : -300,
      duration: 300,
      useNativeDriver: true,
    }).start();
  }, [isSidebarOpen]);

  const handleSidebarNavigate = () => {
    setIsSidebarOpen(false);
  };

  const handleOpenFriends = () => {
    setIsSidebarOpen(false);
    setIsFriendsOpen(true);
  };

  const handleOpenMessages = () => {
    setIsSidebarOpen(false);
    (stackNavigation as any).navigate('Messages');
  };

  const handleTabNavigate = (screen: string) => {
    if (tabNavigationRef.current) {
      tabNavigationRef.current.navigate(screen);
    }
  };

  return (
    <View style={styles.container}>
      <StatusBar
        barStyle="light-content"
        backgroundColor="transparent"
        translucent
      />

      {/* Mobile Sidebar Overlay */}
      {isSidebarOpen && (
        <View style={styles.sidebarOverlay}>
          {/* Backdrop */}
          <Pressable
            style={styles.backdrop}
            onPress={() => setIsSidebarOpen(false)}
          />

          {/* Sidebar Panel */}
          <Animated.View
            style={[
              styles.sidebarPanel,
              { transform: [{ translateX: slideAnim }] },
            ]}
          >
            {/* Sidebar Header */}
            <View style={styles.sidebarHeader}>
              <View style={styles.sidebarLogoContainer}>
                <Image source={DRSLogo} style={styles.DRSLogo} />
                <Text style={styles.sidebarLogoText}>DRS Music</Text>
              </View>
              <TouchableOpacity onPress={() => setIsSidebarOpen(false)}>
                <Text style={styles.closeIcon}>✕</Text>
              </TouchableOpacity>
            </View>

            {/* Sidebar Content */}
            <LeftSidebar
              onNavigate={handleSidebarNavigate}
              onOpenFriends={handleOpenFriends}
              onOpenMessages={handleOpenMessages}
              onTabNavigate={handleTabNavigate}
              stackNavigation={stackNavigation}
            />
          </Animated.View>
        </View>
      )}

      {/* Mobile Top Header */}
      <SafeAreaView edges={['top']} style={styles.headerSafeArea}>
        <View style={styles.header}>
          <View style={styles.headerLeft}>
            {/* Menu Button with unread badge */}
            <TouchableOpacity
              onPress={() => setIsSidebarOpen(true)}
              style={styles.menuButton}
              activeOpacity={0.7}
            >
              <Text style={styles.menuIcon}>☰</Text>
              {totalUnread > 0 && (
                <View style={styles.headerUnreadBadge}>
                  <Text style={styles.unreadBadgeText}>
                    {totalUnread > 99 ? '99+' : totalUnread}
                  </Text>
                </View>
              )}
            </TouchableOpacity>
          </View>

          {/* Logo */}
          <TouchableOpacity 
            style={styles.headerCenter}
            onPress={() => tabNavigationRef.current?.navigate('Home' as never)}
            activeOpacity={0.7}
          >
            <Image source={DRSLogo} style={styles.DRSLogo} />
            <Text style={styles.headerLogoText}>DRS Music</Text>
            {isOfflineMode && (
              <View
                style={[
                  styles.offlineBadge,
                  { backgroundColor: themeColors.primaryMuted },
                ]}
              >
                <Text
                  style={[
                    styles.offlineBadgeText,
                    { color: themeColors.primary },
                  ]}
                >
                  Offline
                </Text>
              </View>
            )}
          </TouchableOpacity>

          {/* Online/Offline Toggle and Admin Button */}
          <View style={styles.headerRight}>
            {/* Admin Button - Only visible to admin */}
            {isAdmin && (
              <TouchableOpacity
                onPress={() => (stackNavigation as any).navigate('Admin')}
                style={[
                  styles.modeToggle,
                  {
                    backgroundColor: themeColors.primaryMuted,
                    marginRight: SPACING.xs,
                  },
                ]}
                activeOpacity={0.7}
              >
                <Icon name="shield" size={16} color={themeColors.primary} />
              </TouchableOpacity>
            )}

            <TouchableOpacity
              onPress={() => {
                const newMode = !isOfflineMode;
                setOfflineMode(newMode);
                if (tabNavigationRef.current) {
                  tabNavigationRef.current.navigate('Home');
                }
              }}
              style={[
                styles.modeToggle,
                {
                  backgroundColor: isOfflineMode
                    ? themeColors.primaryMuted
                    : COLORS.zinc800,
                },
              ]}
              activeOpacity={0.7}
            >
              <Icon
                name={isOfflineMode ? 'wifi-off' : 'wifi'}
                size={16}
                color={isOfflineMode ? themeColors.primary : COLORS.textMuted}
              />
            </TouchableOpacity>
          </View>
        </View>
      </SafeAreaView>

      {/* Main Content - Tab Navigator (without visible tab bar) */}
      <View style={styles.content}>
        <Tab.Navigator
          tabBar={props => {
            // Capture navigation for sidebar use using ref (no state update during render)
            if (!tabNavigationRef.current && props.navigation) {
              tabNavigationRef.current = props.navigation;
            }
            return null;
          }}
          screenOptions={{
            headerShown: false,
          }}
        >
          <Tab.Screen name="Home" component={HomeScreen} />
          <Tab.Screen name="Songs" component={SongsScreen} />
          <Tab.Screen name="Albums" component={AlbumsScreen} />
          <Tab.Screen name="Profile" component={ProfileScreen} />
          <Tab.Screen name="Settings" component={SettingsScreen} />
        </Tab.Navigator>
      </View>

      {/* Playback Controls - Always at bottom */}
      <PlaybackControls />

      {/* Friends Activity Modal */}
      <Modal
        visible={isFriendsOpen}
        animationType="slide"
        transparent={false}
        onRequestClose={() => setIsFriendsOpen(false)}
      >
        <SafeAreaView style={styles.friendsContainer}>
          <FriendsActivity onClose={() => setIsFriendsOpen(false)} />
        </SafeAreaView>
      </Modal>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
  },

  DRSLogo: {
    width: 32,
    height: 32,
  },

  // Header
  headerSafeArea: {
    backgroundColor: 'rgba(9, 9, 11, 0.8)',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: SPACING.lg,
    paddingVertical: SPACING.md,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(63, 63, 70, 0.3)',
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.md,
  },
  menuButton: {
    position: 'relative',
    padding: SPACING.sm,
    borderRadius: BORDER_RADIUS.full,
  },
  menuIcon: {
    fontSize: 24,
    color: COLORS.textPrimary,
  },
  headerCenter: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.sm,
  },
  headerLogoText: {
    fontSize: FONT_SIZES.xl,
    fontWeight: 'bold',
    color: COLORS.textPrimary,
  },
  headerLogoIcon: {
    fontSize: 24,
  },
  headerRight: {
    width: 40,
    flexDirection: 'row',
    gap: SPACING.sm,
    alignItems: 'center',
    justifyContent: 'center',
  },
  offlineBadge: {
    paddingHorizontal: SPACING.sm,
    paddingVertical: 2,
    borderRadius: BORDER_RADIUS.full,
    marginLeft: SPACING.xs,
  },
  offlineBadgeText: {
    fontSize: FONT_SIZES.xs,
    fontWeight: '600' as const,
  },
  modeToggle: {
    width: 32,
    height: 32,
    borderRadius: 16,
    marginRight: 28,
    alignItems: 'center' as const,
    justifyContent: 'center' as const,
  },

  // Content
  content: {
    flex: 1,
  },

  // Tab Bar
  tabBar: {
    flexDirection: 'row',
    backgroundColor: COLORS.background,
    borderTopWidth: 1,
    borderTopColor: 'rgba(63, 63, 70, 0.3)',
    paddingBottom: SPACING.sm,
    paddingTop: SPACING.sm,
  },
  tabItem: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: SPACING.xs,
  },
  tabIcon: {
    fontSize: 20,
    marginBottom: 2,
  },
  tabIconActive: {
    // Active state maintained by color
  },
  tabLabel: {
    fontSize: FONT_SIZES.xs,
    color: COLORS.textMuted,
  },
  tabLabelActive: {
    color: COLORS.textPrimary,
  },

  // Sidebar Overlay
  sidebarOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    zIndex: 50,
  },
  backdrop: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.6)',
  },
  sidebarPanel: {
    position: 'absolute',
    top: 0,
    left: 0,
    bottom: 0,
    width: '85%',
    maxWidth: 320,
    backgroundColor: 'rgba(0, 0, 0, 0.6)',
  },
  sidebarHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: SPACING.lg,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(63, 63, 70, 0.5)',
    paddingTop: 60, // Account for status bar
    backgroundColor: 'black',
  },
  sidebarLogoContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.md,
  },
  sidebarLogoIcon: {
    fontSize: 32,
  },
  sidebarLogoText: {
    fontSize: FONT_SIZES.xl,
    fontWeight: '600',
    color: COLORS.textPrimary,
  },

  closeIcon: {
    fontSize: 18,
    color: COLORS.textPrimary,
  },

  // Sidebar Content
  sidebar: {
    flex: 1,
    // backgroundColor: 'rgba(24, 24, 27, 0.8)',
    backgroundColor: 'black',
  },
  sidebarNav: {
    padding: SPACING.md,
  },
  navItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.md,
    borderRadius: BORDER_RADIUS.lg,
    marginBottom: SPACING.xs,
  },
  navItemContent: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.md,
  },
  navIcon: {
    fontSize: 20,
  },
  navLabel: {
    fontSize: FONT_SIZES.md,
    fontWeight: '500',
    color: COLORS.textMuted,
  },
  navBadge: {
    minWidth: 22,
    height: 22,
    borderRadius: 11,
    backgroundColor: COLORS.primary,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 6,
  },
  navBadgeText: {
    fontSize: 11,
    fontWeight: '600',
    color: COLORS.textPrimary,
  },
  divider: {
    marginHorizontal: SPACING.md,
    height: 1,
    backgroundColor: 'rgba(63, 63, 70, 0.5)',
  },

  // Library Section
  librarySection: {
    flex: 1,
    padding: SPACING.md,
  },
  libraryHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: SPACING.md,
  },
  libraryTitleContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.sm,
  },
  libraryIcon: {
    fontSize: 20,
    color: COLORS.textMuted,
  },
  libraryTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: COLORS.textMuted,
    letterSpacing: 1,
  },
  viewAllText: {
    fontSize: FONT_SIZES.sm,
    color: COLORS.primary,
    fontWeight: '500',
  },
  albumList: {
    flex: 1,
  },
  albumItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.md,
    padding: SPACING.sm,
    borderRadius: BORDER_RADIUS.lg,
    marginBottom: SPACING.xs,
  },
  albumImage: {
    width: 48,
    height: 48,
    borderRadius: BORDER_RADIUS.md,
  },
  albumInfo: {
    flex: 1,
    minWidth: 0,
  },
  albumTitle: {
    fontSize: FONT_SIZES.md,
    fontWeight: '500',
    color: COLORS.textPrimary,
  },
  albumSubtitle: {
    fontSize: FONT_SIZES.sm,
    color: COLORS.textMuted,
    marginTop: 2,
  },

  // Skeleton
  albumItemSkeleton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.md,
    padding: SPACING.sm,
    marginBottom: SPACING.xs,
  },
  albumImageSkeleton: {
    width: 48,
    height: 48,
    borderRadius: BORDER_RADIUS.md,
    backgroundColor: COLORS.zinc700,
  },
  albumTextSkeleton: {
    flex: 1,
    gap: SPACING.xs,
  },
  albumTitleSkeleton: {
    height: 14,
    width: '70%',
    backgroundColor: COLORS.zinc700,
    borderRadius: 4,
  },
  albumSubtitleSkeleton: {
    height: 12,
    width: '50%',
    backgroundColor: COLORS.zinc700,
    borderRadius: 4,
  },

  // Friends Activity
  friendsContainer: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  friendsHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: SPACING.lg,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(63, 63, 70, 0.5)',
  },
  backButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.xs,
  },
  backIcon: {
    fontSize: 20,
    color: COLORS.primary,
  },
  backText: {
    fontSize: FONT_SIZES.md,
    color: COLORS.primary,
  },
  friendsTitle: {
    fontSize: FONT_SIZES.lg,
    fontWeight: '600',
    color: COLORS.textPrimary,
  },
  friendsContent: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: SPACING.xl,
  },
  friendsIcon: {
    fontSize: 64,
    marginBottom: SPACING.lg,
    opacity: 0.5,
  },
  friendsEmptyTitle: {
    fontSize: FONT_SIZES.xl,
    fontWeight: '600',
    color: COLORS.textPrimary,
    marginBottom: SPACING.sm,
  },
  friendsEmptyText: {
    fontSize: FONT_SIZES.md,
    color: COLORS.textMuted,
    textAlign: 'center',
  },
  unreadBadge: {
    position: 'absolute',
    top: -6,
    right: -8,
    backgroundColor: '#ef4444',
    minWidth: 18,
    height: 18,
    borderRadius: 9,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 4,
  },
  unreadBadgeText: {
    color: '#ffffff',
    fontSize: 10,
    fontWeight: '700',
  },
  headerUnreadBadge: {
    position: 'absolute',
    top: -4,
    right: -4,
    backgroundColor: '#ef4444',
    minWidth: 16,
    height: 16,
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 3,
  },
});
