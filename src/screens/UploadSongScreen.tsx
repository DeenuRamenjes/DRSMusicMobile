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
import { uploadWithFetch } from '../api/axios';
import { CustomDialog, useDialog } from '../components/CustomDialog';
import { formatDuration } from '../utils/duration';
import Slider from '@react-native-community/slider';
import ViewShot from 'react-native-view-shot';
import { ArtworkPreview } from '../components/ArtworkPreview';
import { CanvasStyleType, CANVAS_STYLES, ArtworkData } from '../constants/artworkConstants';

const { width: SCREEN_WIDTH } = Dimensions.get('window');
const IMAGE_SIZE = Math.min(SCREEN_WIDTH * 0.45, 180);

interface NewSong {
  title: string;
  artist: string;
  albumIds: string[];
  duration: string;
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

  // Artwork state
  const [selectedCanvasStyle, setSelectedCanvasStyle] = useState<CanvasStyleType>('gradient');
  const [baseHue, setBaseHue] = useState(Math.floor(Math.random() * 360));
  const [showStylePicker, setShowStylePicker] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const viewShotRef = useRef<ViewShot>(null);

  // Video ref for duration extraction
  const videoRef = useRef<any>(null);
  const [audioUri, setAudioUri] = useState<string | null>(null);

  // Artwork data for preview
  const artworkData: ArtworkData = {
    title: newSong.title || 'New Track',
    artist: newSong.artist || 'Unknown Artist',
    style: selectedCanvasStyle,
    baseHue: baseHue,
  };

