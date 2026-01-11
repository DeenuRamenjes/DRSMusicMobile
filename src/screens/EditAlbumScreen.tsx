import React, { useState, useEffect, useMemo } from 'react';
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
  Modal,
  FlatList,
  Dimensions,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Icon from 'react-native-vector-icons/Feather';
import { useNavigation, useRoute, RouteProp } from '@react-navigation/native';
import { pick, types } from '@react-native-documents/picker';
import { COLORS, SPACING, FONT_SIZES, BORDER_RADIUS } from '../constants/theme';
import { useThemeStore } from '../store/useThemeStore';
import { useMusicStore } from '../store/useMusicStore';
import { Album, Song } from '../types';
import { getFullImageUrl } from '../config';
import { CustomDialog, useDialog } from '../components/CustomDialog';
import { formatDuration } from '../utils/duration';
import { usePlayerStore } from '../store/usePlayerStore';


const { width: SCREEN_WIDTH } = Dimensions.get('window');
const IMAGE_SIZE = Math.min(SCREEN_WIDTH * 0.45, 180);

type EditAlbumRouteParams = {
  EditAlbum: { album: Album };
};

// Normalize song IDs from album.songs (can be Song objects or string IDs)
const normalizeSongIds = (songs: any[]): string[] => {
  if (!songs?.length) return [];
  return songs.map((song) => (typeof song === 'string' ? song : song._id));
};

