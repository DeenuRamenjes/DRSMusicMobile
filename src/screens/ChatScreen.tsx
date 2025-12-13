import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Image,
  TextInput,
  FlatList,
  KeyboardAvoidingView,
  Platform,
  ActivityIndicator,
  Keyboard,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation, useRoute, RouteProp } from '@react-navigation/native';
import Icon from 'react-native-vector-icons/Feather';
import { COLORS, SPACING, FONT_SIZES, BORDER_RADIUS } from '../constants/theme';
import { useThemeStore } from '../store/useThemeStore';
import { useFriendsStore, formatRelativeTime } from '../store/useFriendsStore';
import { useAuthStore } from '../store/useAuthStore';
import { User, Message } from '../types';
import { getFullImageUrl } from '../config';

type ChatScreenRouteProp = RouteProp<{ Chat: { user: User } }, 'Chat'>;

// Format time for messages
const formatMessageTime = (dateString: string) => {
  const date = new Date(dateString);
  return date.toLocaleTimeString('en-US', {
    hour: '2-digit',
    minute: '2-digit',
    hour12: true,
  });
};

// Format date for message groups
const formatMessageDate = (dateString: string) => {
  const date = new Date(dateString);
  const today = new Date();
  const yesterday = new Date(today);
  yesterday.setDate(yesterday.getDate() - 1);

  if (date.toDateString() === today.toDateString()) {
    return 'Today';
  } else if (date.toDateString() === yesterday.toDateString()) {
    return 'Yesterday';
  } else {
    return date.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: date.getFullYear() !== today.getFullYear() ? 'numeric' : undefined,
    });
  }
};

// Message Bubble Component
const MessageBubble = ({
  message,
  isOwn,
  avatarUrl,
  themeColor,
}: {
  message: Message;
  isOwn: boolean;
  avatarUrl: string;
  themeColor: string;
}) => {
  return (
    <View style={[styles.messageBubbleContainer, isOwn && styles.messageBubbleContainerOwn]}>
      {!isOwn && (
        <View style={styles.avatarContainer}>
          {avatarUrl ? (
            <Image source={{ uri: getFullImageUrl(avatarUrl) }} style={styles.messageAvatar} />
          ) : (
            <View 
            // style={[styles.messageAvatar, styles.messageAvatarPlaceholder]}
            >
              {/* <Text style={styles.avatarText}>?</Text> */}
            </View>
          )}
        </View>
      )}
      <View style={[styles.messageBubble, isOwn ? { backgroundColor: themeColor } : styles.messageBubbleReceived]}>
        <Text style={[styles.messageText, isOwn && styles.messageTextOwn]}>{message.content}</Text>
        <Text style={[styles.messageTime, isOwn && styles.messageTimeOwn]}>
          {formatMessageTime(message.createdAt)}
        </Text>
      </View>
    </View>
  );
};

// Date Separator Component
const DateSeparator = ({ date }: { date: string }) => (
  <View style={styles.dateSeparator}>
    <View style={styles.dateSeparatorLine} />
    <Text style={styles.dateSeparatorText}>{date}</Text>
    <View style={styles.dateSeparatorLine} />
  </View>
);

