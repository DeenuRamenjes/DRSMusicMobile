import TrackPlayer, { Event } from 'react-native-track-player';
import { usePlayerStore } from '../store/usePlayerStore';

/**
 * TrackPlayer Playback Service
 * This runs as a headless task for background audio playback
 */
export default async function playbackService(): Promise<void> {
    console.log('[TrackPlayerService] Starting playback service');

    // Handle remote play event (from notification or lock screen)
    TrackPlayer.addEventListener(Event.RemotePlay, () => {
        console.log('[TrackPlayerService] Remote play');
        TrackPlayer.play();
        usePlayerStore.getState().setIsPlaying(true);
    });

    // Handle remote pause event
    TrackPlayer.addEventListener(Event.RemotePause, () => {
        console.log('[TrackPlayerService] Remote pause');
        TrackPlayer.pause();
        usePlayerStore.getState().setIsPlaying(false);
    });

    // Handle remote stop event
    TrackPlayer.addEventListener(Event.RemoteStop, () => {
        console.log('[TrackPlayerService] Remote stop');
        TrackPlayer.stop();
        usePlayerStore.getState().setIsPlaying(false);
    });

    // Handle remote next event
    TrackPlayer.addEventListener(Event.RemoteNext, () => {
        console.log('[TrackPlayerService] Remote next');
        usePlayerStore.getState().playNext();
    });

    // Handle remote previous event
    TrackPlayer.addEventListener(Event.RemotePrevious, () => {
        console.log('[TrackPlayerService] Remote previous');
        usePlayerStore.getState().playPrevious();
    });

    // Handle remote seek event
    TrackPlayer.addEventListener(Event.RemoteSeek, async (event) => {
        console.log('[TrackPlayerService] Remote seek to:', event.position);
        await TrackPlayer.seekTo(event.position);
        usePlayerStore.getState().updateProgress(event.position, usePlayerStore.getState().duration);
    });

    // Handle playback queue ended
    TrackPlayer.addEventListener(Event.PlaybackQueueEnded, (event) => {
        console.log('[TrackPlayerService] Queue ended:', event);
        // Play next track from our queue
        usePlayerStore.getState().playNext();
    });

    // Handle playback state changes
    TrackPlayer.addEventListener(Event.PlaybackState, (event) => {
        console.log('[TrackPlayerService] Playback state changed:', event.state);
    });

    // Handle playback error
    TrackPlayer.addEventListener(Event.PlaybackError, (event) => {
        console.error('[TrackPlayerService] Playback error:', event);
    });

    // Remote duck (lower volume when another app plays audio)
    TrackPlayer.addEventListener(Event.RemoteDuck, async (event) => {
        console.log('[TrackPlayerService] Remote duck:', event);
        if (event.paused) {
            await TrackPlayer.pause();
        } else if (event.permanent) {
            await TrackPlayer.stop();
        }
    });

    console.log('[TrackPlayerService] Playback service registered');
}
