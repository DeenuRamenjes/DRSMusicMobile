import React, { useState, useEffect } from 'react';
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
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Icon from 'react-native-vector-icons/Feather';
import { useNavigation, useRoute, RouteProp } from '@react-navigation/native';
import { pick, types } from '@react-native-documents/picker';
import LinearGradient from 'react-native-linear-gradient';
import { COLORS, SPACING, FONT_SIZES, BORDER_RADIUS } from '../constants/theme';

// Canvas style types
type CanvasStyleType = 'gradient' | 'geometric' | 'waves' | 'minimal' | 'neon' | 'vintage';

interface CanvasStyle {
  id: CanvasStyleType;
  name: string;
  icon: string;
}

const CANVAS_STYLES: CanvasStyle[] = [
  { id: 'gradient', name: 'Gradient', icon: 'sun' },
  { id: 'geometric', name: 'Geometric', icon: 'octagon' },
  { id: 'waves', name: 'Waves', icon: 'activity' },
  { id: 'minimal', name: 'Minimal', icon: 'square' },
  { id: 'neon', name: 'Neon', icon: 'zap' },
  { id: 'vintage', name: 'Vintage', icon: 'disc' },
];

// Placeholder data type for preview
interface PlaceholderData {
  gradientColors: [string, string];
  artistColor: string;
  title: string;
  artist: string;
  style: CanvasStyleType;
  accentColor?: string;
  baseHue: number;
}

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

// Generate placeholder data for preview with different styles
const generatePlaceholderData = (title: string, artist: string, style: CanvasStyleType = 'gradient'): PlaceholderData => {
  const baseHue = Math.floor(Math.random() * 360);
  
  let color1: string, color2: string, artistColor: string, accentColor: string;
  
  switch (style) {
    case 'geometric':
      color1 = hslToHex(baseHue, 60, 15);
      color2 = hslToHex((baseHue + 30) % 360, 50, 25);
      artistColor = hslToHex((baseHue + 180) % 360, 70, 75);
      accentColor = hslToHex((baseHue + 120) % 360, 80, 50);
      break;
    case 'waves':
      color1 = hslToHex(baseHue, 80, 25);
      color2 = hslToHex((baseHue + 60) % 360, 70, 40);
      artistColor = hslToHex((baseHue + 30) % 360, 60, 85);
      accentColor = hslToHex((baseHue + 90) % 360, 90, 60);
      break;
    case 'minimal':
      color1 = hslToHex(0, 0, 8);
      color2 = hslToHex(0, 0, 15);
      artistColor = hslToHex(baseHue, 70, 65);
      accentColor = hslToHex(baseHue, 80, 55);
      break;
    case 'neon':
      color1 = hslToHex(280, 100, 5);
      color2 = hslToHex(320, 80, 10);
      artistColor = hslToHex((baseHue + 180) % 360, 100, 70);
      accentColor = hslToHex(baseHue, 100, 50);
      break;
    case 'vintage':
      color1 = hslToHex(30, 40, 20);
      color2 = hslToHex(35, 35, 30);
      artistColor = hslToHex(40, 50, 75);
      accentColor = hslToHex(25, 60, 50);
      break;
    default: // gradient
      color1 = hslToHex(baseHue, 70, 20);
      color2 = hslToHex((baseHue + 45) % 360, 70, 45);
      artistColor = hslToHex((baseHue + 20) % 360, 60, 80);
      accentColor = hslToHex((baseHue + 90) % 360, 70, 60);
  }

  return {
    gradientColors: [color1, color2],
    artistColor,
    accentColor,
    title: title || 'New Track',
    artist: artist || 'Unknown Artist',
    style,
    baseHue,
  };
};
import { useThemeStore } from '../store/useThemeStore';
import { useMusicStore } from '../store/useMusicStore';
import { Song } from '../types';
import { getFullImageUrl } from '../config';
import { CustomDialog, useDialog } from '../components/CustomDialog';
import { formatDuration } from '../utils/duration';

type EditSongRouteParams = {
  EditSong: { song: Song };
};

