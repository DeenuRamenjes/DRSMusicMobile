import { create } from 'zustand';
import AsyncStorage from '@react-native-async-storage/async-storage';

const STORAGE_KEY = 'download-settings';

interface DownloadState {
    downloadQuality: 'low' | 'normal' | 'high';
    downloadOverWifi: boolean;
    autoDownload: boolean;

    // Actions
    setDownloadQuality: (quality: 'low' | 'normal' | 'high') => void;
    setDownloadOverWifi: (enabled: boolean) => void;
    setAutoDownload: (enabled: boolean) => void;
    getDownloadUrl: (audioUrl: string | { low?: string; normal?: string; high?: string }) => string;
    loadFromStorage: () => Promise<void>;
    _saveToStorage: () => Promise<void>;
}

export const useDownloadStore = create<DownloadState>((set, get) => ({
    downloadQuality: 'high',
    downloadOverWifi: true,
    autoDownload: false,

    setDownloadQuality: (quality: 'low' | 'normal' | 'high') => {
        set({ downloadQuality: quality });
        get()._saveToStorage();
    },

    setDownloadOverWifi: (enabled: boolean) => {
        set({ downloadOverWifi: enabled });
        get()._saveToStorage();
    },

    setAutoDownload: (enabled: boolean) => {
        set({ autoDownload: enabled });
        get()._saveToStorage();
    },

    getDownloadUrl: (audioUrl: string | { low?: string; normal?: string; high?: string }) => {
        const { downloadQuality } = get();

        // Return different quality URLs based on the setting
        if (typeof audioUrl === 'object' && audioUrl !== null) {
            switch (downloadQuality) {
                case 'low':
                    return audioUrl.low || audioUrl.normal || audioUrl.high || '';
                case 'normal':
                    return audioUrl.normal || audioUrl.high || audioUrl.low || '';
                case 'high':
                default:
                    return audioUrl.high || audioUrl.normal || audioUrl.low || '';
            }
        } else {
            // Fallback to string audioUrl
            return audioUrl as string;
        }
    },

    loadFromStorage: async () => {
        try {
            const json = await AsyncStorage.getItem(STORAGE_KEY);
            if (json) {
                const data = JSON.parse(json);
                set({
                    downloadQuality: data.downloadQuality || 'high',
                    downloadOverWifi: data.downloadOverWifi !== undefined ? data.downloadOverWifi : true,
                    autoDownload: data.autoDownload || false,
                });
            }
        } catch (error) {
            console.error('Failed to load download settings:', error);
        }
    },

    _saveToStorage: async () => {
        try {
            const state = get();
            await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify({
                downloadQuality: state.downloadQuality,
                downloadOverWifi: state.downloadOverWifi,
                autoDownload: state.autoDownload,
            }));
        } catch (error) {
            console.error('Failed to save download settings:', error);
        }
    },
}));

export default useDownloadStore;
