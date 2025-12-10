import { create } from 'zustand';
import AsyncStorage from '@react-native-async-storage/async-storage';
import RNFS from 'react-native-fs';
import { Platform, PermissionsAndroid, Alert, Linking } from 'react-native';
import { Song } from '../types';

// Local song type (extends Song with local file info)
export interface LocalSong extends Song {
    localPath: string;
    isDownloaded: boolean;
    downloadedAt?: string;
    fileSize?: number;
}

interface DownloadProgress {
    songId: string;
    progress: number; // 0-100
    status: 'pending' | 'downloading' | 'completed' | 'failed';
}

interface OfflineMusicState {
    // Downloaded songs from streaming
    downloadedSongs: LocalSong[];

    // Device local songs (scanned from device)
    deviceSongs: LocalSong[];

    // Download progress tracking
    downloadProgress: Record<string, DownloadProgress>;

    // Loading states
    isScanning: boolean;
    isLoading: boolean;
    error: string | null;

    // Offline mode
    isOfflineMode: boolean;

    // Storage info
    storageUsed: number; // bytes

    // Actions
    loadDownloadedSongs: () => Promise<void>;
    scanDeviceMusic: () => Promise<void>;
    downloadSong: (song: Song, audioUrl: string) => Promise<boolean>;
    deleteSong: (songId: string) => Promise<boolean>;
    isDownloaded: (songId: string) => boolean;
    getLocalPath: (songId: string) => string | null;
    setOfflineMode: (offline: boolean) => void;
    calculateStorageUsed: () => Promise<void>;
    clearAllDownloads: () => Promise<void>;
}

// Storage keys
const STORAGE_KEYS = {
    DOWNLOADED_SONGS: '@drs_downloaded_songs',
    OFFLINE_MODE: '@drs_offline_mode',
};

// Download directory
const getDownloadDir = () => {
    return Platform.OS === 'ios'
        ? `${RNFS.DocumentDirectoryPath}/downloads`
        : `${RNFS.ExternalDirectoryPath || RNFS.DocumentDirectoryPath}/DRSMusic/downloads`;
};

// Ensure download directory exists
const ensureDownloadDir = async () => {
    const dir = getDownloadDir();
    const exists = await RNFS.exists(dir);
    if (!exists) {
        await RNFS.mkdir(dir);
    }
    return dir;
};

// Request storage permission for Android
const requestStoragePermission = async (): Promise<boolean> => {
    if (Platform.OS !== 'android') return true;

    try {
        const sdkVersion = Platform.Version;
        console.log('Android SDK Version:', sdkVersion);

        if (typeof sdkVersion === 'number' && sdkVersion >= 33) {
            // Android 13+ - need READ_MEDIA_AUDIO
            console.log('Requesting READ_MEDIA_AUDIO permission (Android 13+)');

            // First check if already granted
            const hasPermission = await PermissionsAndroid.check(
                PermissionsAndroid.PERMISSIONS.READ_MEDIA_AUDIO
            );

            if (hasPermission) {
                console.log('Audio permission already granted');
                return true;
            }

            const result = await PermissionsAndroid.request(
                PermissionsAndroid.PERMISSIONS.READ_MEDIA_AUDIO,
                {
                    title: 'Audio Files Permission',
                    message: 'DRS Music needs access to your audio files to scan and play local music.',
                    buttonNeutral: 'Ask Me Later',
                    buttonNegative: 'Deny',
                    buttonPositive: 'Allow',
                }
            );

            console.log('Permission result:', result);

            // Return true even for NEVER_ASK_AGAIN - we'll try to scan anyway
            return result === PermissionsAndroid.RESULTS.GRANTED ||
                result === PermissionsAndroid.RESULTS.NEVER_ASK_AGAIN;
        } else {
            // Android 12 and below - need READ_EXTERNAL_STORAGE
            console.log('Requesting READ_EXTERNAL_STORAGE permission (Android <= 12)');

            // First check if already granted
            const hasPermission = await PermissionsAndroid.check(
                PermissionsAndroid.PERMISSIONS.READ_EXTERNAL_STORAGE
            );

            if (hasPermission) {
                console.log('Storage permission already granted');
                return true;
            }

            const result = await PermissionsAndroid.request(
                PermissionsAndroid.PERMISSIONS.READ_EXTERNAL_STORAGE,
                {
                    title: 'Storage Permission',
                    message: 'DRS Music needs access to your storage to scan and play local music.',
                    buttonNeutral: 'Ask Me Later',
                    buttonNegative: 'Deny',
                    buttonPositive: 'Allow',
                }
            );

            console.log('Permission result:', result);

            return result === PermissionsAndroid.RESULTS.GRANTED ||
                result === PermissionsAndroid.RESULTS.NEVER_ASK_AGAIN;
        }
    } catch (err) {
        console.error('Permission request error:', err);
        // Return true to still try scanning - some folders might be accessible
        return true;
    }
};

