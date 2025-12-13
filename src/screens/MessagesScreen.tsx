import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Image,
  FlatList,
  ActivityIndicator,
  RefreshControl,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import Icon from 'react-native-vector-icons/Feather';
import { COLORS, SPACING, FONT_SIZES, BORDER_RADIUS } from '../constants/theme';
import { useFriendsStore, formatRelativeTime } from '../store/useFriendsStore';
import { useAuthStore } from '../store/useAuthStore';
import { useThemeStore } from '../store/useThemeStore';
import { User, Message } from '../types';
import { getFullImageUrl } from '../config';

// User Chat Item Component (WhatsApp style)
const UserChatItem = ({ 
  user, 
  isOnline, 
  activity, 
  lastSeen,
  lastMessage,
  unreadCount,
  themeColor,
  currentUserId,
  onPress 
}: {
  user: User;
  isOnline: boolean;
  activity: string;
  lastSeen: number | undefined;
  lastMessage: Message | undefined;
  unreadCount: number;
  themeColor: string;
  currentUserId: string;
  onPress: () => void;
}) => {
  const isPlaying = activity && activity !== 'Idle';
  const [songName] = isPlaying
    ? activity.replace('Playing ', '').split(' by ')
    : [''];

  // Format last message time
  const formatMessageTime = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diff = now.getTime() - date.getTime();
    const days = Math.floor(diff / (1000 * 60 * 60 * 24));

    if (days === 0) {
      return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    } else if (days === 1) {
      return 'Yesterday';
    } else if (days < 7) {
      return date.toLocaleDateString([], { weekday: 'short' });
    } else {
      return date.toLocaleDateString([], { month: 'short', day: 'numeric' });
    }
  };

  // Determine what to show as the last message preview
  const getMessagePreview = () => {
    if (lastMessage) {
      const isSentByMe = lastMessage.senderId === currentUserId;
      const prefix = isSentByMe ? 'You: ' : '';
      return `${prefix}${lastMessage.content}`;
    }
    if (isPlaying) {
      return `🎵 ${songName}`;
    }
    return isOnline ? 'Available to chat' : 'Tap to start chatting';
  };

  const messageTime = lastMessage?.createdAt 
    ? formatMessageTime(lastMessage.createdAt)
    : isOnline ? 'Online' : lastSeen ? formatRelativeTime(lastSeen) : '';

  return (
    <TouchableOpacity 
      style={styles.userItem}
      onPress={onPress}
      activeOpacity={0.7}
    >
      {/* Avatar with online indicator */}
      <View style={styles.avatarContainer}>
        {user.imageUrl || user.image ? (
          <Image
            source={{ uri: getFullImageUrl(user.imageUrl || user.image) }}
            style={styles.avatar}
          />
        ) : (
          <View style={[styles.avatar, styles.avatarPlaceholder]}>
            <Text style={styles.avatarText}>{user.name?.[0] || '?'}</Text>
          </View>
        )}
        {isOnline && (
          <View style={[styles.onlineIndicator, { backgroundColor: themeColor }]} />
        )}
      </View>

      {/* User info */}
      <View style={styles.userInfo}>
        <View style={styles.userNameRow}>
          <Text style={styles.userName} numberOfLines={1}>
            {user.name}
          </Text>
          {/* Time/Status */}
          <Text style={[
            styles.timeText, 
            unreadCount > 0 && { color: themeColor, fontWeight: '600' }
          ]}>
            {messageTime}
          </Text>
        </View>

        <View style={styles.lastMessageRow}>
          <Text 
            style={[
              styles.lastMessage, 
              unreadCount > 0 && { color: COLORS.textPrimary, fontWeight: '500' }
            ]} 
            numberOfLines={1}
          >
            {getMessagePreview()}
          </Text>
          
          {/* Unread badge */}
          {unreadCount > 0 && (
            <View style={[styles.unreadBadge, { backgroundColor: themeColor }]}>
              <Text style={styles.unreadText}>
                {unreadCount > 99 ? '99+' : unreadCount}
              </Text>
            </View>
          )}
        </View>
      </View>

      {/* Chevron */}
      <Icon name="chevron-right" size={20} color={COLORS.textMuted} />
    </TouchableOpacity>
  );
};