export const EditAlbumScreen = () => {
  const navigation = useNavigation();
  const route = useRoute<RouteProp<EditAlbumRouteParams, 'EditAlbum'>>();
  const { album } = route.params;

  const { colors: themeColors } = useThemeStore();
  const { updateAlbum, fetchAlbums, songs, fetchSongs, assignSongsToAlbum, isLoading: storeLoading } = useMusicStore();
  const { dialogState, hideDialog, showSuccess, showError } = useDialog();
  const { currentSong, isPlaying, playSong, pauseSong } = usePlayerStore();


  const [isLoading, setIsLoading] = useState(false);
  const [editedAlbum, setEditedAlbum] = useState({
    title: album.title,
    artist: album.artist,
    releaseYear: album.releaseYear?.toString() || new Date().getFullYear().toString(),
  });

  const [imageFile, setImageFile] = useState<{ uri: string; name: string; type: string } | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(getFullImageUrl(album.imageUrl));

  // Song management state
  const [showSongPicker, setShowSongPicker] = useState(false);
  const [songSearch, setSongSearch] = useState('');
  const [selectedSongIds, setSelectedSongIds] = useState<string[]>(normalizeSongIds(album.songs || []));
  const [isSavingSongs, setIsSavingSongs] = useState(false);

  // Fetch songs when picker opens
  useEffect(() => {
    if (showSongPicker && songs.length === 0) {
      fetchSongs();
    }
  }, [showSongPicker, songs.length]);

  // Filter songs for search
  const filteredSongs = useMemo(() => {
    const term = songSearch.trim().toLowerCase();
    if (!term) return songs;
    return songs.filter(
      (song) =>
        song.title.toLowerCase().includes(term) ||
        song.artist.toLowerCase().includes(term)
    );
  }, [songs, songSearch]);

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

  const toggleSong = (songId: string) => {
    setSelectedSongIds((prev) =>
      prev.includes(songId) ? prev.filter((id) => id !== songId) : [...prev, songId]
    );
  };

  const handleSaveSongs = async () => {
    setIsSavingSongs(true);
    try {
      await assignSongsToAlbum(album._id, selectedSongIds);
      setShowSongPicker(false);
      showSuccess('Success', 'Songs updated successfully');
    } catch (error: any) {
      showError('Error', error.response?.data?.message || 'Failed to update songs');
    } finally {
      setIsSavingSongs(false);
    }
  };

  const handleSubmit = async () => {
    if (!editedAlbum.title.trim()) {
      showError('Error', 'Please enter an album title');
      return;
    }
    if (!editedAlbum.artist.trim()) {
      showError('Error', 'Please enter an artist name');
      return;
    }

    setIsLoading(true);
    try {
      const formData = new FormData();
      formData.append('title', editedAlbum.title);
      formData.append('artist', editedAlbum.artist);
      formData.append('releaseYear', editedAlbum.releaseYear);

      if (imageFile) {
        formData.append('imageFile', {
          uri: imageFile.uri,
          name: imageFile.name,
          type: imageFile.type,
        } as any);
      }

      await updateAlbum(album._id, formData);

      fetchAlbums();
      showSuccess('Success', 'Album updated successfully', () => navigation.goBack());
    } catch (error: any) {
      console.error('Error updating album:', error);
      showError('Error', error.response?.data?.message || 'Failed to update album');
    } finally {
      setIsLoading(false);
    }
  };

  const hasChanges = () => {
    return (
      editedAlbum.title !== album.title ||
      editedAlbum.artist !== album.artist ||
      editedAlbum.releaseYear !== (album.releaseYear?.toString() || '') ||
      imageFile !== null
    );
  };

  const handleTogglePlay = (song: Song) => {
    if (currentSong?._id === song._id) {
      if (isPlaying) {
        pauseSong();
      } else {
        playSong(song);
      }
    } else {
      playSong(song);
    }
  };


  const renderSongItem = ({ item: song }: { item: Song }) => {
    const isSelected = selectedSongIds.includes(song._id);
    const isCurrentSong = currentSong?._id === song._id;
    const isThisPlaying = isCurrentSong && isPlaying;

    return (
      <View style={[
        styles.songItemContainer,
        isSelected && { backgroundColor: themeColors.primaryMuted, borderColor: themeColors.primary + '50' }
      ]}>
        <TouchableOpacity
          style={styles.songItemContent}
          onPress={() => toggleSong(song._id)}
          activeOpacity={0.7}
        >
          <View style={[styles.checkbox, isSelected && { borderColor: themeColors.primary, backgroundColor: themeColors.primary }]}>
            {isSelected && <Icon name="check" size={12} color="#fff" />}
          </View>

          <View style={styles.songItemImageContainer}>
            <Image
              source={{ uri: getFullImageUrl(song.imageUrl) }}
              style={[styles.songItemImage, isCurrentSong && { borderColor: themeColors.primary, borderWidth: 1 }]}
            />
            <TouchableOpacity
              style={styles.songItemPlayOverlay}
              onPress={() => handleTogglePlay(song)}
              activeOpacity={0.8}
            >
              <Icon
                name={isThisPlaying ? "pause" : "play"}
                size={14}
                color="#fff"
              />
            </TouchableOpacity>
          </View>

          <View style={styles.songItemInfo}>
            <Text style={[styles.songItemTitle, isCurrentSong && { color: themeColors.primary }]} numberOfLines={1}>{song.title}</Text>
            <Text style={styles.songItemArtist} numberOfLines={1}>{song.artist}</Text>
          </View>
          <Text style={styles.songItemDuration}>{formatDuration(song.duration)}</Text>
        </TouchableOpacity>
      </View>
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
        <Text style={styles.headerTitle}>Edit Album</Text>
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
        <Text style={styles.sectionTitle}>Album Title</Text>
        <TextInput
          style={styles.textInput}
          placeholder="Album title"
          placeholderTextColor={COLORS.textMuted}
          value={editedAlbum.title}
          onChangeText={(text) => setEditedAlbum(prev => ({ ...prev, title: text }))}
        />

        {/* Artist Input */}
        <Text style={styles.sectionTitle}>Artist</Text>
        <TextInput
          style={styles.textInput}
          placeholder="Artist name"
          placeholderTextColor={COLORS.textMuted}
          value={editedAlbum.artist}
          onChangeText={(text) => setEditedAlbum(prev => ({ ...prev, artist: text }))}
        />

        {/* Release Year Input */}
        <Text style={styles.sectionTitle}>Release Year</Text>
        <TextInput
          style={styles.textInput}
          placeholder="Release year"
          placeholderTextColor={COLORS.textMuted}
          keyboardType="numeric"
          value={editedAlbum.releaseYear}
          onChangeText={(text) => setEditedAlbum(prev => ({ ...prev, releaseYear: text }))}
          maxLength={4}
        />

        {/* Songs Management Section */}
        <View style={styles.songsSection}>
          <View style={styles.songsSectionHeader}>
            <Text style={styles.sectionTitle}>Songs in Album</Text>
            <TouchableOpacity
              style={[styles.manageSongsButton, { backgroundColor: themeColors.primaryMuted }]}
              onPress={() => setShowSongPicker(true)}
            >
              <Icon name="plus" size={16} color={themeColors.primary} />
              <Text style={[styles.manageSongsButtonText, { color: themeColors.primary }]}>
                Manage Songs
              </Text>
            </TouchableOpacity>
          </View>

          <View style={styles.songCountBox}>
            <Icon name="music" size={18} color={themeColors.primary} />
            <Text style={styles.songCountText}>
              {selectedSongIds.length} {selectedSongIds.length === 1 ? 'song' : 'songs'} in this album
            </Text>
          </View>
        </View>

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

      {/* Song Picker Modal */}
      <Modal
        visible={showSongPicker}
        animationType="slide"
        presentationStyle="pageSheet"
        onRequestClose={() => setShowSongPicker(false)}
      >
        <SafeAreaView style={styles.modalContainer}>
          {/* Modal Header */}
          <View style={styles.modalHeader}>
            <TouchableOpacity onPress={() => setShowSongPicker(false)}>
              <Icon name="x" size={24} color={COLORS.textPrimary} />
            </TouchableOpacity>
            <Text style={styles.modalTitle}>Manage Songs</Text>
            <View style={{ width: 24 }} />
          </View>

          {/* Search Bar */}
          <View style={styles.modalSearchContainer}>
            <Icon name="search" size={18} color={COLORS.textMuted} />
            <TextInput
              style={styles.modalSearchInput}
              placeholder="Search songs by title or artist"
              placeholderTextColor={COLORS.textMuted}
              value={songSearch}
              onChangeText={setSongSearch}
            />
            {songSearch.length > 0 && (
              <TouchableOpacity onPress={() => setSongSearch('')}>
                <Icon name="x" size={18} color={COLORS.textMuted} />
              </TouchableOpacity>
            )}
          </View>

          {/* Selection Info */}
          <View style={styles.selectionInfo}>
            <Text style={styles.selectionInfoText}>
              {selectedSongIds.length} song{selectedSongIds.length === 1 ? '' : 's'} selected
            </Text>
            {selectedSongIds.length > 0 && (
              <TouchableOpacity onPress={() => setSelectedSongIds([])}>
                <Text style={[styles.clearAllText, { color: themeColors.primary }]}>Clear All</Text>
              </TouchableOpacity>
            )}
          </View>

          {/* Song List */}
          {storeLoading && songs.length === 0 ? (
            <View style={styles.loadingContainer}>
              <ActivityIndicator size="large" color={themeColors.primary} />
              <Text style={styles.loadingText}>Loading songs...</Text>
            </View>
          ) : filteredSongs.length === 0 ? (
            <View style={styles.emptyContainer}>
              <Icon name="music" size={48} color={COLORS.zinc700} />
              <Text style={styles.emptyText}>No songs found</Text>
            </View>
          ) : (
            <FlatList
              data={filteredSongs}
              renderItem={renderSongItem}
              keyExtractor={(item) => item._id}
              contentContainerStyle={styles.songList}
              showsVerticalScrollIndicator={false}
            />
          )}

          {/* Modal Footer */}
          <View style={styles.modalFooter}>
            <TouchableOpacity
              style={styles.modalCancelButton}
              onPress={() => setShowSongPicker(false)}
            >
              <Text style={styles.modalCancelText}>Cancel</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[
                styles.modalSaveButton,
                { backgroundColor: themeColors.primary },
                isSavingSongs && styles.modalSaveButtonDisabled,
              ]}
              onPress={handleSaveSongs}
              disabled={isSavingSongs}
            >
              {isSavingSongs ? (
                <ActivityIndicator size="small" color="#fff" />
              ) : (
                <Text style={styles.modalSaveText}>Save</Text>
              )}
            </TouchableOpacity>
          </View>
        </SafeAreaView>
      </Modal>

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
  songsSection: {
    marginTop: SPACING.lg,
  },
  songsSectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  manageSongsButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: SPACING.sm,
    paddingVertical: SPACING.xs,
    borderRadius: BORDER_RADIUS.md,
    gap: SPACING.xs,
  },
  manageSongsButtonText: {
    fontSize: FONT_SIZES.sm,
    fontWeight: '500',
  },
  songCountBox: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: SPACING.md,
    backgroundColor: COLORS.zinc900,
    borderRadius: BORDER_RADIUS.md,
    marginTop: SPACING.sm,
    gap: SPACING.sm,
  },
  songCountText: {
    flex: 1,
    fontSize: FONT_SIZES.md,
    color: COLORS.textSecondary,
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
  // Modal styles
  modalContainer: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.sm,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.zinc800,
  },
  modalTitle: {
    fontSize: FONT_SIZES.lg,
    fontWeight: '600',
    color: COLORS.textPrimary,
  },
  modalSearchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.zinc800,
    borderRadius: BORDER_RADIUS.lg,
    marginHorizontal: SPACING.md,
    marginTop: SPACING.md,
    paddingHorizontal: SPACING.sm,
    gap: SPACING.xs,
  },
  modalSearchInput: {
    flex: 1,
    paddingVertical: SPACING.sm,
    color: COLORS.textPrimary,
    fontSize: FONT_SIZES.md,
  },
  selectionInfo: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.sm,
  },
  selectionInfoText: {
    fontSize: FONT_SIZES.sm,
    color: COLORS.textMuted,
  },
  clearAllText: {
    fontSize: FONT_SIZES.sm,
    fontWeight: '500',
  },
  loadingContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  loadingText: {
    color: COLORS.textMuted,
    marginTop: SPACING.sm,
  },
  emptyContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  emptyText: {
    color: COLORS.textMuted,
    marginTop: SPACING.sm,
  },
  songList: {
    padding: SPACING.md,
    paddingBottom: 100,
  },
  songItemContainer: {
    backgroundColor: COLORS.zinc900,
    borderRadius: BORDER_RADIUS.md,
    marginBottom: SPACING.xs,
    borderWidth: 1,
    borderColor: 'transparent',
    overflow: 'hidden',
  },
  songItemContent: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: SPACING.sm,
    gap: SPACING.sm,
  },
  checkbox: {
    width: 22,
    height: 22,
    borderRadius: 4,
    borderWidth: 2,
    borderColor: COLORS.zinc600,
    alignItems: 'center',
    justifyContent: 'center',
  },
  songItemImageContainer: {
    position: 'relative',
    width: 44,
    height: 44,
  },
  songItemImage: {
    width: 44,
    height: 44,
    borderRadius: BORDER_RADIUS.sm,
  },
  songItemPlayOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0,0,0,0.3)',
    borderRadius: BORDER_RADIUS.sm,
    justifyContent: 'center',
    alignItems: 'center',
  },
  songItemInfo: {
    flex: 1,
  },
  songItemTitle: {
    fontSize: FONT_SIZES.md,
    fontWeight: '500',
    color: COLORS.textPrimary,
  },
  songItemArtist: {
    fontSize: FONT_SIZES.sm,
    color: COLORS.textMuted,
    marginTop: 2,
  },
  songItemDuration: {
    fontSize: FONT_SIZES.xs,
    color: COLORS.textMuted,
  },
  modalFooter: {
    flexDirection: 'row',
    padding: SPACING.md,
    borderTopWidth: 1,
    borderTopColor: COLORS.zinc800,
    gap: SPACING.sm,
  },
  modalCancelButton: {
    flex: 1,
    padding: SPACING.sm,
    borderRadius: BORDER_RADIUS.md,
    backgroundColor: COLORS.zinc800,
    alignItems: 'center',
  },
  modalCancelText: {
    fontSize: FONT_SIZES.md,
    fontWeight: '500',
    color: COLORS.textSecondary,
  },
  modalSaveButton: {
    flex: 1,
    padding: SPACING.sm,
    borderRadius: BORDER_RADIUS.md,
    alignItems: 'center',
  },
  modalSaveButtonDisabled: {
    opacity: 0.7,
  },
  modalSaveText: {
    fontSize: FONT_SIZES.md,
    fontWeight: '600',
    color: '#fff',
  },
});

export default EditAlbumScreen;
