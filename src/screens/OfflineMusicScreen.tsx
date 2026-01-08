import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  FlatList,
  Image,
  ActivityIndicator,
  RefreshControl,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import Icon from 'react-native-vector-icons/Feather';
import { COLORS, SPACING, FONT_SIZES, BORDER_RADIUS } from '../constants/theme';
import { useThemeStore } from '../store/useThemeStore';
import { useOfflineMusicStore, formatFileSize, LocalSong } from '../store/useOfflineMusicStore';
import { usePlayerStore } from '../store/usePlayerStore';
import { CustomDialog, useDialog } from '../components/CustomDialog';
import { getFullImageUrl } from '../config';

type TabType = 'downloaded' | 'device';

// Song Item Component
const SongItem = ({
  song,
  themeColor,
  onPlay,
  onDelete,
  showDeleteButton,
  isCurrentSong,
  isPlaying,
}: {
  song: LocalSong;
  themeColor: string;
  onPlay: () => void;
  onDelete?: () => void;
  showDeleteButton: boolean;
  isCurrentSong: boolean;
  isPlaying: boolean;
}) => {
  const showPause = isCurrentSong && isPlaying;

  return (
    <TouchableOpacity style={styles.songItem} onPress={onPlay} activeOpacity={0.7}>
      {/* Album Art */}
      <View style={styles.albumArt}>
        {song.imageUrl ? (
          <Image source={{ uri: getFullImageUrl(song.imageUrl) }} style={styles.albumImage} />
        ) : (
          <View style={[styles.albumPlaceholder, { backgroundColor: themeColor + '30' }]}>
            <Icon name="music" size={24} color={themeColor} />
          </View>
        )}
      </View>

      {/* Song Info */}
      <View style={styles.songInfo}>
        <Text style={[styles.songTitle, isCurrentSong && { color: themeColor }]} numberOfLines={1}>
          {song.title}
        </Text>
        <Text style={styles.songArtist} numberOfLines={1}>
          {song.artist}
        </Text>
        {song.fileSize && (
          <Text style={styles.songSize}>{formatFileSize(song.fileSize)}</Text>
        )}
      </View>

      {/* Actions */}
      <View style={styles.songActions}>
        {showDeleteButton && onDelete && (
          <TouchableOpacity
            style={styles.deleteButton}
            onPress={onDelete}
            hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
          >
            <Icon name="trash-2" size={18} color={COLORS.textMuted} />
          </TouchableOpacity>
        )}
        <TouchableOpacity
          style={[styles.playButton, { backgroundColor: themeColor }]}
          onPress={onPlay}
        >
          <Icon name={showPause ? "pause" : "play"} size={16} color="#fff" style={!showPause && { marginLeft: 2 }} />
        </TouchableOpacity>
      </View>
    </TouchableOpacity>
  );
};

