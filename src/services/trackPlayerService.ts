import TrackPlayer, { Event } from 'react-native-track-player';

/**
 * This is the playback service that runs in the background.
 * It handles events from the notification/lockscreen controls.
 */
export async function PlaybackService() {
    TrackPlayer.addEventListener(Event.RemotePlay, () => {
        TrackPlayer.play();
    });

    TrackPlayer.addEventListener(Event.RemotePause, () => {
        TrackPlayer.pause();
    });

    TrackPlayer.addEventListener(Event.RemoteNext, () => {
        TrackPlayer.skipToNext();
    });

    TrackPlayer.addEventListener(Event.RemotePrevious, () => {
        TrackPlayer.skipToPrevious();
    });

    TrackPlayer.addEventListener(Event.RemoteStop, async () => {
        await TrackPlayer.reset();
    });

    TrackPlayer.addEventListener(Event.RemoteSeek, (event) => {
        TrackPlayer.seekTo(event.position);
    });

    // Handle playback state changes
    TrackPlayer.addEventListener(Event.PlaybackState, async (event) => {
        console.log('Playback state:', event.state);
    });

    // Handle track changes
    TrackPlayer.addEventListener(Event.PlaybackActiveTrackChanged, async (event) => {
        if (event.track) {
            console.log('Now playing:', event.track.title);
        }
    });

    // Handle playback errors
    TrackPlayer.addEventListener(Event.PlaybackError, (event) => {
        console.error('Playback error:', event);
    });
}

export default PlaybackService;
