/**
 * Native Equalizer Bridge
 * Provides TypeScript interface to the Android native equalizer module
 */

import { NativeModules, Platform } from 'react-native';

const { EqualizerModule } = NativeModules;

export interface BandInfo {
    band: number;
    centerFreq: number; // Hz
    minFreq: number;
    maxFreq: number;
}

export interface EqualizerInfo {
    numberOfBands: number;
    bands: BandInfo[];
    minLevel: number; // millibels
    maxLevel: number; // millibels
    numberOfPresets: number;
}

export interface NativePreset {
    index: number;
    name: string;
}

/**
 * Check if the native equalizer is available on this platform
 */
export const isEqualizerAvailable = (): boolean => {
    return Platform.OS === 'android' && EqualizerModule != null;
};

/**
 * Initialize the equalizer with an audio session ID
 * @param sessionId - Audio session ID from the player
 */
export const initializeEqualizer = async (sessionId: number): Promise<EqualizerInfo | null> => {
    if (!isEqualizerAvailable()) {
        return null;
    }

    try {
        const result = await EqualizerModule.initialize(sessionId);
        return result as EqualizerInfo;
    } catch (error) {
        console.error('Failed to initialize equalizer:', error);
        return null;
    }
};

/**
 * Enable or disable the equalizer
 */
export const setEqualizerEnabled = async (enabled: boolean): Promise<boolean> => {
    if (!isEqualizerAvailable()) return false;

    try {
        await EqualizerModule.setEnabled(enabled);
        return true;
    } catch (error) {
        console.error('Failed to set equalizer enabled:', error);
        return false;
    }
};

/**
 * Set a specific band level
 * @param band - Band index (0-4)
 * @param level - Level in millibels (-1500 to 1500)
 */
export const setBandLevel = async (band: number, level: number): Promise<boolean> => {
    if (!isEqualizerAvailable()) return false;

    try {
        await EqualizerModule.setBandLevel(band, level);
        return true;
    } catch (error) {
        console.error('Failed to set band level:', error);
        return false;
    }
};

/**
 * Set all band levels at once
 * @param levels - Array of levels in millibels
 */
export const setAllBandLevels = async (levels: number[]): Promise<boolean> => {
    if (!isEqualizerAvailable()) return false;

    try {
        await EqualizerModule.setAllBands(levels);
        return true;
    } catch (error) {
        console.error('Failed to set all bands:', error);
        return false;
    }
};

/**
 * Get available device presets
 */
export const getDevicePresets = async (): Promise<NativePreset[]> => {
    if (!isEqualizerAvailable()) return [];

    try {
        const presets = await EqualizerModule.getPresets();
        return presets as NativePreset[];
    } catch (error) {
        console.error('Failed to get presets:', error);
        return [];
    }
};

/**
 * Set a device preset
 * @param presetIndex - Index of the preset
 */
export const setDevicePreset = async (presetIndex: number): Promise<boolean> => {
    if (!isEqualizerAvailable()) return false;

    try {
        await EqualizerModule.setPreset(presetIndex);
        return true;
    } catch (error) {
        console.error('Failed to set preset:', error);
        return false;
    }
};

/**
 * Release the equalizer resources
 */
export const releaseEqualizer = async (): Promise<void> => {
    if (!isEqualizerAvailable()) return;

    try {
        await EqualizerModule.release();
    } catch (error) {
        console.error('Failed to release equalizer:', error);
    }
};

/**
 * Convert dB value (-12 to +12) to millibels (-1500 to +1500)
 */
export const dbToMillibels = (db: number): number => {
    // Standard conversion: 1 dB = 100 millibels
    // But Android range is typically -1500 to +1500 (which is -15dB to +15dB)
    // Our UI uses -12 to +12, so we scale appropriately
    return Math.round(db * 100);
};

/**
 * Convert millibels to dB
 */
export const millibelsToDb = (mb: number): number => {
    return mb / 100;
};
