import TrackPlayer, { Event, State } from 'react-native-track-player';
import { usePlayerStore } from '../store/usePlayerStore';

// Debounce tracking for playNext to prevent double triggering
let lastPlayNextTime = 0;

/**
 * TrackPlayer Playback Service
 * This runs as a headless task for background audio playback
 * Handles remote control events from notification and lock screen
 */
export default async function playbackService(): Promise<void> {
    console.log('[TrackPlayerService] Starting playback service');

    // Handle remote play event (from notification or lock screen)
    TrackPlayer.addEventListener(Event.RemotePlay, async () => {
        console.log('[TrackPlayerService] Remote play pressed');
        try {
            await TrackPlayer.play();
            usePlayerStore.getState().setIsPlaying(true);
        } catch (error) {
            console.error('[TrackPlayerService] Error playing:', error);
        }
    });

    // Handle remote pause event
    TrackPlayer.addEventListener(Event.RemotePause, async () => {
        console.log('[TrackPlayerService] Remote pause pressed');
        try {
            await TrackPlayer.pause();
            usePlayerStore.getState().setIsPlaying(false);
        } catch (error) {
            console.error('[TrackPlayerService] Error pausing:', error);
        }
    });

    // Handle remote stop event
    TrackPlayer.addEventListener(Event.RemoteStop, async () => {
        console.log('[TrackPlayerService] Remote stop pressed');
        try {
            await TrackPlayer.stop();
            usePlayerStore.getState().setIsPlaying(false);
        } catch (error) {
            console.error('[TrackPlayerService] Error stopping:', error);
        }
    });

    // Handle remote next event (from notification controls)
    TrackPlayer.addEventListener(Event.RemoteNext, async () => {
        console.log('[TrackPlayerService] Remote next pressed');
        try {
            usePlayerStore.getState().playNext();
        } catch (error) {
            console.error('[TrackPlayerService] Error playing next:', error);
        }
    });

    // Handle remote previous event (from notification controls)
    TrackPlayer.addEventListener(Event.RemotePrevious, async () => {
        console.log('[TrackPlayerService] Remote previous pressed');
        try {
            usePlayerStore.getState().playPrevious();
        } catch (error) {
            console.error('[TrackPlayerService] Error playing previous:', error);
        }
    });

    // Handle remote seek event (from notification seekbar)
    TrackPlayer.addEventListener(Event.RemoteSeek, async (event) => {
        console.log('[TrackPlayerService] Remote seek to:', event.position);
        try {
            await TrackPlayer.seekTo(event.position);
            const store = usePlayerStore.getState();
            store.updateProgress(event.position, store.duration);
        } catch (error) {
            console.error('[TrackPlayerService] Error seeking:', error);
        }
    });

    // Handle playback queue ended - for BACKGROUND playback
    TrackPlayer.addEventListener(Event.PlaybackQueueEnded, (event) => {
        // Debounce: Only trigger if more than 500ms since last trigger
        const now = Date.now();
        if (now - lastPlayNextTime < 500) {
            console.log('[TrackPlayerService] Queue ended - skipping (debounced)');
            return;
        }
        lastPlayNextTime = now;

        console.log('[TrackPlayerService] Queue ended - triggering playNext');
        usePlayerStore.getState().playNext();
    });

    // Handle playback state changes
    TrackPlayer.addEventListener(Event.PlaybackState, async (event) => {
        console.log('[TrackPlayerService] Playback state:', event.state);

        // Sync play state to store
        if (event.state === State.Playing) {
            usePlayerStore.getState().setIsPlaying(true);
        } else if (event.state === State.Paused || event.state === State.Stopped) {
            usePlayerStore.getState().setIsPlaying(false);
        }
    });

    // Handle playback error
    TrackPlayer.addEventListener(Event.PlaybackError, (event) => {
        console.error('[TrackPlayerService] Playback error:', event);
    });

    // Remote duck (lower volume when another app plays audio)
    TrackPlayer.addEventListener(Event.RemoteDuck, async (event) => {
        console.log('[TrackPlayerService] Remote duck:', event);
        try {
            if (event.paused) {
                await TrackPlayer.pause();
                usePlayerStore.getState().setIsPlaying(false);
            } else if (event.permanent) {
                await TrackPlayer.stop();
                usePlayerStore.getState().setIsPlaying(false);
            }
        } catch (error) {
            console.error('[TrackPlayerService] Error handling duck:', error);
        }
    });

    console.log('[TrackPlayerService] Playback service registered successfully');
}
