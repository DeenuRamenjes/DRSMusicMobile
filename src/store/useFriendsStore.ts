import { create } from 'zustand';
import axiosInstance from '../api/axios';
import { User, Message } from '../types';
import { io, Socket } from 'socket.io-client';
import { Vibration } from 'react-native';
import { getSocketUrl } from '../config';
import { showBroadcastNotification, showMessageNotification } from '../services/NotificationService';

// Notification callback - to be set by notification service
let notificationCallback: ((title: string, body: string, data?: any) => void) | null = null;

export const setNotificationCallback = (callback: (title: string, body: string, data?: any) => void) => {
    notificationCallback = callback;
};

interface FriendsState {
    users: User[];
    isLoading: boolean;
    error: string | null;
    socket: Socket | null;
    isConnected: boolean;
    onlineUsers: Set<string>;
    userActivities: Map<string, string>;
    userLastSeen: Map<string, number>;
    messages: Message[];
    selectedUser: User | null;
    unreadCounts: Record<string, number>;
    isChatScreenActive: boolean;
    lastMessages: Record<string, Message>; // Last message per user

    // Actions
    fetchUsers: () => Promise<void>;
    fetchLastSeen: () => Promise<void>;
    fetchLastMessages: () => Promise<void>;
    initSocket: (userId: string) => void;
    disconnectSocket: () => void;
    updateActivity: (songTitle: string, artist: string) => void;
    clearActivity: () => void;
    setSelectedUser: (user: User | null) => void;
    fetchMessages: (userId: string) => Promise<void>;
    sendMessage: (receiverId: string, senderId: string, content: string) => void;
    sendSongMessage: (receiverId: string, senderId: string, song: {
        songId: string;
        title: string;
        artist: string;
        imageUrl: string;
        audioUrl: string;
        duration: string | number;
    }) => void;
    setChatScreenActive: (active: boolean) => void;
    clearUnreadCount: (userId: string) => void;
}

// Create socket instance
let socketInstance: Socket | null = null;
let currentUserId: string | null = null;