// Common audio formats
const AUDIO_EXTENSIONS = ['.mp3', '.m4a', '.wav', '.flac', '.aac', '.ogg', '.wma'];

// Scan a directory for audio files
const scanDirectory = async (path: string, songs: LocalSong[]): Promise<void> => {
    try {
        const items = await RNFS.readDir(path);

        for (const item of items) {
            if (item.isDirectory()) {
                // Recursively scan subdirectories
                await scanDirectory(item.path, songs);
            } else if (item.isFile()) {
                const ext = item.name.toLowerCase().substring(item.name.lastIndexOf('.'));
                if (AUDIO_EXTENSIONS.includes(ext)) {
                    // Extract basic info from filename
                    const nameWithoutExt = item.name.substring(0, item.name.lastIndexOf('.'));
                    const parts = nameWithoutExt.split(' - ');

                    const song: LocalSong = {
                        _id: `local_${item.path}`,
                        title: parts.length > 1 ? parts[1] : nameWithoutExt,
                        artist: parts.length > 1 ? parts[0] : 'Unknown Artist',
                        duration: 0, // Will need metadata reading for accurate duration
                        audioUrl: item.path,
                        imageUrl: '',
                        createdAt: new Date().toISOString(),
                        localPath: item.path,
                        isDownloaded: false,
                        fileSize: item.size,
                    };

                    console.log(`Found audio file: ${item.name}`);
                    songs.push(song);
                }
            }
        }
    } catch (error: any) {
        // Log but don't throw for permission errors
        console.log(`Scan error for ${path}: ${error.message || error}`);
    }
};

// Scan a single directory without recursion (for restricted folders)
const scanDirectoryFlat = async (path: string, songs: LocalSong[]): Promise<void> => {
    try {
        const items = await RNFS.readDir(path);
        let foundCount = 0;

        for (const item of items) {
            if (item.isFile()) {
                const ext = item.name.toLowerCase().substring(item.name.lastIndexOf('.'));
                if (AUDIO_EXTENSIONS.includes(ext)) {
                    const nameWithoutExt = item.name.substring(0, item.name.lastIndexOf('.'));
                    const parts = nameWithoutExt.split(' - ');

                    const song: LocalSong = {
                        _id: `local_${item.path}`,
                        title: parts.length > 1 ? parts[1] : nameWithoutExt,
                        artist: parts.length > 1 ? parts[0] : 'Unknown Artist',
                        duration: 0,
                        audioUrl: item.path,
                        imageUrl: '',
                        createdAt: new Date().toISOString(),
                        localPath: item.path,
                        isDownloaded: false,
                        fileSize: item.size,
                    };

                    songs.push(song);
                    foundCount++;
                }
            }
        }
        if (foundCount > 0) {
            console.log(`Found ${foundCount} audio files in ${path}`);
        }
    } catch (error: any) {
        console.log(`Flat scan error for ${path}: ${error.message || error}`);
    }
};

