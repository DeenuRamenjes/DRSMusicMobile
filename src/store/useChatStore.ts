import { create } from 'zustand';

interface Message {
    _id: string;
    senderId: string;
    receiverId: string;
    content: string;
    createdAt: string;
}

interface ChatUser {
    googleId: string;
    fullName: string;
    imageUrl: string;
}

interface ChatState {
    messages: Message[];
    users: ChatUser[];
    selectedUser: ChatUser | null;
    isLoading: boolean;
    unreadCount: number;

    // Actions
    setSelectedUser: (user: ChatUser | null) => void;
    fetchUsers: () => Promise<void>;
    fetchMessages: (userId: string) => Promise<void>;
    sendMessage: (receiverId: string, content: string) => Promise<void>;
    setUnreadCount: (count: number) => void;
}

export const useChatStore = create<ChatState>((set) => ({
    messages: [],
    users: [],
    selectedUser: null,
    isLoading: false,
    unreadCount: 0,

    setSelectedUser: (user) => set({ selectedUser: user }),

    fetchUsers: async () => {
        // Placeholder for fetching users
        set({ isLoading: true });
        set({ users: [], isLoading: false });
    },

    fetchMessages: async (userId: string) => {
        // Placeholder for fetching messages
        console.log(`Fetching messages for ${userId}`);
        set({ isLoading: true });
        set({ messages: [], isLoading: false });
    },

    sendMessage: async (receiverId: string, content: string) => {
        // Placeholder for sending messages
        console.log(`Sending message to ${receiverId}: ${content}`);
    },

    setUnreadCount: (count) => set({ unreadCount: count }),
}));
