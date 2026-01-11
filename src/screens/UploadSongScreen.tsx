import React, { useState, useRef, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  StatusBar,
  TextInput,
  ActivityIndicator,
  Image,
  Dimensions,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Icon from 'react-native-vector-icons/Feather';
import { useNavigation } from '@react-navigation/native';
import { pick, types } from '@react-native-documents/picker';
import Video from 'react-native-video';
import LinearGradient from 'react-native-linear-gradient';
import { COLORS, SPACING, FONT_SIZES, BORDER_RADIUS } from '../constants/theme';
import { useThemeStore } from '../store/useThemeStore';
import { useMusicStore } from '../store/useMusicStore';
import axiosInstance from '../api/axios';
import { CustomDialog, useDialog } from '../components/CustomDialog';
import { formatDuration } from '../utils/duration';


const { width: SCREEN_WIDTH } = Dimensions.get('window');
const IMAGE_SIZE = Math.min(SCREEN_WIDTH * 0.45, 180);

interface NewSong {
  title: string;
  artist: string;
  albumIds: string[];
  duration: string;
}

// Placeholder data type for preview
interface PlaceholderData {
  gradientColors: [string, string];
  artistColor: string;
  title: string;
  artist: string;
}

const extractSongDetailsFromFilename = (filename: string) => {
  const withoutExtension = filename.replace(/\.[^/.]+$/, '')
    .replace(/[_]+/g, ' ')
    .trim();

  if (!withoutExtension) {
    return { title: '', artist: '' };
  }

  const parts = withoutExtension.split(/\s*-\s*/);
  if (parts.length >= 2) {
    return {
      artist: parts[0]?.trim() ?? '',
      title: parts.slice(1).join(' - ').trim(),
    };
  }

  return {
    title: withoutExtension,
    artist: '',
  };
};

// HSL to hex conversion
const hslToHex = (h: number, s: number, l: number): string => {
  h = h / 360;
  s = s / 100;
  l = l / 100;
  let r, g, b;

  if (s === 0) {
    r = g = b = l;
  } else {
    const hue2rgb = (p: number, q: number, t: number) => {
      if (t < 0) t += 1;
      if (t > 1) t -= 1;
      if (t < 1 / 6) return p + (q - p) * 6 * t;
      if (t < 1 / 2) return q;
      if (t < 2 / 3) return p + (q - p) * (2 / 3 - t) * 6;
      return p;
    };
    const q = l < 0.5 ? l * (1 + s) : l + s - l * s;
    const p = 2 * l - q;
    r = hue2rgb(p, q, h + 1 / 3);
    g = hue2rgb(p, q, h);
    b = hue2rgb(p, q, h - 1 / 3);
  }
  const toHex = (c: number) => Math.round(c * 255).toString(16).padStart(2, '0');
  return `#${toHex(r)}${toHex(g)}${toHex(b)}`;
};

// Generate placeholder data for preview
const generatePlaceholderData = (title: string, artist: string): PlaceholderData => {
  const baseHue = Math.floor(Math.random() * 360);
  const color1 = hslToHex(baseHue, 70, 20);
  const color2 = hslToHex((baseHue + 45) % 360, 70, 45);
  const artistColor = hslToHex((baseHue + 20) % 360, 60, 80);

  return {
    gradientColors: [color1, color2],
    artistColor,
    title: title || 'New Track',
    artist: artist || 'Unknown Artist',
  };
};

export const UploadSongScreen = () => {
  const navigation = useNavigation();
  const { colors: themeColors } = useThemeStore();
  const { albums, fetchAlbums, fetchSongs } = useMusicStore();
  const { dialogState, hideDialog, showSuccess, showError } = useDialog();

  const [isLoading, setIsLoading] = useState(false);
  const [newSong, setNewSong] = useState<NewSong>({
    title: '',
    artist: '',
    albumIds: [],
    duration: '0',
  });

  const [audioFile, setAudioFile] = useState<{ uri: string; name: string; type: string } | null>(null);
  const [imageFile, setImageFile] = useState<{ uri: string; name: string; type: string } | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [showAlbumPicker, setShowAlbumPicker] = useState(false);
  const [isExtractingDuration, setIsExtractingDuration] = useState(false);

  // Placeholder data for preview when no image selected
  const [placeholderData, setPlaceholderData] = useState<PlaceholderData | null>(null);

  // Video ref for duration extraction
  const videoRef = useRef<any>(null);
  const [audioUri, setAudioUri] = useState<string | null>(null);

  useEffect(() => {
    fetchAlbums();
  }, []);

  // Handle audio load for duration extraction
  const handleAudioLoad = useCallback((data: any) => {
    if (data?.duration && !isNaN(data.duration)) {
      const durationSeconds = Math.round(data.duration);
      setNewSong(prev => ({ ...prev, duration: String(durationSeconds) }));
    }
    setIsExtractingDuration(false);
    setAudioUri(null);
  }, []);

  const handleAudioError = useCallback((error: any) => {
    console.error('Error extracting audio duration:', error);
    setIsExtractingDuration(false);
    setAudioUri(null);
  }, []);

  const selectAudioFile = async () => {
    try {
      const result = await pick({
        type: [types.audio],
      });

      if (result && result.length > 0) {
        const file = result[0];
        const fileData = {
          uri: file.uri,
          name: file.name || 'audio.mp3',
          type: file.type || 'audio/mpeg',
        };
        setAudioFile(fileData);

        // Extract title and artist from filename
        let extractedTitle = 'New Track';
        let extractedArtist = 'Unknown Artist';
        if (file.name) {
          const extracted = extractSongDetailsFromFilename(file.name);
          extractedTitle = extracted.title || 'New Track';
          extractedArtist = extracted.artist || 'Unknown Artist';
          setNewSong(prev => ({
            ...prev,
            title: prev.title || extractedTitle,
            artist: prev.artist || extractedArtist,
          }));
        }

        // Generate placeholder preview if no image selected
        if (!imageFile && !imagePreview) {
          setPlaceholderData(generatePlaceholderData(extractedTitle, extractedArtist));
        }

        // Extract duration using react-native-video
        setIsExtractingDuration(true);
        setAudioUri(file.uri);
      }
    } catch (err: any) {
      if (err?.code !== 'DOCUMENT_PICKER_CANCELED') {
        console.error('Error picking audio:', err);
        showError('Error', 'Failed to select audio file');
      }
    }
  };

  const selectImageFile = async () => {
    try {
      const result = await pick({
        type: [types.images],
      });

      if (result && result.length > 0) {
        const file = result[0];
        setImageFile({
          uri: file.uri,
          name: file.name || 'image.jpg',
          type: file.type || 'image/jpeg',
        });
        setImagePreview(file.uri);
        setPlaceholderData(null); // Clear placeholder when real image selected
      }
    } catch (err: any) {
      if (err?.code !== 'DOCUMENT_PICKER_CANCELED') {
        console.error('Error picking image:', err);
        showError('Error', 'Failed to select image file');
      }
    }
  };

  const toggleAlbum = (albumId: string) => {
    setNewSong(prev => ({
      ...prev,
      albumIds: prev.albumIds.includes(albumId)
        ? prev.albumIds.filter(id => id !== albumId)
        : [...prev.albumIds, albumId],
    }));
  };

  const handleSubmit = async () => {
    if (!audioFile) {
      showError('Error', 'Please select an audio file');
      return;
    }
    if (!newSong.title.trim()) {
      showError('Error', 'Please enter a song title');
      return;
    }
    if (!newSong.artist.trim()) {
      showError('Error', 'Please enter an artist name');
      return;
    }

    setIsLoading(true);
    try {
      const formData = new FormData();
      formData.append('title', newSong.title);
      formData.append('artist', newSong.artist);
      formData.append('duration', newSong.duration || '0');
      formData.append('albumIds', JSON.stringify(newSong.albumIds));

      formData.append('audioFile', {
        uri: audioFile.uri,
        name: audioFile.name,
        type: audioFile.type,
      } as any);

      // If image was selected, send it. Otherwise, request placeholder generation
      if (imageFile) {
        formData.append('imageFile', {
          uri: imageFile.uri,
          name: imageFile.name,
          type: imageFile.type,
        } as any);
      } else {
        // Request backend to generate placeholder
        formData.append('generatePlaceholder', 'true');
      }

      await axiosInstance.post('/admin/songs', formData, {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
      });

      fetchSongs();
      showSuccess('Success', 'Song uploaded successfully', () => navigation.goBack());
    } catch (error: any) {
      console.error('Error uploading song:', error);
      showError('Error', error.response?.data?.message || 'Failed to upload song');
    } finally {
      setIsLoading(false);
    }
  };



  // Render placeholder preview
  const renderPlaceholderPreview = () => {
    if (!placeholderData) return null;

    return (
      <LinearGradient
        colors={placeholderData.gradientColors}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={styles.placeholderGradient}
      >
        {/* Decorative circles */}
        <View style={[styles.decorCircle, { top: '10%', left: '5%', width: 60, height: 60 }]} />
        <View style={[styles.decorCircle, { top: '60%', right: '10%', width: 80, height: 80 }]} />
        <View style={[styles.decorCircle, { bottom: '15%', left: '20%', width: 50, height: 50 }]} />
        <View style={[styles.decorCircle, { top: '30%', right: '5%', width: 55, height: 55 }]} />

        {/* Text content */}
        <View style={styles.placeholderTextContainer}>
          <Text style={styles.placeholderTitle} numberOfLines={2}>
            {placeholderData.title.slice(0, 20)}{placeholderData.title.length > 20 ? '...' : ''}
          </Text>
          <Text style={[styles.placeholderArtist, { color: placeholderData.artistColor }]} numberOfLines={1}>
            {placeholderData.artist}
          </Text>
        </View>
      </LinearGradient>
    );
  };

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <StatusBar barStyle="light-content" backgroundColor={COLORS.background} />

      {/* Hidden Video component for audio duration extraction */}
      {audioUri && (
        <Video
          ref={videoRef}
          source={{ uri: audioUri }}
          paused={true}
          onLoad={handleAudioLoad}
          onError={handleAudioError}
          style={{ width: 0, height: 0, position: 'absolute', opacity: 0 }}
        />
      )}

      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
          <Icon name="arrow-left" size={24} color={COLORS.textPrimary} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Upload Song</Text>
        <View style={styles.headerRight} />
      </View>

      <ScrollView
        style={styles.content}
        contentContainerStyle={styles.contentContainer}
        showsVerticalScrollIndicator={false}
      >
        {/* Image Upload - Square */}
        <Text style={styles.sectionTitle}>Cover Art</Text>
        <TouchableOpacity
          style={[styles.imageUploadContainer, { width: IMAGE_SIZE, height: IMAGE_SIZE }]}
          onPress={selectImageFile}
        >
          {imagePreview ? (
            <Image source={{ uri: imagePreview }} style={styles.imagePreview} />
          ) : placeholderData ? (
            renderPlaceholderPreview()
          ) : (
            <View style={styles.imagePlaceholder}>
              <Icon name="image" size={32} color={COLORS.textMuted} />
              <Text style={styles.uploadText}>Tap to select image</Text>
            </View>
          )}
          {placeholderData && !imagePreview && (
            <View style={styles.placeholderBadge}>
              <Text style={styles.placeholderBadgeText}>Auto-generated</Text>
            </View>
          )}
        </TouchableOpacity>
        <Text style={styles.imageHint}>
          {placeholderData && !imagePreview
            ? 'This image will be auto-generated. Tap to select a custom image.'
            : 'Optional: Tap to select cover art (will be auto-generated if not selected)'
          }
        </Text>

        {/* Audio Upload */}
        <Text style={styles.sectionTitle}>Audio File *</Text>
        <TouchableOpacity
          style={[styles.fileButton, audioFile && styles.fileButtonSelected]}
          onPress={selectAudioFile}
        >
          <Icon
            name={audioFile ? 'check-circle' : 'music'}
            size={20}
            color={audioFile ? themeColors.primary : COLORS.textMuted}
          />
          <Text style={[styles.fileButtonText, audioFile && { color: themeColors.primary }]}>
            {audioFile ? audioFile.name.slice(0, 30) + (audioFile.name.length > 30 ? '...' : '') : 'Select Audio File'}
          </Text>
          {isExtractingDuration && (
            <ActivityIndicator size="small" color={themeColors.primary} />
          )}
        </TouchableOpacity>

        {/* Title Input */}
        <Text style={styles.sectionTitle}>Title *</Text>
        <TextInput
          style={styles.textInput}
          placeholder="Song title"
          placeholderTextColor={COLORS.textMuted}
          value={newSong.title}
          onChangeText={(text) => setNewSong(prev => ({ ...prev, title: text }))}
        />

        {/* Artist Input */}
        <Text style={styles.sectionTitle}>Artist *</Text>
        <TextInput
          style={styles.textInput}
          placeholder="Artist name"
          placeholderTextColor={COLORS.textMuted}
          value={newSong.artist}
          onChangeText={(text) => setNewSong(prev => ({ ...prev, artist: text }))}
        />

        {/* Duration Input - Auto-filled but editable */}
        <Text style={styles.sectionTitle}>Duration (seconds)</Text>
        <View style={styles.durationContainer}>
          <TextInput
            style={[styles.textInput, styles.durationInput]}
            placeholder="Duration in seconds"
            placeholderTextColor={COLORS.textMuted}
            keyboardType="numeric"
            value={newSong.duration}
            onChangeText={(text) => setNewSong(prev => ({ ...prev, duration: text }))}
          />
          <View style={styles.durationPreview}>
            <Icon name="clock" size={14} color={COLORS.textMuted} />
            <Text style={styles.durationPreviewText}>
              {formatDuration(parseInt(newSong.duration) || 0)}
            </Text>
          </View>
        </View>
        {isExtractingDuration && (
          <Text style={styles.durationHint}>Extracting duration from audio file...</Text>
        )}

        {/* Albums Section */}
        <View style={styles.albumsHeader}>
          <Text style={styles.sectionTitle}>Albums (optional)</Text>
          {newSong.albumIds.length > 0 && (
            <TouchableOpacity onPress={() => setNewSong(prev => ({ ...prev, albumIds: [] }))}>
              <Text style={[styles.clearText, { color: themeColors.primary }]}>Clear</Text>
            </TouchableOpacity>
          )}
        </View>

        <TouchableOpacity
          style={styles.albumPickerButton}
          onPress={() => setShowAlbumPicker(!showAlbumPicker)}
        >
          <Text style={styles.albumPickerButtonText}>
            {newSong.albumIds.length === 0
              ? 'No albums selected (single)'
              : `${newSong.albumIds.length} album${newSong.albumIds.length > 1 ? 's' : ''} selected`}
          </Text>
          <Icon
            name={showAlbumPicker ? 'chevron-up' : 'chevron-down'}
            size={20}
            color={COLORS.textMuted}
          />
        </TouchableOpacity>

        {showAlbumPicker && (
          <View style={styles.albumsList}>
            {albums.length === 0 ? (
              <Text style={styles.noAlbumsText}>No albums available</Text>
            ) : (
              albums.map((album) => {
                const isSelected = newSong.albumIds.includes(album._id);
                return (
                  <TouchableOpacity
                    key={album._id}
                    style={[styles.albumItem, isSelected && { backgroundColor: themeColors.primaryMuted }]}
                    onPress={() => toggleAlbum(album._id)}
                  >
                    <View style={styles.checkbox}>
                      {isSelected && <Icon name="check" size={14} color={themeColors.primary} />}
                    </View>
                    <View style={styles.albumInfo}>
                      <Text style={styles.albumTitle}>{album.title}</Text>
                      <Text style={styles.albumArtist}>{album.artist}</Text>
                    </View>
                    {isSelected && <Icon name="check" size={16} color={themeColors.primary} />}
                  </TouchableOpacity>
                );
              })
            )}
          </View>
        )}

        {/* Submit Button */}
        <TouchableOpacity
          style={[
            styles.submitButton,
            { backgroundColor: themeColors.primary },
            isLoading && styles.submitButtonDisabled,
          ]}
          onPress={handleSubmit}
          disabled={isLoading}
        >
          {isLoading ? (
            <ActivityIndicator size="small" color={COLORS.textPrimary} />
          ) : (
            <>
              <Icon name="upload" size={20} color={COLORS.textPrimary} />
              <Text style={styles.submitButtonText}>Upload Song</Text>
            </>
          )}
        </TouchableOpacity>
      </ScrollView>

      {/* Custom Dialog */}
      <CustomDialog
        visible={dialogState.visible}
        title={dialogState.title}
        message={dialogState.message}
        type={dialogState.type}
        buttons={dialogState.buttons}
        onClose={hideDialog}
      />
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.sm,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.zinc800,
  },
  backButton: {
    padding: SPACING.xs,
  },
  headerTitle: {
    fontSize: FONT_SIZES.lg,
    fontWeight: '600',
    color: COLORS.textPrimary,
  },
  headerRight: {
    width: 40,
  },
  content: {
    flex: 1,
  },
  contentContainer: {
    padding: SPACING.md,
    paddingBottom: SPACING.xxl,
  },
  sectionTitle: {
    fontSize: FONT_SIZES.sm,
    fontWeight: '500',
    color: COLORS.textSecondary,
    marginBottom: SPACING.xs,
    marginTop: SPACING.md,
  },
  imageUploadContainer: {
    alignSelf: 'center',
    borderRadius: BORDER_RADIUS.lg,
    overflow: 'hidden',
    backgroundColor: COLORS.zinc800,
    borderWidth: 2,
    borderStyle: 'dashed',
    borderColor: COLORS.zinc700,
    position: 'relative',
  },
  imagePlaceholder: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  imagePreview: {
    width: '100%',
    height: '100%',
    resizeMode: 'cover',
  },
  placeholderGradient: {
    width: '100%',
    height: '100%',
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
    overflow: 'hidden',
  },
  decorCircle: {
    position: 'absolute',
    borderRadius: 999,
    backgroundColor: 'rgba(15, 23, 42, 0.35)',
  },
  placeholderTextContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 10,
    zIndex: 1,
  },
  placeholderTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#f8fafc',
    textAlign: 'center',
  },
  placeholderArtist: {
    fontSize: 11,
    marginTop: 4,
    textAlign: 'center',
  },
  placeholderBadge: {
    position: 'absolute',
    bottom: SPACING.xs,
    left: SPACING.xs,
    right: SPACING.xs,
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    paddingVertical: 4,
    paddingHorizontal: 8,
    borderRadius: BORDER_RADIUS.sm,
  },
  placeholderBadgeText: {
    color: COLORS.textSecondary,
    fontSize: FONT_SIZES.xs,
    textAlign: 'center',
  },
  uploadText: {
    color: COLORS.textMuted,
    fontSize: FONT_SIZES.sm,
    marginTop: SPACING.sm,
  },
  imageHint: {
    color: COLORS.textMuted,
    fontSize: FONT_SIZES.xs,
    textAlign: 'center',
    marginTop: SPACING.xs,
  },
  fileButton: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: SPACING.md,
    backgroundColor: COLORS.zinc800,
    borderRadius: BORDER_RADIUS.md,
    borderWidth: 1,
    borderColor: COLORS.zinc700,
    gap: SPACING.sm,
  },
  fileButtonSelected: {
    borderColor: 'rgba(16, 185, 129, 0.5)',
    backgroundColor: 'rgba(16, 185, 129, 0.1)',
  },
  fileButtonText: {
    flex: 1,
    color: COLORS.textMuted,
    fontSize: FONT_SIZES.md,
  },
  textInput: {
    backgroundColor: COLORS.zinc800,
    borderRadius: BORDER_RADIUS.md,
    padding: SPACING.sm,
    color: COLORS.textPrimary,
    fontSize: FONT_SIZES.md,
    borderWidth: 1,
    borderColor: COLORS.zinc700,
  },
  durationContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.sm,
  },
  durationInput: {
    flex: 1,
  },
  durationPreview: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.zinc800,
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.sm,
    borderRadius: BORDER_RADIUS.md,
    gap: SPACING.xs,
  },
  durationPreviewText: {
    color: COLORS.textSecondary,
    fontSize: FONT_SIZES.md,
    fontWeight: '500',
  },
  durationHint: {
    color: COLORS.textMuted,
    fontSize: FONT_SIZES.xs,
    marginTop: SPACING.xs,
    fontStyle: 'italic',
  },
  albumsHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  clearText: {
    fontSize: FONT_SIZES.sm,
    fontWeight: '500',
  },
  albumPickerButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: SPACING.md,
    backgroundColor: COLORS.zinc800,
    borderRadius: BORDER_RADIUS.md,
    borderWidth: 1,
    borderColor: COLORS.zinc700,
  },
  albumPickerButtonText: {
    color: COLORS.textMuted,
    fontSize: FONT_SIZES.md,
  },
  albumsList: {
    marginTop: SPACING.sm,
    backgroundColor: COLORS.zinc800,
    borderRadius: BORDER_RADIUS.md,
    overflow: 'hidden',
  },
  noAlbumsText: {
    color: COLORS.textMuted,
    fontSize: FONT_SIZES.sm,
    padding: SPACING.md,
    textAlign: 'center',
  },
  albumItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: SPACING.sm,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.zinc700,
    gap: SPACING.sm,
  },
  checkbox: {
    width: 20,
    height: 20,
    borderRadius: 4,
    borderWidth: 2,
    borderColor: COLORS.zinc600,
    alignItems: 'center',
    justifyContent: 'center',
  },
  albumInfo: {
    flex: 1,
  },
  albumTitle: {
    fontSize: FONT_SIZES.sm,
    fontWeight: '500',
    color: COLORS.textPrimary,
  },
  albumArtist: {
    fontSize: FONT_SIZES.xs,
    color: COLORS.textMuted,
  },
  submitButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: SPACING.md,
    borderRadius: BORDER_RADIUS.md,
    marginTop: SPACING.xl,
    gap: SPACING.sm,
  },
  submitButtonDisabled: {
    opacity: 0.7,
  },
  submitButtonText: {
    fontSize: FONT_SIZES.md,
    fontWeight: '600',
    color: COLORS.textPrimary,
  },
});

export default UploadSongScreen;
