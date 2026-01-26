import React, { useEffect, useRef } from 'react';
import { AppState, AppStateStatus } from 'react-native';
import TrackPlayer, {
    Capability,
    Event,
    useProgress,
    useTrackPlayerEvents,
    RepeatMode,
    AppKilledPlaybackBehavior,
    State,
} from 'react-native-track-player';
import { usePlayerStore } from '../store/usePlayerStore';
import { useFriendsStore } from '../store/useFriendsStore';
import { useEqualizerStore } from '../store/useEqualizerStore';
import { getFullAudioUrl, getFullImageUrl } from '../config';
import { useOfflineMusicStore } from '../store/useOfflineMusicStore';
import { parseDuration } from '../utils/duration';

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

        // CRITICAL: Force playback rate to 1.0 to prevent sample rate mismatch issues
        await TrackPlayer.setRate(1.0);

        isTrackPlayerInitialized = true;

        // Initialize equalizer with audio session 0 (default output mix)
        // This allows the EQ to apply to the system audio output
        const eqStore = useEqualizerStore.getState();
        await eqStore.initializeNative(0);

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
    const lastListeningUpdateRef = useRef<number>(Date.now());
    const crossfadeTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

    const {
        audioUrl,
        currentSong,
        isPlaying,
        updateProgress,
        setIsPlaying,
        addListeningTime,
        crossfade,
        duration: storeDuration,
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
    // CRITICAL: Enforce playback rate on state changes
    // This catches any edge cases where the rate might have drifted or reset
    useTrackPlayerEvents(
        [Event.PlaybackQueueEnded, Event.PlaybackState],
        async (event) => {
            if (event.type === Event.PlaybackState) {
                if (event.state === State.Playing) {
                    await TrackPlayer.setRate(1.0);
                }
            }

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

    // Track listening time - updates every 10 seconds while playing
    useEffect(() => {
        if (!isPlaying) {
            // Reset the timer when paused so we don't count paused time
            lastListeningUpdateRef.current = Date.now();
            return;
        }

        const interval = setInterval(() => {
            const now = Date.now();
            const elapsed = Math.floor((now - lastListeningUpdateRef.current) / 1000);

            // Only add if at least 10 seconds have passed
            if (elapsed >= 10) {
                addListeningTime(elapsed);
                lastListeningUpdateRef.current = now;
            }
        }, 10000); // Check every 10 seconds

        return () => clearInterval(interval);
    }, [isPlaying, addListeningTime]);

    // Automatic Song Caching - cache song when it starts playing
    useEffect(() => {
        if (!currentSong || !audioUrl || !isPlaying) return;

        // Only cache if it's a remote URL and not already downloaded
        if (audioUrl.startsWith('http')) {
            const { isDownloaded, downloadSong } = useOfflineMusicStore.getState();

            if (!isDownloaded(currentSong._id)) {
                downloadSong(currentSong, audioUrl, true).then((success) => {
                    if (success) {
                    }
                }).catch(() => {
                    // Silently fail, we'll try next time or just stream
                });
            }
        }
    }, [currentSong?._id, audioUrl, isPlaying]);

    // Crossfade effect - fade out current song near the end
    const CROSSFADE_DURATION = 3; // seconds before end to start crossfade
    useEffect(() => {
        // Clear any existing timeout
        if (crossfadeTimeoutRef.current) {
            clearTimeout(crossfadeTimeoutRef.current);
            crossfadeTimeoutRef.current = null;
        }

        if (!crossfade || !isPlaying || !progress.duration) return;

        const timeRemaining = progress.duration - progress.position;

        // If we're within crossfade range and haven't triggered yet
        if (timeRemaining <= CROSSFADE_DURATION && timeRemaining > 0.5) {
            // Start fading out volume
            const fadeSteps = 10;
            const fadeInterval = (timeRemaining * 1000) / fadeSteps;
            let currentStep = 0;

            const fadeOut = async () => {
                try {
                    currentStep++;
                    const newVolume = Math.max(0, 1 - (currentStep / fadeSteps));
                    await TrackPlayer.setVolume(newVolume);

                    if (currentStep < fadeSteps) {
                        crossfadeTimeoutRef.current = setTimeout(fadeOut, fadeInterval);
                    }
                } catch (error) {
                    // Ignore errors during fade
                }
            };

            crossfadeTimeoutRef.current = setTimeout(fadeOut, fadeInterval);
        }

        return () => {
            if (crossfadeTimeoutRef.current) {
                clearTimeout(crossfadeTimeoutRef.current);
                crossfadeTimeoutRef.current = null;
            }
        };
    }, [crossfade, isPlaying, progress.position, progress.duration]);

    // Reset volume when song changes (after crossfade)
    useEffect(() => {
        if (currentSong && isInitializedRef.current) {
            TrackPlayer.setVolume(1).catch(() => { });
        }
    }, [currentSong?._id]);

    // NUCLEAR OPTION: Enforce 1.0x speed every 2 seconds while playing
    // This fixes persistent "chipmunk" issues caused by native thread drift
    useEffect(() => {
        if (!isPlaying) return;

        const rateInterval = setInterval(() => {
            TrackPlayer.setRate(1.0).catch(() => {
                // Ignore errors if player is not ready
            });
        }, 2000);

        return () => clearInterval(rateInterval);
    }, [isPlaying]);

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
                    duration: parseDuration(currentSong.duration),
                };

                // CRITICAL: Reset player state completely to ensure decoders re-init
                // This fixes the "chipmunk" (fast playback) issue when switching sample rates
                // We pause and wait briefly to allow the AudioTrack to fully release
                await TrackPlayer.pause();
                await new Promise<void>(resolve => setTimeout(() => resolve(), 50));

                await TrackPlayer.reset();
                await TrackPlayer.add(newTrack);

                // Ensure repeat is OFF - we handle next track manually
                await TrackPlayer.setRepeatMode(RepeatMode.Off);

                // CRITICAL: Reset rate to 1.0 for every new track to prevent speed glitches
                await TrackPlayer.setRate(1.0);

                // Play the track
                await TrackPlayer.play();

                // Broadcast activity to friends (real-time "now playing")
                useFriendsStore.getState().updateActivity(
                    currentSong.title || 'Unknown Title',
                    currentSong.artist || 'Unknown Artist'
                );
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
                        duration: parseDuration(currentSong.duration),
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
                    // Update activity when resuming playback
                    if (currentSong) {
                        useFriendsStore.getState().updateActivity(
                            currentSong.title || 'Unknown Title',
                            currentSong.artist || 'Unknown Artist'
                        );
                    }
                } else {
                    await TrackPlayer.pause();
                    // Clear activity when pausing (shows as "Idle")
                    useFriendsStore.getState().clearActivity();
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
                TrackPlayer.seekTo(state.currentTime).catch(() => { });
            }
        });

        return () => unsubscribe();
    }, []);

    // This component doesn't render anything visible
    return null;
};

export default AudioPlayer;
