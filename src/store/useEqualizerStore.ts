import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import AsyncStorage from '@react-native-async-storage/async-storage';
import {
    isEqualizerAvailable,
    initializeEqualizer,
    setEqualizerEnabled,
    setAllBandLevels,
    releaseEqualizer,
    dbToMillibels,
    EqualizerInfo,
} from '../utils/nativeEqualizer';

// 10-Band Equalizer frequencies
export const EQ_BANDS = [
    { id: 'band31Hz', label: '31Hz', frequency: 31 },
    { id: 'band62Hz', label: '62Hz', frequency: 62 },
    { id: 'band125Hz', label: '125Hz', frequency: 125 },
    { id: 'band250Hz', label: '250Hz', frequency: 250 },
    { id: 'band500Hz', label: '500Hz', frequency: 500 },
    { id: 'band1kHz', label: '1kHz', frequency: 1000 },
    { id: 'band2kHz', label: '2kHz', frequency: 2000 },
    { id: 'band4kHz', label: '4kHz', frequency: 4000 },
    { id: 'band8kHz', label: '8kHz', frequency: 8000 },
    { id: 'band16kHz', label: '16kHz', frequency: 16000 },
] as const;

// Preset definitions with band values (-12 to +12 dB)
export const EQ_PRESETS = {
    flat: {
        name: 'Flat',
        icon: '⚖️',
        bands: {
            band31Hz: 0, band62Hz: 0, band125Hz: 0, band250Hz: 0, band500Hz: 0,
            band1kHz: 0, band2kHz: 0, band4kHz: 0, band8kHz: 0, band16kHz: 0,
        },
    },

    bass: {
        name: 'Bass Boost',
        icon: '🔊',
        bands: {
            band31Hz: 6, band62Hz: 5, band125Hz: 4, band250Hz: 2, band500Hz: 0,
            band1kHz: 0, band2kHz: 0, band4kHz: 0, band8kHz: -1, band16kHz: -2,
        },
    },

    treble: {
        name: 'Treble Boost',
        icon: '🎵',
        bands: {
            band31Hz: -2, band62Hz: -1, band125Hz: 0, band250Hz: 0, band500Hz: 0,
            band1kHz: 1, band2kHz: 2, band4kHz: 4, band8kHz: 6, band16kHz: 6,
        },
    },

    vocal: {
        name: 'Vocal',
        icon: '🎤',
        bands: {
            band31Hz: -3, band62Hz: -2, band125Hz: -1, band250Hz: 0, band500Hz: 1,
            band1kHz: 3, band2kHz: 4, band4kHz: 3, band8kHz: 1, band16kHz: 0,
        },
    },

    rock: {
        name: 'Rock',
        icon: '🎸',
        bands: {
            band31Hz: 4, band62Hz: 3, band125Hz: 2, band250Hz: 0, band500Hz: -1,
            band1kHz: -1, band2kHz: 2, band4kHz: 3, band8kHz: 4, band16kHz: 4,
        },
    },

    pop: {
        name: 'Pop',
        icon: '🎧',
        bands: {
            band31Hz: 2, band62Hz: 2, band125Hz: 1, band250Hz: 0, band500Hz: 0,
            band1kHz: 1, band2kHz: 3, band4kHz: 2, band8kHz: 1, band16kHz: 0,
        },
    },

    jazz: {
        name: 'Jazz',
        icon: '🎷',
        bands: {
            band31Hz: 3, band62Hz: 2, band125Hz: 1, band250Hz: 1, band500Hz: 1,
            band1kHz: 2, band2kHz: 2, band4kHz: 3, band8kHz: 3, band16kHz: 4,
        },
    },

    classical: {
        name: 'Classical',
        icon: '🎻',
        bands: {
            band31Hz: 3, band62Hz: 2, band125Hz: 1, band250Hz: 1, band500Hz: 0,
            band1kHz: 1, band2kHz: 2, band4kHz: 2, band8kHz: 3, band16kHz: 4,
        },
    },

    custom: {
        name: 'Custom',
        icon: '⚙️',
        bands: {
            band31Hz: 0, band62Hz: 0, band125Hz: 0, band250Hz: 0, band500Hz: 0,
            band1kHz: 0, band2kHz: 0, band4kHz: 0, band8kHz: 0, band16kHz: 0,
        },
    },
} as const;

export type PresetKey = keyof typeof EQ_PRESETS;
export type BandId = typeof EQ_BANDS[number]['id'];
export type CustomBands = { [key in BandId]: number };

interface EqualizerState {
    enabled: boolean;
    preset: PresetKey;
    customBands: CustomBands;
    isInitialized: boolean;
    nativeInfo: EqualizerInfo | null;

    // Actions
    setEnabled: (enabled: boolean) => void;
    toggleEnabled: () => void;
    setPreset: (preset: PresetKey) => void;
    setBandValue: (bandId: BandId, value: number) => void;
    resetCustomBands: () => void;
    getBandValues: () => CustomBands;
    loadFromSettings: (settings: any) => void;

    // Native module actions
    initializeNative: (audioSessionId: number) => Promise<boolean>;
    applyToNative: () => Promise<void>;
    releaseNative: () => Promise<void>;
}

