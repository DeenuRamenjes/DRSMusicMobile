import React, { useEffect, useRef } from 'react';
import { AppState, AppStateStatus } from 'react-native';
import TrackPlayer, {
    Capability,
    Event,
    useProgress,
    useTrackPlayerEvents,
    RepeatMode,
    AppKilledPlaybackBehavior,
} from 'react-native-track-player';
import { usePlayerStore } from '../store/usePlayerStore';
import { getFullAudioUrl, getFullImageUrl } from '../config';

// Track if TrackPlayer is initialized
let isTrackPlayerInitialized = false;

/**
 * Initialize TrackPlayer with proper configuration
 */
export const setupTrackPlayer = async (): Promise<boolean> => {
    if (isTrackPlayerInitialized) {
        return true;
    }

    try {
        // Check if already setup
        try {
            await TrackPlayer.getActiveTrackIndex();
            isTrackPlayerInitialized = true;
            return true;
        } catch {
            // Not initialized, continue with setup
        }

        await TrackPlayer.setupPlayer({
            autoHandleInterruptions: true,
        });

        // Configure player capabilities (notification controls)
        await TrackPlayer.updateOptions({
            capabilities: [
                Capability.Play,
                Capability.Pause,
                Capability.SkipToNext,
                Capability.SkipToPrevious,
                Capability.SeekTo,
                Capability.Stop,
            ],
            notificationCapabilities: [
                Capability.Play,
                Capability.Pause,
                Capability.SkipToNext,
                Capability.SkipToPrevious,
                Capability.SeekTo,
            ],
            progressUpdateEventInterval: 1,
            android: {
                appKilledPlaybackBehavior: AppKilledPlaybackBehavior.ContinuePlayback,
            },
        });

        // Set repeat mode to OFF - we handle queue advancement manually
        await TrackPlayer.setRepeatMode(RepeatMode.Off);

        isTrackPlayerInitialized = true;
        return true;
    } catch (error) {
        console.error('[TrackPlayer] Setup error:', error);
        return false;
    }
};

/**
 * AudioPlayer - Component that manages TrackPlayer and syncs with Zustand store
 */
export const AudioPlayer = () => {
    const isInitializedRef = useRef(false);
    const lastSongIdRef = useRef<string | null>(null);
    const appStateRef = useRef(AppState.currentState);
    const isLoadingTrackRef = useRef(false);

    const {
        audioUrl,
        currentSong,
        isPlaying,
        updateProgress,
        setIsPlaying,
    } = usePlayerStore();

    // Get progress from TrackPlayer
    const progress = useProgress(500);

    // Initialize TrackPlayer on mount
    useEffect(() => {
        const initialize = async () => {
            if (isInitializedRef.current) return;
            
            const success = await setupTrackPlayer();
            if (success) {
                isInitializedRef.current = true;
            }
        };

        initialize();
    }, []);

    // Handle app state changes
    useEffect(() => {
        const subscription = AppState.addEventListener('change', (nextAppState: AppStateStatus) => {
            appStateRef.current = nextAppState;
        });

        return () => {
            subscription.remove();
        };
    }, []);

    // Track last time we triggered playNext to prevent double triggering
    const lastPlayNextTimeRef = useRef<number>(0);

    // CRITICAL: Listen for playback events to handle track ending
    // NOTE: We only listen for queue ended - play/pause state is controlled by the store
    useTrackPlayerEvents(
        [Event.PlaybackQueueEnded],
        async (event) => {
            // When queue ends (no more tracks to play) - trigger next song
            if (event.type === Event.PlaybackQueueEnded) {
                // Debounce: Only trigger if more than 500ms since last trigger
                const now = Date.now();
                if (now - lastPlayNextTimeRef.current < 500) {
                    return;
                }
                lastPlayNextTimeRef.current = now;
                
                usePlayerStore.getState().playNext();
            }
        }
    );

    // Sync progress to store
    useEffect(() => {
        if (progress.duration > 0) {
            updateProgress(progress.position, progress.duration);
        }
    }, [progress.position, progress.duration, updateProgress]);

    // Sync current song changes to TrackPlayer
    useEffect(() => {
        const loadTrack = async () => {
            if (!currentSong || !audioUrl || !isInitializedRef.current) return;

            // Avoid reloading the same track - the sync effect handles play/pause state
            if (lastSongIdRef.current === currentSong._id) {
                // Same track - no need to reload, play/pause is handled by the sync effect
                return;
            }

            lastSongIdRef.current = currentSong._id;
            isLoadingTrackRef.current = true;

            try {
                const newTrack = {
                    id: currentSong._id,
                    url: audioUrl,
                    title: currentSong.title || 'Unknown Title',
                    artist: currentSong.artist || 'Unknown Artist',
                    artwork: currentSong.imageUrl 
                        ? getFullImageUrl(currentSong.imageUrl) 
                        : undefined,
                    duration: currentSong.duration || 0,
                };

                // Use load() instead of reset() + add() to prevent notification from restarting
                // load() smoothly transitions to the new track
                await TrackPlayer.load(newTrack);

                // Ensure repeat is OFF - we handle next track manually
                await TrackPlayer.setRepeatMode(RepeatMode.Off);

                // Play the track
                await TrackPlayer.play();
            } catch (error) {
                console.error('[TrackPlayer] Error loading track:', error);
                
                // Fallback to reset approach if load fails
                try {
                    await TrackPlayer.reset();
                    await TrackPlayer.add({
                        id: currentSong._id,
                        url: audioUrl,
                        title: currentSong.title || 'Unknown Title',
                        artist: currentSong.artist || 'Unknown Artist',
                        artwork: currentSong.imageUrl 
                            ? getFullImageUrl(currentSong.imageUrl) 
                            : undefined,
                        duration: currentSong.duration || 0,
                    });
                    await TrackPlayer.setRepeatMode(RepeatMode.Off);
                    await TrackPlayer.play();
                } catch (fallbackError) {
                    console.error('[TrackPlayer] Fallback also failed:', fallbackError);
                }
            } finally {
                isLoadingTrackRef.current = false;
            }
        };

        loadTrack();
    }, [currentSong?._id, audioUrl]);

    // Sync play/pause state from store to TrackPlayer
    // This ONLY triggers when isPlaying changes in the store (from user action or notification)
    useEffect(() => {
        // Skip sync if not initialized or loading a new track
        if (!isInitializedRef.current || isLoadingTrackRef.current) return;
        
        const syncPlayState = async () => {
            try {
                if (isPlaying) {
                    await TrackPlayer.play();
                } else {
                    await TrackPlayer.pause();
                }
            } catch (error) {
                console.error('[TrackPlayer] Play state sync error:', error);
            }
        };

        syncPlayState();
    }, [isPlaying]); // ONLY react to isPlaying changes

    // Listen for seek requests from store
    useEffect(() => {
        const unsubscribe = usePlayerStore.subscribe((state, prevState) => {
            const timeDiff = Math.abs(state.currentTime - prevState.currentTime);
            // If time changed by more than 1 second, it's likely a seek
            if (timeDiff > 1 && isInitializedRef.current) {
                TrackPlayer.seekTo(state.currentTime).catch(() => {});
            }
        });

        return () => unsubscribe();
    }, []);

    // This component doesn't render anything visible
    return null;
};

export default AudioPlayer;