export const useOfflineMusicStore = create<OfflineMusicState>((set, get) => ({
    downloadedSongs: [],
    deviceSongs: [],
    downloadProgress: {},
    isScanning: false,
    isLoading: false,
    error: null,
    isOfflineMode: false,
    storageUsed: 0,

    loadDownloadedSongs: async () => {
        set({ isLoading: true, error: null });

        try {
            const stored = await AsyncStorage.getItem(STORAGE_KEYS.DOWNLOADED_SONGS);
            if (stored) {
                const songs: LocalSong[] = JSON.parse(stored);

                // Verify files still exist
                const validSongs: LocalSong[] = [];
                for (const song of songs) {
                    const exists = await RNFS.exists(song.localPath);
                    if (exists) {
                        validSongs.push(song);
                    }
                }

                // Update storage if any files were removed
                if (validSongs.length !== songs.length) {
                    await AsyncStorage.setItem(
                        STORAGE_KEYS.DOWNLOADED_SONGS,
                        JSON.stringify(validSongs)
                    );
                }

                set({ downloadedSongs: validSongs });
            }

            // Load offline mode preference
            const offlineMode = await AsyncStorage.getItem(STORAGE_KEYS.OFFLINE_MODE);
            if (offlineMode === 'true') {
                set({ isOfflineMode: true });
            }

            // Calculate storage
            await get().calculateStorageUsed();
        } catch (error: any) {
            console.error('Error loading downloaded songs:', error);
            set({ error: error.message });
        } finally {
            set({ isLoading: false });
        }
    },

    scanDeviceMusic: async () => {
        set({ isScanning: true, error: null });

        try {
            const hasPermission = await requestStoragePermission();
            console.log('Permission granted:', hasPermission);

            console.log('\n====== Starting File System Scan ======');

            const songs: LocalSong[] = [];
            const externalPath = RNFS.ExternalStorageDirectoryPath || '/storage/emulated/0';
            console.log('External storage path:', externalPath);

            // Comprehensive list of directories to scan
            const musicDirs = [
                `${externalPath}/Music`,
                `${externalPath}/Download`,
                `${externalPath}/Downloads`,
                `${externalPath}/DCIM`,
                `${externalPath}/Recordings`,
                `${externalPath}/Audio`,
                `${externalPath}/Podcasts`,
                `${externalPath}/media`,
                // App-specific folders (may not be accessible on Android 11+)
                `${externalPath}/WhatsApp/Media/WhatsApp Audio`,
                `${externalPath}/Telegram/Telegram Audio`,
            ];

            let scannedCount = 0;
            let existingDirs = 0;

            for (const dir of musicDirs) {
                try {
                    const exists = await RNFS.exists(dir);
                    if (exists) {
                        existingDirs++;
                        console.log(`✓ Scanning: ${dir}`);
                        const beforeCount = songs.length;
                        await scanDirectory(dir, songs);
                        const found = songs.length - beforeCount;
                        if (found > 0) {
                            console.log(`  Found ${found} files`);
                        }
                        scannedCount++;
                    }
                } catch (e: any) {
                    console.log(`✗ Cannot access: ${dir} - ${e.message || e}`);
                }
            }

            // Also scan app's own download directory
            try {
                const appDownloadDir = `${RNFS.DocumentDirectoryPath}/downloads`;
                const exists = await RNFS.exists(appDownloadDir);
                if (exists) {
                    console.log(`✓ Scanning app downloads: ${appDownloadDir}`);
                    await scanDirectory(appDownloadDir, songs);
                }
            } catch (e) {
                console.log('App download dir not accessible');
            }

            console.log(`\n====== Scan Complete ======`);
            console.log(`Scanned ${scannedCount}/${existingDirs} directories`);
            console.log(`Found ${songs.length} audio files`);

            if (songs.length === 0) {
                // Show helpful message with link to settings
                const errorMsg = Platform.OS === 'android'
                    ? 'No audio files found. On Android 13+, you need to grant "All files access" permission in Settings > Apps > DRS Music > Permissions > Files and media.'
                    : 'No audio files found on device.';

                set({ error: errorMsg });

                // Show alert with option to open settings
                if (Platform.OS === 'android') {
                    Alert.alert(
                        'Permission Required',
                        'To scan all music files, please grant "All files access" permission in app settings.',
                        [
                            { text: 'Cancel', style: 'cancel' },
                            {
                                text: 'Open Settings',
                                onPress: () => Linking.openSettings()
                            }
                        ]
                    );
                }
            } else {
                set({ error: null });
            }

            set({ deviceSongs: songs });
        } catch (error: any) {
            console.error('Error scanning device:', error);
            set({ error: `Scan failed: ${error.message}` });
        } finally {
            set({ isScanning: false });
        }
    },

    downloadSong: async (song: Song, audioUrl: string): Promise<boolean> => {
        const downloadDir = await ensureDownloadDir();
        const fileName = `${song._id}.mp3`;
        const filePath = `${downloadDir}/${fileName}`;

        // Check if already downloaded
        if (get().isDownloaded(song._id)) {
            console.log('Song already downloaded:', song.title);
            return true;
        }

        // Set initial progress
        set((state) => ({
            downloadProgress: {
                ...state.downloadProgress,
                [song._id]: { songId: song._id, progress: 0, status: 'downloading' },
            },
        }));

        try {
            console.log('Downloading:', audioUrl, 'to', filePath);

            const downloadResult = await RNFS.downloadFile({
                fromUrl: audioUrl,
                toFile: filePath,
                progress: (res) => {
                    const progress = Math.round((res.bytesWritten / res.contentLength) * 100);
                    set((state) => ({
                        downloadProgress: {
                            ...state.downloadProgress,
                            [song._id]: { songId: song._id, progress, status: 'downloading' },
                        },
                    }));
                },
                progressDivider: 5, // Update every 5%
            }).promise;

            if (downloadResult.statusCode === 200) {
                // Get file size
                const stat = await RNFS.stat(filePath);

                const localSong: LocalSong = {
                    ...song,
                    localPath: filePath,
                    isDownloaded: true,
                    downloadedAt: new Date().toISOString(),
                    fileSize: stat.size,
                };

                // Add to downloaded songs
                const newDownloadedSongs = [...get().downloadedSongs, localSong];
                set({ downloadedSongs: newDownloadedSongs });

                // Persist to storage
                await AsyncStorage.setItem(
                    STORAGE_KEYS.DOWNLOADED_SONGS,
                    JSON.stringify(newDownloadedSongs)
                );

                // Update progress
                set((state) => ({
                    downloadProgress: {
                        ...state.downloadProgress,
                        [song._id]: { songId: song._id, progress: 100, status: 'completed' },
                    },
                }));

                // Calculate storage
                await get().calculateStorageUsed();

                console.log('Download completed:', song.title);
                return true;
            } else {
                throw new Error(`Download failed with status ${downloadResult.statusCode}`);
            }
        } catch (error: any) {
            console.error('Download error:', error);

            // Clean up partial download
            try {
                await RNFS.unlink(filePath);
            } catch { }

            set((state) => ({
                downloadProgress: {
                    ...state.downloadProgress,
                    [song._id]: { songId: song._id, progress: 0, status: 'failed' },
                },
            }));

            return false;
        }
    },

    deleteSong: async (songId: string): Promise<boolean> => {
        try {
            const song = get().downloadedSongs.find((s) => s._id === songId);
            if (!song) return false;

            // Delete file
            if (await RNFS.exists(song.localPath)) {
                await RNFS.unlink(song.localPath);
            }

            // Remove from list
            const newDownloadedSongs = get().downloadedSongs.filter((s) => s._id !== songId);
            set({ downloadedSongs: newDownloadedSongs });

            // Persist to storage
            await AsyncStorage.setItem(
                STORAGE_KEYS.DOWNLOADED_SONGS,
                JSON.stringify(newDownloadedSongs)
            );

            // Calculate storage
            await get().calculateStorageUsed();

            return true;
        } catch (error) {
            console.error('Delete error:', error);
            return false;
        }
    },

    isDownloaded: (songId: string): boolean => {
        return get().downloadedSongs.some((s) => s._id === songId);
    },

    getLocalPath: (songId: string): string | null => {
        const song = get().downloadedSongs.find((s) => s._id === songId);
        return song?.localPath || null;
    },

    setOfflineMode: (offline: boolean) => {
        set({ isOfflineMode: offline });
        // Fire and forget - don't await
        AsyncStorage.setItem(STORAGE_KEYS.OFFLINE_MODE, offline ? 'true' : 'false');
    },

    calculateStorageUsed: async () => {
        let total = 0;
        for (const song of get().downloadedSongs) {
            if (song.fileSize) {
                total += song.fileSize;
            }
        }
        set({ storageUsed: total });
    },

    clearAllDownloads: async () => {
        try {
            // Delete all files
            for (const song of get().downloadedSongs) {
                if (await RNFS.exists(song.localPath)) {
                    await RNFS.unlink(song.localPath);
                }
            }

            // Clear storage
            await AsyncStorage.removeItem(STORAGE_KEYS.DOWNLOADED_SONGS);

            set({ downloadedSongs: [], storageUsed: 0, downloadProgress: {} });
        } catch (error) {
            console.error('Clear downloads error:', error);
        }
    },
}));

// Helper function to format file size
export const formatFileSize = (bytes: number): string => {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
};

export default useOfflineMusicStore;