export const EditSongScreen = () => {
  const navigation = useNavigation();
  const route = useRoute<RouteProp<EditSongRouteParams, 'EditSong'>>();
  const { song } = route.params;

  const { colors: themeColors } = useThemeStore();
  const { updateSong, fetchSongs, albums, fetchAlbums } = useMusicStore();
  const { dialogState, hideDialog, showSuccess, showError } = useDialog();

  const [isLoading, setIsLoading] = useState(false);
  const [editedSong, setEditedSong] = useState({
    title: song.title,
    artist: song.artist,
    duration: String(song.duration) || '0',
    albumIds: song.albumIds || [],
  });

  const [imageFile, setImageFile] = useState<{ uri: string; name: string; type: string } | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(getFullImageUrl(song.imageUrl));
  const [showAlbumPicker, setShowAlbumPicker] = useState(false);
  
  // Placeholder/auto-gen state
  const [placeholderData, setPlaceholderData] = useState<PlaceholderData | null>(null);
  const [selectedCanvasStyle, setSelectedCanvasStyle] = useState<CanvasStyleType>('gradient');
  const [showStylePicker, setShowStylePicker] = useState(false);
  const [useAutoGenCover, setUseAutoGenCover] = useState(false);

  useEffect(() => {
    fetchAlbums();
  }, []);

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
        setUseAutoGenCover(false);
        setPlaceholderData(null);
      }
    } catch (err: any) {
      if (err?.code !== 'DOCUMENT_PICKER_CANCELED') {
        console.error('Error picking image:', err);
        showError('Error', 'Failed to select image file');
      }
    }
  };

  // Enable auto-generated cover (replaces current image)
  const enableAutoGenCover = () => {
    setUseAutoGenCover(true);
    setImageFile(null);
    setImagePreview(null);
    const title = editedSong.title || 'New Track';
    const artist = editedSong.artist || 'Unknown Artist';
    setPlaceholderData(generatePlaceholderData(title, artist, selectedCanvasStyle));
  };

  // Regenerate placeholder with current title/artist and selected style
  const regeneratePlaceholder = () => {
    const title = editedSong.title || 'New Track';
    const artist = editedSong.artist || 'Unknown Artist';
    setPlaceholderData(generatePlaceholderData(title, artist, selectedCanvasStyle));
  };

  // Change canvas style
  const changeCanvasStyle = (style: CanvasStyleType) => {
    setSelectedCanvasStyle(style);
    const title = editedSong.title || 'New Track';
    const artist = editedSong.artist || 'Unknown Artist';
    setPlaceholderData(generatePlaceholderData(title, artist, style));
    setShowStylePicker(false);
  };

  // Render decorations based on style
  const renderStyleDecorations = () => {
    if (!placeholderData) return null;
    
    const { style, accentColor } = placeholderData;
    
    switch (style) {
      case 'geometric':
        return (
          <>
            <View style={[styles.geometricShape, styles.triangle, { borderBottomColor: accentColor, top: '5%', left: '10%' }]} />
            <View style={[styles.geometricShape, styles.diamond, { backgroundColor: accentColor, top: '50%', right: '5%' }]} />
            <View style={[styles.geometricShape, styles.hexLine, { backgroundColor: accentColor, bottom: '20%', left: '5%' }]} />
            <View style={[styles.geometricShape, styles.hexLine, { backgroundColor: accentColor, bottom: '25%', left: '15%', transform: [{ rotate: '60deg' }] }]} />
          </>
        );
      case 'waves':
        return (
          <>
            <View style={[styles.wave, { backgroundColor: accentColor, opacity: 0.3, top: '20%' }]} />
            <View style={[styles.wave, { backgroundColor: accentColor, opacity: 0.2, top: '35%' }]} />
            <View style={[styles.wave, { backgroundColor: accentColor, opacity: 0.15, top: '50%' }]} />
          </>
        );
      case 'minimal':
        return (
          <>
            <View style={[styles.minimalLine, { backgroundColor: accentColor, top: '15%', width: '40%' }]} />
            <View style={[styles.minimalLine, { backgroundColor: accentColor, bottom: '15%', width: '30%', alignSelf: 'flex-end', right: 10 }]} />
          </>
        );
      case 'neon':
        return (
          <>
            <View style={[styles.neonGlow, { backgroundColor: accentColor, top: '10%', left: '10%' }]} />
            <View style={[styles.neonGlow, { backgroundColor: placeholderData.artistColor, bottom: '20%', right: '15%' }]} />
            <View style={[styles.neonLine, { backgroundColor: accentColor, top: '40%' }]} />
          </>
        );
      case 'vintage':
        return (
          <>
            <View style={styles.vintageBorder} />
            <View style={[styles.vintageCorner, { top: 10, left: 10 }]} />
            <View style={[styles.vintageCorner, { top: 10, right: 10, transform: [{ rotate: '90deg' }] }]} />
            <View style={[styles.vintageCorner, { bottom: 10, left: 10, transform: [{ rotate: '-90deg' }] }]} />
            <View style={[styles.vintageCorner, { bottom: 10, right: 10, transform: [{ rotate: '180deg' }] }]} />
          </>
        );
      default: // gradient
        return (
          <>
            <View style={[styles.decorCircle, { top: '10%', left: '5%', width: 60, height: 60 }]} />
            <View style={[styles.decorCircle, { top: '60%', right: '10%', width: 80, height: 80 }]} />
            <View style={[styles.decorCircle, { bottom: '15%', left: '20%', width: 50, height: 50 }]} />
            <View style={[styles.decorCircle, { top: '30%', right: '5%', width: 55, height: 55 }]} />
          </>
        );
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
        {/* Style-specific decorations */}
        {renderStyleDecorations()}

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

  const toggleAlbum = (albumId: string) => {
    setEditedSong(prev => ({
      ...prev,
      albumIds: prev.albumIds.includes(albumId)
        ? prev.albumIds.filter(id => id !== albumId)
        : [...prev.albumIds, albumId],
    }));
  };

  const handleSubmit = async () => {
    if (!editedSong.title.trim()) {
      showError('Error', 'Please enter a song title');
      return;
    }
    if (!editedSong.artist.trim()) {
      showError('Error', 'Please enter an artist name');
      return;
    }

    setIsLoading(true);
    try {
      const formData = new FormData();
      formData.append('title', editedSong.title);
      formData.append('artist', editedSong.artist);
      formData.append('duration', editedSong.duration);
      formData.append('albumIds', JSON.stringify(editedSong.albumIds));

      if (imageFile) {
        formData.append('imageFile', {
          uri: imageFile.uri,
          name: imageFile.name,
          type: imageFile.type,
        } as any);
      } else if (useAutoGenCover) {
        // Request backend to generate a new placeholder
        formData.append('generatePlaceholder', 'true');
      }

      await updateSong(song._id, formData);

      fetchSongs();
      showSuccess('Success', 'Song updated successfully', () => navigation.goBack());
    } catch (error: any) {
      console.error('Error updating song:', error);
      showError('Error', error.response?.data?.message || 'Failed to update song');
    } finally {
      setIsLoading(false);
    }
  };

  const hasChanges = () => {
    const originalAlbumIds = song.albumIds || [];
    const currentAlbumIds = editedSong.albumIds;
    const albumsChanged =
      originalAlbumIds.length !== currentAlbumIds.length ||
      !originalAlbumIds.every(id => currentAlbumIds.includes(id));

    return (
      editedSong.title !== song.title ||
      editedSong.artist !== song.artist ||
      editedSong.duration !== (song.duration?.toString() || '0') ||
      albumsChanged ||
      imageFile !== null ||
      useAutoGenCover
    );
  };

  if (isLoading) {
    return (
      <View style={styles.container}>
        <StatusBar barStyle="light-content" backgroundColor={COLORS.background} />
      </View>
    );
  }

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <StatusBar barStyle="light-content" backgroundColor={COLORS.background} />

      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
          <Icon name="arrow-left" size={24} color={COLORS.textPrimary} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Edit Song</Text>
        <View style={styles.headerRight} />
      </View>

      <ScrollView
        style={styles.content}
        contentContainerStyle={styles.contentContainer}
        showsVerticalScrollIndicator={false}
      >
        {/* Image Upload */}
        <Text style={styles.sectionTitle}>Cover Art</Text>
        <TouchableOpacity
          style={styles.imageUploadContainer}
          onPress={selectImageFile}
        >
          {imagePreview ? (
            <Image source={{ uri: imagePreview }} style={styles.imagePreview} />
          ) : placeholderData ? (
            renderPlaceholderPreview()
          ) : (
            <View style={styles.imagePlaceholder}>
              <Icon name="image" size={32} color={COLORS.textMuted} />
              <Text style={styles.uploadText}>Tap to change image</Text>
            </View>
          )}
          {placeholderData && !imagePreview && (
            <View style={styles.placeholderBadge}>
              <Text style={styles.placeholderBadgeText}>Auto-generated</Text>
            </View>
          )}
          <View style={styles.editImageBadge}>
            <Icon name="camera" size={14} color={COLORS.textPrimary} />
          </View>
        </TouchableOpacity>
        
        {/* Auto-gen cover button - show when NOT using placeholder */}
        {!useAutoGenCover && !placeholderData && (
          <TouchableOpacity 
            style={[styles.autoGenStartButton, { backgroundColor: themeColors.primaryMuted }]} 
            onPress={enableAutoGenCover}
          >
            <Icon name="refresh-cw" size={16} color={themeColors.primary} />
            <Text style={[styles.autoGenButtonText, { color: themeColors.primary }]}>Generate New Cover</Text>
          </TouchableOpacity>
        )}
        
        {/* Auto-gen controls - only show when using placeholder */}
        {placeholderData && !imagePreview && (
          <View style={styles.autoGenControls}>
            {/* Regenerate button */}
            <TouchableOpacity 
              style={[styles.autoGenButton, { backgroundColor: themeColors.primaryMuted }]} 
              onPress={regeneratePlaceholder}
            >
              <Icon name="refresh-cw" size={16} color={themeColors.primary} />
              <Text style={[styles.autoGenButtonText, { color: themeColors.primary }]}>Regenerate</Text>
            </TouchableOpacity>
            
            {/* Style picker button */}
            <TouchableOpacity 
              style={[styles.autoGenButton, { backgroundColor: themeColors.primaryMuted }]} 
              onPress={() => setShowStylePicker(!showStylePicker)}
            >
              <Icon name="layers" size={16} color={themeColors.primary} />
              <Text style={[styles.autoGenButtonText, { color: themeColors.primary }]}>
                {CANVAS_STYLES.find(s => s.id === selectedCanvasStyle)?.name || 'Style'}
              </Text>
              <Icon name={showStylePicker ? 'chevron-up' : 'chevron-down'} size={14} color={themeColors.primary} />
            </TouchableOpacity>
            
            {/* Cancel auto-gen button */}
            <TouchableOpacity 
              style={[styles.autoGenButton, { backgroundColor: COLORS.zinc700 }]} 
              onPress={() => {
                setUseAutoGenCover(false);
                setPlaceholderData(null);
                setImagePreview(getFullImageUrl(song.imageUrl));
              }}
            >
              <Icon name="x" size={16} color={COLORS.textMuted} />
              <Text style={[styles.autoGenButtonText, { color: COLORS.textMuted }]}>Cancel</Text>
            </TouchableOpacity>
          </View>
        )}
        
        {/* Style picker dropdown */}
        {showStylePicker && placeholderData && !imagePreview && (
          <View style={styles.stylePickerContainer}>
            {CANVAS_STYLES.map((style) => (
              <TouchableOpacity
                key={style.id}
                style={[
                  styles.styleOption,
                  selectedCanvasStyle === style.id && { backgroundColor: themeColors.primaryMuted }
                ]}
                onPress={() => changeCanvasStyle(style.id)}
              >
                <Icon 
                  name={style.icon} 
                  size={18} 
                  color={selectedCanvasStyle === style.id ? themeColors.primary : COLORS.textMuted} 
                />
                <Text style={[
                  styles.styleOptionText,
                  selectedCanvasStyle === style.id && { color: themeColors.primary }
                ]}>
                  {style.name}
                </Text>
                {selectedCanvasStyle === style.id && (
                  <Icon name="check" size={16} color={themeColors.primary} />
                )}
              </TouchableOpacity>
            ))}
          </View>
        )}

        {/* Title Input */}
        <Text style={styles.sectionTitle}>Title</Text>
        <TextInput
          style={styles.textInput}
          placeholder="Song title"
          placeholderTextColor={COLORS.textMuted}
          value={editedSong.title}
          onChangeText={(text) => setEditedSong(prev => ({ ...prev, title: text }))}
        />

        {/* Artist Input */}
        <Text style={styles.sectionTitle}>Artist</Text>
        <TextInput
          style={styles.textInput}
          placeholder="Artist name"
          placeholderTextColor={COLORS.textMuted}
          value={editedSong.artist}
          onChangeText={(text) => setEditedSong(prev => ({ ...prev, artist: text }))}
        />

        {/* Duration Input */}
        <Text style={styles.sectionTitle}>Duration (seconds)</Text>
        <View style={styles.durationContainer}>
          <TextInput
            style={[styles.textInput, styles.durationInput]}
            placeholder="Duration in seconds"
            placeholderTextColor={COLORS.textMuted}
            keyboardType="numeric"
            value={editedSong.duration}
            onChangeText={(text) => setEditedSong(prev => ({ ...prev, duration: text }))}
          />
          <View style={styles.durationPreview}>
            <Icon name="clock" size={14} color={COLORS.textMuted} />
            <Text style={styles.durationPreviewText}>
              {formatDuration(parseInt(editedSong.duration) || 0)}
            </Text>
          </View>
        </View>

        {/* Albums Section */}
        <View style={styles.albumsHeader}>
          <Text style={styles.sectionTitle}>Albums</Text>
          {editedSong.albumIds.length > 0 && (
            <TouchableOpacity onPress={() => setEditedSong(prev => ({ ...prev, albumIds: [] }))}>
              <Text style={[styles.clearText, { color: themeColors.primary }]}>Clear</Text>
            </TouchableOpacity>
          )}
        </View>

        <TouchableOpacity
          style={styles.albumPickerButton}
          onPress={() => setShowAlbumPicker(!showAlbumPicker)}
        >
          <Text style={styles.albumPickerButtonText}>
            {editedSong.albumIds.length === 0
              ? 'No albums selected (single)'
              : `${editedSong.albumIds.length} album${editedSong.albumIds.length > 1 ? 's' : ''} selected`}
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
                const isSelected = editedSong.albumIds.includes(album._id);
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
            (isLoading || !hasChanges()) && styles.submitButtonDisabled,
          ]}
          onPress={handleSubmit}
          disabled={isLoading || !hasChanges()}
        >
          {isLoading ? (
            <ActivityIndicator size="small" color={COLORS.textPrimary} />
          ) : (
            <>
              <Icon name="save" size={20} color={COLORS.textPrimary} />
              <Text style={styles.submitButtonText}>Save Changes</Text>
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
    width: '100%',
    aspectRatio: 1,
    alignSelf: 'center',
    borderRadius: BORDER_RADIUS.lg,
    overflow: 'hidden',
    backgroundColor: COLORS.zinc800,
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
  editImageBadge: {
    position: 'absolute',
    bottom: SPACING.sm,
    right: SPACING.sm,
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  uploadText: {
    color: COLORS.textMuted,
    fontSize: FONT_SIZES.sm,
    marginTop: SPACING.sm,
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
    maxHeight: 200,
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
    opacity: 0.5,
  },
  submitButtonText: {
    fontSize: FONT_SIZES.md,
    fontWeight: '600',
    color: COLORS.textPrimary,
  },
  // Placeholder preview styles
  placeholderGradient: {
    width: '100%',
    height: '100%',
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
  placeholderTextContainer: {
    position: 'absolute',
    bottom: 15,
    left: 10,
    right: 10,
    zIndex: 10,
  },
  placeholderTitle: {
    fontSize: FONT_SIZES.lg,
    fontWeight: 'bold',
    color: '#ffffff',
    textShadowColor: 'rgba(0, 0, 0, 0.5)',
    textShadowOffset: { width: 1, height: 1 },
    textShadowRadius: 3,
  },
  placeholderArtist: {
    fontSize: FONT_SIZES.sm,
    fontWeight: '500',
    textShadowColor: 'rgba(0, 0, 0, 0.5)',
    textShadowOffset: { width: 1, height: 1 },
    textShadowRadius: 2,
    marginTop: 2,
  },
  placeholderBadge: {
    position: 'absolute',
    top: SPACING.xs,
    left: SPACING.xs,
    backgroundColor: 'rgba(0, 0, 0, 0.6)',
    paddingHorizontal: SPACING.xs,
    paddingVertical: 2,
    borderRadius: BORDER_RADIUS.sm,
  },
  placeholderBadgeText: {
    color: '#ffffff',
    fontSize: FONT_SIZES.xs,
    fontWeight: '500',
  },
  decorCircle: {
    position: 'absolute',
    borderRadius: 100,
    backgroundColor: 'rgba(255, 255, 255, 0.15)',
  },
  // Auto-gen controls
  autoGenStartButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: SPACING.sm,
    paddingHorizontal: SPACING.md,
    borderRadius: BORDER_RADIUS.md,
    gap: SPACING.xs,
    marginTop: SPACING.sm,
    alignSelf: 'center',
  },
  autoGenControls: {
    flexDirection: 'row',
    justifyContent: 'center',
    flexWrap: 'wrap',
    gap: SPACING.sm,
    marginTop: SPACING.sm,
  },
  autoGenButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: SPACING.xs,
    paddingHorizontal: SPACING.sm,
    borderRadius: BORDER_RADIUS.md,
    gap: SPACING.xs,
  },
  autoGenButtonText: {
    fontSize: FONT_SIZES.sm,
    fontWeight: '500',
  },
  stylePickerContainer: {
    backgroundColor: COLORS.zinc800,
    borderRadius: BORDER_RADIUS.md,
    marginTop: SPACING.sm,
    padding: SPACING.xs,
    borderWidth: 1,
    borderColor: COLORS.zinc700,
  },
  styleOption: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: SPACING.sm,
    borderRadius: BORDER_RADIUS.sm,
    gap: SPACING.sm,
  },
  styleOptionText: {
    flex: 1,
    fontSize: FONT_SIZES.sm,
    color: COLORS.textSecondary,
  },
  // Style-specific decorations
  geometricShape: {
    position: 'absolute',
  },
  triangle: {
    width: 0,
    height: 0,
    borderLeftWidth: 25,
    borderRightWidth: 25,
    borderBottomWidth: 45,
    borderLeftColor: 'transparent',
    borderRightColor: 'transparent',
    opacity: 0.6,
  },
  diamond: {
    width: 30,
    height: 30,
    transform: [{ rotate: '45deg' }],
    opacity: 0.5,
  },
  hexLine: {
    width: 40,
    height: 3,
    opacity: 0.6,
  },
  wave: {
    position: 'absolute',
    left: 0,
    right: 0,
    height: 30,
    borderRadius: 100,
  },
  minimalLine: {
    position: 'absolute',
    height: 2,
    left: 15,
    borderRadius: 1,
  },
  neonGlow: {
    position: 'absolute',
    width: 40,
    height: 40,
    borderRadius: 20,
    opacity: 0.4,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.8,
    shadowRadius: 15,
  },
  neonLine: {
    position: 'absolute',
    left: '10%',
    right: '10%',
    height: 2,
    opacity: 0.6,
  },
  vintageBorder: {
    position: 'absolute',
    top: 8,
    left: 8,
    right: 8,
    bottom: 8,
    borderWidth: 2,
    borderColor: 'rgba(255, 255, 255, 0.2)',
    borderRadius: 4,
  },
  vintageCorner: {
    position: 'absolute',
    width: 15,
    height: 15,
    borderTopWidth: 2,
    borderLeftWidth: 2,
    borderColor: 'rgba(255, 255, 255, 0.4)',
  },
});

export default EditSongScreen;