  useEffect(() => {
    fetchAlbums();
  }, []);

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
        copyTo: 'cachesDirectory',
      });

      if (result && result.length > 0) {
        const file = result[0];
        const maxSize = 100 * 1024 * 1024;
        if (file.size && file.size > maxSize) {
          showError('File Too Large', 'Maximum allowed size is 100MB.');
          return;
        }

        const fileUri = (file as any).fileCopyUri || file.uri;
        setAudioFile({
          uri: fileUri,
          name: file.name || 'audio.mp3',
          type: file.type || 'audio/mpeg',
        });

        if (file.name) {
          const extracted = extractSongDetailsFromFilename(file.name);
          setNewSong(prev => ({
            ...prev,
            title: prev.title || extracted.title,
            artist: prev.artist || extracted.artist,
          }));
        }

        setIsExtractingDuration(true);
        setAudioUri(file.uri);
      }
    } catch (err: any) {
      if (err?.code !== 'DOCUMENT_PICKER_CANCELED') {
        showError('Error', 'Failed to select audio file');
      }
    }
  };

  const selectImageFile = async () => {
    try {
      const result = await pick({
        type: [types.images],
        copyTo: 'cachesDirectory',
      });

      if (result && result.length > 0) {
        const file = result[0];
        const fileUri = (file as any).fileCopyUri || file.uri;
        setImageFile({
          uri: fileUri,
          name: file.name || 'image.jpg',
          type: file.type || 'image/jpeg',
        });
        setImagePreview(fileUri);
      }
    } catch (err: any) {
      if (err?.code !== 'DOCUMENT_PICKER_CANCELED') {
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
    if (!newSong.title.trim() || !newSong.artist.trim()) {
      showError('Error', 'Please enter title and artist');
      return;
    }

    setIsLoading(true);
    setUploadProgress(0);
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

      if (imageFile) {
        formData.append('imageFile', {
          uri: imageFile.uri,
          name: imageFile.name,
          type: imageFile.type,
        } as any);
      } else if (viewShotRef.current) {
        const uri = await viewShotRef.current.capture?.();
        if (uri) {
          formData.append('imageFile', {
            uri: uri,
            name: 'cover.jpg',
            type: 'image/jpeg',
          } as any);
        }
      }

      await uploadWithFetch('/admin/songs', formData, (progress) => {
        setUploadProgress(progress);
      });

      fetchSongs();
      showSuccess('Success', 'Song uploaded successfully', () => navigation.goBack());
    } catch (error: any) {
      console.error('Upload error:', error);
      showError('Error', error.response?.data?.message || 'Failed to upload song');
    } finally {
      setIsLoading(false);
      setUploadProgress(0);
    }
  };

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <StatusBar barStyle="light-content" backgroundColor={COLORS.background} />

      {audioUri && (
        <Video
          ref={videoRef}
          source={{ uri: audioUri }}
          paused={true}
          onLoad={handleAudioLoad}
          onError={handleAudioError}
          style={styles.hiddenVideo}
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

      <ScrollView style={styles.content} contentContainerStyle={styles.contentContainer}>
        {/* Cover Section */}
        <Text style={styles.sectionTitle}>Cover Art</Text>
        <TouchableOpacity
          style={[styles.imageUploadContainer, { width: IMAGE_SIZE, height: IMAGE_SIZE }]}
          onPress={selectImageFile}
        >
          {imagePreview ? (
            <Image source={{ uri: imagePreview }} style={styles.imagePreview} />
          ) : (
            <ArtworkPreview ref={viewShotRef} data={artworkData} size={IMAGE_SIZE} />
          )}
          {!imagePreview && (
            <View style={styles.placeholderBadge}>
              <Text style={styles.placeholderBadgeText}>Auto-generated Cover</Text>
            </View>
          )}
        </TouchableOpacity>

        {!imagePreview && (
          <View style={styles.autoGenControls}>
            <View style={styles.hueCard}>
              <Text style={styles.hueText}>Theme Color</Text>
              <Slider
                style={styles.slider}
                minimumValue={0}
                maximumValue={360}
                value={baseHue}
                onValueChange={setBaseHue}
                minimumTrackTintColor={themeColors.primary}
                thumbTintColor={themeColors.primary}
              />
            </View>
            <TouchableOpacity
              style={[styles.styleButton, { backgroundColor: themeColors.primaryMuted }]}
              onPress={() => setShowStylePicker(!showStylePicker)}
            >
              <Icon name="layers" size={16} color={themeColors.primary} />
              <Text style={[styles.styleButtonText, { color: themeColors.primary }]}>
                {CANVAS_STYLES.find(s => s.id === selectedCanvasStyle)?.name} Style
              </Text>
              <Icon name={showStylePicker ? 'chevron-up' : 'chevron-down'} size={14} color={themeColors.primary} />
            </TouchableOpacity>
          </View>
        )}

        {showStylePicker && !imagePreview && (
          <View style={styles.stylePicker}>
            {CANVAS_STYLES.map(s => (
              <TouchableOpacity
                key={s.id}
                style={[styles.styleOption, selectedCanvasStyle === s.id && { backgroundColor: themeColors.primaryMuted }]}
                onPress={() => { setSelectedCanvasStyle(s.id); setShowStylePicker(false); }}
              >
                <Icon name={s.icon} size={18} color={selectedCanvasStyle === s.id ? themeColors.primary : COLORS.textMuted} />
                <Text style={[styles.styleOptionText, selectedCanvasStyle === s.id && { color: themeColors.primary }]}>{s.name}</Text>
              </TouchableOpacity>
            ))}
          </View>
        )}

        {/* Inputs */}
        <Text style={styles.sectionTitle}>Audio File *</Text>
        <TouchableOpacity style={[styles.fileButton, audioFile && styles.fileButtonSelected]} onPress={selectAudioFile}>
          <Icon name={audioFile ? 'check-circle' : 'music'} size={20} color={audioFile ? themeColors.primary : COLORS.textMuted} />
          <Text style={[styles.fileButtonText, audioFile && { color: themeColors.primary }]}>
            {audioFile ? audioFile.name : 'Select Audio File'}
          </Text>
        </TouchableOpacity>

        <Text style={styles.sectionTitle}>Title *</Text>
        <TextInput
          style={styles.input}
          placeholder="Song title"
          placeholderTextColor={COLORS.textMuted}
          value={newSong.title}
          onChangeText={t => setNewSong(p => ({ ...p, title: t }))}
        />

        <Text style={styles.sectionTitle}>Artist *</Text>
        <TextInput
          style={styles.input}
          placeholder="Artist name"
          placeholderTextColor={COLORS.textMuted}
          value={newSong.artist}
          onChangeText={t => setNewSong(p => ({ ...p, artist: t }))}
        />

        {/* Albums */}
        <TouchableOpacity style={styles.albumPicker} onPress={() => setShowAlbumPicker(!showAlbumPicker)}>
          <Text style={styles.albumPickerText}>
            {newSong.albumIds.length === 0 ? 'No albums selected' : `${newSong.albumIds.length} albums selected`}
          </Text>
          <Icon name={showAlbumPicker ? 'chevron-up' : 'chevron-down'} size={20} color={COLORS.textMuted} />
        </TouchableOpacity>

        {showAlbumPicker && (
          <View style={styles.albumsList}>
            {albums.map(a => (
              <TouchableOpacity
                key={a._id}
                style={styles.albumItem}
                onPress={() => toggleAlbum(a._id)}
              >
                <Icon name={newSong.albumIds.includes(a._id) ? 'check-square' : 'square'} size={18} color={themeColors.primary} />
                <Text style={styles.albumItemText}>{a.title}</Text>
              </TouchableOpacity>
            ))}
          </View>
        )}

        {/* Submit */}
        <TouchableOpacity
          style={[styles.submitButton, { backgroundColor: themeColors.primary }, isLoading && styles.disabled]}
          onPress={handleSubmit}
          disabled={isLoading}
        >
          {isLoading ? (
            <View style={styles.row}>
              <ActivityIndicator color="#fff" />
              <Text style={styles.submitText}>Uploading {uploadProgress}%</Text>
            </View>
          ) : (
            <Text style={styles.submitText}>Upload Song</Text>
          )}
        </TouchableOpacity>
      </ScrollView>

      <CustomDialog {...dialogState} onClose={hideDialog} />
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.background },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', padding: SPACING.md, borderBottomWidth: 1, borderBottomColor: COLORS.zinc800 },
  headerTitle: { fontSize: FONT_SIZES.lg, fontWeight: 'bold', color: COLORS.textPrimary },
  headerRight: { width: 40 },
  backButton: { padding: 4 },
  content: { flex: 1 },
  contentContainer: { padding: SPACING.md, paddingBottom: 40 },
  sectionTitle: { fontSize: FONT_SIZES.sm, color: COLORS.textSecondary, marginTop: SPACING.md, marginBottom: SPACING.xs },
  imageUploadContainer: { alignSelf: 'center', borderRadius: BORDER_RADIUS.lg, overflow: 'hidden', backgroundColor: COLORS.zinc800, position: 'relative' },
  imagePreview: { width: '100%', height: '100%' },
  placeholderBadge: { position: 'absolute', bottom: 8, left: 8, right: 8, backgroundColor: 'rgba(0,0,0,0.6)', padding: 4, borderRadius: 4 },
  placeholderBadgeText: { color: '#fff', fontSize: 10, textAlign: 'center' },
  autoGenControls: { marginTop: SPACING.md },
  hueCard: { backgroundColor: COLORS.zinc900, padding: SPACING.sm, borderRadius: BORDER_RADIUS.md, marginBottom: SPACING.sm },
  hueText: { color: COLORS.textSecondary, fontSize: 10, marginBottom: 4 },
  slider: { width: '100%', height: 30 },
  styleButton: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', padding: 8, borderRadius: 8, gap: 8 },
  styleButtonText: { fontSize: 12, fontWeight: '600' },
  stylePicker: { backgroundColor: COLORS.zinc800, borderRadius: 8, marginTop: 8, padding: 4 },
  styleOption: { flexDirection: 'row', alignItems: 'center', padding: 10, borderRadius: 6, gap: 10 },
  styleOptionText: { fontSize: 14, color: COLORS.textSecondary },
  fileButton: { flexDirection: 'row', alignItems: 'center', padding: SPACING.md, backgroundColor: COLORS.zinc800, borderRadius: BORDER_RADIUS.md, gap: 10 },
  fileButtonSelected: { borderColor: COLORS.zinc600, borderWidth: 1 },
  fileButtonText: { color: COLORS.textMuted, flex: 1 },
  input: { backgroundColor: COLORS.zinc800, borderRadius: BORDER_RADIUS.md, padding: SPACING.sm, color: COLORS.textPrimary, fontSize: 16 },
  albumPicker: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', padding: SPACING.md, backgroundColor: COLORS.zinc800, borderRadius: BORDER_RADIUS.md, marginTop: SPACING.md },
  albumPickerText: { color: COLORS.textMuted },
  albumsList: { backgroundColor: COLORS.zinc900, marginTop: 4, borderRadius: 8, maxHeight: 150 },
  albumItem: { flexDirection: 'row', alignItems: 'center', padding: 12, borderBottomWidth: 1, borderBottomColor: COLORS.zinc800, gap: 10 },
  albumItemText: { color: COLORS.textSecondary, fontSize: 14 },
  submitButton: { marginTop: 30, padding: 16, borderRadius: 12, alignItems: 'center' },
  submitText: { color: '#fff', fontWeight: 'bold', fontSize: 16 },
  disabled: { opacity: 0.6 },
  row: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  hiddenVideo: { width: 0, height: 0, position: 'absolute', opacity: 0 },
});

export default UploadSongScreen;