export const OfflineMusicScreen = () => {
  const navigation = useNavigation();
  const { colors: themeColors } = useThemeStore();
  const { dialogState, hideDialog, showConfirm } = useDialog();
  const {
    downloadedSongs,
    deviceSongs,
    isLoading,
    isScanning,
    storageUsed,
    isOfflineMode,
    loadDownloadedSongs,
    scanDeviceMusic,
    deleteSong,
    setOfflineMode,
    clearAllDownloads,
  } = useOfflineMusicStore();
  const { currentSong, isPlaying, pauseSong, playAlbum } = usePlayerStore();

  const [activeTab, setActiveTab] = useState<TabType>('downloaded');
  const [refreshing, setRefreshing] = useState(false);

  useEffect(() => {
    loadDownloadedSongs();
  }, []);

  const handleRefresh = async () => {
    setRefreshing(true);
    if (activeTab === 'downloaded') {
      await loadDownloadedSongs();
    } else {
      await scanDeviceMusic();
    }
    setRefreshing(false);
  };

  const handlePlaySong = (song: LocalSong) => {
    // If it's the same song, toggle play/pause
    if (currentSong?._id === song._id) {
      if (isPlaying) {
        pauseSong();
      } else {
        // Resume playback
        usePlayerStore.getState().resumeSong();
      }
      return;
    }

    // Get all songs from the current tab for the queue
    const currentSongs = activeTab === 'downloaded' ? downloadedSongs : deviceSongs;

    // Prepare all songs with proper file:// URLs
    const queueSongs = currentSongs.map(s => ({
      ...s,
      audioUrl: s.localPath.startsWith('file://') ? s.localPath : `file://${s.localPath}`,
    }));

    // Find the index of the song to play
    const songIndex = queueSongs.findIndex(s => s._id === song._id);

    if (songIndex === -1) {
      console.error('Song not found in list:', song.title);
      return;
    }

    playAlbum(queueSongs as any, songIndex);
  };

  const handleDeleteSong = (song: LocalSong) => {
    showConfirm(
      'Delete Download',
      `Remove "${song.title}" from downloads?`,
      () => deleteSong(song._id),
      'Delete',
      true
    );
  };

  const handleClearAll = () => {
    if (downloadedSongs.length === 0) return;

    showConfirm(
      'Clear All Downloads',
      `This will delete all ${downloadedSongs.length} downloaded songs. Are you sure?`,
      clearAllDownloads,
      'Clear All',
      true
    );
  };

  const handleBack = () => {
    navigation.goBack();
  };

  const songs = activeTab === 'downloaded' ? downloadedSongs : deviceSongs;
  const loading = activeTab === 'downloaded' ? isLoading : isScanning;

  const renderSongItem = ({ item }: { item: LocalSong }) => (
    <SongItem
      song={item}
      themeColor={themeColors.primary}
      onPlay={() => handlePlaySong(item)}
      onDelete={activeTab === 'downloaded' ? () => handleDeleteSong(item) : undefined}
      showDeleteButton={activeTab === 'downloaded'}
      isCurrentSong={currentSong?._id === item._id}
      isPlaying={isPlaying}
    />
  );

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      {/* Header */}
      <View style={[styles.header, { borderBottomColor: themeColors.primaryMuted }]}>
        <TouchableOpacity onPress={handleBack} style={styles.backButton}>
          <Icon name="arrow-left" size={24} color={COLORS.textPrimary} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Offline Music</Text>
        <View style={styles.headerActions}>
          <TouchableOpacity
            style={[styles.offlineToggle, isOfflineMode && { backgroundColor: themeColors.primary }]}
            onPress={() => setOfflineMode(!isOfflineMode)}
          >
            <Icon
              name={isOfflineMode ? 'wifi-off' : 'wifi'}
              size={16}
              color={isOfflineMode ? '#fff' : COLORS.textMuted}
            />
          </TouchableOpacity>
        </View>
      </View>

      {/* Storage Info */}
      <View style={[styles.storageInfo, { backgroundColor: themeColors.primaryMuted }]}>
        <Icon name="hard-drive" size={16} color={themeColors.primary} />
        <Text style={[styles.storageText, { color: themeColors.primary }]}>
          {formatFileSize(storageUsed)} used • {downloadedSongs.length} songs downloaded
        </Text>
        {downloadedSongs.length > 0 && (
          <TouchableOpacity onPress={handleClearAll}>
            <Text style={[styles.clearAllText, { color: themeColors.primary }]}>
              Clear All
            </Text>
          </TouchableOpacity>
        )}
      </View>

      {/* Tabs */}
      <View style={styles.tabContainer}>
        <TouchableOpacity
          style={[styles.tab, activeTab === 'downloaded' && { borderBottomColor: themeColors.primary }]}
          onPress={() => setActiveTab('downloaded')}
        >
          <Icon
            name="download"
            size={16}
            color={activeTab === 'downloaded' ? themeColors.primary : COLORS.textMuted}
          />
          <Text
            style={[
              styles.tabText,
              activeTab === 'downloaded' && { color: themeColors.primary },
            ]}
          >
            Downloads ({downloadedSongs.length})
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.tab, activeTab === 'device' && { borderBottomColor: themeColors.primary }]}
          onPress={() => {
            setActiveTab('device');
            if (deviceSongs.length === 0) {
              scanDeviceMusic();
            }
          }}
        >
          <Icon
            name="smartphone"
            size={16}
            color={activeTab === 'device' ? themeColors.primary : COLORS.textMuted}
          />
          <Text
            style={[styles.tabText, activeTab === 'device' && { color: themeColors.primary }]}
          >
            Device ({deviceSongs.length})
          </Text>
        </TouchableOpacity>
      </View>

      {/* Content */}
      {loading ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={themeColors.primary} />
          <Text style={styles.loadingText}>
            {activeTab === 'downloaded' ? 'Loading downloads...' : 'Scanning device...'}
          </Text>
        </View>
      ) : songs.length === 0 ? (
        <View style={styles.emptyContainer}>
          <Icon
            name={activeTab === 'downloaded' ? 'download-cloud' : 'music'}
            size={64}
            color={COLORS.textMuted}
          />
          <Text style={styles.emptyTitle}>
            {activeTab === 'downloaded' ? 'No Downloads' : 'No Music Found'}
          </Text>
          <Text style={styles.emptyText}>
            {activeTab === 'downloaded'
              ? 'Download songs to listen offline'
              : 'No audio files found on your device'}
          </Text>
          {activeTab === 'device' && (
            <TouchableOpacity
              style={[styles.scanButton, { backgroundColor: themeColors.primary }]}
              onPress={scanDeviceMusic}
            >
              <Icon name="search" size={18} color="#fff" />
              <Text style={styles.scanButtonText}>Scan Again</Text>
            </TouchableOpacity>
          )}
        </View>
      ) : (
        <FlatList
          data={songs}
          keyExtractor={(item) => item._id}
          renderItem={renderSongItem}
          contentContainerStyle={styles.listContent}
          showsVerticalScrollIndicator={false}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={handleRefresh}
              tintColor={themeColors.primary}
              colors={[themeColors.primary]}
            />
          }
        />
      )}

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
    paddingHorizontal: SPACING.sm,
    paddingVertical: SPACING.md,
    borderBottomWidth: 1,
  },
  backButton: {
    padding: SPACING.sm,
  },
  headerTitle: {
    flex: 1,
    fontSize: FONT_SIZES.xl,
    fontWeight: '700',
    color: COLORS.textPrimary,
    marginLeft: SPACING.sm,
  },
  headerActions: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  offlineToggle: {
    padding: SPACING.sm,
    borderRadius: BORDER_RADIUS.full,
    backgroundColor: COLORS.zinc800,
  },
  storageInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: SPACING.lg,
    paddingVertical: SPACING.sm,
    gap: SPACING.xs,
  },
  storageText: {
    flex: 1,
    fontSize: FONT_SIZES.sm,
  },
  clearAllText: {
    fontSize: FONT_SIZES.sm,
    fontWeight: '600',
  },
  tabContainer: {
    flexDirection: 'row',
    paddingHorizontal: SPACING.lg,
  },
  tab: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: SPACING.xs,
    paddingVertical: SPACING.md,
    borderBottomWidth: 2,
    borderBottomColor: 'transparent',
  },
  tabText: {
    fontSize: FONT_SIZES.md,
    fontWeight: '500',
    color: COLORS.textMuted,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    marginTop: SPACING.md,
    color: COLORS.textMuted,
    fontSize: FONT_SIZES.md,
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: SPACING.xxl,
  },
  emptyTitle: {
    fontSize: FONT_SIZES.xl,
    fontWeight: '600',
    color: COLORS.textMuted,
    marginTop: SPACING.lg,
  },
  emptyText: {
    fontSize: FONT_SIZES.md,
    color: COLORS.textDim,
    marginTop: SPACING.sm,
    textAlign: 'center',
  },
  scanButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.sm,
    paddingVertical: SPACING.md,
    paddingHorizontal: SPACING.xl,
    borderRadius: BORDER_RADIUS.full,
    marginTop: SPACING.xl,
  },
  scanButtonText: {
    color: '#fff',
    fontSize: FONT_SIZES.md,
    fontWeight: '600',
  },
  listContent: {
    paddingVertical: SPACING.sm,
  },
  songItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: SPACING.lg,
    paddingVertical: SPACING.md,
    gap: SPACING.md,
  },
  albumArt: {
    width: 56,
    height: 56,
    borderRadius: BORDER_RADIUS.sm,
    overflow: 'hidden',
  },
  albumImage: {
    width: '100%',
    height: '100%',
  },
  albumPlaceholder: {
    width: '100%',
    height: '100%',
    justifyContent: 'center',
    alignItems: 'center',
  },
  songInfo: {
    flex: 1,
  },
  songTitle: {
    fontSize: FONT_SIZES.md,
    fontWeight: '600',
    color: COLORS.textPrimary,
  },
  songArtist: {
    fontSize: FONT_SIZES.sm,
    color: COLORS.textMuted,
    marginTop: 2,
  },
  songSize: {
    fontSize: FONT_SIZES.xs,
    color: COLORS.textDim,
    marginTop: 2,
  },
  songActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.sm,
  },
  deleteButton: {
    padding: SPACING.sm,
  },
  playButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    justifyContent: 'center',
    alignItems: 'center',
  },
});

export default OfflineMusicScreen;
