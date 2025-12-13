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
    audioUrl: string | null;

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
    onPlaybackEnd: () => void;
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
    audioUrl: null,

    playSong: (song: Song) => {
        const state = get();

        if (!song.audioUrl) {
            console.warn('playSong: Song has no audioUrl:', song.title);
            return;
        }

        // If same song, toggle play/pause
        if (state.currentSong?._id === song._id) {
            set({ isPlaying: !state.isPlaying });
            return;
        }

        // Get the audio URL - might be local or remote
        const audioUrl = getFullAudioUrl(song.audioUrl);
        const isLocalFile = audioUrl.startsWith('file://');

        // Find the song in the queue
        let songIndex = state.queue.findIndex((s) => s._id === song._id);

        // For local/offline files, if not in queue, add it to queue
        if (songIndex === -1) {
            if (isLocalFile) {
                // Add song to queue for local files
                const newQueue = [...state.queue, song];
                songIndex = newQueue.length - 1;
                set({ queue: newQueue });
            } else {
                console.error('playSong: Remote song not found in queue:', song.title);
                return;
            }
        }

        const updates: Partial<PlayerState> = {
            currentSong: song,
            isPlaying: true,
            currentTime: 0,
            currentIndex: songIndex,
            audioUrl: audioUrl,
            duration: song.duration || 0,
            isLoading: false,
        };

        // Handle shuffle queue matching web app behavior
        if (state.isShuffle) {
            let remainingShuffleQueue = state.shuffleQueue.filter((queuedSong) => queuedSong._id !== song._id);
            if (remainingShuffleQueue.length === state.shuffleQueue.length) {
                remainingShuffleQueue = buildShuffleQueue(state.queue, song._id);
            }
            updates.shuffleQueue = remainingShuffleQueue;
        }

        set(updates);

        // Save as last played song (only for non-local files to avoid issues)
        if (!isLocalFile) {
            saveLastSong(song);
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
            audioUrl: null,
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
                audioUrl: null,
            });
        }
    },

    playAlbum: (songs: Song[], startIndex = 0) => {
        if (!songs.length) {
            return;
        }

        const state = get();
        const boundedIndex = Math.min(Math.max(startIndex, 0), songs.length - 1);
        const songToPlay = songs[boundedIndex];

        if (!songToPlay.audioUrl) {
            console.warn('playAlbum: Song has no audioUrl:', songToPlay.title);
            return;
        }

        const newQueue = [...songs];
        const audioUrl = getFullAudioUrl(songToPlay.audioUrl);

        // Set everything atomically like web app
        set({
            queue: newQueue,
            currentSong: songToPlay,
            currentIndex: boundedIndex,
            isPlaying: true,
            currentTime: 0,
            duration: songToPlay.duration || 0,
            audioUrl: audioUrl,
            shuffleQueue: state.isShuffle ? buildShuffleQueue(newQueue, songToPlay._id) : [],
            isLoading: false,
        });

        // Save as last played song (only for online songs)
        if (!audioUrl.startsWith('file://')) {
            saveLastSong(songToPlay);
        }
    },

    pauseSong: () => {
        set({ isPlaying: false });
    },

    resumeSong: () => {
        const { currentSong, audioUrl } = get();
        if (currentSong) {
            // If no audio URL, load it
            if (!audioUrl && currentSong.audioUrl) {
                set({
                    isPlaying: true,
                    audioUrl: getFullAudioUrl(currentSong.audioUrl)
                });
            } else {
                set({ isPlaying: true });
            }
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
        const state = get();
        const { queue, currentIndex, isShuffle, shuffleQueue, isLooping, currentSong } = state;


        if (queue.length === 0) return;

        // Handle case when no song is playing yet
        if (currentIndex === -1) {
            const nextSong = queue[0];
            set({
                currentSong: nextSong,
                currentIndex: 0,
                isPlaying: true,
                currentTime: 0,
                audioUrl: getFullAudioUrl(nextSong.audioUrl),
                shuffleQueue: isShuffle ? buildShuffleQueue(queue, nextSong._id) : shuffleQueue,
            });
            return;
        }

        if (isShuffle) {
            let [nextSong, ...remainingQueue] = shuffleQueue;

            if (!nextSong) {
                // Shuffle queue is empty
                if (!isLooping) {
                    // Not looping - stop playback
                    set({
                        isPlaying: false,
                        currentTime: 0,
                    });
                    return;
                }
                // Looping - rebuild shuffle queue
                const rebuilt = buildShuffleQueue(queue, currentSong?._id);
                [nextSong, ...remainingQueue] = rebuilt;
            }

            if (!nextSong) {
                // Still no song (shouldn't happen)
                set({
                    isPlaying: false,
                    currentTime: 0,
                });
                return;
            }

            const updatedIndex = queue.findIndex((song) => song._id === nextSong._id);


            set({
                currentSong: nextSong,
                isPlaying: true,
                currentTime: 0,
                currentIndex: updatedIndex === -1 ? currentIndex : updatedIndex,
                shuffleQueue: remainingQueue,
                audioUrl: getFullAudioUrl(nextSong.audioUrl),
            });
            return;
        }

        // Normal sequential playback
        const isLastIndex = currentIndex === queue.length - 1;
        if (isLastIndex && !isLooping) {
            set({
                isPlaying: false,
                currentTime: 0,
            });
            return;
        }

        const nextIndex = isLastIndex ? 0 : currentIndex + 1;
        const nextSong = queue[nextIndex];

        if (!nextSong) return;


        set({
            currentSong: nextSong,
            isPlaying: true,
            currentTime: 0,
            currentIndex: nextIndex,
            shuffleQueue: isShuffle ? buildShuffleQueue(queue, nextSong._id) : shuffleQueue,
            audioUrl: getFullAudioUrl(nextSong.audioUrl),
        });
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
        // The VideoPlayer component will handle the actual seek
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
        const state = get();
        const currentSongId = state.currentSong?._id;
        const newQueue = [...songs];

        // Find the current song's position in the new queue
        const newIndex = currentSongId
            ? newQueue.findIndex((song) => song._id === currentSongId)
            : -1;

        if (newQueue.length === 0) {
            set({
                queue: [],
                currentIndex: -1,
                currentSong: null,
                isPlaying: false,
                shuffleQueue: [],
                audioUrl: null,
            });
            return;
        }

        if (state.currentSong) {
            if (newIndex !== -1) {
                // Current song found in new queue
                set({
                    queue: newQueue,
                    currentIndex: newIndex,
                    shuffleQueue: state.isShuffle ? buildShuffleQueue(newQueue, state.currentSong._id) : state.shuffleQueue,
                });
            } else {
                // Current song not in new queue, reset to first song (don't auto-play)
                set({
                    queue: newQueue,
                    currentIndex: 0,
                    currentSong: newQueue[0],
                    isPlaying: false,
                    shuffleQueue: state.isShuffle ? buildShuffleQueue(newQueue, newQueue[0]._id) : state.shuffleQueue,
                    audioUrl: null,
                });
            }
        } else {
            // No current song - just set the queue, don't auto-select
            set({
                queue: newQueue,
                currentIndex: -1,
                shuffleQueue: state.isShuffle ? buildShuffleQueue(newQueue) : [],
            });
        }
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
        set({ queue: [], currentIndex: -1, shuffleQueue: [], audioUrl: null });
    },

    updateProgress: (position: number, duration: number) => {
        set({ currentTime: position, duration });
    },

    setIsPlaying: (isPlaying: boolean) => {
        const { currentSong, audioUrl } = get();

        // If trying to play but no audio URL loaded, load it
        if (isPlaying && !audioUrl && currentSong?.audioUrl) {
            set({
                isPlaying: true,
                audioUrl: getFullAudioUrl(currentSong.audioUrl)
            });
        } else {
            set({ isPlaying });
        }
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

    onPlaybackEnd: () => {
        get().playNext();
    },

    cleanup: () => {
        set({
            currentSong: null,
            isPlaying: false,
            currentTime: 0,
            duration: 0,
            audioUrl: null,
        });
    },
}));

export default usePlayerStore;
