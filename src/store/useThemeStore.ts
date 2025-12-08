import { create } from 'zustand';
import AsyncStorage from '@react-native-async-storage/async-storage';

// Accent color map
const ACCENT_COLOR_MAP: Record<string, { primary: string; primaryLight: string; primaryDark: string; primaryMuted: string }> = {
    emerald: {
        primary: '#10b981',
        primaryLight: '#34d399',
        primaryDark: '#059669',
        primaryMuted: 'rgba(16, 185, 129, 0.2)',
    },
    green: {
        primary: '#16a34a',
        primaryLight: '#22c55e',
        primaryDark: '#15803d',
        primaryMuted: 'rgba(22, 163, 74, 0.2)',
    },
    blue: {
        primary: '#3b82f6',
        primaryLight: '#60a5fa',
        primaryDark: '#2563eb',
        primaryMuted: 'rgba(59, 130, 246, 0.2)',
    },
    purple: {
        primary: '#a855f7',
        primaryLight: '#c084fc',
        primaryDark: '#9333ea',
        primaryMuted: 'rgba(168, 85, 247, 0.2)',
    },
    pink: {
        primary: '#ec4899',
        primaryLight: '#f472b6',
        primaryDark: '#db2777',
        primaryMuted: 'rgba(236, 72, 153, 0.2)',
    },
    orange: {
        primary: '#f97316',
        primaryLight: '#fb923c',
        primaryDark: '#ea580c',
        primaryMuted: 'rgba(249, 115, 22, 0.2)',
    },
};

interface ThemeState {
    accentColor: string;
    compactMode: boolean;

    // Computed colors
    colors: {
        primary: string;
        primaryLight: string;
        primaryDark: string;
        primaryMuted: string;
    };

    // Actions
    setAccentColor: (color: string) => void;
    setCompactMode: (enabled: boolean) => void;
    loadTheme: () => void;
}

export const useThemeStore = create<ThemeState>((set) => ({
    accentColor: 'emerald',
    compactMode: false,
    colors: ACCENT_COLOR_MAP.emerald,

    setAccentColor: (color: string) => {
        const colorConfig = ACCENT_COLOR_MAP[color] || ACCENT_COLOR_MAP.emerald;
        set({
            accentColor: color,
            colors: colorConfig,
        });
        // Save to storage (fire and forget)
        AsyncStorage.setItem('theme:accentColor', color).catch((e) => {
            console.warn('Failed to save accent color:', e);
        });
    },

    setCompactMode: (enabled: boolean) => {
        set({ compactMode: enabled });
        // Save to storage (fire and forget)
        AsyncStorage.setItem('theme:compactMode', enabled.toString()).catch((e) => {
            console.warn('Failed to save compact mode:', e);
        });
    },

    loadTheme: () => {
        // Load from storage asynchronously
        Promise.all([
            AsyncStorage.getItem('theme:accentColor'),
            AsyncStorage.getItem('theme:compactMode'),
        ])
            .then(([savedColor, savedCompact]) => {
                if (savedColor && ACCENT_COLOR_MAP[savedColor]) {
                    set({
                        accentColor: savedColor,
                        colors: ACCENT_COLOR_MAP[savedColor],
                    });
                }

                if (savedCompact !== null) {
                    set({ compactMode: savedCompact === 'true' });
                }
            })
            .catch((e) => {
                console.warn('Failed to load theme:', e);
            });
    },
}));

// Helper function to get accent colors
export const getAccentColors = (colorId: string) => {
    return ACCENT_COLOR_MAP[colorId] || ACCENT_COLOR_MAP.emerald;
};
