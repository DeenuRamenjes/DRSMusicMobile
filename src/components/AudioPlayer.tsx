import React, { useRef, useEffect, useCallback } from 'react';
import { StyleSheet, Platform } from 'react-native';
import Video, { OnProgressData, OnLoadData, VideoRef } from 'react-native-video';
import MusicControl, { Command } from 'react-native-music-control';
import { usePlayerStore } from '../store/usePlayerStore';
import { getFullImageUrl } from '../config';

/**
 * AudioPlayer - A hidden component that handles audio playback using react-native-video
 * with notification controls via react-native-music-control
 */
export const AudioPlayer = () => {
    const videoRef = useRef<VideoRef>(null);
    const seekTimeRef = useRef<number | null>(null);
    const isInitializedRef = useRef(false);
    
    const {
        audioUrl,
        currentSong,
        isPlaying,
        volume,
        isMuted,
        currentTime,
        duration,
        updateProgress,
        onPlaybackEnd,
    } = usePlayerStore();

    // Initialize MusicControl once - use getState() for callbacks to avoid stale closures
    useEffect(() => {
        if (isInitializedRef.current) return;
        
        try {
            // Enable background mode
            MusicControl.enableBackgroundMode(true);
            
            // Enable controls on lock screen
            MusicControl.enableControl('play', true);
            MusicControl.enableControl('pause', true);
            MusicControl.enableControl('stop', false);
            MusicControl.enableControl('nextTrack', true);
            MusicControl.enableControl('previousTrack', true);
            MusicControl.enableControl('seekForward', false);
            MusicControl.enableControl('seekBackward', false);
            MusicControl.enableControl('seek', true);
            MusicControl.enableControl('skipForward', false);
            MusicControl.enableControl('skipBackward', false);
            MusicControl.enableControl('togglePlayPause', true);
            
            if (Platform.OS === 'android') {
                MusicControl.enableControl('closeNotification', true, { when: 'paused' });
            }
            
            // Register event handlers - use getState() to get fresh references
            MusicControl.on(Command.play, () => {
                console.log('[MusicControl] Play command received');
                usePlayerStore.getState().setIsPlaying(true);
            });
            
            MusicControl.on(Command.pause, () => {
                console.log('[MusicControl] Pause command received');
                usePlayerStore.getState().setIsPlaying(false);
            });
            
            MusicControl.on(Command.stop, () => {
                console.log('[MusicControl] Stop command received');
                usePlayerStore.getState().setIsPlaying(false);
            });
            
            MusicControl.on(Command.nextTrack, () => {
                console.log('[MusicControl] Next track command received');
                usePlayerStore.getState().playNext();
            });
            
            MusicControl.on(Command.previousTrack, () => {
                console.log('[MusicControl] Previous track command received');
                usePlayerStore.getState().playPrevious();
            });
            
            MusicControl.on(Command.seek, (pos: number) => {
                console.log('[MusicControl] Seek command received, position:', pos);
                if (videoRef.current) {
                    videoRef.current.seek(pos);
                    const store = usePlayerStore.getState();
                    store.updateProgress(pos, store.duration);
                }
            });

            MusicControl.on(Command.closeNotification, () => {
                console.log('[MusicControl] Close notification command received');
                usePlayerStore.getState().setIsPlaying(false);
            });

            // Handle togglePlayPause - Android often sends this instead of separate play/pause
            MusicControl.on(Command.togglePlayPause, () => {
                console.log('[MusicControl] Toggle play/pause command received');
                const store = usePlayerStore.getState();
                store.setIsPlaying(!store.isPlaying);
            });
            
            isInitializedRef.current = true;
            console.log('[MusicControl] Initialized successfully');
        } catch (error) {
            console.error('[MusicControl] Init error:', error);
        }
        
        return () => {
            try {
                MusicControl.stopControl();
            } catch (error) {
                console.error('[MusicControl] Cleanup error:', error);
            }
        };
    }, []);

    // Update notification when song changes
    useEffect(() => {
        if (!currentSong || !isInitializedRef.current) return;
        
        try {
            console.log('[MusicControl] Updating now playing:', currentSong.title);
            MusicControl.setNowPlaying({
                title: currentSong.title || 'Unknown Title',
                artist: currentSong.artist || 'Unknown Artist',
                album: '',
                genre: '',
                duration: Number(currentSong.duration) || 0,
                description: '',
                color: 0x1DB954, // Green color
                colorized: true,
                isLiveStream: false,
                artwork: currentSong.imageUrl 
                    ? getFullImageUrl(currentSong.imageUrl) 
                    : undefined,
            });
        } catch (error) {
            console.error('[MusicControl] Set now playing error:', error);
        }
    }, [currentSong?._id, currentSong?.title]);

    // Update playback state in notification
    useEffect(() => {
        console.log('[AudioPlayer] isPlaying effect triggered:', {
            isPlaying,
            hasVideoRef: !!videoRef.current,
            audioUrl: audioUrl?.substring(0, 60),
        });
        
        if (!isInitializedRef.current) return;
        
        try {
            MusicControl.updatePlayback({
                state: isPlaying ? MusicControl.STATE_PLAYING : MusicControl.STATE_PAUSED,
                elapsedTime: Number(currentTime) || 0,
            });
        } catch (error) {
            console.error('[MusicControl] Update playback error:', error);
        }
    }, [isPlaying]); // Only trigger on isPlaying changes

    // Handle seek requests from store
    useEffect(() => {
        const unsubscribe = usePlayerStore.subscribe((state, prevState) => {
            // If currentTime changed significantly (more than 1s difference), it's likely a seek
            const timeDiff = Math.abs(state.currentTime - prevState.currentTime);
            if (timeDiff > 1 && videoRef.current) {
                seekTimeRef.current = state.currentTime;
                videoRef.current.seek(state.currentTime);
            }
        });
        
        return () => unsubscribe();
    }, []);

    // Periodically update notification progress
    useEffect(() => {
        if (!isInitializedRef.current || !isPlaying) return;
        
        try {
            MusicControl.updatePlayback({
                elapsedTime: Number(currentTime) || 0,
            });
        } catch (error) {
            // Ignore
        }
    }, [Math.floor(currentTime / 5)]);

    const handleProgress = useCallback((data: OnProgressData) => {
        // Don't update if we're actively seeking
        if (seekTimeRef.current !== null) {
            const diff = Math.abs(data.currentTime - seekTimeRef.current);
            if (diff < 0.5) {
                seekTimeRef.current = null; // Seek complete
            }
            return;
        }
        updateProgress(data.currentTime, data.seekableDuration || data.playableDuration);
    }, [updateProgress]);

    const handleLoad = useCallback((data: OnLoadData) => {
        console.log('[AudioPlayer] Audio loaded, duration:', data.duration);
        updateProgress(0, data.duration);
        
        // Update duration in notification
        if (currentSong && isInitializedRef.current) {
            try {
                MusicControl.setNowPlaying({
                    title: currentSong.title || 'Unknown Title',
                    artist: currentSong.artist || 'Unknown Artist',
                    duration: Number(data.duration) || 0,
                    artwork: currentSong.imageUrl 
                        ? getFullImageUrl(currentSong.imageUrl) 
                        : undefined,
                });
            } catch (error) {
                console.error('[MusicControl] Update duration error:', error);
            }
        }
    }, [updateProgress, currentSong]);

    const handleEnd = useCallback(() => {
        console.log('[AudioPlayer] Playback ended');
        onPlaybackEnd();
    }, [onPlaybackEnd]);

    const handleError = useCallback((error: any) => {
        console.error('[AudioPlayer] Playback error:', error);
        console.error('[AudioPlayer] Audio URL was:', audioUrl);
        usePlayerStore.getState().setIsPlaying(false);
    }, [audioUrl]);

    const handleBuffer = useCallback((data: { isBuffering: boolean }) => {
        if (data.isBuffering) {
            console.log('[AudioPlayer] Buffering...');
            if (isInitializedRef.current) {
                try {
                    MusicControl.updatePlayback({
                        state: MusicControl.STATE_BUFFERING,
                    });
                } catch (error) {
                    // Ignore
                }
            }
        }
    }, []);

    const handleReadyForDisplay = useCallback(() => {
        // Audio is ready
        console.log('[AudioPlayer] Ready for display');
    }, []);

    // Debug: Log when audioUrl changes
    useEffect(() => {
        console.log('[AudioPlayer] audioUrl changed to:', audioUrl);
    }, [audioUrl]);

    // No audio URL, don't render anything
    if (!audioUrl) {
        return null;
    }

    return (
        <Video
            ref={videoRef}
            source={{ uri: audioUrl }}
            style={styles.hidden}
            paused={!isPlaying}
            volume={isMuted ? 0 : volume}
            onProgress={handleProgress}
            onLoad={handleLoad}
            onEnd={handleEnd}
            onError={handleError}
            onBuffer={handleBuffer}
            onReadyForDisplay={handleReadyForDisplay}
            progressUpdateInterval={500}
            playInBackground={true}
            playWhenInactive={true}
            ignoreSilentSwitch="ignore"
            resizeMode="none"
            automaticallyWaitsToMinimizeStalling={false}
        />
    );
};

const styles = StyleSheet.create({
    hidden: {
        width: 0,
        height: 0,
        position: 'absolute',
        opacity: 0,
    },
});

export default AudioPlayer;
