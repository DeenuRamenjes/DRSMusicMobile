import { create } from 'zustand';
import axiosInstance from '../api/axios';

interface ConnectionState {
    isConnecting: boolean;
    isConnected: boolean;
    connectionError: string | null;
    retryCount: number;
    maxRetries: number;

    // Actions
    checkConnection: () => Promise<boolean>;
    setConnecting: (connecting: boolean) => void;
    setConnected: (connected: boolean) => void;
    resetRetries: () => void;
}

export const useConnectionStore = create<ConnectionState>((set, get) => ({
    isConnecting: false,
    isConnected: false,
    connectionError: null,
    retryCount: 0,
    maxRetries: 5,

    checkConnection: async () => {
        const state = get();

        if (state.isConnecting) {
            return state.isConnected;
        }

        set({ isConnecting: true, connectionError: null });

        try {
            // Try to ping the backend health endpoint
            const response = await axiosInstance.get('/health', {
                timeout: 10000, // 10 second timeout
            });

            set({
                isConnected: true,
                isConnecting: false,
                retryCount: 0,
                connectionError: null
            });
            return true;
        } catch (error: any) {
            const retryCount = state.retryCount + 1;
            const errorMessage = error.code === 'ECONNABORTED'
                ? 'Backend is waking up...'
                : error.response?.status === 503
                    ? 'Server is starting up...'
                    : 'Connecting to server...';


            set({
                isConnected: false,
                isConnecting: false,
                retryCount,
                connectionError: errorMessage
            });

            // Auto-retry if under max retries
            if (retryCount < state.maxRetries) {
                setTimeout(() => {
                    get().checkConnection();
                }, 3000); // Retry every 3 seconds
            }

            return false;
        }
    },

    setConnecting: (connecting: boolean) => set({ isConnecting: connecting }),
    setConnected: (connected: boolean) => set({ isConnected: connected }),
    resetRetries: () => set({ retryCount: 0 }),
}));

export default useConnectionStore;