export const ChatScreen = () => {
  const navigation = useNavigation();
  const route = useRoute<ChatScreenRouteProp>();
  const { user: chatUser } = route.params;
  
  const { user: authUser } = useAuthStore();
  const { colors: themeColors } = useThemeStore();
  const {
    messages,
    fetchMessages,
    sendMessage,
    isLoading,
    onlineUsers,
    userActivities,
    setSelectedUser,
    setChatScreenActive,
    clearUnreadCount,
  } = useFriendsStore();

  const [messageText, setMessageText] = useState('');
  const flatListRef = useRef<FlatList>(null);
  const [isTyping, setIsTyping] = useState(false);

  // Get user IDs
  const currentUserId = authUser?.clerkId || authUser?.id || '';
  const chatUserId = chatUser.clerkId || chatUser._id;

  // Check if user is online
  const isOnline = onlineUsers.has(chatUserId);
  const activity = userActivities.get(chatUserId);
  const isPlaying = activity && activity !== 'Idle';

  // Set selected user and fetch messages
  useEffect(() => {
    setSelectedUser(chatUser);
    setChatScreenActive(true);
    clearUnreadCount(chatUserId);
    
    if (chatUserId) {
      fetchMessages(chatUserId);
    }
    
    return () => {
      setSelectedUser(null);
      setChatScreenActive(false);
    };
  }, [chatUserId]);

  // Scroll to bottom when new messages arrive
  useEffect(() => {
    if (messages.length > 0) {
      setTimeout(() => {
        flatListRef.current?.scrollToEnd({ animated: true });
      }, 100);
    }
  }, [messages.length]);

  const handleSend = useCallback(() => {
    if (!messageText.trim()) return;
    
    sendMessage(chatUserId, currentUserId, messageText.trim());
    setMessageText('');
    Keyboard.dismiss();
    
    // Scroll to bottom after sending
    setTimeout(() => {
      flatListRef.current?.scrollToEnd({ animated: true });
    }, 100);
  }, [messageText, chatUserId, currentUserId, sendMessage]);

  const handleBack = () => {
    navigation.goBack();
  };

  // Group messages by date
  const getMessageGroups = () => {
    const groups: { date: string; messages: Message[] }[] = [];
    let currentDate = '';

    messages.forEach((message) => {
      const messageDate = formatMessageDate(message.createdAt);
      if (messageDate !== currentDate) {
        currentDate = messageDate;
        groups.push({ date: messageDate, messages: [message] });
      } else {
        groups[groups.length - 1].messages.push(message);
      }
    });

    return groups;
  };

  const renderMessage = ({ item }: { item: Message }) => {
    const isOwn = item.senderId === currentUserId;
    return (
      <MessageBubble
        message={item}
        isOwn={isOwn}
        avatarUrl={isOwn ? (authUser?.imageUrl || '') : (chatUser.imageUrl || '')}
        themeColor={themeColors.primary}
      />
    );
  };

  // Status text
  const getStatusText = () => {
    if (isPlaying && activity) {
      const songInfo = activity.replace('Playing ', '');
      return `🎵 ${songInfo}`;
    }
    if (isOnline) {
      return 'Online';
    }
    return 'Offline';
  };

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      {/* Header - WhatsApp Style */}
      <View style={[styles.header, { borderBottomColor: themeColors.primaryMuted }]}>
        <TouchableOpacity onPress={handleBack} style={styles.backButton}>
          <Icon name="arrow-left" size={24} color={COLORS.textPrimary} />
        </TouchableOpacity>

        <TouchableOpacity style={styles.userInfo} activeOpacity={0.7}>
          <View style={styles.avatarWrapper}>
            {chatUser.imageUrl ? (
              <Image
                source={{ uri: getFullImageUrl(chatUser.imageUrl) }}
                style={styles.headerAvatar}
              />
            ) : (
              <View style={[styles.headerAvatar, styles.headerAvatarPlaceholder]}>
                <Text style={styles.headerAvatarText}>{chatUser.name?.[0] || '?'}</Text>
              </View>
            )}
            {isOnline && <View style={[styles.onlineIndicator, { backgroundColor: themeColors.primary }]} />}
          </View>

          <View style={styles.headerTextContainer}>
            <Text style={styles.headerName} numberOfLines={1}>{chatUser.name}</Text>
            <Text style={[styles.headerStatus, isOnline && { color: themeColors.primary }]} numberOfLines={1}>
              {getStatusText()}
            </Text>
          </View>
        </TouchableOpacity>

        <View style={styles.headerActions}>
          <TouchableOpacity style={styles.headerActionButton}>
            <Icon name="more-vertical" size={20} color={COLORS.textPrimary} />
          </TouchableOpacity>
        </View>
      </View>

      {/* Messages */}
      <KeyboardAvoidingView
        style={styles.messagesContainer}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        keyboardVerticalOffset={Platform.OS === 'ios' ? 90 : 20}
      >
        {isLoading ? (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color={themeColors.primary} />
          </View>
        ) : messages.length === 0 ? (
          <View style={styles.emptyContainer}>
            <Icon name="message-circle" size={64} color={COLORS.textMuted} />
            <Text style={styles.emptyText}>No messages yet</Text>
            <Text style={styles.emptySubtext}>Send a message to start the conversation</Text>
          </View>
        ) : (
          <FlatList
            ref={flatListRef}
            data={messages}
            keyExtractor={(item) => item._id}
            renderItem={renderMessage}
            contentContainerStyle={styles.messagesList}
            showsVerticalScrollIndicator={false}
            onContentSizeChange={() => flatListRef.current?.scrollToEnd({ animated: false })}
          />
        )}

        {/* Message Input - WhatsApp Style */}
        <View style={styles.inputContainer}>
          <View style={styles.inputWrapper}>
            <TouchableOpacity style={styles.emojiButton}>
              <Icon name="smile" size={22} color={COLORS.textMuted} />
            </TouchableOpacity>
            <TextInput
              style={styles.textInput}
              placeholder="Type a message"
              placeholderTextColor={COLORS.textMuted}
              value={messageText}
              onChangeText={setMessageText}
              multiline
              maxLength={1000}
            />
          <TouchableOpacity
            style={styles.attachButton}
            onPress={handleSend}
            disabled={!messageText.trim()}
          >
            <Icon
              name={messageText.trim() ? 'send' : 'mic'}
              size={20}
              color={COLORS.textPrimary}
            />
          </TouchableOpacity>
          </View>

           <TouchableOpacity
            style={[styles.sendButton, { backgroundColor: themeColors.primary }]}
          >
            <Icon
              name="audio-off"
              size={20}
              color={COLORS.textPrimary}
            />
          </TouchableOpacity>

        </View>
      </KeyboardAvoidingView>
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
  userInfo: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    marginLeft: SPACING.xs,
  },
  avatarWrapper: {
    position: 'relative',
  },
  headerAvatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
  },
  headerAvatarPlaceholder: {
    backgroundColor: COLORS.zinc700,
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerAvatarText: {
    color: COLORS.textPrimary,
    fontSize: FONT_SIZES.lg,
    fontWeight: '600',
  },
  onlineIndicator: {
    position: 'absolute',
    bottom: 0,
    right: 0,
    width: 12,
    height: 12,
    borderRadius: 6,
    borderWidth: 2,
    borderColor: COLORS.background,
  },
  headerTextContainer: {
    flex: 1,
    marginLeft: SPACING.md,
  },
  headerName: {
    fontSize: FONT_SIZES.lg,
    fontWeight: '600',
    color: COLORS.textPrimary,
  },
  headerStatus: {
    fontSize: FONT_SIZES.sm,
    color: COLORS.textMuted,
    marginTop: 2,
  },
  headerActions: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  headerActionButton: {
    padding: SPACING.sm,
  },
  messagesContainer: {
    flex: 1,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: SPACING.xxl,
  },
  emptyText: {
    fontSize: FONT_SIZES.xl,
    fontWeight: '600',
    color: COLORS.textMuted,
    marginTop: SPACING.lg,
  },
  emptySubtext: {
    fontSize: FONT_SIZES.md,
    color: COLORS.textDim,
    marginTop: SPACING.sm,
    textAlign: 'center',
  },
  messagesList: {
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.md,
  },
  messageBubbleContainer: {
    flexDirection: 'row',
    marginBottom: SPACING.sm,
    alignItems: 'flex-end',
  },
  messageBubbleContainerOwn: {
    justifyContent: 'flex-end',
  },
  avatarContainer: {
    marginRight: SPACING.sm,
  },
  messageAvatar: {
    width: 28,
    height: 28,
    borderRadius: 14,
  },
  messageAvatarPlaceholder: {
    backgroundColor: COLORS.zinc700,
    justifyContent: 'center',
    alignItems: 'center',
  },
  avatarText: {
    color: COLORS.textPrimary,
    fontSize: 12,
    fontWeight: '600',
  },
  messageBubble: {
    maxWidth: '75%',
    paddingHorizontal: SPACING.lg,
    paddingVertical: SPACING.md,
    borderRadius: BORDER_RADIUS.xl,
  },
  messageBubbleReceived: {
    backgroundColor: COLORS.zinc800,
    borderBottomLeftRadius: BORDER_RADIUS.sm,
  },
  messageText: {
    fontSize: FONT_SIZES.md,
    color: COLORS.textPrimary,
    lineHeight: 20,
  },
  messageTextOwn: {
    color: '#FFFFFF',
  },
  messageTime: {
    fontSize: 11,
    color: COLORS.textMuted,
    marginTop: SPACING.xs,
    alignSelf: 'flex-end',
  },
  messageTimeOwn: {
    color: 'rgba(255, 255, 255, 0.7)',
  },
  dateSeparator: {
    flexDirection: 'row',
    alignItems: 'center',
    marginVertical: SPACING.lg,
  },
  dateSeparatorLine: {
    flex: 1,
    height: 1,
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
  },
  dateSeparatorText: {
    fontSize: FONT_SIZES.sm,
    color: COLORS.textMuted,
    marginHorizontal: SPACING.md,
    fontWeight: '500',
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.sm,
    paddingBottom: SPACING.sm,
    gap: SPACING.sm,
    backgroundColor: COLORS.background,
  },
  inputWrapper: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'flex-end',
    backgroundColor: COLORS.zinc800,
    borderRadius: 24,
    paddingHorizontal: SPACING.sm,
    minHeight: 48,
  },
  emojiButton: {
    padding: SPACING.sm,
    paddingBottom: 12,
  },
  textInput: {
    flex: 1,
    fontSize: FONT_SIZES.md,
    padding: SPACING.sm,
    paddingBottom: 16,
    color: COLORS.textPrimary,
    maxHeight: 100,
    paddingVertical: Platform.OS === 'ios' ? SPACING.md : SPACING.sm,
    paddingHorizontal: SPACING.xs,
  },
  attachButton: {
    padding: SPACING.sm,
    paddingBottom: 14,
  },
  sendButton: {
    width: 48,
    height: 48,
    borderRadius: 24,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 0,
  },
});

export default ChatScreen;
