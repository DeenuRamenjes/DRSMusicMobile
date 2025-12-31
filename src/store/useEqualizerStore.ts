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

// Equalizer band frequencies
export const EQ_BANDS = [
    { id: 'band60Hz', label: '60Hz', frequency: 60 },
    { id: 'band230Hz', label: '230Hz', frequency: 230 },
    { id: 'band910Hz', label: '910Hz', frequency: 910 },
    { id: 'band3600Hz', label: '3.6kHz', frequency: 3600 },
    { id: 'band14000Hz', label: '14kHz', frequency: 14000 },
] as const;

// Preset definitions with band values (-12 to +12 dB)
export const EQ_PRESETS = {
    flat: { name: 'Flat', icon: '⚖️', bands: { band60Hz: 0, band230Hz: 0, band910Hz: 0, band3600Hz: 0, band14000Hz: 0 } },
    bass: { name: 'Bass Boost', icon: '🔊', bands: { band60Hz: 6, band230Hz: 4, band910Hz: 0, band3600Hz: 0, band14000Hz: 0 } },
    treble: { name: 'Treble Boost', icon: '🎵', bands: { band60Hz: 0, band230Hz: 0, band910Hz: 0, band3600Hz: 4, band14000Hz: 6 } },
    vocal: { name: 'Vocal', icon: '🎤', bands: { band60Hz: -2, band230Hz: 0, band910Hz: 4, band3600Hz: 2, band14000Hz: 0 } },
    rock: { name: 'Rock', icon: '🎸', bands: { band60Hz: 4, band230Hz: 2, band910Hz: -2, band3600Hz: 2, band14000Hz: 4 } },
    pop: { name: 'Pop', icon: '🎧', bands: { band60Hz: -1, band230Hz: 2, band910Hz: 4, band3600Hz: 2, band14000Hz: -1 } },
    jazz: { name: 'Jazz', icon: '🎷', bands: { band60Hz: 3, band230Hz: 0, band910Hz: 2, band3600Hz: 3, band14000Hz: 4 } },
    classical: { name: 'Classical', icon: '🎻', bands: { band60Hz: 4, band230Hz: 2, band910Hz: 0, band3600Hz: 2, band14000Hz: 4 } },
    custom: { name: 'Custom', icon: '⚙️', bands: { band60Hz: 0, band230Hz: 0, band910Hz: 0, band3600Hz: 0, band14000Hz: 0 } },
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
    band60Hz: 0,
    band230Hz: 0,
    band910Hz: 0,
    band3600Hz: 0,
    band14000Hz: 0,
};

// Helper to convert band values to array for native
const bandsToArray = (bands: CustomBands): number[] => {
    return [
        dbToMillibels(bands.band60Hz),
        dbToMillibels(bands.band230Hz),
        dbToMillibels(bands.band910Hz),
        dbToMillibels(bands.band3600Hz),
        dbToMillibels(bands.band14000Hz),
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
                            band60Hz: customBands.band60Hz ?? 0,
                            band230Hz: customBands.band230Hz ?? 0,
                            band910Hz: customBands.band910Hz ?? 0,
                            band3600Hz: customBands.band3600Hz ?? 0,
                            band14000Hz: customBands.band14000Hz ?? 0,
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
