import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Image,
} from 'react-native';
import Icon from 'react-native-vector-icons/Feather';
import { COLORS, SPACING, FONT_SIZES, BORDER_RADIUS, SHADOWS } from '../constants/theme';
import { useThemeStore } from '../store/useThemeStore';
import { Song } from '../types';
import { getFullImageUrl } from '../config';

interface SongCardProps {
  song: Song;
  onPress: () => void;
  isPlaying?: boolean;
  size?: 'small' | 'medium' | 'large';
}

export const SongCard: React.FC<SongCardProps> = ({
  song,
  onPress,
  isPlaying = false,
  size = 'medium'
}) => {
  const { colors: themeColors } = useThemeStore();

  const dimensions = {
    small: 100,
    medium: 140,
    large: 180,
  };

  const cardSize = dimensions[size];

  return (
    <TouchableOpacity
      style={[styles.container, { width: cardSize }]}
      onPress={onPress}
      activeOpacity={0.8}
    >
      <View style={[styles.imageContainer, { width: cardSize, height: cardSize }]}>
        <Image
          source={{ uri: getFullImageUrl(song.imageUrl) }}
          style={[styles.image, { width: cardSize, height: cardSize }]}
        />

        {/* Play overlay */}
        <View style={[styles.playOverlay, isPlaying && styles.playOverlayActive]}>
          {isPlaying ? (
            <View style={[styles.playingIndicator, { backgroundColor: themeColors.primary }]}>
              <Icon name="pause" size={20} color="#fff" />
            </View>
          ) : (
            <View style={[styles.playButton, { backgroundColor: themeColors.primary }]}>
              <Icon name="play" size={20} color="#fff" style={{ marginLeft: 2 }} />
            </View>
          )}
        </View>
      </View>

      <Text style={styles.title} numberOfLines={1}>{song.title}</Text>
      <Text style={styles.artist} numberOfLines={1}>{song.artist}</Text>
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  container: {
    marginRight: SPACING.md,
  },
  imageContainer: {
    borderRadius: BORDER_RADIUS.md,
    overflow: 'hidden',
    marginBottom: SPACING.sm,
    backgroundColor: COLORS.backgroundSecondary,
    ...SHADOWS.sm,
  },
  image: {
    borderRadius: BORDER_RADIUS.md,
  },
  playOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.3)',
    justifyContent: 'center',
    alignItems: 'center',
    opacity: 0,
  },
  playOverlayActive: {
    opacity: 1,
  },
  playButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    justifyContent: 'center',
    alignItems: 'center',
  },
  playingIndicator: {
    width: 44,
    height: 44,
    borderRadius: 22,
    justifyContent: 'center',
    alignItems: 'center',
  },
  title: {
    fontSize: FONT_SIZES.md,
    fontWeight: '600',
    color: COLORS.textPrimary,
  },
  artist: {
    fontSize: FONT_SIZES.sm,
    color: COLORS.textMuted,
    marginTop: 2,
  },
});
