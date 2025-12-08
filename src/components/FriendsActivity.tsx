import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Image,
  ScrollView,
  ActivityIndicator,
  RefreshControl,
} from 'react-native';
import { COLORS, SPACING, FONT_SIZES, BORDER_RADIUS } from '../constants/theme';
import { useFriendsStore, formatRelativeTime } from '../store/useFriendsStore';
import { useAuthStore } from '../store/useAuthStore';
import { User } from '../types';

// Helper to get full image URL
const getFullImageUrl = (imageUrl?: string | null) => {
  if (!imageUrl) return '';
  if (imageUrl.startsWith('http')) return imageUrl;
  return `http://192.168.1.40:5000${imageUrl}`;
};

interface FriendsActivityProps {
  onClose?: () => void;
}

export const FriendsActivity = ({ onClose }: FriendsActivityProps) => {
  const { user: authUser } = useAuthStore();
  const {
    users,
    isLoading,
    onlineUsers,
    userActivities,
    userLastSeen,
    fetchUsers,
    initSocket,
    disconnectSocket,
  } = useFriendsStore();

  const [refreshing, setRefreshing] = useState(false);
  const [, setRefreshTrigger] = useState(0);

  // Initialize socket and fetch users
  useEffect(() => {
    if (authUser) {
      fetchUsers();
      initSocket(authUser.clerkId || authUser.id);
    }

    // Refresh relative times every 30 seconds
    const interval = setInterval(() => {
      setRefreshTrigger((prev) => prev + 1);
    }, 30000);

    return () => {
      clearInterval(interval);
    };
  }, [authUser]);

  const handleRefresh = async () => {
    setRefreshing(true);
    await fetchUsers();
    setRefreshing(false);
  };

  // Filter out current user and sort: online first, then by activity
  const currentUserId = authUser?.clerkId || authUser?.id;
  const sortedUsers = [...users]
    .filter((u) => u.clerkId !== currentUserId && u._id !== currentUserId)
    .sort((a, b) => {
      const aOnline = onlineUsers.has(a.clerkId);
      const bOnline = onlineUsers.has(b.clerkId);
      if (aOnline !== bOnline) return bOnline ? 1 : -1;

      const aActivity = userActivities.get(a.clerkId) || 'Idle';
      const bActivity = userActivities.get(b.clerkId) || 'Idle';
      if (aActivity !== 'Idle' && bActivity === 'Idle') return -1;
      if (aActivity === 'Idle' && bActivity !== 'Idle') return 1;

      return 0;
    });

  const renderUserItem = (userData: User) => {
    const activity = userActivities.get(userData.clerkId) || 'Idle';
    const isPlaying = activity !== 'Idle';
    const isOnline = onlineUsers.has(userData.clerkId);
    const lastSeenTimestamp = userLastSeen.get(userData.clerkId);

    // Parse song info from activity
    const [songName, artistName] = isPlaying
      ? activity.replace('Playing ', '').split(' by ')
      : ['', ''];

    return (
      <View key={userData._id} style={styles.userItem}>
        {/* Avatar with online indicator */}
        <View style={styles.avatarContainer}>
          {userData.imageUrl || userData.image ? (
            <Image
              source={{ uri: getFullImageUrl(userData.imageUrl || userData.image) }}
              style={styles.avatar}
            />
          ) : (
            <View style={[styles.avatar, styles.avatarPlaceholder]}>
              <Text style={styles.avatarText}>{userData.name?.[0] || '?'}</Text>
            </View>
          )}
          <View
            style={[
              styles.onlineIndicator,
              { backgroundColor: isOnline ? COLORS.primary : COLORS.zinc600 },
            ]}
          />
        </View>

        {/* User info */}
        <View style={styles.userInfo}>
          <View style={styles.userNameRow}>
            <Text style={styles.userName} numberOfLines={1}>
              {userData.name}
            </Text>
            {isPlaying && (
              <View style={styles.playingIndicator}>
                <View style={[styles.playingBar, styles.playingBar1]} />
                <View style={[styles.playingBar, styles.playingBar2]} />
                <View style={[styles.playingBar, styles.playingBar3]} />
              </View>
            )}
          </View>

          {isPlaying ? (
            <View>
              <Text style={styles.songName} numberOfLines={1}>
                {songName}
              </Text>
              <Text style={styles.artistName} numberOfLines={1}>
                {artistName}
              </Text>
            </View>
          ) : (
            <Text style={styles.statusText}>
              {isOnline ? (
                <Text style={styles.onlineText}>Online</Text>
              ) : lastSeenTimestamp && lastSeenTimestamp > 0 && !isNaN(lastSeenTimestamp) ? (
                `Last seen ${formatRelativeTime(lastSeenTimestamp)}`
              ) : (
                'Offline'
              )}
            </Text>
          )}
        </View>
      </View>
    );
  };

  if (!authUser) {
    return (
      <View style={styles.container}>
        <View style={styles.header}>
          <TouchableOpacity onPress={onClose} style={styles.backButton}>
            <Text style={styles.backIcon}>←</Text>
            <Text style={styles.backText}>Back</Text>
          </TouchableOpacity>
          <Text style={styles.title}>Friends Activity</Text>
          <View style={{ width: 64 }} />
        </View>
        <View style={styles.emptyState}>
          <Text style={styles.emptyIcon}>🎧</Text>
          <Text style={styles.emptyTitle}>See What Friends Are Playing</Text>
          <Text style={styles.emptyText}>
            Login to discover what music your friends are enjoying
          </Text>
        </View>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={onClose} style={styles.backButton}>
          <Text style={styles.backIcon}>←</Text>
          <Text style={styles.backText}>Back</Text>
        </TouchableOpacity>
        <Text style={styles.title}>Friends Activity</Text>
        <View style={{ width: 64 }} />
      </View>

      {/* Content */}
      {isLoading && sortedUsers.length === 0 ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={COLORS.primary} />
          <Text style={styles.loadingText}>Loading friends...</Text>
        </View>
      ) : (
        <ScrollView
          style={styles.scrollView}
          contentContainerStyle={styles.scrollContent}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={handleRefresh}
              tintColor={COLORS.primary}
              colors={[COLORS.primary]}
            />
          }
        >
          {sortedUsers.length > 0 ? (
            sortedUsers.map(renderUserItem)
          ) : (
            <View style={styles.emptyState}>
              <Text style={styles.emptyIcon}>👥</Text>
              <Text style={styles.emptyTitle}>No Friends Yet</Text>
              <Text style={styles.emptyText}>
                Connect with friends to see what they're listening to
              </Text>
            </View>
          )}
        </ScrollView>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
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
  backButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.xs,
  },
  backIcon: {
    color: COLORS.textPrimary,
    fontSize: 20,
  },
  backText: {
    color: COLORS.textPrimary,
    fontSize: FONT_SIZES.md,
  },
  title: {
    fontSize: FONT_SIZES.lg,
    fontWeight: '600',
    color: COLORS.textPrimary,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    padding: SPACING.md,
    gap: SPACING.xs,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    marginTop: SPACING.md,
    color: COLORS.textMuted,
    fontSize: FONT_SIZES.md,
  },
  userItem: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    padding: SPACING.md,
    borderRadius: BORDER_RADIUS.xl,
    backgroundColor: 'rgba(39, 39, 42, 0.3)',
    gap: SPACING.md,
  },
  avatarContainer: {
    position: 'relative',
    flexShrink: 0,
  },
  avatar: {
    width: 48,
    height: 48,
    borderRadius: 24,
    borderWidth: 2,
    borderColor: COLORS.zinc800,
  },
  avatarPlaceholder: {
    backgroundColor: COLORS.zinc700,
    justifyContent: 'center',
    alignItems: 'center',
  },
  avatarText: {
    color: COLORS.textMuted,
    fontSize: FONT_SIZES.lg,
    fontWeight: '600',
  },
  onlineIndicator: {
    position: 'absolute',
    bottom: -2,
    right: -2,
    width: 14,
    height: 14,
    borderRadius: 7,
    borderWidth: 2,
    borderColor: COLORS.background,
  },
  userInfo: {
    flex: 1,
    minWidth: 0,
  },
  userNameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.sm,
  },
  userName: {
    fontSize: FONT_SIZES.md,
    fontWeight: '500',
    color: COLORS.textPrimary,
  },
  playingIndicator: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    gap: 2,
    height: 12,
  },
  playingBar: {
    width: 2,
    backgroundColor: COLORS.primary,
    borderRadius: 1,
  },
  playingBar1: {
    height: 12,
  },
  playingBar2: {
    height: 8,
  },
  playingBar3: {
    height: 12,
  },
  songName: {
    marginTop: 4,
    fontSize: FONT_SIZES.sm,
    fontWeight: '500',
    color: COLORS.primary,
  },
  artistName: {
    fontSize: FONT_SIZES.xs,
    color: COLORS.textMuted,
  },
  statusText: {
    marginTop: 4,
    fontSize: FONT_SIZES.xs,
    color: COLORS.textMuted,
  },
  onlineText: {
    color: 'rgba(16, 185, 129, 0.7)',
  },
  emptyState: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: SPACING.xl,
  },
  emptyIcon: {
    fontSize: 48,
    marginBottom: SPACING.md,
  },
  emptyTitle: {
    fontSize: FONT_SIZES.lg,
    fontWeight: '600',
    color: COLORS.textPrimary,
    marginBottom: SPACING.sm,
  },
  emptyText: {
    fontSize: FONT_SIZES.sm,
    color: COLORS.textMuted,
    textAlign: 'center',
    maxWidth: 200,
  },
});

export default FriendsActivity;
