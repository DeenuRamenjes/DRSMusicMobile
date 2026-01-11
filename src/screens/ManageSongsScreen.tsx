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
  Modal,
  Image,
  FlatList,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Icon from 'react-native-vector-icons/Feather';
import { useNavigation } from '@react-navigation/native';
import { COLORS, SPACING, FONT_SIZES, BORDER_RADIUS } from '../constants/theme';
import { useThemeStore } from '../store/useThemeStore';
import { useMusicStore } from '../store/useMusicStore';
import { Song } from '../types';
import { getFullImageUrl } from '../config';
import { CustomDialog, useDialog } from '../components/CustomDialog';
import { formatDuration } from '../utils/duration';
import { usePlayerStore } from '../store/usePlayerStore';


export const ManageSongsScreen = () => {
  const navigation = useNavigation();
  const { colors: themeColors } = useThemeStore();
  const { songs, fetchSongs, deleteSong, isLoading, error } = useMusicStore();
  const { dialogState, hideDialog, showSuccess, showError } = useDialog();
  const { currentSong, isPlaying, playSong, pauseSong } = usePlayerStore();


  const [searchTerm, setSearchTerm] = useState('');
  const [pendingDelete, setPendingDelete] = useState<{ id: string; title: string } | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  // Fetch songs on mount
  useEffect(() => {
    fetchSongs();
  }, []);

  // Filtered songs based on search
  const filteredSongs = useMemo(() => {
    const term = searchTerm.trim().toLowerCase();
    if (!term) return songs;
    return songs.filter(
      (song) =>
        song.title.toLowerCase().includes(term) ||
        song.artist.toLowerCase().includes(term)
    );
  }, [songs, searchTerm]);

  const handleDeleteSong = async () => {
    if (!pendingDelete) return;
    setIsDeleting(true);
    try {
      await deleteSong(pendingDelete.id);
      setPendingDelete(null);
      showSuccess('Success', 'Song deleted successfully');
    } catch (error: any) {
      showError('Error', error.response?.data?.message || 'Failed to delete song');
    } finally {
      setIsDeleting(false);
    }
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
    const isCurrentSong = currentSong?._id === song._id;
    const isThisPlaying = isCurrentSong && isPlaying;

    return (
      <View style={styles.songCard}>
        <TouchableOpacity
          style={styles.imageContainer}
          onPress={() => handleTogglePlay(song)}
          activeOpacity={0.8}
        >
          <Image
            source={{ uri: getFullImageUrl(song.imageUrl) }}
            style={[styles.songImage, isCurrentSong && { borderColor: themeColors.primary, borderWidth: 2 }]}
          />
          <View style={styles.playOverlay}>
            <Icon
              name={isThisPlaying ? "pause" : "play"}
              size={20}
              color="#fff"
            />
          </View>
        </TouchableOpacity>
        <View style={styles.songInfo}>
          <Text style={[styles.songTitle, isCurrentSong && { color: themeColors.primary }]} numberOfLines={1}>
            {song.title}
          </Text>
          <Text style={styles.songArtist} numberOfLines={1}>
            {song.artist}
          </Text>
          <Text style={styles.songDuration}>
            {formatDuration(song.duration)}
          </Text>
        </View>

        <View style={styles.songActions}>
          <TouchableOpacity
            style={[styles.actionButton, { backgroundColor: themeColors.primaryMuted }]}
            onPress={() => (navigation as any).navigate('EditSong', { song })}
          >
            <Icon name="edit-2" size={16} color={themeColors.primary} />
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.actionButton, styles.deleteButton]}
            onPress={() => setPendingDelete({ id: song._id, title: song.title })}
          >
            <Icon name="trash-2" size={16} color="#ef4444" />
          </TouchableOpacity>
        </View>
      </View>
    );
  };

  if (isLoading && songs.length === 0) {
    return (
      <SafeAreaView style={styles.container} edges={['top']}>
        <StatusBar barStyle="light-content" backgroundColor={COLORS.background} />
        <View style={styles.header}>
          <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
            <Icon name="arrow-left" size={24} color={COLORS.textPrimary} />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Manage Songs</Text>
          <View style={styles.headerRight} />
        </View>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={themeColors.primary} />
          <Text style={styles.loadingText}>Loading songs...</Text>
        </View>
      </SafeAreaView>
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
        <Text style={styles.headerTitle}>Manage Songs</Text>
        <TouchableOpacity
          onPress={() => (navigation as any).navigate('UploadSong')}
          style={[styles.addButton, { backgroundColor: themeColors.primary }]}
        >
          <Icon name="plus" size={20} color={COLORS.textPrimary} />
        </TouchableOpacity>
      </View>

      {/* Search Bar */}
      <View style={styles.searchContainer}>
        <View style={styles.searchInputContainer}>
          <Icon name="search" size={18} color={COLORS.textMuted} style={styles.searchIcon} />
          <TextInput
            style={styles.searchInput}
            placeholder="Search by title or artist..."
            placeholderTextColor={COLORS.textMuted}
            value={searchTerm}
            onChangeText={setSearchTerm}
          />
          {searchTerm.length > 0 && (
            <TouchableOpacity onPress={() => setSearchTerm('')}>
              <Icon name="x" size={18} color={COLORS.textMuted} />
            </TouchableOpacity>
          )}
        </View>
      </View>

      {/* Song Count */}
      <View style={styles.countContainer}>
        <Text style={styles.countText}>
          {filteredSongs.length} {filteredSongs.length === 1 ? 'song' : 'songs'}
          {searchTerm && ` matching "${searchTerm}"`}
        </Text>
        <TouchableOpacity onPress={() => fetchSongs()}>
          <Icon name="refresh-cw" size={16} color={COLORS.textMuted} />
        </TouchableOpacity>
      </View>

      {/* Songs List */}
      {filteredSongs.length === 0 ? (
        <View style={styles.emptyContainer}>
          <Icon name="music" size={48} color={COLORS.zinc700} />
          <Text style={styles.emptyTitle}>
            {searchTerm ? 'No songs found' : 'No songs yet'}
          </Text>
          <Text style={styles.emptySubtitle}>
            {searchTerm
              ? `No songs matching "${searchTerm}"`
              : 'Tap the + button to upload your first song'
            }
          </Text>
        </View>
      ) : (
        <FlatList
          data={filteredSongs}
          renderItem={renderSongItem}
          keyExtractor={(item) => item._id}
          contentContainerStyle={styles.listContainer}
          showsVerticalScrollIndicator={false}
        />
      )}

      {/* Delete Confirmation Modal */}
      <Modal
        visible={!!pendingDelete}
        transparent
        animationType="fade"
        onRequestClose={() => !isDeleting && setPendingDelete(null)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContainer}>
            <View style={styles.modalIconContainer}>
              <Icon name="trash-2" size={24} color="#ef4444" />
            </View>
            <Text style={styles.modalTitle}>Delete Song?</Text>
            <Text style={styles.modalMessage}>
              <Text style={styles.modalSongTitle}>"{pendingDelete?.title}"</Text>
              {' '}will be permanently removed. This action cannot be undone.
            </Text>
            <View style={styles.modalActions}>
              <TouchableOpacity
                style={styles.modalCancelButton}
                onPress={() => setPendingDelete(null)}
                disabled={isDeleting}
              >
                <Text style={styles.modalCancelText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.modalDeleteButton, isDeleting && styles.modalDeleteButtonDisabled]}
                onPress={handleDeleteSong}
                disabled={isDeleting}
              >
                {isDeleting ? (
                  <ActivityIndicator size="small" color="#fff" />
                ) : (
                  <Text style={styles.modalDeleteText}>Delete</Text>
                )}
              </TouchableOpacity>
            </View>
          </View>
        </View>
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
  addButton: {
    width: 36,
    height: 36,
    borderRadius: BORDER_RADIUS.md,
    alignItems: 'center',
    justifyContent: 'center',
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
  searchContainer: {
    padding: SPACING.md,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.zinc800,
  },
  searchInputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.zinc800,
    borderRadius: BORDER_RADIUS.lg,
    paddingHorizontal: SPACING.sm,
  },
  searchIcon: {
    marginRight: SPACING.xs,
  },
  searchInput: {
    flex: 1,
    paddingVertical: SPACING.sm,
    color: COLORS.textPrimary,
    fontSize: FONT_SIZES.md,
  },
  countContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.sm,
  },
  countText: {
    fontSize: FONT_SIZES.sm,
    color: COLORS.textMuted,
  },
  listContainer: {
    padding: SPACING.md,
    paddingBottom: SPACING.xxl,
  },
  songCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.zinc900,
    borderRadius: BORDER_RADIUS.lg,
    padding: SPACING.sm,
    marginBottom: SPACING.sm,
  },
  songImage: {
    width: 56,
    height: 56,
    borderRadius: BORDER_RADIUS.md,
  },
  imageContainer: {
    position: 'relative',
    width: 56,
    height: 56,
  },
  playOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0,0,0,0.3)',
    borderRadius: BORDER_RADIUS.md,
    justifyContent: 'center',
    alignItems: 'center',
  },
  songInfo: {
    flex: 1,
    marginLeft: SPACING.sm,
  },
  songTitle: {
    fontSize: FONT_SIZES.md,
    fontWeight: '500',
    color: COLORS.textPrimary,
  },
  songArtist: {
    fontSize: FONT_SIZES.sm,
    color: COLORS.textSecondary,
    marginTop: 2,
  },
  songDuration: {
    fontSize: FONT_SIZES.xs,
    color: COLORS.textMuted,
    marginTop: 2,
  },
  songActions: {
    flexDirection: 'row',
    gap: SPACING.xs,
  },
  actionButton: {
    width: 36,
    height: 36,
    borderRadius: BORDER_RADIUS.md,
    alignItems: 'center',
    justifyContent: 'center',
  },
  deleteButton: {
    backgroundColor: 'rgba(239, 68, 68, 0.1)',
  },
  emptyContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: SPACING.xl,
  },
  emptyTitle: {
    fontSize: FONT_SIZES.lg,
    fontWeight: '600',
    color: COLORS.textPrimary,
    marginTop: SPACING.md,
  },
  emptySubtitle: {
    fontSize: FONT_SIZES.sm,
    color: COLORS.textMuted,
    marginTop: SPACING.xs,
    textAlign: 'center',
  },
  // Modal styles
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: SPACING.md,
  },
  modalContainer: {
    width: '100%',
    maxWidth: 320,
    backgroundColor: COLORS.zinc900,
    borderRadius: BORDER_RADIUS.lg,
    padding: SPACING.lg,
    alignItems: 'center',
  },
  modalIconContainer: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: 'rgba(239, 68, 68, 0.1)',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: SPACING.md,
  },
  modalTitle: {
    fontSize: FONT_SIZES.lg,
    fontWeight: '600',
    color: COLORS.textPrimary,
    marginBottom: SPACING.sm,
  },
  modalMessage: {
    fontSize: FONT_SIZES.sm,
    color: COLORS.textSecondary,
    textAlign: 'center',
    marginBottom: SPACING.lg,
    lineHeight: 20,
  },
  modalSongTitle: {
    fontWeight: '600',
    color: COLORS.textPrimary,
  },
  modalActions: {
    flexDirection: 'row',
    gap: SPACING.sm,
    width: '100%',
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
  modalDeleteButton: {
    flex: 1,
    padding: SPACING.sm,
    borderRadius: BORDER_RADIUS.md,
    backgroundColor: '#ef4444',
    alignItems: 'center',
  },
  modalDeleteButtonDisabled: {
    opacity: 0.7,
  },
  modalDeleteText: {
    fontSize: FONT_SIZES.md,
    fontWeight: '600',
    color: '#fff',
  },
});

export default ManageSongsScreen;
