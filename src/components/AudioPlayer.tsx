import React, { useEffect, useRef } from 'react';
import { AppState, AppStateStatus } from 'react-native';
import TrackPlayer, {
    Capability,
    State,
    usePlaybackState,
    useProgress,
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
            console.log('[TrackPlayer] Already initialized');
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
        console.log('[TrackPlayer] Setup complete');
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
    } = usePlayerStore();

    // Get playback state from TrackPlayer
    const playbackState = usePlaybackState();
    const progress = useProgress(500);

    // Initialize TrackPlayer on mount
    useEffect(() => {
        const initialize = async () => {
            if (isInitializedRef.current) return;
            
            const success = await setupTrackPlayer();
            if (success) {
                isInitializedRef.current = true;
                console.log('[AudioPlayer] TrackPlayer initialized');
            }
        };

        initialize();
    }, []);

    // Handle app state changes
    useEffect(() => {
        const subscription = AppState.addEventListener('change', (nextAppState: AppStateStatus) => {
            console.log('[AudioPlayer] App state changed:', appStateRef.current, '->', nextAppState);
            appStateRef.current = nextAppState;
        });

        return () => {
            subscription.remove();
        };
    }, []);

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

            // Avoid reloading the same track
            if (lastSongIdRef.current === currentSong._id) {
                // Just control playback for same song
                try {
                    const state = playbackState.state;
                    if (isPlaying && state !== State.Playing) {
                        await TrackPlayer.play();
                    } else if (!isPlaying && state === State.Playing) {
                        await TrackPlayer.pause();
                    }
                } catch (error) {
                    // Ignore
                }
                return;
            }

            lastSongIdRef.current = currentSong._id;
            isLoadingTrackRef.current = true;
            console.log('[TrackPlayer] Loading new track:', currentSong.title);

            try {
                // Get current queue
                const queue = await TrackPlayer.getQueue();
                
                // If there's a track playing, just skip to end and add new track
                if (queue.length > 0) {
                    // Remove all tracks from queue
                    await TrackPlayer.removeUpcomingTracks();
                    
                    // Add new track
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
                    
                    // Skip to the new track
                    await TrackPlayer.skipToNext();
                    
                    // Remove the old track (now at position 0)
                    try {
                        await TrackPlayer.remove(0);
                    } catch (e) {
                        // Ignore if removal fails
                    }
                } else {
                    // No tracks in queue, just add and play
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
                }

                // Ensure repeat is off
                await TrackPlayer.setRepeatMode(RepeatMode.Off);

                // Play the track
                await TrackPlayer.play();
                console.log('[TrackPlayer] Track loaded and playing');
            } catch (error) {
                console.error('[TrackPlayer] Error loading track:', error);
            } finally {
                isLoadingTrackRef.current = false;
            }
        };

        loadTrack();
    }, [currentSong?._id, audioUrl]);

    // Sync play/pause state from store to TrackPlayer
    useEffect(() => {
        const syncPlayState = async () => {
            if (!isInitializedRef.current || isLoadingTrackRef.current) return;

            try {
                const currentState = playbackState.state;
                
                if (isPlaying && currentState !== State.Playing && currentState !== State.Buffering) {
                    await TrackPlayer.play();
                } else if (!isPlaying && currentState === State.Playing) {
                    await TrackPlayer.pause();
                }
            } catch (error) {
                console.error('[TrackPlayer] Play state sync error:', error);
            }
        };

        syncPlayState();
    }, [isPlaying, playbackState.state]);

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
