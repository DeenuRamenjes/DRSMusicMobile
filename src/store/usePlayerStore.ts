import { create } from 'zustand';
import { Platform } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import Sound from 'react-native-sound';
import { Song } from '../types';
import axiosInstance from '../api/axios';

// Storage key for persisting last song
const LAST_SONG_KEY = '@drs_music_last_song';

// Enable playback in silence mode (iOS)
Sound.setCategory('Playback');

// Backend URL for audio files
const BACKEND_PORT = 5000;
const LOCAL_IP = '192.168.1.40';
const BACKEND_URL = Platform.OS === 'android'
    ? `http://${LOCAL_IP}:${BACKEND_PORT}`
    : `http://localhost:${BACKEND_PORT}`;

// GLOBAL sound reference to ensure only one sound plays at a time
let currentSoundInstance: Sound | null = null;
let isLoadingSoundGlobal = false;

// Function to stop and release the current sound
const stopAndReleaseCurrentSound = () => {
    if (currentSoundInstance) {
        try {
            currentSoundInstance.stop();
            currentSoundInstance.release();
        } catch (e) {
            // Ignore errors during cleanup
        }
        currentSoundInstance = null;
    }
};

// Helper to get full audio URL
const getFullAudioUrl = (audioUrl: string): string => {
    if (!audioUrl) return '';

    // Already a full URL (Cloudinary, etc.)
    if (audioUrl.startsWith('http://') || audioUrl.startsWith('https://')) {
        return audioUrl;
    }

    // Handle relative paths from backend
    let path = audioUrl;
    if (!path.startsWith('/')) {
        path = '/' + path;
    }

    const fullUrl = `${BACKEND_URL}${path}`;
    return fullUrl;
};

// Build shuffle queue - matching web app logic
const buildShuffleQueue = (songs: Song[], excludeSongId?: string): Song[] => {
    const pool = songs.filter((song) => song._id !== excludeSongId);
    for (let i = pool.length - 1; i > 0; i -= 1) {
        const j = Math.floor(Math.random() * (i + 1));
        [pool[i], pool[j]] = [pool[j], pool[i]];
    }
    return pool;
};

// Debounce function for syncing to backend
let syncTimeout: ReturnType<typeof setTimeout> | null = null;
const syncPlaybackToBackend = async (shuffle?: boolean, loop?: boolean, volume?: number) => {
    if (syncTimeout) {
        clearTimeout(syncTimeout);
    }
    syncTimeout = setTimeout(async () => {
        try {
            await axiosInstance.patch('/users/me/settings/playback', {
                shuffle,
                loop,
                volume
            });
        } catch (error) {
            // Silently fail - user may not be authenticated
        }
    }, 500);
};

// Persist last song to AsyncStorage
const saveLastSong = async (song: Song) => {
    try {
        await AsyncStorage.setItem(LAST_SONG_KEY, JSON.stringify(song));
    } catch (error) {
        console.error('Error saving last song:', error);
    }
};

// Load last song from AsyncStorage
const loadLastSong = async (): Promise<Song | null> => {
    try {
        const songJson = await AsyncStorage.getItem(LAST_SONG_KEY);
        if (songJson) {
            return JSON.parse(songJson) as Song;
        }
    } catch (error) {
        console.error('Error loading last song:', error);
    }
    return null;
};

interface PlayerState {
    currentSong: Song | null;
    isPlaying: boolean;
    isLoading: boolean;
    volume: number;
    isMuted: boolean;
    currentTime: number;
    duration: number;
    queue: Song[];
    currentIndex: number;
    isShuffle: boolean;
    isLooping: boolean;
    shuffleQueue: Song[];
    audioQuality: 'low' | 'normal' | 'high';
    crossfade: boolean;
    isPlayerReady: boolean;
    sound: Sound | null;

    // Actions
    setupPlayer: () => Promise<void>;
    playSong: (song: Song) => void;
    setCurrentSong: (song: Song) => void; // Set song without playing
    restoreLastSong: () => Promise<void>; // Restore last song from storage
    playAlbum: (songs: Song[], startIndex?: number) => void;
    pauseSong: () => void;
    resumeSong: () => void;
    togglePlayPause: () => void;
    playNext: () => void;
    playPrevious: () => void;
    seekTo: (position: number) => Promise<void>;
    setVolume: (volume: number) => void;
    toggleMute: () => void;
    toggleShuffle: () => Promise<void>;
    toggleLoop: () => Promise<void>;
    setQueue: (songs: Song[]) => void;
    addToQueue: (song: Song) => Promise<void>;
    removeFromQueue: (songId: string) => void;
    clearQueue: () => void;
    updateProgress: (position: number, duration: number) => void;
    setIsPlaying: (isPlaying: boolean) => void;
    setAudioQuality: (quality: 'low' | 'normal' | 'high') => void;
    toggleCrossfade: () => void;
    loadSettingsFromBackend: () => Promise<void>;
    cleanup: () => void;
}

