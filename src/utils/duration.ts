/**
 * Duration utilities for handling different duration formats
 * Database stores duration as string "2:10" (MM:SS)
 * UI sometimes expects duration as number (seconds)
 */

/**
 * Parse duration from various formats to seconds
 * Handles:
 *   - String "2:10" (MM:SS) → 130
 *   - String "1:02:30" (HH:MM:SS) → 3750
 *   - Number 130 → 130
 *   - String "130" → 130
 */
export const parseDuration = (duration: string | number | undefined | null): number => {
    if (duration === undefined || duration === null) return 0;

    // If already a number, return it
    if (typeof duration === 'number') {
        return isNaN(duration) ? 0 : Math.floor(duration);
    }

    // If string, try to parse
    const str = String(duration).trim();

    // Check if it contains ":" (time format)
    if (str.includes(':')) {
        const parts = str.split(':').map(p => parseInt(p, 10) || 0);

        if (parts.length === 2) {
            // MM:SS format
            const [minutes, seconds] = parts;
            return minutes * 60 + seconds;
        } else if (parts.length === 3) {
            // HH:MM:SS format
            const [hours, minutes, seconds] = parts;
            return hours * 3600 + minutes * 60 + seconds;
        }
    }

    // Try parsing as a plain number (seconds)
    const num = parseInt(str, 10);
    return isNaN(num) ? 0 : num;
};

/**
 * Format duration from seconds to MM:SS or HH:MM:SS
 * Examples:
 *   - 130 → "2:10"
 *   - 3750 → "1:02:30"
 *   - "2:10" → "2:10" (already formatted)
 */
export const formatDuration = (duration: string | number | undefined | null): string => {
    // If already in MM:SS format, return as-is
    if (typeof duration === 'string' && duration.includes(':')) {
        return duration;
    }

    const totalSeconds = parseDuration(duration);

    if (totalSeconds >= 3600) {
        // HH:MM:SS format
        const hours = Math.floor(totalSeconds / 3600);
        const minutes = Math.floor((totalSeconds % 3600) / 60);
        const seconds = totalSeconds % 60;
        return `${hours}:${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
    }

    // MM:SS format
    const minutes = Math.floor(totalSeconds / 60);
    const seconds = totalSeconds % 60;
    return `${minutes}:${seconds.toString().padStart(2, '0')}`;
};

/**
 * Get duration in seconds for calculations (progress bar, etc.)
 * This is a convenience wrapper around parseDuration
 */
export const getDurationInSeconds = (duration: string | number | undefined | null): number => {
    return parseDuration(duration);
};
