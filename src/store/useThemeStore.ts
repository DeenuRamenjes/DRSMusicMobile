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

// Compact mode dimension scales
const COMPACT_SCALE = 0.85;

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

    // Compact-aware dimensions
    dimensions: {
        listImageSize: number;
        songCardHeight: number;
        albumCardSize: number;
        sectionPadding: number;
        headerHeight: number;
        iconSize: number;
        playButtonSize: number;
    };

    // Compact-aware spacing
    spacing: {
        xs: number;
        sm: number;
        md: number;
        lg: number;
        xl: number;
    };

    // Compact-aware font sizes
    fontSizes: {
        xs: number;
        sm: number;
        md: number;
        lg: number;
        xl: number;
        title: number;
    };

    // Actions
    setAccentColor: (color: string) => void;
    setCompactMode: (enabled: boolean) => void;
    loadTheme: () => void;
}

// Helper to calculate compact-aware values
const getCompactDimensions = (isCompact: boolean) => ({
    listImageSize: isCompact ? 40 : 48,
    songCardHeight: isCompact ? 52 : 64,
    albumCardSize: isCompact ? 120 : 150,
    sectionPadding: isCompact ? 12 : 16,
    headerHeight: isCompact ? 48 : 56,
    iconSize: isCompact ? 18 : 22,
    playButtonSize: isCompact ? 56 : 64,
});

const getCompactSpacing = (isCompact: boolean) => ({
    xs: isCompact ? 3 : 4,
    sm: isCompact ? 6 : 8,
    md: isCompact ? 10 : 12,
    lg: isCompact ? 12 : 16,
    xl: isCompact ? 16 : 20,
});

const getCompactFontSizes = (isCompact: boolean) => ({
    xs: isCompact ? 9 : 10,
    sm: isCompact ? 11 : 12,
    md: isCompact ? 12 : 14,
    lg: isCompact ? 14 : 16,
    xl: isCompact ? 16 : 18,
    title: isCompact ? 20 : 24,
});

export const useThemeStore = create<ThemeState>((set) => ({
    accentColor: 'emerald',
    compactMode: false,
    colors: ACCENT_COLOR_MAP.emerald,
    dimensions: getCompactDimensions(false),
    spacing: getCompactSpacing(false),
    fontSizes: getCompactFontSizes(false),

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
        set({
            compactMode: enabled,
            dimensions: getCompactDimensions(enabled),
            spacing: getCompactSpacing(enabled),
            fontSizes: getCompactFontSizes(enabled),
        });
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
                const updates: Partial<ThemeState> = {};

                if (savedColor && ACCENT_COLOR_MAP[savedColor]) {
                    updates.accentColor = savedColor;
                    updates.colors = ACCENT_COLOR_MAP[savedColor];
                }

                const isCompact = savedCompact === 'true';
                updates.compactMode = isCompact;
                updates.dimensions = getCompactDimensions(isCompact);
                updates.spacing = getCompactSpacing(isCompact);
                updates.fontSizes = getCompactFontSizes(isCompact);

                set(updates);
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