const DEFAULT_BANDS: CustomBands = {
    band31Hz: 0,
    band62Hz: 0,
    band125Hz: 0,
    band250Hz: 0,
    band500Hz: 0,
    band1kHz: 0,
    band2kHz: 0,
    band4kHz: 0,
    band8kHz: 0,
    band16kHz: 0,
};

// Helper to convert band values to array for native
const bandsToArray = (bands: CustomBands): number[] => {
    return [
        dbToMillibels(bands.band31Hz),
        dbToMillibels(bands.band62Hz),
        dbToMillibels(bands.band125Hz),
        dbToMillibels(bands.band250Hz),
        dbToMillibels(bands.band500Hz),
        dbToMillibels(bands.band1kHz),
        dbToMillibels(bands.band2kHz),
        dbToMillibels(bands.band4kHz),
        dbToMillibels(bands.band8kHz),
        dbToMillibels(bands.band16kHz),
    ];
};

export const useEqualizerStore = create<EqualizerState>()(
    persist(
        (set, get) => ({
            enabled: false,
            preset: 'flat',
            customBands: { ...DEFAULT_BANDS },
            isInitialized: false,
            nativeInfo: null,

            setEnabled: async (enabled) => {
                set({ enabled });

                // Apply to native if available
                if (isEqualizerAvailable() && get().isInitialized) {
                    await setEqualizerEnabled(enabled);
                    if (enabled) {
                        await get().applyToNative();
                    }
                }
            },

            toggleEnabled: () => {
                const newEnabled = !get().enabled;
                get().setEnabled(newEnabled);
            },

            setPreset: async (preset) => {
                if (preset === 'custom') {
                    set({ preset });
                } else {
                    const presetBands = EQ_PRESETS[preset].bands;
                    set({
                        preset,
                        customBands: { ...presetBands }
                    });
                }

                // Apply to native
                if (get().enabled && get().isInitialized) {
                    await get().applyToNative();
                }
            },

            setBandValue: async (bandId, value) => {
                const clampedValue = Math.max(-12, Math.min(12, Math.round(value)));
                set((state) => ({
                    preset: 'custom',
                    customBands: {
                        ...state.customBands,
                        [bandId]: clampedValue,
                    },
                }));

                // Apply to native (debounced in UI)
                if (get().enabled && get().isInitialized) {
                    await get().applyToNative();
                }
            },

            resetCustomBands: async () => {
                set({ customBands: { ...DEFAULT_BANDS }, preset: 'flat' });
                if (get().enabled && get().isInitialized) {
                    await get().applyToNative();
                }
            },

            getBandValues: () => {
                const { preset, customBands } = get();
                if (preset === 'custom') {
                    return customBands;
                }
                return EQ_PRESETS[preset].bands;
            },

            loadFromSettings: (settings) => {
                if (settings?.playback) {
                    const { equalizerEnabled, equalizerPreset, customBands } = settings.playback;
                    set({
                        enabled: equalizerEnabled ?? false,
                        preset: equalizerPreset ?? 'flat',
                        customBands: customBands ? {
                            band31Hz: customBands.band31Hz ?? 0,
                            band62Hz: customBands.band62Hz ?? 0,
                            band125Hz: customBands.band125Hz ?? 0,
                            band250Hz: customBands.band250Hz ?? 0,
                            band500Hz: customBands.band500Hz ?? 0,
                            band1kHz: customBands.band1kHz ?? 0,
                            band2kHz: customBands.band2kHz ?? 0,
                            band4kHz: customBands.band4kHz ?? 0,
                            band8kHz: customBands.band8kHz ?? 0,
                            band16kHz: customBands.band16kHz ?? 0,
                        } : { ...DEFAULT_BANDS },
                    });
                }
            },

            // Initialize the native equalizer with audio session
            initializeNative: async (audioSessionId: number) => {
                if (!isEqualizerAvailable()) {
                    return false;
                }

                try {
                    const info = await initializeEqualizer(audioSessionId);
                    if (info) {
                        set({ isInitialized: true, nativeInfo: info });

                        // Apply current settings
                        const state = get();
                        if (state.enabled) {
                            await setEqualizerEnabled(true);
                            await get().applyToNative();
                        }
                        return true;
                    }
                    return false;
                } catch (error) {
                    console.error('Failed to initialize native equalizer:', error);
                    return false;
                }
            },

            // Apply current band values to native equalizer
            applyToNative: async () => {
                if (!get().isInitialized) return;

                const bands = get().getBandValues();
                const levels = bandsToArray(bands);

                await setAllBandLevels(levels);
            },

            // Release native equalizer resources
            releaseNative: async () => {
                if (get().isInitialized) {
                    await releaseEqualizer();
                    set({ isInitialized: false, nativeInfo: null });
                }
            },
        }),
        {
            name: 'equalizer-storage',
            storage: createJSONStorage(() => AsyncStorage),
            partialize: (state) => ({
                // Only persist these fields
                enabled: state.enabled,
                preset: state.preset,
                customBands: state.customBands,
            }),
        }
    )
);
