import { create } from 'zustand';
import { useBackendStore, BACKEND_SERVERS } from '../config';

interface ConnectionState {
    isConnecting: boolean;
    isConnected: boolean;
    connectionError: string | null;
    retryCount: number;
    maxRetries: number;
    currentServerName: string | null;

    // Actions
    checkConnection: () => Promise<boolean>;
    initializeConnection: () => Promise<boolean>;
    setConnecting: (connecting: boolean) => void;
    setConnected: (connected: boolean) => void;
    resetRetries: () => void;
}

export const useConnectionStore = create<ConnectionState>((set, get) => ({
    isConnecting: false,
    isConnected: false,
    connectionError: null,
    retryCount: 0,
    maxRetries: 3, // Reduced since we auto-failover
    currentServerName: null,

    // Initialize connection with auto-failover
    initializeConnection: async (): Promise<boolean> => {
        const state = get();
        if (state.isConnecting) return state.isConnected;

        set({ isConnecting: true, connectionError: null, retryCount: 0 });

        const backendStore = useBackendStore.getState();

        // Get current server name for UI
        const currentServer = backendStore.getSelectedServer();
        set({ currentServerName: currentServer.name });

        // Try the selected server first with health check
        const { initializeWithHealthCheck, getSelectedServer, serverHealthStatus } = backendStore;

        await initializeWithHealthCheck();

        // Check if any server is now online
        const updatedServerStatus = useBackendStore.getState().serverHealthStatus;
        const selectedServer = useBackendStore.getState().getSelectedServer();
        const isOnline = updatedServerStatus[selectedServer.id] === 'online';

        if (isOnline) {
            set({
                isConnected: true,
                isConnecting: false,
                retryCount: 0,
                connectionError: null,
                currentServerName: selectedServer.name
            });
            return true;
        }

        // No server is online
        set({
            isConnected: false,
            isConnecting: false,
            retryCount: get().maxRetries,
            connectionError: 'All servers are currently unavailable',
            currentServerName: selectedServer.name
        });
        return false;
    },

    // Legacy check connection - now uses health check
    checkConnection: async () => {
        const state = get();

        if (state.isConnecting) {
            return state.isConnected;
        }

        const currentRetry = state.retryCount;
        set({ isConnecting: true, connectionError: null });

        const backendStore = useBackendStore.getState();
        const selectedServer = backendStore.getSelectedServer();

        set({ currentServerName: selectedServer.name });

        try {
            // Check health of current server
            const isOnline = await backendStore.checkServerHealth(selectedServer.id);

            if (isOnline) {
                set({
                    isConnected: true,
                    isConnecting: false,
                    retryCount: 0,
                    connectionError: null
                });
                return true;
            }

            // Current server failed, try to failover
            for (const server of BACKEND_SERVERS) {
                if (server.id === selectedServer.id) continue;

                set({ currentServerName: server.name, connectionError: `Trying ${server.name}...` });

                const serverOnline = await backendStore.checkServerHealth(server.id);
                if (serverOnline) {
                    await backendStore.setSelectedServer(server.id);
                    set({
                        isConnected: true,
                        isConnecting: false,
                        retryCount: 0,
                        connectionError: null,
                        currentServerName: server.name
                    });
                    return true;
                }
            }

            // All servers failed
            const retryCount = currentRetry + 1;
            const errorMessage = 'All servers are currently unavailable';

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
                }, 5000); // Retry every 5 seconds
            }

            return false;
        } catch (error: any) {
            const retryCount = currentRetry + 1;
            set({
                isConnected: false,
                isConnecting: false,
                retryCount,
                connectionError: 'Connection failed'
            });

            if (retryCount < state.maxRetries) {
                setTimeout(() => {
                    get().checkConnection();
                }, 5000);
            }

            return false;
        }
    },

    setConnecting: (connecting: boolean) => set({ isConnecting: connecting }),
    setConnected: (connected: boolean) => set({ isConnected: connected }),
    resetRetries: () => set({ retryCount: 0 }),
}));

export default useConnectionStore;
