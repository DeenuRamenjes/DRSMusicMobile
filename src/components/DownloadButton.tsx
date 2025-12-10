import React from 'react';
import {
  TouchableOpacity,
  View,
  Text,
  StyleSheet,
  ActivityIndicator,
} from 'react-native';
import Icon from 'react-native-vector-icons/Feather';
import { useOfflineMusicStore } from '../store/useOfflineMusicStore';
import { useThemeStore } from '../store/useThemeStore';
import { Song } from '../types';
import { COLORS, SPACING, FONT_SIZES } from '../constants/theme';
import { getFullAudioUrl } from '../config';

interface DownloadButtonProps {
  song: Song;
  size?: 'small' | 'medium' | 'large';
  showLabel?: boolean;
  style?: any;
}

export const DownloadButton = ({
  song,
  size = 'medium',
  showLabel = false,
  style,
}: DownloadButtonProps) => {
  const { colors: themeColors } = useThemeStore();
  const {
    isDownloaded,
    downloadProgress,
    downloadSong,
    deleteSong,
  } = useOfflineMusicStore();

  const downloaded = isDownloaded(song._id);
  const progress = downloadProgress[song._id];
  const isDownloading = progress?.status === 'downloading';
  const isFailed = progress?.status === 'failed';

  const iconSize = size === 'small' ? 16 : size === 'medium' ? 20 : 24;
  const buttonSize = size === 'small' ? 32 : size === 'medium' ? 40 : 48;

  const handlePress = async () => {
    if (isDownloading) return;

    if (downloaded) {
      // Already downloaded - could show options (delete, etc.)
      // For now, do nothing or show toast
      return;
    }

    // Start download
    const audioUrl = getFullAudioUrl(song.audioUrl);
    await downloadSong(song, audioUrl);
  };

  const handleLongPress = () => {
    if (downloaded) {
      deleteSong(song._id);
    }
  };

  // Render downloading progress
  if (isDownloading) {
    return (
      <View style={[styles.button, { width: buttonSize, height: buttonSize }, style]}>
        <View style={styles.progressContainer}>
          <ActivityIndicator size="small" color={themeColors.primary} />
          {progress && (
            <Text style={[styles.progressText, { color: themeColors.primary }]}>
              {progress.progress}%
            </Text>
          )}
        </View>
      </View>
    );
  }

  // Render failed state
  if (isFailed) {
    return (
      <TouchableOpacity
        style={[
          styles.button,
          styles.failedButton,
          { width: buttonSize, height: buttonSize },
          style,
        ]}
        onPress={handlePress}
      >
        <Icon name="alert-circle" size={iconSize} color="#ef4444" />
        {showLabel && <Text style={styles.failedLabel}>Retry</Text>}
      </TouchableOpacity>
    );
  }

  // Render downloaded state
  if (downloaded) {
    return (
      <TouchableOpacity
        style={[
          styles.button,
          styles.downloadedButton,
          { width: buttonSize, height: buttonSize, backgroundColor: themeColors.primary + '20' },
          style,
        ]}
        onPress={handlePress}
        onLongPress={handleLongPress}
      >
        <Icon name="check-circle" size={iconSize} color={themeColors.primary} />
        {showLabel && (
          <Text style={[styles.downloadedLabel, { color: themeColors.primary }]}>
            Downloaded
          </Text>
        )}
      </TouchableOpacity>
    );
  }

  // Render default (not downloaded) state
  return (
    <TouchableOpacity
      style={[
        styles.button,
        { width: buttonSize, height: buttonSize },
        style,
      ]}
      onPress={handlePress}
    >
      <Icon name="download" size={iconSize} color={COLORS.textMuted} />
      {showLabel && <Text style={styles.downloadLabel}>Download</Text>}
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  button: {
    justifyContent: 'center',
    alignItems: 'center',
    borderRadius: 20,
  },
  progressContainer: {
    alignItems: 'center',
  },
  progressText: {
    fontSize: FONT_SIZES.xs,
    fontWeight: '600',
    marginTop: 2,
  },
  failedButton: {},
  failedLabel: {
    fontSize: FONT_SIZES.xs,
    color: '#ef4444',
    marginTop: 2,
  },
  downloadedButton: {},
  downloadedLabel: {
    fontSize: FONT_SIZES.xs,
    marginTop: 2,
  },
  downloadLabel: {
    fontSize: FONT_SIZES.xs,
    color: COLORS.textMuted,
    marginTop: 2,
  },
});

export default DownloadButton;
