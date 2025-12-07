import { create } from 'zustand';
import AsyncStorage from '@react-native-async-storage/async-storage';

const STORAGE_KEY = 'display-settings';

interface DisplayState {
    theme: 'dark' | 'light';
    accentColor: 'emerald' | 'green' | 'blue' | 'purple' | 'pink' | 'orange';
    compactMode: boolean;
    layout: 'default' | 'compact' | 'comfortable';
    sidebarCollapsed: boolean;

    // Actions
    setTheme: (theme: 'dark' | 'light') => void;
    setAccentColor: (color: 'emerald' | 'green' | 'blue' | 'purple' | 'pink' | 'orange') => void;
    setCompactMode: (enabled: boolean) => void;
    setLayout: (layout: 'default' | 'compact' | 'comfortable') => void;
    setSidebarCollapsed: (collapsed: boolean) => void;
    loadFromStorage: () => Promise<void>;
    _saveToStorage: () => Promise<void>;
}

export const useDisplayStore = create<DisplayState>((set, get) => ({
    theme: 'dark',
    accentColor: 'emerald',
    compactMode: false,
    layout: 'default',
    sidebarCollapsed: false,

    setTheme: (theme: 'dark' | 'light') => {
        set({ theme });
        get()._saveToStorage();
    },

    setAccentColor: (color: 'emerald' | 'green' | 'blue' | 'purple' | 'pink' | 'orange') => {
        set({ accentColor: color });
        get()._saveToStorage();
    },

    setCompactMode: (enabled: boolean) => {
        set({ compactMode: enabled });
        get()._saveToStorage();
    },

    setLayout: (layout: 'default' | 'compact' | 'comfortable') => {
        set({ layout });
        get()._saveToStorage();
    },

    setSidebarCollapsed: (collapsed: boolean) => {
        set({ sidebarCollapsed: collapsed });
        get()._saveToStorage();
    },

    loadFromStorage: async () => {
        try {
            const json = await AsyncStorage.getItem(STORAGE_KEY);
            if (json) {
                const data = JSON.parse(json);
                set({
                    theme: data.theme || 'dark',
                    accentColor: data.accentColor || 'emerald',
                    compactMode: data.compactMode || false,
                    layout: data.layout || 'default',
                    sidebarCollapsed: data.sidebarCollapsed || false,
                });
            }
        } catch (error) {
            console.error('Failed to load display settings:', error);
        }
    },

    _saveToStorage: async () => {
        try {
            const state = get();
            await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify({
                theme: state.theme,
                accentColor: state.accentColor,
                compactMode: state.compactMode,
                layout: state.layout,
                sidebarCollapsed: state.sidebarCollapsed,
            }));
        } catch (error) {
            console.error('Failed to save display settings:', error);
        }
    },
}));

export default useDisplayStore;
