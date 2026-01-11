import AsyncStorage from '@react-native-async-storage/async-storage';
import { create } from 'zustand';

// ===========================================
// DEPLOYMENT CONFIGURATION
// ===========================================

// Set to TRUE for production (deployed backend servers)
// Set to FALSE for local development (uses local server directly)
export const USE_DEPLOYMENT = false;

// Local Development Configuration
const LOCAL_IP = '10.45.147.136';
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
        id: 'amazon-aws',
        name: 'Server 1 (AWS)',
        url: 'http://15.134.170.70',
        description: 'Primary production server',
    },
    {
        id: 'railway',
        name: 'Server 2 (Railway)',
        url: 'https://drsmusic-backend-production.up.railway.app',
        description: 'Backup production server',
    },
];

// Default server ID
const DEFAULT_SERVER_ID = 'amazon-aws';

// Storage key
const STORAGE_KEY = 'selected_backend_server';

// Health check timeout (ms)
const HEALTH_CHECK_TIMEOUT = 5000;

// ===========================================
// BACKEND STORE
// ===========================================

export type ServerHealthStatus = 'online' | 'offline' | 'checking' | 'unknown';

interface BackendState {
    selectedServerId: string;
    isLoading: boolean;
    isInitialized: boolean;
    serverHealthStatus: Record<string, ServerHealthStatus>;

    // Computed getters
    getSelectedServer: () => BackendServer;
    getBackendUrl: () => string;
    getApiUrl: () => string;
    getSocketUrl: () => string;

    // Actions
    setSelectedServer: (serverId: string) => Promise<void>;
    loadSelectedServer: () => Promise<void>;

    // Health check actions
    checkServerHealth: (serverId: string) => Promise<boolean>;
    checkAllServersHealth: () => Promise<void>;
    initializeWithHealthCheck: () => Promise<void>;
}

export const useBackendStore = create<BackendState>((set, get) => ({
    selectedServerId: DEFAULT_SERVER_ID,
    isLoading: true,
    isInitialized: false,
    serverHealthStatus: {},

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

    // Check health of a specific server
    checkServerHealth: async (serverId: string): Promise<boolean> => {
        const server = BACKEND_SERVERS.find(s => s.id === serverId);
        if (!server) return false;

        set(state => ({
            serverHealthStatus: { ...state.serverHealthStatus, [serverId]: 'checking' }
        }));

        try {
            const controller = new AbortController();
            const timeoutId = setTimeout(() => controller.abort(), HEALTH_CHECK_TIMEOUT);

            const response = await fetch(`${server.url}/api/health`, {
                method: 'GET',
                signal: controller.signal,
            });
            clearTimeout(timeoutId);

            const isOnline = response.ok;
            set(state => ({
                serverHealthStatus: { ...state.serverHealthStatus, [serverId]: isOnline ? 'online' : 'offline' }
            }));
            return isOnline;
        } catch (error) {
            set(state => ({
                serverHealthStatus: { ...state.serverHealthStatus, [serverId]: 'offline' }
            }));
            return false;
        }
    },

    // Check health of all servers
    checkAllServersHealth: async () => {
        const { checkServerHealth } = get();
        await Promise.all(BACKEND_SERVERS.map(server => checkServerHealth(server.id)));
    },

    // Initialize with health check - tries servers in order until one works
    initializeWithHealthCheck: async () => {
        const { checkServerHealth, setSelectedServer } = get();

        // Load saved preference first
        try {
            const savedServerId = await AsyncStorage.getItem(STORAGE_KEY);
            if (savedServerId && BACKEND_SERVERS.find(s => s.id === savedServerId)) {
                set({ selectedServerId: savedServerId });
            }
        } catch (error) {
            // Ignore, use default
        }

        // Try the selected server first
        const { selectedServerId } = get();
        const isSelectedOnline = await checkServerHealth(selectedServerId);

        if (isSelectedOnline) {
            set({ isLoading: false, isInitialized: true });
            return;
        }

        // Selected server failed, try other servers in order
        for (const server of BACKEND_SERVERS) {
            if (server.id === selectedServerId) continue; // Already tried

            const isOnline = await checkServerHealth(server.id);
            if (isOnline) {
                // Found a working server, switch to it
                await setSelectedServer(server.id);
                set({ isLoading: false, isInitialized: true });
                return;
            }
        }

        // No server is online
        set({ isLoading: false, isInitialized: true });
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
    const placeholder = 'https://via.placeholder.com/300?text=No+Image';
    if (!imageUrl || imageUrl.trim() === '') return placeholder;
    if (imageUrl.startsWith('http')) return imageUrl;
    return `${getBackendUrl()}${imageUrl}`;
};

// Helper function to get full audio URL
export const getFullAudioUrl = (audioUrl?: string | null): string => {
    if (!audioUrl || audioUrl.trim() === '') return '';

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
