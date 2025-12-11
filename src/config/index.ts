/**
 * App Configuration
 * 
 * Change these values to switch between development and production environments.
 * This is the ONLY file you need to modify to switch backend URLs.
 */

// ===========================================
// BACKEND CONFIGURATION
// ===========================================

// Set to true for production (deployed backend)
// Set to false for local development
export const USE_PRODUCTION = true;

// Production/Deployed Backend URL
const PRODUCTION_URL = 'https://drs-music-backend.onrender.com';

// Local Development Configuration
const LOCAL_IP = '192.168.1.40'; // Your computer's IP address
const LOCAL_PORT = 5000;
const DEVELOPMENT_URL = `http://${LOCAL_IP}:${LOCAL_PORT}`;

// ===========================================
// COMPUTED VALUES (Don't modify these)
// ===========================================

// The active backend URL based on environment
export const BACKEND_URL = USE_PRODUCTION ? PRODUCTION_URL : DEVELOPMENT_URL;

// API URL (with /api prefix)
export const API_URL = `${BACKEND_URL}/api`;

// Socket URL (same as backend URL)
export const SOCKET_URL = BACKEND_URL;

// Helper function to get full image URL
export const getFullImageUrl = (imageUrl?: string | null): string => {
    if (!imageUrl) return '';
    if (imageUrl.startsWith('http')) return imageUrl;
    return `${BACKEND_URL}${imageUrl}`;
};

// Helper function to get full audio URL
export const getFullAudioUrl = (audioUrl?: string | null): string => {
    if (!audioUrl) return '';

    // Already a complete URL (http, https, or file)
    if (audioUrl.startsWith('http://') || audioUrl.startsWith('https://') || audioUrl.startsWith('file://')) {
        return audioUrl;
    }

    // Local file path (absolute path starting with /)
    if (audioUrl.startsWith('/storage') || audioUrl.startsWith('/data')) {
        return `file://${audioUrl}`;
    }

    // Relative path - prepend backend URL
    let path = audioUrl;
    if (!path.startsWith('/')) {
        path = '/' + path;
    }
    return `${BACKEND_URL}${path}`;
};

// Log the current configuration
console.log(`🌐 Environment: ${USE_PRODUCTION ? 'PRODUCTION' : 'DEVELOPMENT'}`);
console.log(`🌐 Backend URL: ${BACKEND_URL}`);
