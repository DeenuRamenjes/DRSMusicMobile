import React, { useRef, useEffect, useCallback } from 'react';
import { StyleSheet } from 'react-native';
import Video, { OnProgressData, OnLoadData, VideoRef } from 'react-native-video';
import { usePlayerStore } from '../store/usePlayerStore';

/**
 * AudioPlayer - A hidden component that handles audio playback using react-native-video
 * This component renders an invisible video player that plays audio files
 */
export const AudioPlayer = () => {
    const videoRef = useRef<VideoRef>(null);
    const seekTimeRef = useRef<number | null>(null);
    
    const {
        audioUrl,
        isPlaying,
        volume,
        isMuted,
        currentTime,
        updateProgress,
        onPlaybackEnd,
        setIsPlaying,
    } = usePlayerStore();

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
        console.log('Audio loaded, duration:', data.duration);
        updateProgress(0, data.duration);
    }, [updateProgress]);

    const handleEnd = useCallback(() => {
        console.log('Playback ended');
        onPlaybackEnd();
    }, [onPlaybackEnd]);

    const handleError = useCallback((error: any) => {
        console.error('Audio playback error:', error);
        console.error('Audio playback error - audioUrl was:', audioUrl);
        setIsPlaying(false);
    }, [setIsPlaying, audioUrl]);

    const handleBuffer = useCallback((data: { isBuffering: boolean }) => {
        if (data.isBuffering) {
            console.log('Buffering...');
        }
    }, []);

    const handleReadyForDisplay = useCallback(() => {
        // Audio is ready
    }, []);

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