export const useFriendsStore = create<FriendsState>((set, get) => ({
    users: [],
    isLoading: false,
    error: null,
    socket: null,
    isConnected: false,
    onlineUsers: new Set(),
    userActivities: new Map(),
    userLastSeen: new Map(),
    messages: [],
    selectedUser: null,
    unreadCounts: {},
    isChatScreenActive: false,
    lastMessages: {},

    fetchUsers: async () => {
        set({ isLoading: true, error: null });
        try {
            const response = await axiosInstance.get('/users');
            set({ users: response.data });

            // Also fetch last seen data
            get().fetchLastSeen();
        } catch (error: any) {
            console.error('Error fetching users:', error);
            set({ error: error.response?.data?.message || 'Failed to fetch users' });
        } finally {
            set({ isLoading: false });
        }
    },

    fetchLastSeen: async () => {
        try {
            const response = await axiosInstance.get('/users/last-seen');
            if (response.data && Array.isArray(response.data)) {
                set((state) => {
                    const newLastSeen = new Map(state.userLastSeen);
                    response.data.forEach((item: [string, number]) => {
                        const [userId, timestamp] = item;
                        newLastSeen.set(userId, timestamp);
                    });
                    return { userLastSeen: newLastSeen };
                });
            }
        } catch (error) {
        }
    },

    fetchLastMessages: async () => {
        try {
            const users = get().users;
            const lastMessagesMap: Record<string, Message> = {};

            // Fetch messages for each user and get the last one
            await Promise.all(
                users.map(async (user) => {
                    try {
                        const response = await axiosInstance.get(`/users/messages/${user.googleId}`);
                        const messages = response.data;
                        if (messages && messages.length > 0) {
                            // Get the last message (messages are sorted by createdAt)
                            lastMessagesMap[user.googleId] = messages[messages.length - 1];
                        }
                    } catch (error) {
                        // Ignore errors for individual users
                    }
                })
            );

            set({ lastMessages: lastMessagesMap });
        } catch (error) {
        }
    },

    initSocket: (userId: string) => {
        if (get().isConnected || socketInstance?.connected) {
            return;
        }

        // Store userId for later use in updateActivity
        currentUserId = userId;

        socketInstance = io(getSocketUrl(), {
            autoConnect: false,
            withCredentials: true,
            auth: { userId },
        });

        set({ socket: socketInstance });

        socketInstance.connect();
        socketInstance.emit('user_connected', userId);

        socketInstance.on('connect', () => {
            set({ isConnected: true });

            // Fetch users list to have sender names ready for notifications
            get().fetchUsers();
        });

        socketInstance.on('disconnect', () => {
            set({ isConnected: false });
        });

        socketInstance.on('users_online', (users: string[]) => {
            set({ onlineUsers: new Set(users) });
        });

        socketInstance.on('activities', (activities: [string, string][]) => {
            set({ userActivities: new Map(activities) });
        });

        socketInstance.on('user_connected', (connectedUserId: string) => {
            set((state) => ({
                onlineUsers: new Set([...state.onlineUsers, connectedUserId]),
            }));
        });

        socketInstance.on('user_disconnected', (disconnectedUserId: string) => {
            set((state) => {
                const newOnlineUsers = new Set(state.onlineUsers);
                newOnlineUsers.delete(disconnectedUserId);
                return { onlineUsers: newOnlineUsers };
            });
        });

        socketInstance.on('activity_updated', (data: any) => {

            // Handle different possible data formats from server
            let activityUserId: string | undefined;
            let activity: string | undefined;

            if (data && typeof data === 'object') {
                // Try different property names the server might use
                activityUserId = data.userId || data.user_id || data.googleId || data.id;
                activity = data.activity || data.status || data.message;
            } else if (Array.isArray(data) && data.length >= 2) {
                // Server might send as array [userId, activity]
                activityUserId = data[0];
                activity = data[1];
            }

            if (activityUserId && activity) {
                set((state) => {
                    const newActivities = new Map(state.userActivities);
                    newActivities.set(activityUserId!, activity!);
                    return { userActivities: newActivities };
                });
            }
        });

        socketInstance.on('last_seen_updated', (lastSeenData: [string, number][]) => {
            set((state) => {
                const newLastSeen = new Map(state.userLastSeen);
                lastSeenData.forEach(([lastSeenUserId, timestamp]) => {
                    newLastSeen.set(lastSeenUserId, timestamp);
                });
                return { userLastSeen: newLastSeen };
            });
        });

        socketInstance.on('receive_message', async (message: Message) => {
            const state = get();
            const { selectedUser, users, isChatScreenActive } = state;
            const isActiveConversation =
                isChatScreenActive &&
                selectedUser &&
                message.senderId === selectedUser.googleId;

            // Always add to messages if it's part of the current conversation
            if (selectedUser &&
                (message.senderId === selectedUser.googleId || message.receiverId === selectedUser.googleId)) {
                set((prev) => ({
                    messages: [...prev.messages, message],
                }));
            }

            // If not in active conversation with this user, show notification
            if (!isActiveConversation) {
                // Increment unread count
                set((prev) => ({
                    unreadCounts: {
                        ...prev.unreadCounts,
                        [message.senderId]: (prev.unreadCounts[message.senderId] || 0) + 1,
                    },
                }));

                // Vibrate for notification
                Vibration.vibrate(100);

                // Find sender info for notification - check local cache first
                let sender = users.find((u) => u.googleId === message.senderId);

                // If sender not in local users, refresh the users list
                if (!sender && users.length === 0) {
                    try {
                        const response = await axiosInstance.get('/users');
                        if (response.data && Array.isArray(response.data)) {
                            set({ users: response.data });
                            sender = response.data.find((u: User) => u.googleId === message.senderId);
                        }
                    } catch (error) {
                        console.error('[Socket] Could not fetch users:', error);
                    }
                }

                const senderName = sender?.name || sender?.fullName || sender?.emailAddress?.split('@')[0] || 'Someone';

                // Show in-app notification via callback
                if (notificationCallback) {
                    notificationCallback(senderName, message.content, {
                        userId: message.senderId,
                        messageId: message._id,
                    });
                }

                // Also show system push notification
                showMessageNotification(senderName, message.content, {
                    userId: message.senderId,
                    messageId: message._id,
                });
            }
        });

        socketInstance.on('message_sent', (message: Message) => {
            const currentUser = get().selectedUser;
            if (currentUser && (message.senderId === currentUser.googleId || message.receiverId === currentUser.googleId)) {
                set((state) => {
                    // Check if message already exists by _id
                    const messageExists = state.messages.some(m => m._id === message._id);
                    if (messageExists) {
                        return state;
                    }

                    // Find and replace a temp message with matching content (sent by current user)
                    // Temp messages have IDs that are numeric strings (Date.now())
                    const tempIndex = state.messages.findIndex(m =>
                        m.senderId === message.senderId &&
                        m.receiverId === message.receiverId &&
                        m.content === message.content &&
                        (m._id.startsWith('temp_') || /^\d+$/.test(m._id))
                    );

                    if (tempIndex !== -1) {
                        // Replace temp message with real one from server
                        const newMessages = [...state.messages];
                        newMessages[tempIndex] = message;
                        return { messages: newMessages };
                    }

                    // If no temp message found, add the new message
                    return { messages: [...state.messages, message] };
                });
            }
        });

        socketInstance.on('error', (error: string) => {
            console.error('Socket error:', error);
        });

        // Listen for broadcast notifications from admin
        socketInstance.on('broadcast_notification', (notification: {
            id: string;
            title?: string;
            message: string;
            imageUrl?: string;
            link?: string;
            createdAt: string;
        }) => {

            // Vibrate the device
            Vibration.vibrate([0, 250, 100, 250]);

            // Show push notification (real system notification)
            showBroadcastNotification(
                notification.title || 'DRS Music',
                notification.message,
                {
                    id: notification.id,
                    type: 'broadcast',
                    imageUrl: notification.imageUrl,
                    link: notification.link,
                }
            );
        });
    },

    disconnectSocket: () => {
        if (socketInstance) {
            socketInstance.disconnect();
            socketInstance = null;
            set({ isConnected: false, socket: null });
        }
    },

    updateActivity: (songTitle: string, artist: string) => {
        const socket = get().socket;
        const activity = `Playing ${songTitle} by ${artist}`;
        // Check socket.connected directly as isConnected state might be stale
        if (socket && socket.connected && currentUserId) {
            // Server expects { userId, activity } object
            socket.emit('update_activity', { userId: currentUserId, activity });
        } else {
            // Silently skip if not ready - this is common during initial load or reconnections
        }
    },

    clearActivity: () => {
        const socket = get().socket;
        // Check socket.connected directly as isConnected state might be stale
        if (socket && socket.connected && currentUserId) {
            // Server expects { userId, activity } object
            socket.emit('update_activity', { userId: currentUserId, activity: 'Idle' });
        }
    },

    setSelectedUser: (user: User | null) => {
        set({ selectedUser: user });
    },

    fetchMessages: async (userId: string) => {
        set({ isLoading: true, error: null });
        try {
            const response = await axiosInstance.get(`/users/messages/${userId}`);
            set({ messages: response.data || [] });
        } catch (error: any) {
            console.error('❌ Error fetching messages:', error);
            set({
                error: error.response?.data?.message || 'Failed to fetch messages',
                messages: [] // Clear messages on error
            });
        } finally {
            set({ isLoading: false });
        }
    },

    sendMessage: (receiverId: string, senderId: string, content: string) => {
        const socket = get().socket;
        const isConnected = get().isConnected;

        if (!socket || !isConnected) {
            console.error('❌ Cannot send message: Socket not connected');
            // Still add message locally for UI feedback
            const tempMessage: Message = {
                _id: 'temp_' + Date.now().toString(),
                senderId,
                receiverId,
                content,
                createdAt: new Date().toISOString(),
            };
            set((state) => ({
                messages: [...state.messages, tempMessage],
            }));
            return;
        }

        // Create a temporary message for immediate UI update
        const tempMessage: Message = {
            _id: Date.now().toString(),
            senderId,
            receiverId,
            content,
            createdAt: new Date().toISOString(),
        };

        // Update UI immediately
        set((state) => ({
            messages: [...state.messages, tempMessage],
        }));

        // Send via socket
        socket.emit('send_message', { receiverId, senderId, content });
    },

    sendSongMessage: (receiverId: string, senderId: string, song: {
        songId: string;
        title: string;
        artist: string;
        imageUrl: string;
        audioUrl: string;
        duration: string | number;
    }) => {
        const socket = get().socket;
        const isConnected = get().isConnected;

        if (!socket || !isConnected) {
            console.error('❌ Cannot send song message: Socket not connected');
            return;
        }

        const content = `🎵 Shared a song: ${song.title}`;

        // Create a temporary message for immediate UI update
        const tempMessage: Message = {
            _id: Date.now().toString(),
            senderId,
            receiverId,
            content,
            createdAt: new Date().toISOString(),
            messageType: 'song',
            songData: song,
        };

        // Update UI immediately
        set((state) => ({
            messages: [...state.messages, tempMessage],
        }));

        // Send via socket with song data
        socket.emit('send_message', {
            receiverId,
            senderId,
            content,
            messageType: 'song',
            songData: song
        });
    },

    setChatScreenActive: (active: boolean) => {
        set({ isChatScreenActive: active });
    },

    clearUnreadCount: (userId: string) => {
        set((state) => ({
            unreadCounts: {
                ...state.unreadCounts,
                [userId]: 0,
            },
        }));
    },
}));

// Helper function to format relative time
export const formatRelativeTime = (timestamp: number): string => {
    if (!timestamp || isNaN(timestamp)) return 'Unknown';

    const now = Date.now();
    const diff = now - timestamp;

    const minute = 60 * 1000;
    const hour = 60 * minute;
    const day = 24 * hour;
    const week = 7 * day;

    if (diff < minute) {
        return 'Just now';
    } else if (diff < hour) {
        const mins = Math.floor(diff / minute);
        return `${mins}m ago`;
    } else if (diff < day) {
        const hours = Math.floor(diff / hour);
        return `${hours}h ago`;
    } else if (diff < week) {
        const days = Math.floor(diff / day);
        return `${days}d ago`;
    } else {
        const date = new Date(timestamp);
        return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
    }
};

// Helper function to get total unread count
export const getTotalUnreadCount = (): number => {
    const unreadCounts = useFriendsStore.getState().unreadCounts;
    return Object.values(unreadCounts).reduce((total, count) => total + count, 0);
};
