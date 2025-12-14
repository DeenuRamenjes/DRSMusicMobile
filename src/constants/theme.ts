// Theme constants matching web app design exactly
// Based on the web app's Tailwind CSS design system

export const COLORS = {
    // Background colors (dark theme)
    background: '#000000',
    backgroundSecondary: 'rgba(24, 24, 27, 0.8)', // zinc-900/80
    backgroundTertiary: 'rgba(24, 24, 27, 0.5)', // zinc-900/50
    backgroundCard: 'rgba(39, 39, 42, 0.5)', // zinc-800/50
    backgroundCardHover: 'rgba(63, 63, 70, 0.5)', // zinc-700/50
    backgroundOverlay: 'rgba(0, 0, 0, 0.6)', // black/60

    // Primary colors (emerald - accent)
    primary: '#10b981', // emerald-500
    primaryLight: '#34d399', // emerald-400
    primaryDark: '#059669', // emerald-600
    primaryMuted: 'rgba(16, 185, 129, 0.2)', // emerald-500/20

    // Text colors
    textPrimary: '#FFFFFF',
    textSecondary: 'rgba(255, 255, 255, 0.8)', // white/80
    textMuted: '#71717a', // zinc-500
    textDim: '#52525b', // zinc-600
    textPlaceholder: 'rgba(255, 255, 255, 0.6)', // white/60

    // Border colors
    border: 'rgba(255, 255, 255, 0.05)', // white/5
    borderLight: 'rgba(255, 255, 255, 0.1)', // white/10
    borderMedium: 'rgba(63, 63, 70, 0.5)', // zinc-700/50

    // Status colors
    success: '#16a34a', // green-600
    error: '#ef4444', // red-500
    warning: '#f59e0b', // amber-500
    info: '#3b82f6', // blue-500

    // Special colors
    like: '#ec4899', // pink-500
    likeLight: '#db2777', // rose-500
    shuffleActive: '#10b981', // emerald-500
    loopActive: '#10b981', // emerald-500

    // Gradient colors
    gradientStart: 'rgba(16, 185, 129, 0.3)', // emerald-600/30
    gradientMid: 'rgba(6, 78, 59, 0.2)', // emerald-900/20
    gradientEnd: 'transparent',

    // Zinc scale (commonly used)
    zinc400: '#a1a1aa',
    zinc500: '#71717a',
    zinc600: '#52525b',
    zinc700: '#3f3f46',
    zinc800: '#27272a',
    zinc900: '#18181b',
};

// Spacing scale (in pixels)
export const SPACING = {
    xxs: 2,
    xs: 4,
    sm: 8,
    md: 12,
    lg: 16,
    xl: 20,
    xxl: 24,
    xxxl: 32,
    huge: 48,
};

// Font sizes (matching web app)
export const FONT_SIZES = {
    xs: 10,      // text-[10px] - time display
    sm: 12,      // text-xs
    md: 14,      // text-sm
    base: 15,    // text-[15px] - settings
    lg: 16,      // text-base
    xl: 18,      // text-lg
    xxl: 20,     // text-xl
    title: 24,   // text-2xl
    heading: 28, // text-3xl
    display: 32, // text-4xl
    hero: 48,    // text-5xl (profile name)
};

// Border radius
export const BORDER_RADIUS = {
    none: 0,
    sm: 4,
    md: 8,
    lg: 12,
    xl: 16,
    xxl: 20,
    xxxl: 24,
    full: 9999,
};

// Shadows (for elevation)
export const SHADOWS = {
    sm: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.2,
        shadowRadius: 2,
        elevation: 2,
    },
    md: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.25,
        shadowRadius: 8,
        elevation: 4,
    },
    lg: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 8 },
        shadowOpacity: 0.3,
        shadowRadius: 16,
        elevation: 8,
    },
    xl: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 25 },
        shadowOpacity: 0.5,
        shadowRadius: 50,
        elevation: 12,
    },
};

// Dimensions for layout consistency
export const DIMENSIONS = {
    // Header
    headerHeight: 56,

    // Playback controls bar
    playbackHeight: 72,
    playbackHeightCompact: 56,
    playbackHeightMobile: 72,

    // Sidebar (for tablet/landscape)
    sidebarWidth: 280,
    sidebarCollapsedWidth: 72,

    // Cards
    albumCardSize: 150,
    songCardHeight: 64,

    // Images
    playbackImageSize: 48,
    playbackImageSizeMd: 56,
    listImageSize: 48,
    gridImageSize: '100%',
    albumArtMobile: 280,

    // Buttons
    playButtonSize: 64, // main play button
    playButtonSizeSmall: 36,
    playButtonSizeMini: 32,
    playButtonLarge: 64,

    // Icons
    iconSizeSmall: 16,
    iconSizeMedium: 20,
    iconSizeLarge: 24,
    iconSizeXL: 32,
};

// Animation durations (in ms)
export const ANIMATION = {
    fast: 150,
    normal: 200,
    slow: 300,
    verySlow: 500,
};

// Accent color options (for settings)
export const ACCENT_COLORS = [
    { id: 'emerald', hex: '#10b981', name: 'Emerald' },
    { id: 'green', hex: '#16a34a', name: 'Green' },
    { id: 'blue', hex: '#3b82f6', name: 'Blue' },
    { id: 'purple', hex: '#a855f7', name: 'Purple' },
    { id: 'pink', hex: '#ec4899', name: 'Pink' },
    { id: 'orange', hex: '#f97316', name: 'Orange' },
];
