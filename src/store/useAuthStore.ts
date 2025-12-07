import { create } from 'zustand';
import AsyncStorage from '@react-native-async-storage/async-storage';
import axiosInstance from '../api/axios';
import { AuthUser } from '../types';

// Storage helpers using AsyncStorage
const getToken = async (): Promise<string | null> => {
    try {
        return await AsyncStorage.getItem('authToken');
    } catch {
        return null;
    }
};

const setToken = async (token: string): Promise<void> => {
    try {
        await AsyncStorage.setItem('authToken', token);
    } catch (error) {
        console.error('Failed to save token:', error);
    }
};

const removeToken = async (): Promise<void> => {
    try {
        await AsyncStorage.removeItem('authToken');
    } catch (error) {
        console.error('Failed to remove token:', error);
    }
};

interface AuthState {
    isAuthenticated: boolean;
    isLoading: boolean;
    isAdmin: boolean;
    user: AuthUser | null;
    error: string | null;

    // Actions
    login: (userData: any, token: string) => void;
    logout: () => void;
    checkAuth: () => Promise<void>;
    checkAdminStatus: () => Promise<void>;
    setIsLoading: (loading: boolean) => void;
    reset: () => void;
}

export const useAuthStore = create<AuthState>((set, get) => ({
    isAuthenticated: false,
    isLoading: true,
    isAdmin: false,
    user: null,
    error: null,

    login: (userData: any, token: string) => {
        // Store token in AsyncStorage
        setToken(token);

        // Parse user data from Clerk format
        const user: AuthUser = {
            id: userData.id || userData.clerkId || '',
            clerkId: userData.clerkId || userData.id || '',
            name: userData.name || userData.fullName || userData.firstName || '',
            fullName: userData.fullName || userData.name || `${userData.firstName || ''} ${userData.lastName || ''}`.trim(),
            username: userData.username || '',
            emailAddress: userData.emailAddress || userData.email ||
                (userData.emailAddresses?.[0]?.emailAddress) || '',
            imageUrl: userData.imageUrl || userData.image || '',
            createdAt: userData.createdAt || new Date().toISOString(),
        };

        set({
            isAuthenticated: true,
            user,
            isLoading: false,
            error: null,
        });

        // Check admin status after login
        get().checkAdminStatus();
    },

    logout: () => {
        removeToken();
        set({
            isAuthenticated: false,
            user: null,
            isAdmin: false,
            isLoading: false,
            error: null,
        });
    },

    checkAuth: async () => {
        const token = await getToken();

        if (!token) {
            set({ isAuthenticated: false, isLoading: false, user: null });
            return;
        }

        try {
            set({ isLoading: true });
            // Verify token with backend
            const response = await axiosInstance.get('/auth/me');

            if (response.data) {
                const userData = response.data;
                const user: AuthUser = {
                    id: userData._id || userData.id || userData.clerkId || '',
                    clerkId: userData.clerkId || userData._id || '',
                    name: userData.name || userData.fullName || '',
                    fullName: userData.fullName || userData.name || '',
                    username: userData.username || '',
                    emailAddress: userData.emailAddress || userData.email || '',
                    imageUrl: userData.imageUrl || userData.image || '',
                    createdAt: userData.createdAt,
                };

                set({
                    isAuthenticated: true,
                    user,
                    isLoading: false,
                });

                // Check admin status
                get().checkAdminStatus();
            } else {
                set({ isAuthenticated: false, isLoading: false, user: null });
            }
        } catch (error: any) {
            console.error('Auth check failed:', error);
            // Token invalid, clear it
            removeToken();
            set({
                isAuthenticated: false,
                isLoading: false,
                user: null,
                error: error.response?.data?.message || 'Authentication failed',
            });
        }
    },

    checkAdminStatus: async () => {
        set({ isLoading: true, error: null });

        const state = get();
        const userEmail = state.user?.emailAddress || '';

        // List of admin emails - must match ADMIN_EMAILS in backend .env
        const adminEmails = [
            'deenuramenjes29@gmail.com',
            // Add more admin emails as needed
        ];

        // Try backend check first
        try {
            const response = await axiosInstance.get('/admin/check');
            set({ isAdmin: response.data.admin || false, isLoading: false });
            return;
        } catch (error: any) {
            // Backend auth failed (likely 401) - check locally by email
            const isAdmin = adminEmails.some(
                email => email.toLowerCase() === userEmail.toLowerCase()
            );
            set({
                isAdmin,
                isLoading: false,
                error: null
            });
        }
    },

    setIsLoading: (loading: boolean) => set({ isLoading: loading }),

    reset: () => {
        set({
            isAuthenticated: false,
            isLoading: false,
            isAdmin: false,
            user: null,
            error: null,
        });
    },
}));