let progressInterval: ReturnType<typeof setInterval> | null = null;

export const usePlayerStore = create<PlayerState>((set, get) => ({
    currentSong: null,
    isPlaying: false,
    isLoading: false,
    volume: 0.7,
    isMuted: false,
    currentTime: 0,
    duration: 0,
    queue: [],
    currentIndex: -1,
    isShuffle: false,
    isLooping: true,
    shuffleQueue: [],
    audioQuality: 'high',
    crossfade: false,
    isPlayerReady: true,
    sound: null,

    setupPlayer: async () => {
        set({ isPlayerReady: true });
    },

    playSong: (song: Song) => {
        const state = get();

        // Validate audioUrl before attempting to play
        if (!song.audioUrl) {
            console.warn('Song has no audioUrl:', song.title);
            return;
        }

        // If same song, toggle play state
        if (state.currentSong?._id === song._id) {
            if (state.isPlaying) {
                state.pauseSong();
            } else {
                state.resumeSong();
            }
            return;
        }

        // Find song in queue
        const songIndex = state.queue.findIndex((s) => s._id === song._id);

        // Prevent multiple simultaneous load attempts
        if (isLoadingSoundGlobal) {
            return;
        }
        isLoadingSoundGlobal = true;

        set({ isLoading: true, isPlaying: false, currentSong: song });

        // IMPORTANT: Stop and release the GLOBAL sound reference first
        stopAndReleaseCurrentSound();

        // Also stop state.sound if it exists (belt and suspenders)
        if (state.sound) {
            try {
                state.sound.stop();
                state.sound.release();
            } catch (e) {
                console.log('Error stopping state sound:', e);
            }
        }

        // Clear progress interval
        if (progressInterval) {
            clearInterval(progressInterval);
            progressInterval = null;
        }

        // Clear the sound reference immediately
        set({ sound: null });

        const audioUrl = getFullAudioUrl(song.audioUrl);

        // Load new sound
        const newSound = new Sound(audioUrl, '', (error) => {
            // Reset loading flag
            isLoadingSoundGlobal = false;

            if (error) {
                console.error('❌ Error loading sound:', error);
                set({ isLoading: false, isPlaying: false });
                // Try next song if this one fails
                get().playNext();
                return;
            }

            // Check if a different song was requested while we were loading
            if (get().currentSong?._id !== song._id) {
                newSound.release();
                return;
            }

            const songDuration = newSound.getDuration();

            // Store in global reference
            currentSoundInstance = newSound;

            // Update shuffle queue if shuffle is on
            const updates: Partial<PlayerState> = {
                currentSong: song,
                isPlaying: true,
                isLoading: false,
                currentTime: 0,
                duration: songDuration,
                currentIndex: songIndex !== -1 ? songIndex : state.currentIndex,
                sound: newSound,
            };

            if (state.isShuffle) {
                let remainingShuffleQueue = state.shuffleQueue.filter(
                    (queuedSong) => queuedSong._id !== song._id
                );
                if (remainingShuffleQueue.length === state.shuffleQueue.length) {
                    remainingShuffleQueue = buildShuffleQueue(state.queue, song._id);
                }
                updates.shuffleQueue = remainingShuffleQueue;
            }

            set(updates);

            // Set volume
            newSound.setVolume(state.isMuted ? 0 : state.volume);

            // Save the last song to storage
            saveLastSong(song);

            // Broadcast activity to friends
            try {
                const { useFriendsStore } = require('./useFriendsStore');
                useFriendsStore.getState().updateActivity(song.title, song.artist);
            } catch (e) {
                // Friends store may not be available
            }

            // Play the sound
            newSound.play((success) => {
                if (success) {
                    // Auto-play next
                    get().playNext();
                } else {
                    set({ isPlaying: false });
                }
            });

            // Start progress tracking
            progressInterval = setInterval(() => {
                const currentSound = get().sound;
                if (currentSound && get().isPlaying) {
                    currentSound.getCurrentTime((seconds) => {
                        set({ currentTime: seconds });
                    });
                }
            }, 500);
        });
    },

    // Set a song as current without playing it (for UI display)
    setCurrentSong: (song: Song) => {
        if (!song.audioUrl) {
            console.warn('Song has no audioUrl:', song.title);
            return;
        }

        // Just update the state without loading/playing audio
        set({
            currentSong: song,
            isPlaying: false,
            isLoading: false,
            currentTime: 0,
            duration: song.duration || 0,
        });

        // Save to storage
        saveLastSong(song);
    },

    // Restore the last played song from storage
    restoreLastSong: async () => {
        const lastSong = await loadLastSong();
        if (lastSong) {
            set({
                currentSong: lastSong,
                isPlaying: false,
                isLoading: false,
                currentTime: 0,
                duration: lastSong.duration || 0,
            });
        }
    },

    playAlbum: (songs: Song[], startIndex = 0) => {
        if (!songs.length) return;

        // Filter songs that have valid audioUrl
        const playableSongs = songs.filter((song) => song.audioUrl);
        if (playableSongs.length === 0) {
            console.warn('No playable songs in album');
            return;
        }

        const boundedIndex = Math.min(Math.max(startIndex, 0), playableSongs.length - 1);
        const songToPlay = playableSongs[boundedIndex];

        set((state) => ({
            queue: playableSongs,
            currentIndex: boundedIndex,
            shuffleQueue: state.isShuffle ? buildShuffleQueue(playableSongs, songToPlay._id) : [],
        }));

        get().playSong(songToPlay);
    },

    pauseSong: () => {
        const { sound } = get();
        // Pause both the zustand sound and global instance
        if (sound) {
            sound.pause();
        }
        if (currentSoundInstance) {
            currentSoundInstance.pause();
        }
        set({ isPlaying: false });
    },

    resumeSong: () => {
        const { sound, currentSong } = get();
        // Use zustand sound or fall back to global instance
        const activeSound = sound || currentSoundInstance;

        if (activeSound && currentSong) {
            activeSound.play((success) => {
                if (success) {
                    get().playNext();
                } else {
                    set({ isPlaying: false });
                }
            });
            set({ isPlaying: true });
        }
    },

    togglePlayPause: () => {
        const { isPlaying, pauseSong, resumeSong, currentSong, sound, playSong } = get();
        if (!currentSong) return;

        if (isPlaying) {
            pauseSong();
        } else {
            // If no sound is loaded yet (e.g., song was set via setCurrentSong), load and play it
            const activeSound = sound || currentSoundInstance;
            if (!activeSound) {
                playSong(currentSong);
            } else {
                resumeSong();
            }
        }
    },

    playNext: () => {
        const state = get();
        if (!state.queue.length) return;

        // If no current song, play first
        if (state.currentIndex === -1) {
            const nextSong = state.queue[0];
            if (nextSong?.audioUrl) {
                set({
                    currentIndex: 0,
                    shuffleQueue: state.isShuffle ? buildShuffleQueue(state.queue, nextSong._id) : state.shuffleQueue,
                });
                get().playSong(nextSong);
            }
            return;
        }

        if (state.isShuffle) {
            let [nextSong, ...remainingQueue] = state.shuffleQueue;

            if (!nextSong) {
                if (!state.isLooping) {
                    set({ isPlaying: false, currentTime: 0 });
                    return;
                }
                const rebuilt = buildShuffleQueue(state.queue, state.currentSong?._id);
                [nextSong, ...remainingQueue] = rebuilt;
            }

            if (!nextSong || !nextSong.audioUrl) {
                // Find next song with valid audioUrl
                const validSong = remainingQueue.find((s) => s.audioUrl);
                if (validSong) {
                    const updatedIndex = state.queue.findIndex((song) => song._id === validSong._id);
                    set({
                        shuffleQueue: remainingQueue.filter((s) => s._id !== validSong._id),
                        currentIndex: updatedIndex !== -1 ? updatedIndex : state.currentIndex,
                    });
                    get().playSong(validSong);
                } else {
                    set({ isPlaying: false, currentTime: 0 });
                }
                return;
            }

            const updatedIndex = state.queue.findIndex((song) => song._id === nextSong._id);
            set({
                shuffleQueue: remainingQueue,
                currentIndex: updatedIndex !== -1 ? updatedIndex : state.currentIndex,
            });
            get().playSong(nextSong);
            return;
        }

        // Non-shuffle mode
        const isLastIndex = state.currentIndex === state.queue.length - 1;
        if (isLastIndex && !state.isLooping) {
            set({ isPlaying: false, currentTime: 0 });
            return;
        }

        const nextIndex = isLastIndex ? 0 : state.currentIndex + 1;
        const nextSong = state.queue[nextIndex];

        if (nextSong?.audioUrl) {
            set({ currentIndex: nextIndex });
            get().playSong(nextSong);
        }
    },

    playPrevious: () => {
        const state = get();
        if (!state.queue.length) return;

        // If more than 3 seconds in, restart current song
        if (state.currentTime > 3 && state.currentSong) {
            const { sound } = state;
            if (sound) {
                sound.setCurrentTime(0);
                set({ currentTime: 0 });
            }
            return;
        }

        const isFirstIndex = state.currentIndex === 0;
        const prevIndex = isFirstIndex ? state.queue.length - 1 : state.currentIndex - 1;
        const prevSong = state.queue[prevIndex];

        if (prevSong?.audioUrl) {
            set({ currentIndex: prevIndex });
            get().playSong(prevSong);
        }
    },

    seekTo: async (position: number) => {
        const { sound } = get();
        if (sound) {
            sound.setCurrentTime(position);
            set({ currentTime: position });
        }
    },

    setVolume: (volume: number) => {
        const { sound } = get();
        const clampedVolume = Math.max(0, Math.min(1, volume));
        if (sound) {
            sound.setVolume(clampedVolume);
        }
        set({ volume: clampedVolume, isMuted: clampedVolume === 0 });
        syncPlaybackToBackend(undefined, undefined, clampedVolume);
    },

    toggleMute: () => {
        const { sound, isMuted, volume } = get();
        const newMuted = !isMuted;
        if (sound) {
            sound.setVolume(newMuted ? 0 : volume);
        }
        set({ isMuted: newMuted });
    },

    toggleShuffle: async () => {
        const state = get();
        const newShuffle = !state.isShuffle;

        if (newShuffle && state.queue.length > 0) {
            const shuffled = buildShuffleQueue(state.queue, state.currentSong?._id);
            set({ isShuffle: newShuffle, shuffleQueue: shuffled });
        } else {
            set({ isShuffle: newShuffle, shuffleQueue: [] });
        }

        syncPlaybackToBackend(newShuffle, undefined, undefined);
    },

    toggleLoop: async () => {
        const state = get();
        const newLoop = !state.isLooping;
        set({ isLooping: newLoop });
        syncPlaybackToBackend(undefined, newLoop, undefined);
    },

    setQueue: (songs: Song[]) => {
        const playableSongs = songs.filter((song) => song.audioUrl);
        set({ queue: playableSongs });
    },

    addToQueue: async (song: Song) => {
        if (!song.audioUrl) return;
        set((state) => ({
            queue: [...state.queue, song],
        }));
    },

    removeFromQueue: (songId: string) => {
        set((state) => ({
            queue: state.queue.filter((song) => song._id !== songId),
        }));
    },

    clearQueue: () => {
        stopAndReleaseCurrentSound();
        if (progressInterval) {
            clearInterval(progressInterval);
            progressInterval = null;
        }
        set({
            queue: [],
            currentIndex: -1,
            shuffleQueue: [],
            currentSong: null,
            isPlaying: false,
            currentTime: 0,
            duration: 0,
            sound: null,
        });
    },

    updateProgress: (position: number, duration: number) => {
        set({ currentTime: position, duration });
    },

    setIsPlaying: (isPlaying: boolean) => {
        set({ isPlaying });
    },

    setAudioQuality: (quality: 'low' | 'normal' | 'high') => {
        set({ audioQuality: quality });
    },

    toggleCrossfade: () => {
        set((state) => ({ crossfade: !state.crossfade }));
    },

    loadSettingsFromBackend: async () => {
        try {
            const response = await axiosInstance.get('/users/me/settings');
            const settings = response.data?.playback;
            if (settings) {
                set({
                    isShuffle: settings.shuffle ?? false,
                    isLooping: settings.loop ?? true,
                    volume: settings.volume ?? 0.7,
                    audioQuality: settings.quality ?? 'high',
                    crossfade: settings.crossfade ?? false,
                });
            }
        } catch (error) {
            // Silently fail
        }
    },

    cleanup: () => {
        stopAndReleaseCurrentSound();
        if (progressInterval) {
            clearInterval(progressInterval);
            progressInterval = null;
        }
        set({
            currentSong: null,
            isPlaying: false,
            currentTime: 0,
            duration: 0,
            sound: null,
        });
    },
}));

export default usePlayerStore;
