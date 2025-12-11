declare module 'react-native-music-control' {
    export enum Command {
        play = 'play',
        pause = 'pause',
        stop = 'stop',
        nextTrack = 'nextTrack',
        previousTrack = 'previousTrack',
        seekForward = 'seekForward',
        seekBackward = 'seekBackward',
        seek = 'seek',
        skipForward = 'skipForward',
        skipBackward = 'skipBackward',
        setRating = 'setRating',
        volume = 'volume',
        remoteVolume = 'remoteVolume',
        closeNotification = 'closeNotification',
        togglePlayPause = 'togglePlayPause',
        changePlaybackPosition = 'changePlaybackPosition',
    }

    interface NowPlayingInfo {
        title?: string;
        artist?: string;
        album?: string;
        genre?: string;
        description?: string;
        artwork?: string;
        duration?: number;
        elapsedTime?: number;
        color?: number;
        colorized?: boolean;
        isLiveStream?: boolean;
        notificationIcon?: string;
        rating?: number;
        date?: string;
        speed?: number;
        maxVolume?: number;
        volume?: number;
    }

    interface PlaybackInfo {
        state?: number;
        speed?: number;
        elapsedTime?: number;
        bufferedTime?: number;
        volume?: number;
        maxVolume?: number;
        rating?: number;
    }

    interface ControlOptions {
        when?: 'always' | 'paused' | 'never';
    }

    const MusicControl: {
        STATE_PLAYING: number;
        STATE_PAUSED: number;
        STATE_STOPPED: number;
        STATE_ERROR: number;
        STATE_BUFFERING: number;

        enableBackgroundMode: (enable: boolean) => void;
        enableControl: (control: string, enable: boolean, options?: ControlOptions) => void;
        setNowPlaying: (info: NowPlayingInfo) => void;
        updatePlayback: (info: PlaybackInfo) => void;
        resetNowPlaying: () => void;
        stopControl: () => void;
        on: (event: Command, callback: (value?: any) => void) => void;
        off: (event: Command, callback: (value?: any) => void) => void;
    };

    export default MusicControl;
}