export const MessagesScreen = () => {
  const navigation = useNavigation();
  const { user: authUser } = useAuthStore();
  const { colors: themeColors } = useThemeStore();
  const {
    users,
    isLoading,
    onlineUsers,
    userActivities,
    userLastSeen,
    unreadCounts,
    lastMessages,
    fetchUsers,
    fetchLastMessages,
  } = useFriendsStore();

  const [refreshing, setRefreshing] = useState(false);

  // Fetch users and messages on mount (socket is initialized in MainLayout)
  useEffect(() => {
    if (authUser) {
      fetchUsers().then(() => {
        fetchLastMessages();
      });
    }
  }, [authUser]);

  const handleRefresh = async () => {
    setRefreshing(true);
    await fetchUsers();
    await fetchLastMessages();
    setRefreshing(false);
  };

  const handleUserPress = (user: User) => {
    (navigation as any).navigate('Chat', { user });
  };

  const handleBack = () => {
    navigation.goBack();
  };

  // Filter out current user and sort by last message time, then unread, then online
  const currentUserId = authUser?.clerkId || authUser?.id || '';
  const sortedUsers = [...users]
    .filter((u) => u.clerkId !== currentUserId && u._id !== currentUserId)
    .sort((a, b) => {
      // Sort by last message time first (most recent first)
      const aLastMsg = lastMessages[a.clerkId];
      const bLastMsg = lastMessages[b.clerkId];
      if (aLastMsg && bLastMsg) {
        return new Date(bLastMsg.createdAt).getTime() - new Date(aLastMsg.createdAt).getTime();
      }
      if (aLastMsg && !bLastMsg) return -1;
      if (!aLastMsg && bLastMsg) return 1;

      // Then by unread messages
      const aUnread = unreadCounts[a.clerkId] || 0;
      const bUnread = unreadCounts[b.clerkId] || 0;
      if (aUnread !== bUnread) return bUnread - aUnread;

      // Then by online status
      const aOnline = onlineUsers.has(a.clerkId);
      const bOnline = onlineUsers.has(b.clerkId);
      if (aOnline !== bOnline) return bOnline ? 1 : -1;

      // Then by activity
      const aActivity = userActivities.get(a.clerkId) || 'Idle';
      const bActivity = userActivities.get(b.clerkId) || 'Idle';
      if (aActivity !== 'Idle' && bActivity === 'Idle') return -1;
      if (aActivity === 'Idle' && bActivity !== 'Idle') return 1;

      return 0;
    });

  const renderUserItem = ({ item }: { item: User }) => (
    <UserChatItem
      user={item}
      isOnline={onlineUsers.has(item.clerkId)}
      activity={userActivities.get(item.clerkId) || 'Idle'}
      lastSeen={userLastSeen.get(item.clerkId)}
      lastMessage={lastMessages[item.clerkId]}
      unreadCount={unreadCounts[item.clerkId] || 0}
      themeColor={themeColors.primary}
      currentUserId={currentUserId}
      onPress={() => handleUserPress(item)}
    />
  );

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      {/* Header */}
      <View style={[styles.header, { borderBottomColor: themeColors.primaryMuted }]}>
        <TouchableOpacity onPress={handleBack} style={styles.backButton}>
          <Icon name="arrow-left" size={24} color={COLORS.textPrimary} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Messages</Text>
        <View style={styles.headerActions}>
          <TouchableOpacity style={styles.headerActionButton}>
            <Icon name="more-vertical" size={20} color={COLORS.textPrimary} />
          </TouchableOpacity>
        </View>
      </View>

      {/* Users List */}
      {isLoading && users.length === 0 ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={themeColors.primary} />
          <Text style={styles.loadingText}>Loading users...</Text>
        </View>
      ) : sortedUsers.length === 0 ? (
        <View style={styles.emptyContainer}>
          <Icon name="message-circle" size={64} color={COLORS.textMuted} />
          <Text style={styles.emptyTitle}>No Conversations</Text>
          <Text style={styles.emptyText}>
            When other users join, they'll appear here
          </Text>
        </View>
      ) : (
        <FlatList
          data={sortedUsers}
          keyExtractor={(item) => item._id}
          renderItem={renderUserItem}
          contentContainerStyle={styles.listContent}
          showsVerticalScrollIndicator={false}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={handleRefresh}
              tintColor={themeColors.primary}
              colors={[themeColors.primary]}
            />
          }
        />
      )}
    </SafeAreaView>
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
    paddingHorizontal: SPACING.sm,
    paddingVertical: SPACING.md,
    borderBottomWidth: 1,
  },
  backButton: {
    padding: SPACING.sm,
  },
  headerTitle: {
    flex: 1,
    fontSize: FONT_SIZES.xl,
    fontWeight: '700',
    color: COLORS.textPrimary,
    marginLeft: SPACING.sm,
  },
  headerActions: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  headerActionButton: {
    padding: SPACING.sm,
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
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: SPACING.xxl,
  },
  emptyTitle: {
    fontSize: FONT_SIZES.xl,
    fontWeight: '600',
    color: COLORS.textMuted,
    marginTop: SPACING.lg,
  },
  emptyText: {
    fontSize: FONT_SIZES.md,
    color: COLORS.textDim,
    marginTop: SPACING.sm,
    textAlign: 'center',
  },
  listContent: {
    paddingVertical: SPACING.sm,
  },
  userItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: SPACING.lg,
    paddingVertical: SPACING.md,
  },
  avatarContainer: {
    position: 'relative',
  },
  avatar: {
    width: 56,
    height: 56,
    borderRadius: 28,
  },
  avatarPlaceholder: {
    backgroundColor: COLORS.zinc700,
    justifyContent: 'center',
    alignItems: 'center',
  },
  avatarText: {
    color: COLORS.textPrimary,
    fontSize: FONT_SIZES.xl,
    fontWeight: '600',
  },
  onlineIndicator: {
    position: 'absolute',
    bottom: 2,
    right: 2,
    width: 14,
    height: 14,
    borderRadius: 7,
    borderWidth: 2,
    borderColor: COLORS.background,
  },
  userInfo: {
    flex: 1,
    marginLeft: SPACING.md,
  },
  userNameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  userName: {
    flex: 1,
    fontSize: FONT_SIZES.lg,
    fontWeight: '600',
    color: COLORS.textPrimary,
  },
  timeText: {
    fontSize: FONT_SIZES.sm,
    color: COLORS.textMuted,
    marginLeft: SPACING.sm,
  },
  lastMessageRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 4,
  },
  playingContainer: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  lastMessage: {
    flex: 1,
    fontSize: FONT_SIZES.md,
    color: COLORS.textMuted,
  },
  unreadBadge: {
    minWidth: 20,
    height: 20,
    borderRadius: 10,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 6,
    marginLeft: SPACING.sm,
  },
  unreadText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#FFFFFF',
  },
});

export default MessagesScreen;
