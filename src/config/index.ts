import AsyncStorage from '@react-native-async-storage/async-storage';
import { create } from 'zustand';

// ===========================================
// DEPLOYMENT CONFIGURATION
// ===========================================

// Set to TRUE for production (deployed backend servers)
// Set to FALSE for local development (uses local server directly)
export const USE_DEPLOYMENT = false;

// Local Development Configuration
const LOCAL_IP = '192.168.1.40';
const LOCAL_PORT = 5000;
const LOCAL_SERVER_URL = `http://${LOCAL_IP}:${LOCAL_PORT}`;

// ===========================================
// BACKEND SERVERS CONFIGURATION
// ===========================================

export interface BackendServer {
    id: string;
    name: string;
    url: string;
    description?: string;
}

// Production servers (only shown when USE_DEPLOYMENT is true)
export const BACKEND_SERVERS: BackendServer[] = [
    {
        id: 'railway',
        name: 'Server 1',
        url: 'https://drsmusic-backend-production.up.railway.app',
        description: 'Primary production server',
    },
    {
        id: 'render',
        name: 'Server 2',
        url: 'https://drs-music-backend.onrender.com',
        description: 'Backup production server',
    },
];

// Default server ID
const DEFAULT_SERVER_ID = 'railway';

// Storage key
const STORAGE_KEY = 'selected_backend_server';

// ===========================================
// BACKEND STORE
// ===========================================

interface BackendState {
    selectedServerId: string;
    isLoading: boolean;

    // Computed getters
    getSelectedServer: () => BackendServer;
    getBackendUrl: () => string;
    getApiUrl: () => string;
    getSocketUrl: () => string;

    // Actions
    setSelectedServer: (serverId: string) => Promise<void>;
    loadSelectedServer: () => Promise<void>;
}

export const useBackendStore = create<BackendState>((set, get) => ({
    selectedServerId: DEFAULT_SERVER_ID,
    isLoading: true,

    getSelectedServer: () => {
        const { selectedServerId } = get();
        return BACKEND_SERVERS.find(s => s.id === selectedServerId) || BACKEND_SERVERS[0];
    },

    getBackendUrl: () => {
        return get().getSelectedServer().url;
    },

    getApiUrl: () => {
        return `${get().getBackendUrl()}/api`;
    },

    getSocketUrl: () => {
        return get().getBackendUrl();
    },

    setSelectedServer: async (serverId: string) => {
        const server = BACKEND_SERVERS.find(s => s.id === serverId);
        if (!server) return;

        set({ selectedServerId: serverId });
        await AsyncStorage.setItem(STORAGE_KEY, serverId);
    },

    loadSelectedServer: async () => {
        try {
            const savedServerId = await AsyncStorage.getItem(STORAGE_KEY);
            if (savedServerId && BACKEND_SERVERS.find(s => s.id === savedServerId)) {
                set({ selectedServerId: savedServerId, isLoading: false });
            } else {
                set({ isLoading: false });
            }
        } catch (error) {
            console.error('[Backend] Error loading server:', error);
            set({ isLoading: false });
        }
    },
}));

// ===========================================
// HELPER FUNCTIONS (for backward compatibility)
// ===========================================

// Get the current backend URL dynamically
export const getBackendUrl = (): string => {
    // If not using deployment, always return local server
    if (!USE_DEPLOYMENT) {
        return LOCAL_SERVER_URL;
    }
    return useBackendStore.getState().getBackendUrl();
};

// Get the current API URL dynamically
export const getApiUrl = (): string => {
    return `${getBackendUrl()}/api`;
};

// Get the current Socket URL dynamically
export const getSocketUrl = (): string => {
    return getBackendUrl();
};

// Helper function to get full image URL
export const getFullImageUrl = (imageUrl?: string | null): string => {
    if (!imageUrl) return '';
    if (imageUrl.startsWith('http')) return imageUrl;
    return `${getBackendUrl()}${imageUrl}`;
};

// Helper function to get full audio URL
export const getFullAudioUrl = (audioUrl?: string | null): string => {
    if (!audioUrl) return '';

    // Already a complete URL (http, https, or file)
    if (audioUrl.startsWith('http://') || audioUrl.startsWith('https://') || audioUrl.startsWith('file://')) {
        return audioUrl;
    }

    // Local file path (absolute path starting with /)
    if (audioUrl.startsWith('/storage') || audioUrl.startsWith('/data')) {
        return `file://${audioUrl}`;
    }

    // Relative path - prepend backend URL
    let path = audioUrl;
    if (!path.startsWith('/')) {
        path = '/' + path;
    }
    return `${getBackendUrl()}${path}`;
};

// Legacy exports for backward compatibility
export const BACKEND_URL = getBackendUrl();
export const API_URL = getApiUrl();
export const SOCKET_URL = getSocketUrl();
