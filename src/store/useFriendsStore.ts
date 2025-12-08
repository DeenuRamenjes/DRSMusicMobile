import { create } from 'zustand';
import axiosInstance from '../api/axios';
import { User, Message } from '../types';
import { io, Socket } from 'socket.io-client';
import { Platform } from 'react-native';

// Backend URL for socket connection
const BACKEND_PORT = 5000;
const LOCAL_IP = '192.168.1.40';
const SOCKET_URL = Platform.OS === 'android'
    ? `http://${LOCAL_IP}:${BACKEND_PORT}`
    : `http://localhost:${BACKEND_PORT}`;

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

    // Actions
    fetchUsers: () => Promise<void>;
    fetchLastSeen: () => Promise<void>;
    initSocket: (userId: string) => void;
    disconnectSocket: () => void;
    updateActivity: (songTitle: string, artist: string) => void;
    setSelectedUser: (user: User | null) => void;
    fetchMessages: (userId: string) => Promise<void>;
    sendMessage: (receiverId: string, senderId: string, content: string) => void;
}

// Create socket instance
let socketInstance: Socket | null = null;

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
            console.log('Could not fetch last seen data:', error);
        }
    },

    initSocket: (userId: string) => {
        if (get().isConnected || socketInstance?.connected) {
            return;
        }

        socketInstance = io(SOCKET_URL, {
            autoConnect: false,
            withCredentials: true,
            auth: { userId },
        });

        set({ socket: socketInstance });

        socketInstance.connect();
        socketInstance.emit('user_connected', userId);

        socketInstance.on('connect', () => {
            console.log('✅ Socket connected');
            set({ isConnected: true });
        });

        socketInstance.on('disconnect', () => {
            console.log('❌ Socket disconnected');
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

        socketInstance.on('activity_updated', ({ userId: activityUserId, activity }: { userId: string; activity: string }) => {
            set((state) => {
                const newActivities = new Map(state.userActivities);
                newActivities.set(activityUserId, activity);
                return { userActivities: newActivities };
            });
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

        socketInstance.on('receive_message', (message: Message) => {
            const state = get();
            const { selectedUser } = state;
            const conversationActive =
                selectedUser &&
                (message.senderId === selectedUser.clerkId || message.receiverId === selectedUser.clerkId);

            if (conversationActive) {
                set((prev) => ({
                    messages: [...prev.messages, message],
                }));
            }
        });

        socketInstance.on('message_sent', (message: Message) => {
            const currentUser = get().selectedUser;
            if (currentUser && (message.senderId === currentUser.clerkId || message.receiverId === currentUser.clerkId)) {
                set((state) => {
                    // Check if message already exists
                    const messageExists = state.messages.some(m => m._id === message._id);
                    if (!messageExists) {
                        return { messages: [...state.messages, message] };
                    }
                    return state;
                });
            }
        });

        socketInstance.on('error', (error: string) => {
            console.error('Socket error:', error);
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
        if (socket && get().isConnected) {
            const activity = `Playing ${songTitle} by ${artist}`;
            socket.emit('update_activity', activity);
        }
    },

    setSelectedUser: (user: User | null) => {
        set({ selectedUser: user });
    },

    fetchMessages: async (userId: string) => {
        set({ isLoading: true, error: null });
        try {
            const response = await axiosInstance.get(`/users/messages/${userId}`);
            set({ messages: response.data });
        } catch (error: any) {
            console.error('Error fetching messages:', error);
            set({ error: error.response?.data?.message || 'Failed to fetch messages' });
        } finally {
            set({ isLoading: false });
        }
    },

    sendMessage: (receiverId: string, senderId: string, content: string) => {
        const socket = get().socket;
        if (!socket) return;

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
