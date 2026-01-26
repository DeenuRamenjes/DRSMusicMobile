import React, { useState, useEffect, useRef } from 'react';
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
import { useNavigation, useRoute, RouteProp } from '@react-navigation/native';
import { pick, types } from '@react-native-documents/picker';
import { COLORS, SPACING, FONT_SIZES, BORDER_RADIUS } from '../constants/theme';
import { useThemeStore } from '../store/useThemeStore';
import { useMusicStore } from '../store/useMusicStore';
import { uploadWithFetch } from '../api/axios';
import { Song } from '../types';
import { getFullImageUrl } from '../config';
import { CustomDialog, useDialog } from '../components/CustomDialog';
import { formatDuration } from '../utils/duration';
import Slider from '@react-native-community/slider';
import ViewShot from 'react-native-view-shot';
import { ArtworkPreview } from '../components/ArtworkPreview';
import { CanvasStyleType, CANVAS_STYLES, ArtworkData } from '../constants/artworkConstants';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

type EditSongRouteParams = {
  EditSong: { song: Song };
};

export const EditSongScreen = () => {
  const navigation = useNavigation();
  const route = useRoute<RouteProp<EditSongRouteParams, 'EditSong'>>();
  const { song } = route.params;

  const { colors: themeColors } = useThemeStore();
  const { fetchSongs, albums, fetchAlbums } = useMusicStore();
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

  // Artwork state
  const [selectedCanvasStyle, setSelectedCanvasStyle] = useState<CanvasStyleType>('gradient');
  const [baseHue, setBaseHue] = useState(Math.floor(Math.random() * 360));
  const [showStylePicker, setShowStylePicker] = useState(false);
  const [useAutoGenCover, setUseAutoGenCover] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const viewShotRef = useRef<ViewShot>(null);

  // Artwork data for preview
  const artworkData: ArtworkData = {
    title: editedSong.title || 'New Track',
    artist: editedSong.artist || 'Unknown Artist',
    style: selectedCanvasStyle,
    baseHue: baseHue,
  };

  useEffect(() => {
    fetchAlbums();
  }, []);

  const selectImageFile = async () => {
    try {
      const result = await pick({ type: [types.images] });
      if (result && result.length > 0) {
        const file = result[0];
        setImageFile({
          uri: file.uri,
          name: file.name || 'image.jpg',
          type: file.type || 'image/jpeg',
        });
        setImagePreview(file.uri);
        setUseAutoGenCover(false);
      }
    } catch (err: any) {
      if (err?.code !== 'DOCUMENT_PICKER_CANCELED') {
        showError('Error', 'Failed to select image file');
      }
    }
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
    if (!editedSong.title.trim() || !editedSong.artist.trim()) {
      showError('Error', 'Please enter title and artist');
      return;
    }

    setIsLoading(true);
    setUploadProgress(0);
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
      } else if (useAutoGenCover && viewShotRef.current) {
        const uri = await viewShotRef.current.capture?.();
        if (uri) {
          formData.append('imageFile', {
            uri: uri,
            name: 'cover.jpg',
            type: 'image/jpeg',
          } as any);
        }
      }

      await uploadWithFetch(`/admin/songs/${song._id}`, formData, (progress) => {
        setUploadProgress(progress);
      }, 'PATCH');

      fetchSongs();
      showSuccess('Success', 'Song updated successfully', () => navigation.goBack());
    } catch (error: any) {
      console.error('Update error:', error);
      showError('Error', error.response?.data?.message || 'Failed to update song');
    } finally {
      setIsLoading(false);
      setUploadProgress(0);
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
      editedSong.duration !== String(song.duration) ||
      albumsChanged ||
      imageFile !== null ||
      useAutoGenCover
    );
  };

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

      <ScrollView style={styles.content} contentContainerStyle={styles.contentContainer}>
        {/* Cover Section */}
        <Text style={styles.sectionTitle}>Cover Art</Text>
        <TouchableOpacity style={styles.imageUploadContainer} onPress={selectImageFile}>
          {imagePreview && !useAutoGenCover ? (
            <Image source={{ uri: imagePreview }} style={styles.imagePreview} />
          ) : (
            <ArtworkPreview ref={viewShotRef} data={artworkData} size={SCREEN_WIDTH - SPACING.md * 2} />
          )}
          {useAutoGenCover && (
            <View style={styles.placeholderBadge}>
              <Text style={styles.placeholderBadgeText}>New Generated Cover</Text>
            </View>
          )}
          <View style={styles.cameraBadge}>
            <Icon name="camera" size={14} color="#fff" />
          </View>
        </TouchableOpacity>

        {!imageFile && !useAutoGenCover && (
          <TouchableOpacity
            style={[styles.autoGenButton, { backgroundColor: themeColors.primaryMuted, marginTop: 12 }]}
            onPress={() => setUseAutoGenCover(true)}
          >
            <Icon name="refresh-cw" size={16} color={themeColors.primary} />
            <Text style={[styles.autoGenText, { color: themeColors.primary }]}>Generate New Cover</Text>
          </TouchableOpacity>
        )}

        {useAutoGenCover && (
          <View style={styles.autoGenControls}>
            <View style={styles.hueCard}>
              <Text style={styles.hueLabel}>Theme Color</Text>
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
            <View style={styles.row}>
              <TouchableOpacity
                style={[styles.controlButton, { backgroundColor: themeColors.primaryMuted, flex: 1 }]}
                onPress={() => setShowStylePicker(!showStylePicker)}
              >
                <Icon name="layers" size={16} color={themeColors.primary} />
                <Text style={[styles.controlText, { color: themeColors.primary }]}>
                  {CANVAS_STYLES.find(s => s.id === selectedCanvasStyle)?.name} Style
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.controlButton, { backgroundColor: COLORS.zinc800 }]}
                onPress={() => setUseAutoGenCover(false)}
              >
                <Icon name="x" size={16} color={COLORS.textMuted} />
              </TouchableOpacity>
            </View>
          </View>
        )}

        {showStylePicker && useAutoGenCover && (
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
        <Text style={styles.sectionTitle}>Title</Text>
        <TextInput
          style={styles.input}
          value={editedSong.title}
          onChangeText={t => setEditedSong(p => ({ ...p, title: t }))}
        />

        <Text style={styles.sectionTitle}>Artist</Text>
        <TextInput
          style={styles.input}
          value={editedSong.artist}
          onChangeText={t => setEditedSong(p => ({ ...p, artist: t }))}
        />

        <Text style={styles.sectionTitle}>Duration (seconds)</Text>
        <View style={styles.durationRow}>
          <TextInput
            style={[styles.input, { flex: 1 }]}
            keyboardType="numeric"
            value={editedSong.duration}
            onChangeText={t => setEditedSong(p => ({ ...p, duration: t }))}
          />
          <View style={styles.durationPreview}>
            <Text style={styles.durationText}>{formatDuration(parseInt(editedSong.duration) || 0)}</Text>
          </View>
        </View>

        {/* Albums */}
        <TouchableOpacity style={styles.albumPicker} onPress={() => setShowAlbumPicker(!showAlbumPicker)}>
          <Text style={styles.albumPickerText}>
            {editedSong.albumIds.length === 0 ? 'No albums selected' : `${editedSong.albumIds.length} albums selected`}
          </Text>
          <Icon name={showAlbumPicker ? 'chevron-up' : 'chevron-down'} size={20} color={COLORS.textMuted} />
        </TouchableOpacity>

        {showAlbumPicker && (
          <View style={styles.albumsList}>
            {albums.map(a => (
              <TouchableOpacity key={a._id} style={styles.albumItem} onPress={() => toggleAlbum(a._id)}>
                <Icon name={editedSong.albumIds.includes(a._id) ? 'check-square' : 'square'} size={18} color={themeColors.primary} />
                <Text style={styles.albumItemText}>{a.title}</Text>
              </TouchableOpacity>
            ))}
          </View>
        )}

        {/* Submit */}
        <TouchableOpacity
          style={[styles.submitButton, { backgroundColor: themeColors.primary }, (isLoading || !hasChanges()) && styles.disabled]}
          onPress={handleSubmit}
          disabled={isLoading || !hasChanges()}
        >
          {isLoading ? (
            <View style={styles.row}>
              <ActivityIndicator color="#fff" />
              <Text style={styles.submitText}>Saving {uploadProgress}%</Text>
            </View>
          ) : (
            <Text style={styles.submitText}>Save Changes</Text>
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
  imageUploadContainer: { width: '100%', aspectRatio: 1, borderRadius: BORDER_RADIUS.lg, overflow: 'hidden', backgroundColor: COLORS.zinc800, position: 'relative' },
  imagePreview: { width: '100%', height: '100%' },
  cameraBadge: { position: 'absolute', bottom: 12, right: 12, width: 32, height: 32, borderRadius: 16, backgroundColor: 'rgba(0,0,0,0.6)', alignItems: 'center', justifyContent: 'center' },
  placeholderBadge: { position: 'absolute', bottom: 50, left: 12, right: 12, backgroundColor: 'rgba(0,0,0,0.6)', padding: 4, borderRadius: 4 },
  placeholderBadgeText: { color: '#fff', fontSize: 10, textAlign: 'center' },
  autoGenControls: { marginTop: 12 },
  hueCard: { backgroundColor: COLORS.zinc900, padding: 8, borderRadius: 8, marginBottom: 8 },
  hueLabel: { color: COLORS.textSecondary, fontSize: 10, marginBottom: 4 },
  slider: { width: '100%', height: 30 },
  autoGenButton: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', padding: 10, borderRadius: 8, gap: 8 },
  autoGenText: { fontSize: 12, fontWeight: '600' },
  row: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  controlButton: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', padding: 10, borderRadius: 8, gap: 8 },
  controlText: { fontSize: 12, fontWeight: '600' },
  stylePicker: { backgroundColor: COLORS.zinc800, borderRadius: 8, marginTop: 8, padding: 4 },
  styleOption: { flexDirection: 'row', alignItems: 'center', padding: 10, borderRadius: 6, gap: 10 },
  styleOptionText: { fontSize: 14, color: COLORS.textSecondary },
  input: { backgroundColor: COLORS.zinc800, borderRadius: 8, padding: 12, color: COLORS.textPrimary, fontSize: 16 },
  durationRow: { flexDirection: 'row', gap: 10 },
  durationPreview: { backgroundColor: COLORS.zinc800, paddingHorizontal: 16, justifyContent: 'center', borderRadius: 8 },
  durationText: { color: COLORS.textSecondary },
  albumPicker: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', padding: 16, backgroundColor: COLORS.zinc800, borderRadius: 8, marginTop: 16 },
  albumPickerText: { color: COLORS.textMuted },
  albumsList: { backgroundColor: COLORS.zinc900, marginTop: 4, borderRadius: 8, maxHeight: 150 },
  albumItem: { flexDirection: 'row', alignItems: 'center', padding: 12, borderBottomWidth: 1, borderBottomColor: COLORS.zinc800, gap: 10 },
  albumItemText: { color: COLORS.textSecondary, fontSize: 14 },
  submitButton: { marginTop: 30, padding: 16, borderRadius: 12, alignItems: 'center' },
  submitText: { color: '#fff', fontWeight: 'bold', fontSize: 16 },
  disabled: { opacity: 0.6 },
});

export default EditSongScreen;
