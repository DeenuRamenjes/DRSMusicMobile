import React, { useRef, memo } from 'react';
import {
    View,
    Text,
    StyleSheet,
    TouchableOpacity,
    GestureResponderEvent,
    LayoutRectangle,
} from 'react-native';
import { usePlayerStore } from '../store/usePlayerStore';
import { useThemeStore } from '../store/useThemeStore';
import { formatDuration } from '../utils/duration';
import { COLORS } from '../constants/theme';

export const PlaybackProgress = memo(() => {
    const { currentTime, duration, seekTo } = usePlayerStore();
    const { colors: themeColors } = useThemeStore();

    // Ref for progress bar to measure its layout
    const progressBarRef = useRef<View>(null);
    const progressBarLayout = useRef<LayoutRectangle | null>(null);

    const progressPercent = duration > 0 ? (currentTime / duration) * 100 : 0;

    // Handle seek when user taps on progress bar
    const handleSeek = (event: GestureResponderEvent) => {
        if (!progressBarLayout.current || duration <= 0) return;

        const { locationX } = event.nativeEvent;
        const barWidth = progressBarLayout.current.width;

        const seekPercent = Math.max(0, Math.min(1, locationX / barWidth));
        const seekPosition = seekPercent * duration;

        seekTo(seekPosition);
    };

    return (
        <View style={styles.progressSection}>
            <TouchableOpacity
                ref={progressBarRef}
                style={styles.progressBar}
                onLayout={(event) => {
                    progressBarLayout.current = event.nativeEvent.layout;
                }}
                onPress={handleSeek}
                activeOpacity={0.9}
                hitSlop={{ top: 20, bottom: 20, left: 0, right: 0 }}
            >
                <View style={[styles.progressBackground]} />
                <View style={[styles.progressFill, { width: `${progressPercent}%`, backgroundColor: themeColors.primary }]} />
                <View style={[styles.progressHandle, { left: `${progressPercent}%`, backgroundColor: themeColors.primary }]} />
            </TouchableOpacity>
            <View style={styles.timeContainer}>
                <Text style={styles.timeText}>{formatDuration(currentTime)}</Text>
                <Text style={styles.timeText}>{formatDuration(duration)}</Text>
            </View>
        </View>
    );
});

const styles = StyleSheet.create({
    progressSection: {
        width: '100%',
        marginBottom: 30,
    },
    progressBar: {
        height: 4,
        borderRadius: 2,
        position: 'relative',
        justifyContent: 'center',
    },
    progressBackground: {
        position: 'absolute',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        backgroundColor: 'rgba(255, 255, 255, 0.1)',
        borderRadius: 2,
    },
    progressFill: {
        height: 4,
        borderRadius: 2,
    },
    progressHandle: {
        position: 'absolute',
        width: 12,
        height: 12,
        borderRadius: 6,
        top: -4,
        marginLeft: -6,
    },
    timeContainer: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        marginTop: 10,
    },
    timeText: {
        fontSize: 12,
        color: COLORS.textMuted,
        fontFamily: 'Avenir',
    },
});
