import { create } from 'zustand';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Song } from '../types';
import axiosInstance from '../api/axios';
import { getFullAudioUrl, getFullImageUrl } from '../config';

// Storage key for persisting last song
const LAST_SONG_KEY = '@drs_music_last_song';

// Build shuffle queue - matching web app logic
const buildShuffleQueue = (songs: Song[], excludeSongId?: string): Song[] => {
    const pool = songs.filter((s) => s._id !== excludeSongId);
    for (let i = pool.length - 1; i > 0; i--) {
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

    // Actions
    playSong: (song: Song) => void;
    setCurrentSong: (song: Song) => void;
    restoreLastSong: () => Promise<void>;
    playAlbum: (songs: Song[], startIndex?: number) => void;
    pauseSong: () => void;
    resumeSong: () => void;
    togglePlayPause: () => void;
    playNext: () => void;
    playPrevious: () => void;
    seekTo: (position: number) => void;
    setVolume: (volume: number) => void;
    toggleMute: () => void;
    toggleShuffle: () => void;
    toggleLoop: () => void;
    setQueue: (songs: Song[]) => void;
    addToQueue: (song: Song) => void;
    removeFromQueue: (songId: string) => void;
    clearQueue: () => void;
    updateProgress: (position: number, duration: number) => void;
    setIsPlaying: (isPlaying: boolean) => void;
    setAudioQuality: (quality: 'low' | 'normal' | 'high') => void;
    toggleCrossfade: () => void;
    loadSettingsFromBackend: () => Promise<void>;
    cleanup: () => void;
}

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

    playSong: (song: Song) => {
        const state = get();

        if (!song.audioUrl) {
            console.warn('Song has no audioUrl:', song.title);
            return;
        }

        // If same song and already playing, toggle instead
        if (state.currentSong?._id === song._id) {
            if (state.isPlaying) {
                get().pauseSong();
            } else {
                get().resumeSong();
            }
            return;
        }

        const audioUrl = getFullAudioUrl(song.audioUrl);
        console.log('Would play audio from:', audioUrl);

        // Find index in queue
        const index = state.queue.findIndex(s => s._id === song._id);

        // Update state
        const updates: Partial<PlayerState> = {
            isLoading: false,
            isPlaying: true,
            duration: song.duration || 0,
            currentTime: 0,
            currentIndex: index,
            currentSong: song,
        };

        // Build shuffle queue if shuffle is on
        if (state.isShuffle) {
            updates.shuffleQueue = buildShuffleQueue(state.queue, song._id);
        }

        set(updates);

        // Save as last played song
        saveLastSong(song);

        // NOTE: Audio playback is temporarily disabled
        // A compatible audio library will be added in a future update
        console.log('Now playing (UI only):', song.title, '-', song.artist);

        // Broadcast activity to friends
        try {
            const { useFriendsStore } = require('./useFriendsStore');
            useFriendsStore.getState().updateActivity(song.title, song.artist);
        } catch (e) {
            // Friends store may not be available
        }
    },

    setCurrentSong: (song: Song) => {
        if (!song.audioUrl) {
            console.warn('Song has no audioUrl:', song.title);
            return;
        }

        set({
            currentSong: song,
            isPlaying: false,
            isLoading: false,
            currentTime: 0,
            duration: song.duration || 0,
        });

        // Save as last played song for restoration
        saveLastSong(song);
    },

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
        set({ queue: songs });
        if (songs.length > 0 && songs[startIndex]) {
            get().playSong(songs[startIndex]);
        }
    },

    pauseSong: () => {
        set({ isPlaying: false });
    },

    resumeSong: () => {
        const { currentSong } = get();
        if (currentSong) {
            set({ isPlaying: true });
        }
    },

    togglePlayPause: () => {
        const { isPlaying, currentSong, queue } = get();

        if (!currentSong) {
            // No current song, try to play the first from queue
            if (queue.length > 0) {
                get().playSong(queue[0]);
            }
            return;
        }

        if (isPlaying) {
            get().pauseSong();
        } else {
            get().resumeSong();
        }
    },

    playNext: () => {
        const { queue, currentIndex, isShuffle, shuffleQueue, isLooping } = get();

        if (queue.length === 0) return;

        let nextSong: Song | undefined;
        let nextIndex = currentIndex;

        if (isShuffle && shuffleQueue.length > 0) {
            // Get next from shuffle queue
            nextSong = shuffleQueue[0];
            const newShuffleQueue = shuffleQueue.slice(1);

            // Rebuild shuffle queue if empty and looping
            if (newShuffleQueue.length === 0 && isLooping) {
                set({ shuffleQueue: buildShuffleQueue(queue, nextSong._id) });
            } else {
                set({ shuffleQueue: newShuffleQueue });
            }

            nextIndex = queue.findIndex(s => s._id === nextSong?._id);
        } else {
            // Normal sequential playback
            nextIndex = (currentIndex + 1) % queue.length;

            // If we've wrapped around and not looping, stop
            if (nextIndex === 0 && !isLooping && currentIndex !== -1) {
                set({ isPlaying: false, currentTime: 0 });
                return;
            }

            nextSong = queue[nextIndex];
        }

        if (nextSong) {
            set({ currentIndex: nextIndex });
            get().playSong(nextSong);
        }
    },

    playPrevious: () => {
        const { queue, currentIndex, currentTime } = get();

        // If more than 3 seconds into the song, restart it
        if (currentTime > 3) {
            get().seekTo(0);
            return;
        }

        if (queue.length === 0) return;

        let prevIndex = currentIndex - 1;
        if (prevIndex < 0) {
            prevIndex = queue.length - 1;
        }

        const prevSong = queue[prevIndex];
        if (prevSong) {
            set({ currentIndex: prevIndex });
            get().playSong(prevSong);
        }
    },

    seekTo: (position: number) => {
        set({ currentTime: position });
    },

    setVolume: (volume: number) => {
        const clampedVolume = Math.max(0, Math.min(1, volume));
        set({ volume: clampedVolume, isMuted: clampedVolume === 0 });
        syncPlaybackToBackend(undefined, undefined, clampedVolume);
    },

    toggleMute: () => {
        const { isMuted } = get();
        set({ isMuted: !isMuted });
    },

    toggleShuffle: () => {
        const { isShuffle, queue, currentSong } = get();
        const newShuffle = !isShuffle;

        if (newShuffle && queue.length > 0) {
            const newShuffleQueue = buildShuffleQueue(queue, currentSong?._id);
            set({ isShuffle: true, shuffleQueue: newShuffleQueue });
        } else {
            set({ isShuffle: false, shuffleQueue: [] });
        }

        syncPlaybackToBackend(newShuffle);
    },

    toggleLoop: () => {
        const newLooping = !get().isLooping;
        set({ isLooping: newLooping });
        syncPlaybackToBackend(undefined, newLooping);
    },

    setQueue: (songs: Song[]) => {
        set({ queue: songs });
    },

    addToQueue: (song: Song) => {
        const { queue } = get();
        if (!queue.some(s => s._id === song._id)) {
            set({ queue: [...queue, song] });
        }
    },

    removeFromQueue: (songId: string) => {
        const { queue } = get();
        set({ queue: queue.filter(s => s._id !== songId) });
    },

    clearQueue: () => {
        set({ queue: [], currentIndex: -1, shuffleQueue: [] });
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
        const { crossfade } = get();
        set({ crossfade: !crossfade });
    },

    loadSettingsFromBackend: async () => {
        try {
            const response = await axiosInstance.get('/users/me/settings');
            const settings = response.data?.settings?.playback;
            if (settings) {
                const updates: Partial<PlayerState> = {};
                if (typeof settings.shuffle === 'boolean') {
                    updates.isShuffle = settings.shuffle;
                }
                if (typeof settings.loop === 'boolean') {
                    updates.isLooping = settings.loop;
                }
                if (typeof settings.volume === 'number') {
                    updates.volume = settings.volume;
                }
                set(updates);
            }
        } catch (error) {
            // Silently fail - user may not be authenticated
        }
    },

    cleanup: () => {
        set({
            currentSong: null,
            isPlaying: false,
            currentTime: 0,
            duration: 0,
        });
    },
}));

export default usePlayerStore;
