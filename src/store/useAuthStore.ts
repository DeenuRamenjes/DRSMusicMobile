import { create } from 'zustand';
import AsyncStorage from '@react-native-async-storage/async-storage';
import axiosInstance from '../api/axios';
import { AuthUser } from '../types';

// Storage keys
const AUTH_TOKEN_KEY = 'authToken';
const USER_DATA_KEY = 'userData';

// Storage helpers using AsyncStorage
const getToken = async (): Promise<string | null> => {
    try {
        return await AsyncStorage.getItem(AUTH_TOKEN_KEY);
    } catch {
        return null;
    }
};

const setToken = async (token: string): Promise<void> => {
    try {
        await AsyncStorage.setItem(AUTH_TOKEN_KEY, token);
    } catch (error) {
        console.error('Failed to save token:', error);
    }
};

const removeToken = async (): Promise<void> => {
    try {
        await AsyncStorage.removeItem(AUTH_TOKEN_KEY);
    } catch (error) {
        console.error('Failed to remove token:', error);
    }
};

// User data persistence
const getUserData = async (): Promise<AuthUser | null> => {
    try {
        const data = await AsyncStorage.getItem(USER_DATA_KEY);
        return data ? JSON.parse(data) : null;
    } catch {
        return null;
    }
};

const setUserData = async (user: AuthUser): Promise<void> => {
    try {
        await AsyncStorage.setItem(USER_DATA_KEY, JSON.stringify(user));
    } catch (error) {
        console.error('Failed to save user data:', error);
    }
};

const removeUserData = async (): Promise<void> => {
    try {
        await AsyncStorage.removeItem(USER_DATA_KEY);
    } catch (error) {
        console.error('Failed to remove user data:', error);
    }
};

interface AuthState {
    isAuthenticated: boolean;
    isLoading: boolean;
    user: AuthUser | null;
    error: string | null;

    // Actions
    login: (userData: any, token: string) => void;
    logout: () => void;
    checkAuth: () => Promise<void>;
    setIsLoading: (loading: boolean) => void;
    reset: () => void;
}

export const useAuthStore = create<AuthState>((set, get) => ({
    isAuthenticated: false,
    isLoading: true,
    user: null,
    error: null,

    login: (userData: any, token: string) => {
        // Parse user data
        const user: AuthUser = {
            id: userData.id || userData.clerkId || userData._id || '',
            clerkId: userData.clerkId || userData.id || '',
            name: userData.name || userData.fullName || userData.firstName || '',
            fullName: userData.fullName || userData.name || `${userData.firstName || ''} ${userData.lastName || ''}`.trim(),
            username: userData.username || '',
            emailAddress: userData.emailAddress || userData.email ||
                (userData.emailAddresses?.[0]?.emailAddress) || '',
            imageUrl: userData.imageUrl || userData.image || '',
            createdAt: userData.createdAt || new Date().toISOString(),
        };

        // Store token and user data in AsyncStorage (fire-and-forget)
        setToken(token);
        setUserData(user);

        set({
            isAuthenticated: true,
            user,
            isLoading: false,
            error: null,
        });
    },

    logout: () => {
        // Clear persisted data
        removeToken();
        removeUserData();

        set({
            isAuthenticated: false,
            user: null,
            isLoading: false,
            error: null,
        });
    },

    checkAuth: async () => {
        try {
            set({ isLoading: true });

            // First, check for stored token and user data
            const [token, storedUser] = await Promise.all([
                getToken(),
                getUserData(),
            ]);

            if (!token) {
                set({ isAuthenticated: false, isLoading: false, user: null });
                return;
            }

            if (storedUser) {
                set({
                    isAuthenticated: true,
                    user: storedUser,
                    isLoading: false,
                });

                try {
                    const response = await axiosInstance.get('/auth/me');
                    if (response.data) {
                        const userData = response.data;
                        const updatedUser: AuthUser = {
                            id: userData._id || userData.id || userData.clerkId || storedUser.id,
                            clerkId: userData.clerkId || userData._id || storedUser.clerkId,
                            name: userData.name || userData.fullName || storedUser.name,
                            fullName: userData.fullName || userData.name || storedUser.fullName,
                            username: userData.username || storedUser.username,
                            emailAddress: userData.emailAddress || userData.email || storedUser.emailAddress,
                            imageUrl: userData.imageUrl || userData.image || storedUser.imageUrl,
                            createdAt: userData.createdAt || storedUser.createdAt,
                        };

                        // Update stored user data
                        setUserData(updatedUser);
                        set({ user: updatedUser });
                    }
                } catch (error) {
                }

                return;
            }

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

                // Store user data for future offline access
                setUserData(user);

                set({
                    isAuthenticated: true,
                    user,
                    isLoading: false,
                });
            } else {
                set({ isAuthenticated: false, isLoading: false, user: null });
            }
        } catch (error: any) {
            console.error('⚠️ Auth check error:', error.message);

            // Check if we have stored user data - if so, keep the session
            const storedUser = await getUserData();
            if (storedUser) {
                set({
                    isAuthenticated: true,
                    user: storedUser,
                    isLoading: false,
                });
                return;
            }

            // Only logout if we truly have no valid session data
            // Don't clear token on network errors - only on 401
            if (error.response?.status === 401) {
                removeToken();
                removeUserData();
            }

            set({
                isAuthenticated: false,
                isLoading: false,
                user: null,
                error: error.response?.data?.message || 'Authentication failed',
            });
        }
    },

    setIsLoading: (loading: boolean) => set({ isLoading: loading }),

    reset: () => {
        set({
            isAuthenticated: false,
            isLoading: false,
            user: null,
            error: null,
        });
    },
}));
