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
import { COLORS, SPACING, FONT_SIZES, BORDER_RADIUS } from '../constants/theme';
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
      }
    } catch (err: any) {
      if (err?.code !== 'DOCUMENT_PICKER_CANCELED') {
        console.error('Error picking image:', err);
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
      imageFile !== null
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
          ) : (
            <View style={styles.imagePlaceholder}>
              <Icon name="image" size={32} color={COLORS.textMuted} />
              <Text style={styles.uploadText}>Tap to change image</Text>
            </View>
          )}
          <View style={styles.editImageBadge}>
            <Icon name="camera" size={14} color={COLORS.textPrimary} />
          </View>
        </TouchableOpacity>

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
});

export default EditSongScreen;
