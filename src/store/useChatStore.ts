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
        // TODO: Implement API call
        set({ isLoading: true });
        try {
            // const response = await axiosInstance.get('/users');
            // set({ users: response.data });
            set({ users: [], isLoading: false });
        } catch (error) {
            console.error('Error fetching users:', error);
            set({ isLoading: false });
        }
    },

    fetchMessages: async (userId: string) => {
        set({ isLoading: true });
        try {
            // const response = await axiosInstance.get(`/messages/${userId}`);
            // set({ messages: response.data });
            set({ messages: [], isLoading: false });
        } catch (error) {
            console.error('Error fetching messages:', error);
            set({ isLoading: false });
        }
    },

    sendMessage: async (receiverId: string, content: string) => {
        try {
            // await axiosInstance.post('/messages', { receiverId, content });
        } catch (error) {
            console.error('Error sending message:', error);
        }
    },

    setUnreadCount: (count) => set({ unreadCount: count }),
}));
