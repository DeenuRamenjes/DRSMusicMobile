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
import axiosInstance, { uploadWithFetch } from '../api/axios';
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
  const [selectedCanvasStyle, setSelectedCanvasStyle] = useState<CanvasStyleType>('gradient');
  const [showStylePicker, setShowStylePicker] = useState(false);

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
        copyTo: 'cachesDirectory', // Copy file to cache for reliable upload
      });

      if (result && result.length > 0) {
        const file = result[0];
        
        // Log file details for debugging
        console.log('Selected audio file:', JSON.stringify(file, null, 2));
        
        // Check file size (50MB limit)
        const maxSize = 50 * 1024 * 1024; // 50MB in bytes
        if (file.size && file.size > maxSize) {
          const sizeMB = (file.size / (1024 * 1024)).toFixed(2);
          showError('File Too Large', `The selected file is ${sizeMB}MB. Maximum allowed size is 50MB.`);
          return;
        }
        
        // Use fileCopyUri if available (copied to cache), otherwise use original uri
        const fileUri = (file as any).fileCopyUri || file.uri;
        console.log('Using URI for upload:', fileUri);
        
        const fileData = {
          uri: fileUri,
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
          setPlaceholderData(generatePlaceholderData(extractedTitle, extractedArtist, selectedCanvasStyle));
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
        copyTo: 'cachesDirectory', // Copy file to cache for reliable upload
      });

      if (result && result.length > 0) {
        const file = result[0];
        // Use fileCopyUri if available (copied to cache), otherwise use original uri
        const fileUri = (file as any).fileCopyUri || file.uri;
        
        setImageFile({
          uri: fileUri,
          name: file.name || 'image.jpg',
          type: file.type || 'image/jpeg',
        });
        setImagePreview(fileUri);
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
      console.log('=== UPLOAD SONG START ===');
      console.log('Audio file:', audioFile);
      console.log('Using uploadWithFetch (not axios)');
      
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

      await uploadWithFetch('/admin/songs', formData);

      fetchSongs();
      showSuccess('Success', 'Song uploaded successfully', () => navigation.goBack());
    } catch (error: any) {
      console.error('Error uploading song:', error);
      let errorMessage = 'Failed to upload song';
      if (error.response?.status === 413) {
        errorMessage = 'File is too large. Maximum audio file size is 50MB.';
      } else if (error.code === 'ECONNABORTED') {
        errorMessage = 'Upload timed out. Please check your connection and try again.';
      } else if (error.response?.data?.message) {
        errorMessage = error.response.data.message;
      }
      showError('Error', errorMessage);
    } finally {
      setIsLoading(false);
    }
  };



  // Regenerate placeholder with current title/artist and selected style
  const regeneratePlaceholder = () => {
    const title = newSong.title || 'New Track';
    const artist = newSong.artist || 'Unknown Artist';
    setPlaceholderData(generatePlaceholderData(title, artist, selectedCanvasStyle));
  };

  // Change canvas style
  const changeCanvasStyle = (style: CanvasStyleType) => {
    setSelectedCanvasStyle(style);
    const title = newSong.title || 'New Track';
    const artist = newSong.artist || 'Unknown Artist';
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
        
        <Text style={styles.imageHint}>
          {placeholderData && !imagePreview
            ? 'This image will be auto-generated. Tap image to select a custom one.'
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
  // Auto-gen controls
  autoGenControls: {
    flexDirection: 'row',
    justifyContent: 'center',
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

export default UploadSongScreen;
