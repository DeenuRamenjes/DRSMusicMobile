import TrackPlayer, { Event } from 'react-native-track-player';
import { usePlayerStore } from '../store/usePlayerStore';

/**
 * TrackPlayer Playback Service
 * This runs as a headless task for background audio playback
 * Handles remote control events from notification and lock screen
 */
export default async function playbackService(): Promise<void> {

    // Handle remote play event (from notification or lock screen)
    TrackPlayer.addEventListener(Event.RemotePlay, async () => {
        try {
            await TrackPlayer.play();
            usePlayerStore.getState().setIsPlaying(true);
        } catch (error) {
            console.error('[TrackPlayerService] Error playing:', error);
        }
    });

    // Handle remote pause event
    TrackPlayer.addEventListener(Event.RemotePause, async () => {
        try {
            await TrackPlayer.pause();
            usePlayerStore.getState().setIsPlaying(false);
        } catch (error) {
            console.error('[TrackPlayerService] Error pausing:', error);
        }
    });

    // Handle remote stop event
    TrackPlayer.addEventListener(Event.RemoteStop, async () => {
        try {
            await TrackPlayer.stop();
            usePlayerStore.getState().setIsPlaying(false);
        } catch (error) {
            console.error('[TrackPlayerService] Error stopping:', error);
        }
    });

    // Handle remote next event (from notification controls)
    TrackPlayer.addEventListener(Event.RemoteNext, async () => {
        try {
            usePlayerStore.getState().playNext();
        } catch (error) {
            console.error('[TrackPlayerService] Error playing next:', error);
        }
    });

    // Handle remote previous event (from notification controls)
    TrackPlayer.addEventListener(Event.RemotePrevious, async () => {
        try {
            usePlayerStore.getState().playPrevious();
        } catch (error) {
            console.error('[TrackPlayerService] Error playing previous:', error);
        }
    });

    // Handle remote seek event (from notification seekbar)
    TrackPlayer.addEventListener(Event.RemoteSeek, async (event) => {
        try {
            await TrackPlayer.seekTo(event.position);
            const store = usePlayerStore.getState();
            store.updateProgress(event.position, store.duration);
        } catch (error) {
            console.error('[TrackPlayerService] Error seeking:', error);
        }
    });

    // NOTE: PlaybackQueueEnded is handled in AudioPlayer.tsx component
    // Do NOT handle it here as well - it causes double triggering and song skipping

    // Handle playback state changes - LOGGING ONLY
    // We do NOT sync state to store here - the store is the source of truth
    // Syncing here causes audio to pause during navigation/re-renders
    TrackPlayer.addEventListener(Event.PlaybackState, async (event) => {
        // NOTE: Intentionally NOT syncing to store - causes issues during navigation
    });

    // Handle playback error
    TrackPlayer.addEventListener(Event.PlaybackError, (event) => {
        console.error('[TrackPlayerService] Playback error:', event);
    });

    // Remote duck (lower volume when another app plays audio)
    TrackPlayer.addEventListener(Event.RemoteDuck, async (event) => {
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
}
