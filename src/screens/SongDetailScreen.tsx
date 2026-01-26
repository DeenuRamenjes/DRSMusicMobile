import React, { useRef, useState, useMemo, useEffect, useCallback, memo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Image,
  ImageBackground,
  ScrollView,
  Dimensions,
  StatusBar,
  GestureResponderEvent,
  LayoutRectangle,
  Modal,
  FlatList,
  Share,
  Platform,
  ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import Icon from 'react-native-vector-icons/Feather';
import Slider from '@react-native-community/slider';
import { COLORS, SPACING, FONT_SIZES, BORDER_RADIUS, DIMENSIONS as DIMS } from '../constants/theme';
import { usePlayerStore } from '../store/usePlayerStore';
import { useMusicStore } from '../store/useMusicStore';
import { useThemeStore } from '../store/useThemeStore';
import { useOfflineMusicStore } from '../store/useOfflineMusicStore';
import { useAuthStore } from '../store/useAuthStore';
import { getFullImageUrl, getFullAudioUrl } from '../config';
import { Song } from '../types';
import { CustomDialog, useDialog } from '../components/CustomDialog';
import { formatDuration } from '../utils/duration';
import { PlaybackProgress } from '../components/PlaybackProgress';

import axiosInstance from '../api/axios';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

// Album art sizing based on screen width
const ALBUM_ART_SIZE = Math.min(SCREEN_WIDTH - SPACING.xxl * 2, 320);

// User type for share list
interface ShareUser {
  _id: string;
  googleId: string;
  name: string;
  email?: string;
  image?: string;
}

// Memoized Queue Item
const QueueListItem = memo(({
  item,
  index,
  isMenuVisible,
  onPress,
  onLongPress,
  onPlayNext,
  onRemove
}: {
  item: Song;
  index: number;
  isMenuVisible: boolean;
  onPress: (song: Song) => void;
  onLongPress: (id: string) => void;
  onPlayNext: (id: string) => void;
  onRemove: (id: string) => void;
}) => {
  return (
    <View style={styles.queueItemWrapper}>
      <TouchableOpacity
        style={styles.queueItem}
        onPress={() => onPress(item)}
        onLongPress={() => onLongPress(item._id)}
        activeOpacity={0.7}
      >
        <View style={styles.queueItemIndex}>
          <Text style={styles.queueItemIndexText}>{index + 1}</Text>
        </View>
        <Image
          source={{ uri: getFullImageUrl(item.imageUrl) }}
          style={styles.queueItemImage}
        />
        <View style={styles.queueItemInfo}>
          <Text style={styles.queueItemTitle} numberOfLines={1}>{item.title}</Text>
          <Text style={styles.queueItemArtist} numberOfLines={1}>{item.artist}</Text>
        </View>
        <Text style={styles.queueItemDuration}>{formatDuration(item.duration || 0)}</Text>
        <TouchableOpacity
          style={styles.queueItemMenuButton}
          onPress={() => onLongPress(item._id)}
          hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
        >
          <Icon name="more-vertical" size={18} color={COLORS.textMuted} />
        </TouchableOpacity>
      </TouchableOpacity>

      {/* Dropdown Menu */}
      {isMenuVisible && (
        <View style={styles.queueItemMenu}>
          <TouchableOpacity
            style={styles.queueItemMenuOption}
            onPress={() => onPlayNext(item._id)}
          >
            <Icon name="skip-forward" size={16} color={COLORS.textPrimary} />
            <Text style={styles.queueItemMenuText}>Play Next</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.queueItemMenuOption}
            onPress={() => onRemove(item._id)}
          >
            <Icon name="trash-2" size={16} color={COLORS.error} />
            <Text style={[styles.queueItemMenuText, { color: COLORS.error }]}>Remove from Queue</Text>
          </TouchableOpacity>
        </View>
      )}
    </View>
  );
});

export const SongDetailScreen = () => {
  const navigation = useNavigation();
  const [isQueueOpen, setIsQueueOpen] = useState(false);
  const [isVolumeOpen, setIsVolumeOpen] = useState(false);
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [isDownloading, setIsDownloading] = useState(false);
  const [isDownloadOptionsOpen, setIsDownloadOptionsOpen] = useState(false);
  const [isShareUsersOpen, setIsShareUsersOpen] = useState(false);
  const [shareUsers, setShareUsers] = useState<ShareUser[]>([]);
  const [isLoadingUsers, setIsLoadingUsers] = useState(false);
  const [isSending, setIsSending] = useState<string | null>(null); // Track which user we're sending to
  const [queueItemMenuId, setQueueItemMenuId] = useState<string | null>(null); // Track which queue item has menu open
  const { dialogState, hideDialog, showSuccess, showError, showConfirm } = useDialog();

  const {
    currentSong,
    isPlaying,
    togglePlayPause,
    playNext,
    playPrevious,
    isShuffle,
    isLooping,
    toggleShuffle,
    toggleLoop,
    queue,
    shuffleQueue,
    currentIndex,
    playSong,
    volume,
    isMuted,
    setVolume,
    toggleMute,
    removeFromQueue,
    moveToNextInQueue,
  } = usePlayerStore();

  const { likedSongs, likeSong, unlikeSong } = useMusicStore();
  const { colors: themeColors } = useThemeStore();
  const { isDownloaded, downloadSong, deleteSong, downloadProgress } = useOfflineMusicStore();
  const { user: currentUser } = useAuthStore();

  const isSongLiked = currentSong ? likedSongs.some(s => s._id === currentSong._id) : false;

  const handleBack = () => {
    if (navigation.canGoBack()) {
      navigation.goBack();
    } else {
      (navigation as any).reset({
        index: 0,
        routes: [{ name: 'MainLayout' }],
      });
    }
  };

  const handleToggleLike = async () => {
    if (!currentSong) return;
    if (isSongLiked) {
      await unlikeSong(currentSong._id);
    } else {
      await likeSong(currentSong._id);
    }
  };

  // Calculate upcoming queue based on shuffle/loop mode (matching web app logic exactly)
  const upcomingQueue = useMemo(() => {
    if (!queue.length) return [];

    if (isShuffle) {
      if (shuffleQueue.length) {
        return shuffleQueue;
      }
      if (isLooping) {
        return queue.filter((queuedSong) => queuedSong._id !== currentSong?._id);
      }
      return [];
    }

    if (currentIndex === -1) return queue;

    const afterCurrent = queue.slice(currentIndex + 1);
    const beforeCurrent = queue.slice(0, currentIndex);
    return [...afterCurrent, ...beforeCurrent];
  }, [queue, currentIndex, isShuffle, isLooping, shuffleQueue, currentSong?._id]);

  const handlePlayFromQueue = useCallback((song: Song) => {
    playSong(song);
    setIsQueueOpen(false);
    setQueueItemMenuId(null);
  }, [playSong]);

  // External share (OS share sheet)
  const handleExternalShare = useCallback(async () => {
    if (!currentSong) return;
    try {
      const webAppUrl = 'https://drs-music-player.onrender.com';
      const songShareUrl = `${webAppUrl}/songs/${currentSong._id}`;

      await Share.share({
        message: `🎵 Listen to "${currentSong.title}" by ${currentSong.artist} on DRS Music!\n\n${songShareUrl}`,
        title: currentSong.title,
        url: songShareUrl, // iOS uses this for the share URL
      });
    } catch (error) {
      console.error('Error sharing:', error);
    }
    setIsMenuOpen(false);
  }, [currentSong]);

  // Open in-app share modal (share with users)
  const handleShare = useCallback(async () => {
    if (!currentSong) return;
    setIsMenuOpen(false);
    setIsShareUsersOpen(true);

    // Fetch users
    setIsLoadingUsers(true);
    try {
      const response = await axiosInstance.get('/users');
      // Filter out the current user from the list
      const users = (response.data || []).filter((u: ShareUser) =>
        u.googleId !== currentUser?.googleId && u._id !== currentUser?.id
      );
      setShareUsers(users);
    } catch (error) {
      console.error('Error fetching users:', error);
      showError('Error', 'Failed to load users');
    } finally {
      setIsLoadingUsers(false);
    }
  }, [currentSong, currentUser, showError]);

  // Send song to a specific user
  const handleSendToUser = useCallback(async (user: ShareUser) => {
    if (!currentSong) return;

    setIsSending(user._id);
    try {
      await axiosInstance.post('/users/messages', {
        receiverId: user.googleId,
        content: `🎵 Check out this song: "${currentSong.title}" by ${currentSong.artist}`,
        messageType: 'song',
        songData: {
          songId: currentSong._id,
          title: currentSong.title,
          artist: currentSong.artist,
          imageUrl: currentSong.imageUrl,
          audioUrl: currentSong.audioUrl,
          duration: currentSong.duration,
        }
      });

      showSuccess('Sent!', `Song sent to ${user.name}`);
      setIsShareUsersOpen(false);
    } catch (error: any) {
      console.error('Error sending song:', error);
      showError('Error', error.response?.data?.message || 'Failed to send song');
    } finally {
      setIsSending(null);
    }
  }, [currentSong, showSuccess, showError]);

  const handleViewLyrics = () => {
    setIsMenuOpen(false);
    if (currentSong) {
      (navigation as any).navigate('Lyrics', { songId: currentSong._id });
    }
  };

  const handleDownload = () => {
    if (!currentSong) return;
    setIsMenuOpen(false);

    // Check if already downloaded for offline
    if (isDownloaded(currentSong._id)) {
      showConfirm(
        'Already Downloaded',
        `"${currentSong.title}" is already available offline. Would you like to remove it?`,
        async () => {
          const success = await deleteSong(currentSong._id);
          if (success) {
            showSuccess('Removed', 'Song removed from downloads.');
          }
        },
        'Remove Download',
        true
      );
      return;
    }

    // Show download options modal
    setIsDownloadOptionsOpen(true);
  };

  // Download for offline viewing within the app
  const handleOfflineDownload = async () => {
    if (!currentSong) return;
    setIsDownloadOptionsOpen(false);
    setIsDownloading(true);

    try {
      const audioUrl = getFullAudioUrl(currentSong.audioUrl);
      const success = await downloadSong(currentSong, audioUrl);

      if (success) {
        showSuccess('Download Complete', `"${currentSong.title}" is now available offline!`);
      } else {
        showError('Download Failed', 'Could not download the song. Please try again.');
      }
    } catch (error) {
      console.error('Offline download error:', error);
      showError('Download Failed', 'Could not download the song. Please try again.');
    } finally {
      setIsDownloading(false);
    }
  };

  // Download to device storage (Downloads folder)
  const handleDeviceDownload = async () => {
    if (!currentSong) return;
    setIsDownloadOptionsOpen(false);
    setIsDownloading(true);

    try {
      const audioUrl = getFullAudioUrl(currentSong.audioUrl);
      const RNFS = require('react-native-fs');

      // Create filename from song title
      const sanitizedTitle = currentSong.title.replace(/[/\\?%*:|"<>]/g, '-');
      const filename = `${sanitizedTitle} - ${currentSong.artist}.mp3`;

      // Determine download path based on platform
      const downloadDir = Platform.OS === 'android'
        ? RNFS.DownloadDirectoryPath
        : RNFS.DocumentDirectoryPath;
      const filePath = `${downloadDir}/${filename}`;

      // Check if file already exists
      const exists = await RNFS.exists(filePath);
      if (exists) {
        showConfirm(
          'File Exists',
          `A file named "${filename}" already exists. Replace it?`,
          async () => {
            await RNFS.unlink(filePath);
            await performDeviceDownload(audioUrl, filePath, filename);
          },
          'Replace',
          true
        );
        setIsDownloading(false);
        return;
      }

      await performDeviceDownload(audioUrl, filePath, filename);
    } catch (error) {
      console.error('Device download error:', error);
      showError('Download Failed', 'Could not save the song to your device. Please try again.');
      setIsDownloading(false);
    }
  };

  const performDeviceDownload = async (audioUrl: string, filePath: string, filename: string) => {
    try {
      const RNFS = require('react-native-fs');

      const downloadResult = await RNFS.downloadFile({
        fromUrl: audioUrl,
        toFile: filePath,
        background: true,
        discretionary: true,
      }).promise;

      if (downloadResult.statusCode === 200) {
        showSuccess('Downloaded to Device', `"${filename}" has been saved to your ${Platform.OS === 'android' ? 'Downloads' : 'Documents'} folder!`);
      } else {
        showError('Download Failed', 'Could not save the song to your device.');
      }
    } catch (error) {
      console.error('Perform device download error:', error);
      showError('Download Failed', 'Could not save the song to your device.');
    } finally {
      setIsDownloading(false);
    }
  };

  const handleVolumeChange = (value: number) => {
    setVolume(value);
  };

  if (!currentSong) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.emptyContainer}>
          <Icon name="music" size={64} color={COLORS.textMuted} />
          <Text style={styles.noSongText}>No song playing</Text>
          <TouchableOpacity style={styles.goBackButton} onPress={handleBack}>
            <Text style={styles.goBackText}>Go Back</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  const imageUri = getFullImageUrl(currentSong.imageUrl);

  const handlePlayNextInQueue = useCallback((id: string) => {
    moveToNextInQueue(id);
    setQueueItemMenuId(null);
  }, [moveToNextInQueue]);

  const handleRemoveFromQueue = useCallback((id: string) => {
    removeFromQueue(id);
    setQueueItemMenuId(null);
  }, [removeFromQueue]);

  const handleToggleQueueItemMenu = useCallback((id: string) => {
    setQueueItemMenuId(prev => prev === id ? null : id);
  }, []);

  const renderQueueItem = useCallback(({ item, index }: { item: Song; index: number }) => (
    <QueueListItem
      item={item}
      index={index}
      isMenuVisible={queueItemMenuId === item._id}
      onPress={handlePlayFromQueue}
      onLongPress={handleToggleQueueItemMenu}
      onPlayNext={handlePlayNextInQueue}
      onRemove={handleRemoveFromQueue}
    />
  ), [queueItemMenuId, handlePlayFromQueue, handleToggleQueueItemMenu, handlePlayNextInQueue, handleRemoveFromQueue]);

  return (
    <View style={styles.container}>
      {/* Blurred Background Image */}
      {imageUri && (
        <ImageBackground
          source={{ uri: imageUri }}
          style={styles.backgroundImage}
          blurRadius={Platform.OS === 'ios' ? 50 : 25}
          resizeMode="cover"
        >
          <View style={styles.backgroundOverlay} />
        </ImageBackground>
      )}

      <SafeAreaView style={styles.safeArea} edges={['top']}>
        <StatusBar barStyle="light-content" translucent backgroundColor="transparent" />

        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity onPress={handleBack} style={styles.backButton}>
            <Icon name="chevron-down" size={28} color={COLORS.textPrimary} />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>NOW PLAYING</Text>
          <TouchableOpacity
            style={styles.menuButton}
            onPress={() => setIsMenuOpen(true)}
          >
            <Icon name="more-vertical" size={24} color={COLORS.textPrimary} />
          </TouchableOpacity>
        </View>

        <ScrollView
          style={styles.content}
          contentContainerStyle={styles.contentContainer}
          showsVerticalScrollIndicator={false}
        >
          {/* Album Art */}
          <View style={styles.albumArtContainer}>
            {imageUri ? (
              <Image
                source={{ uri: imageUri }}
                style={styles.albumArt}
              />
            ) : (
              <View style={[styles.albumArt, styles.albumArtPlaceholder]}>
                <Icon name="music" size={64} color={COLORS.textMuted} />
              </View>
            )}
          </View>

          {/* Song Info */}
          <View style={styles.songInfoContainer}>
            <Text style={styles.songTitle} numberOfLines={2}>{currentSong.title}</Text>
            <Text style={styles.songArtist} numberOfLines={1}>{currentSong.artist}</Text>
          </View>

          {/* Progress Bar */}
          <PlaybackProgress />


          {/* Main Controls */}
          <View style={styles.mainControls}>
            <TouchableOpacity
              style={styles.secondaryButton}
              onPress={toggleShuffle}
            >
              <Icon
                name="shuffle"
                size={22}
                color={isShuffle ? themeColors.primary : COLORS.textMuted}
              />
            </TouchableOpacity>

            <TouchableOpacity style={styles.controlButton} onPress={playPrevious}>
              <Icon name="skip-back" size={32} color={COLORS.textPrimary} />
            </TouchableOpacity>

            <TouchableOpacity style={[styles.playButton, { backgroundColor: themeColors.primary }]} onPress={togglePlayPause}>
              <Icon
                name={isPlaying ? 'pause' : 'play'}
                size={32}
                color={COLORS.background}
                style={!isPlaying && styles.playIconOffset}
              />
            </TouchableOpacity>

            <TouchableOpacity style={styles.controlButton} onPress={playNext}>
              <Icon name="skip-forward" size={32} color={COLORS.textPrimary} />
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.secondaryButton}
              onPress={toggleLoop}
            >
              <Icon
                name="repeat"
                size={22}
                color={isLooping ? themeColors.primary : COLORS.textMuted}
              />
            </TouchableOpacity>
          </View>

          {/* Bottom Actions */}
          <View style={styles.bottomActions}>
            <TouchableOpacity style={styles.actionButton} onPress={handleToggleLike}>
              <Icon
                name="heart"
                size={24}
                color={isSongLiked ? '#f43f5e' : COLORS.textMuted}
              />
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.actionButton}
              onPress={() => setIsVolumeOpen(true)}
            >
              <Icon
                name={isMuted || volume === 0 ? "volume-x" : "volume-2"}
                size={24}
                color={COLORS.textMuted}
              />
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.actionButton}
              onPress={() => setIsQueueOpen(true)}
            >
              <Icon name="list" size={24} color={COLORS.textMuted} />
            </TouchableOpacity>
          </View>
        </ScrollView>

        {/* Volume Modal */}
        <Modal
          visible={isVolumeOpen}
          animationType="fade"
          transparent={true}
          onRequestClose={() => setIsVolumeOpen(false)}
        >
          <TouchableOpacity
            style={styles.volumeModalOverlay}
            activeOpacity={1}
            onPress={() => setIsVolumeOpen(false)}
          >
            <View style={styles.volumePanel}>
              <View style={styles.volumeHeader}>
                <Icon name="volume-2" size={20} color={COLORS.textPrimary} />
                <Text style={styles.volumeTitle}>Volume</Text>
              </View>

              <View style={styles.volumeSliderContainer}>
                <Icon name="volume" size={18} color={COLORS.textMuted} />
                <Slider
                  style={styles.volumeSlider}
                  minimumValue={0}
                  maximumValue={1}
                  value={isMuted ? 0 : volume}
                  onValueChange={handleVolumeChange}
                  minimumTrackTintColor={themeColors.primary}
                  maximumTrackTintColor="rgba(255,255,255,0.2)"
                  thumbTintColor={COLORS.textPrimary}
                />
                <Icon name="volume-2" size={18} color={COLORS.textMuted} />
              </View>

              <View style={styles.volumeFooter}>
                <Text style={styles.volumePercent}>
                  {Math.round((isMuted ? 0 : volume) * 100)}%
                </Text>
                <TouchableOpacity
                  style={styles.muteButton}
                  onPress={toggleMute}
                >
                  <Icon
                    name={isMuted ? "volume-x" : "volume-2"}
                    size={20}
                    color={isMuted ? themeColors.primary : COLORS.textMuted}
                  />
                  <Text style={[styles.muteText, isMuted && { color: themeColors.primary }]}>
                    {isMuted ? 'Unmute' : 'Mute'}
                  </Text>
                </TouchableOpacity>
              </View>
            </View>
          </TouchableOpacity>
        </Modal>

        {/* Menu Modal */}
        <Modal
          visible={isMenuOpen}
          animationType="fade"
          transparent={true}
          onRequestClose={() => setIsMenuOpen(false)}
        >
          <View style={styles.menuModalOverlay}>
            <TouchableOpacity
              style={StyleSheet.absoluteFill}
              activeOpacity={1}
              onPress={() => setIsMenuOpen(false)}
            />
            <View style={styles.menuPanel}>
              <TouchableOpacity
                style={styles.menuItem}
                onPress={handleShare}
              >
                <Icon name="share" size={20} color={COLORS.textPrimary} />
                <Text style={styles.menuItemText}>Share song</Text>
              </TouchableOpacity>

              {/* <TouchableOpacity 
              style={styles.menuItem}
              onPress={handleViewLyrics}
            >
              <Icon name="file-text" size={20} color={COLORS.textPrimary} />
              <Text style={styles.menuItemText}>View Lyrics</Text>
            </TouchableOpacity> */}

              <TouchableOpacity
                style={styles.menuItem}
                onPress={handleDownload}
                disabled={isDownloading}
              >
                <Icon
                  name={currentSong && isDownloaded(currentSong._id) ? "check-circle" : "download"}
                  size={20}
                  color={currentSong && isDownloaded(currentSong._id) ? themeColors.primary : COLORS.textPrimary}
                />
                <Text style={[
                  styles.menuItemText,
                  currentSong && isDownloaded(currentSong._id) && { color: themeColors.primary }
                ]}>
                  {isDownloading
                    ? `Downloading... ${downloadProgress[currentSong?._id || '']?.progress || 0}%`
                    : currentSong && isDownloaded(currentSong._id)
                      ? 'Downloaded'
                      : 'Download'}
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        </Modal>

        {/* Download Options Modal */}
        <Modal
          visible={isDownloadOptionsOpen}
          animationType="fade"
          transparent={true}
          onRequestClose={() => setIsDownloadOptionsOpen(false)}
        >
          <View style={styles.downloadOptionsOverlay}>
            <TouchableOpacity
              style={StyleSheet.absoluteFill}
              activeOpacity={1}
              onPress={() => setIsDownloadOptionsOpen(false)}
            />
            <View style={styles.downloadOptionsPanel}>
              <Text style={styles.downloadOptionsTitle}>Download Options</Text>
              <Text style={styles.downloadOptionsSubtitle}>
                Choose how you want to save "{currentSong?.title}"
              </Text>

              {/* Offline Viewing Option */}
              <TouchableOpacity
                style={styles.downloadOption}
                onPress={handleOfflineDownload}
              >
                <View style={[styles.downloadOptionIcon, { backgroundColor: themeColors.primaryMuted }]}>
                  <Icon name="smartphone" size={24} color={themeColors.primary} />
                </View>
                <View style={styles.downloadOptionInfo}>
                  <Text style={styles.downloadOptionTitle}>Offline Viewing</Text>
                  <Text style={styles.downloadOptionDesc}>
                    Save for offline playback within the app
                  </Text>
                </View>
                <Icon name="chevron-right" size={20} color={COLORS.textMuted} />
              </TouchableOpacity>

              {/* Download to Device Option */}
              <TouchableOpacity
                style={styles.downloadOption}
                onPress={handleDeviceDownload}
              >
                <View style={[styles.downloadOptionIcon, { backgroundColor: 'rgba(59, 130, 246, 0.2)' }]}>
                  <Icon name="download" size={24} color="#3b82f6" />
                </View>
                <View style={styles.downloadOptionInfo}>
                  <Text style={styles.downloadOptionTitle}>Save to Device</Text>
                  <Text style={styles.downloadOptionDesc}>
                    Download to your {Platform.OS === 'android' ? 'Downloads' : 'Documents'} folder
                  </Text>
                </View>
                <Icon name="chevron-right" size={20} color={COLORS.textMuted} />
              </TouchableOpacity>

              {/* Cancel Button */}
              <TouchableOpacity
                style={styles.downloadCancelButton}
                onPress={() => setIsDownloadOptionsOpen(false)}
              >
                <Text style={styles.downloadCancelText}>Cancel</Text>
              </TouchableOpacity>
            </View>
          </View>
        </Modal>

        {/* Queue Modal */}
        <Modal
          visible={isQueueOpen}
          animationType="slide"
          transparent={true}
          onRequestClose={() => setIsQueueOpen(false)}
        >
          <View style={styles.modalOverlay}>
            <TouchableOpacity
              style={styles.modalBackdrop}
              activeOpacity={1}
              onPress={() => {
                setQueueItemMenuId(null);
                setIsQueueOpen(false);
              }}
            />
            <View style={styles.queuePanel}>
              {/* Queue Header */}
              <View style={styles.queueHeader}>
                <View style={styles.queueTitleContainer}>
                  <Icon name="list" size={20} color={COLORS.textPrimary} />
                  <Text style={styles.queueTitle}>
                    {isShuffle ? 'Next Songs (Shuffled)' : 'Next Songs'}
                  </Text>
                </View>
                <TouchableOpacity
                  style={styles.queueCloseButton}
                  onPress={() => {
                    setQueueItemMenuId(null);
                    setIsQueueOpen(false);
                  }}

                >
                  <Text style={styles.queueCloseText}>Close</Text>
                  <Icon name="chevron-down" size={16} color={COLORS.textMuted} />
                </TouchableOpacity>
              </View>

              {/* Queue List */}
              {upcomingQueue.length > 0 ? (
                <FlatList
                  data={upcomingQueue}
                  renderItem={renderQueueItem}
                  keyExtractor={(item) => item._id}
                  style={styles.queueList}
                  contentContainerStyle={styles.queueListContent}
                  showsVerticalScrollIndicator={false}
                  onScrollBeginDrag={() => setQueueItemMenuId(null)}
                  initialNumToRender={10}
                  maxToRenderPerBatch={10}
                  windowSize={11}
                  removeClippedSubviews={Platform.OS === 'android'}
                />
              ) : (
                <View style={styles.emptyQueue}>
                  <Icon name="music" size={40} color={COLORS.textMuted} />
                  <Text style={styles.emptyQueueText}>Queue is empty</Text>
                  <Text style={styles.emptyQueueSubtext}>
                    {queue.length === 0
                      ? 'Play a song to start the queue'
                      : isShuffle && !isLooping
                        ? 'Enable loop to continue playing'
                        : 'No more songs to play'}
                  </Text>
                </View>
              )}
            </View>
          </View>
        </Modal>

        {/* Share Users Modal */}
        <Modal
          visible={isShareUsersOpen}
          animationType="slide"
          transparent={true}
          onRequestClose={() => setIsShareUsersOpen(false)}
        >
          <View style={styles.shareModalOverlay}>
            <TouchableOpacity
              style={styles.modalBackdrop}
              activeOpacity={1}
              onPress={() => setIsShareUsersOpen(false)}
            />
            <View style={styles.sharePanel}>
              {/* Header */}
              <View style={styles.sharePanelHeader}>
                <Text style={styles.sharePanelTitle}>Share Song</Text>
                <TouchableOpacity onPress={() => setIsShareUsersOpen(false)}>
                  <Icon name="x" size={24} color={COLORS.textPrimary} />
                </TouchableOpacity>
              </View>

              {/* Song Preview */}
              {currentSong && (
                <View style={styles.shareSongPreview}>
                  <Image
                    source={{ uri: getFullImageUrl(currentSong.imageUrl) }}
                    style={styles.shareSongImage}
                  />
                  <View style={styles.shareSongInfo}>
                    <Text style={styles.shareSongTitle} numberOfLines={1}>{currentSong.title}</Text>
                    <Text style={styles.shareSongArtist} numberOfLines={1}>{currentSong.artist}</Text>
                  </View>
                </View>
              )}

              {/* External Share Option */}
              <TouchableOpacity
                style={styles.externalShareButton}
                onPress={handleExternalShare}
              >
                <Icon name="share-2" size={20} color={themeColors.primary} />
                <Text style={[styles.externalShareText, { color: themeColors.primary }]}>
                  Share via other apps
                </Text>
                <Icon name="chevron-right" size={18} color={themeColors.primary} />
              </TouchableOpacity>

              <View style={styles.shareDivider}>
                <View style={styles.shareDividerLine} />
                <Text style={styles.shareDividerText}>or send to a friend</Text>
                <View style={styles.shareDividerLine} />
              </View>

              {/* Users List */}
              {isLoadingUsers ? (
                <View style={styles.shareLoadingContainer}>
                  <ActivityIndicator size="large" color={themeColors.primary} />
                  <Text style={styles.shareLoadingText}>Loading users...</Text>
                </View>
              ) : shareUsers.length === 0 ? (
                <View style={styles.shareEmptyContainer}>
                  <Icon name="users" size={40} color={COLORS.textMuted} />
                  <Text style={styles.shareEmptyText}>No users available</Text>
                </View>
              ) : (
                <FlatList
                  data={shareUsers}
                  keyExtractor={(item) => item._id}
                  style={styles.shareUsersList}
                  renderItem={({ item }) => (
                    <TouchableOpacity
                      style={styles.shareUserItem}
                      onPress={() => handleSendToUser(item)}
                      disabled={isSending === item._id}
                    >
                      <View style={styles.shareUserAvatar}>
                        {item.image ? (
                          <Image source={{ uri: item.image }} style={styles.shareUserAvatarImage} />
                        ) : (
                          <View style={[styles.shareUserAvatarPlaceholder, { backgroundColor: themeColors.primary + '30' }]}>
                            <Text style={[styles.shareUserAvatarText, { color: themeColors.primary }]}>
                              {item.name?.charAt(0)?.toUpperCase() || '?'}
                            </Text>
                          </View>
                        )}
                      </View>
                      <View style={styles.shareUserInfo}>
                        <Text style={styles.shareUserName}>{item.name}</Text>
                        {item.email && (
                          <Text style={styles.shareUserEmail} numberOfLines={1}>{item.email}</Text>
                        )}
                      </View>
                      {isSending === item._id ? (
                        <ActivityIndicator size="small" color={themeColors.primary} />
                      ) : (
                        <View style={[styles.shareSendButton, { backgroundColor: themeColors.primary }]}>
                          <Icon name="send" size={16} color="#fff" />
                        </View>
                      )}
                    </TouchableOpacity>
                  )}
                />
              )}
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
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    // backgroundColor: COLORS.background,
  },
  backgroundImage: {
    ...StyleSheet.absoluteFillObject,
    width: '100%',
    height: '100%',
  },
  backgroundOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
  },
  safeArea: {
    flex: 1,
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    gap: SPACING.lg,
  },
  noSongText: {
    color: COLORS.textMuted,
    fontSize: FONT_SIZES.lg,
  },
  goBackButton: {
    paddingHorizontal: SPACING.xl,
    paddingVertical: SPACING.md,
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    borderRadius: BORDER_RADIUS.full,
  },
  goBackText: {
    color: COLORS.textPrimary,
    fontSize: FONT_SIZES.md,
    fontWeight: '500',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: SPACING.lg,
    paddingVertical: SPACING.md,
  },
  backButton: {
    padding: SPACING.sm,
    marginLeft: -SPACING.sm,
  },
  headerTitle: {
    fontSize: FONT_SIZES.md,
    fontWeight: '600',
    color: COLORS.textMuted,
    letterSpacing: 2,
  },
  menuButton: {
    padding: SPACING.sm,
    marginRight: -SPACING.sm,
  },
  content: {
    flex: 1,
  },
  contentContainer: {
    paddingHorizontal: SPACING.xxl,
    paddingBottom: SPACING.xxl,
    alignItems: 'center',
  },
  albumArtContainer: {
    marginTop: SPACING.lg,
    marginBottom: SPACING.xxl,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 25 },
    shadowOpacity: 0.5,
    shadowRadius: 30,
    elevation: 20,
  },
  albumArt: {
    width: ALBUM_ART_SIZE,
    height: ALBUM_ART_SIZE,
    borderRadius: BORDER_RADIUS.xl,
    marginTop: SPACING.xxxl,
  },
  albumArtPlaceholder: {
    backgroundColor: COLORS.zinc800,
    justifyContent: 'center',
    alignItems: 'center',
  },
  songInfoContainer: {
    width: '100%',
    alignItems: 'center',
    marginBottom: SPACING.xxxl,
  },
  songTitle: {
    fontSize: 28,
    fontWeight: 'bold',
    color: COLORS.textPrimary,
    height: 80,
    textAlign: 'center',
    marginBottom: SPACING.sm,
  },
  songArtist: {
    fontSize: FONT_SIZES.lg,
    color: COLORS.textMuted,
    textAlign: 'center',
  },
  progressSection: {
    width: '100%',
    marginTop: SPACING.xxxl,
    marginBottom: SPACING.xxl,
  },
  progressBar: {
    height: 6,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    borderRadius: 3,
    position: 'relative',
  },
  progressFill: {
    height: '100%',
    backgroundColor: COLORS.primary,
    borderRadius: 3,
  },
  progressHandle: {
    position: 'absolute',
    top: -5,
    width: 16,
    height: 16,
    backgroundColor: COLORS.textPrimary,
    borderRadius: 8,
    marginLeft: -8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
    elevation: 4,
  },
  timeContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: SPACING.sm,
  },
  timeText: {
    fontSize: FONT_SIZES.sm,
    color: COLORS.textMuted,
    fontWeight: '500',
  },
  mainControls: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: SPACING.lg,
    marginBottom: SPACING.xxl,
    width: '100%',
  },
  secondaryButton: {
    padding: SPACING.md,
  },
  controlButton: {
    padding: SPACING.sm,
  },
  playButton: {
    width: 72,
    height: 72,
    borderRadius: 36,
    backgroundColor: COLORS.textPrimary,
    justifyContent: 'center',
    alignItems: 'center',
    marginHorizontal: SPACING.md,
    shadowColor: '#fff',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.2,
    shadowRadius: 20,
    elevation: 10,
  },
  playIconOffset: {
    marginLeft: 4,
  },
  bottomActions: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: SPACING.xxl,
    width: '100%',
  },
  actionButton: {
    padding: SPACING.md,
  },
  // Volume Modal Styles
  volumeModalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-end',
    alignItems: 'center',
    paddingBottom: 120,
  },
  volumePanel: {
    backgroundColor: 'rgba(39, 39, 42, 0.98)',
    borderRadius: 20,
    padding: SPACING.lg,
    width: SCREEN_WIDTH - SPACING.xxl * 2,
    maxWidth: 280,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.5,
    shadowRadius: 20,
    elevation: 25,
  },
  volumeHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.sm,
    marginBottom: SPACING.lg,
  },
  volumeTitle: {
    fontSize: FONT_SIZES.lg,
    fontWeight: '600',
    color: COLORS.textPrimary,
  },
  volumeSliderContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.sm,
  },
  volumeSlider: {
    flex: 1,
    height: 40,
  },
  volumeFooter: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: SPACING.md,
  },
  volumePercent: {
    fontSize: FONT_SIZES.lg,
    fontWeight: '600',
    color: COLORS.textPrimary,
  },
  muteButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.sm,
    padding: SPACING.sm,
  },
  muteText: {
    fontSize: FONT_SIZES.sm,
    color: COLORS.textMuted,
  },
  // Menu Modal Styles
  menuModalOverlay: {
    flex: 1,
    // backgroundColor: 'rgba(0, 0, 0, 0.5)',
  },
  menuPanel: {
    position: 'absolute',
    top: 60,
    right: SPACING.lg,
    backgroundColor: 'rgba(39, 39, 42, 0.98)',
    borderRadius: 16,
    padding: SPACING.sm,
    minWidth: 200,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.5,
    shadowRadius: 20,
    elevation: 25,
  },
  menuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.md,
    paddingVertical: SPACING.md,
    paddingHorizontal: SPACING.md,
    borderRadius: BORDER_RADIUS.lg,
  },
  menuItemText: {
    fontSize: FONT_SIZES.md,
    color: COLORS.textPrimary,
  },
  menuDivider: {
    height: 1,
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    marginVertical: SPACING.sm,
  },
  // Queue Modal Styles
  modalOverlay: {
    flex: 1,
    justifyContent: 'flex-end',
  },
  modalBackdrop: {
    ...StyleSheet.absoluteFillObject,
    // backgroundColor: 'rgba(0, 0, 0, 0.5)',
  },
  queuePanel: {
    backgroundColor: 'rgba(24, 24, 27, 0.98)',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    paddingTop: SPACING.lg,
    paddingBottom: SPACING.xxl,
    maxHeight: '70%',
    minHeight: 300,
  },
  queueHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: SPACING.lg,
    paddingBottom: SPACING.md,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255, 255, 255, 0.1)',
  },
  queueTitleContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.sm,
  },
  queueTitle: {
    fontSize: FONT_SIZES.lg,
    fontWeight: '600',
    color: COLORS.textPrimary,
  },
  queueCloseButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.xs,
    padding: SPACING.sm,
  },
  queueCloseText: {
    fontSize: FONT_SIZES.sm,
    color: COLORS.textMuted,
  },
  queueList: {
    flexGrow: 1,
    flexShrink: 1,
  },
  queueListContent: {
    paddingHorizontal: SPACING.md,
    paddingTop: SPACING.sm,
    paddingBottom: SPACING.lg,
  },
  queueItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: SPACING.sm,
    marginVertical: 2,
    borderRadius: BORDER_RADIUS.lg,
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
  },
  queueItemIndex: {
    width: 24,
    alignItems: 'center',
  },
  queueItemIndexText: {
    fontSize: FONT_SIZES.xs,
    color: COLORS.textMuted,
  },
  queueItemImage: {
    width: 40,
    height: 40,
    borderRadius: BORDER_RADIUS.md,
    marginRight: SPACING.sm,
  },
  queueItemInfo: {
    flex: 1,
    minWidth: 0,
  },
  queueItemTitle: {
    fontSize: FONT_SIZES.sm,
    fontWeight: '500',
    color: COLORS.textPrimary,
  },
  queueItemArtist: {
    fontSize: FONT_SIZES.xs,
    color: COLORS.textMuted,
    marginTop: 2,
  },
  queueItemDuration: {
    fontSize: FONT_SIZES.xs,
    color: COLORS.textMuted,
    marginLeft: SPACING.sm,
  },
  emptyQueue: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: SPACING.xxl,
    gap: SPACING.md,
  },
  emptyQueueText: {
    fontSize: FONT_SIZES.md,
    color: COLORS.textMuted,
  },
  emptyQueueSubtext: {
    fontSize: FONT_SIZES.sm,
    color: COLORS.textMuted,
    opacity: 0.7,
    textAlign: 'center',
    paddingHorizontal: SPACING.xl,
  },

  // Download Options Modal
  downloadOptionsOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  downloadOptionsPanel: {
    backgroundColor: COLORS.zinc800,
    borderRadius: BORDER_RADIUS.xxl,
    padding: SPACING.lg,
    marginHorizontal: SPACING.lg,
    borderWidth: 1,
    borderColor: 'rgba(63, 63, 70, 0.5)',
    maxWidth: 400,
    width: '100%',
  },
  downloadOptionsTitle: {
    fontSize: FONT_SIZES.xl,
    fontWeight: '700',
    color: COLORS.textPrimary,
    textAlign: 'center',
    marginBottom: SPACING.xs,
  },
  downloadOptionsSubtitle: {
    fontSize: FONT_SIZES.sm,
    color: COLORS.textMuted,
    textAlign: 'center',
    marginBottom: SPACING.lg,
  },
  downloadOption: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: SPACING.md,
    backgroundColor: 'rgba(39, 39, 42, 0.5)',
    borderRadius: BORDER_RADIUS.xl,
    marginBottom: SPACING.sm,
    gap: SPACING.md,
  },
  downloadOptionIcon: {
    width: 48,
    height: 48,
    borderRadius: BORDER_RADIUS.lg,
    justifyContent: 'center',
    alignItems: 'center',
  },
  downloadOptionInfo: {
    flex: 1,
  },
  downloadOptionTitle: {
    fontSize: FONT_SIZES.md,
    fontWeight: '600',
    color: COLORS.textPrimary,
    marginBottom: 2,
  },
  downloadOptionDesc: {
    fontSize: FONT_SIZES.sm,
    color: COLORS.textMuted,
  },
  downloadCancelButton: {
    padding: SPACING.md,
    alignItems: 'center',
    marginTop: SPACING.sm,
  },
  downloadCancelText: {
    fontSize: FONT_SIZES.md,
    color: COLORS.textMuted,
    fontWeight: '500',
  },
  // Share Users Modal styles
  shareModalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.6)',
    justifyContent: 'flex-end',
  },
  sharePanel: {
    backgroundColor: COLORS.zinc900,
    borderTopLeftRadius: BORDER_RADIUS.xxl,
    borderTopRightRadius: BORDER_RADIUS.xxl,
    maxHeight: '80%',
    paddingBottom: SPACING.xxl,
  },
  sharePanelHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: SPACING.lg,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  sharePanelTitle: {
    fontSize: FONT_SIZES.xl,
    fontWeight: '700',
    color: COLORS.textPrimary,
  },
  shareSongPreview: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: SPACING.lg,
    backgroundColor: COLORS.backgroundCard,
    marginHorizontal: SPACING.lg,
    marginVertical: SPACING.md,
    borderRadius: BORDER_RADIUS.lg,
  },
  shareSongImage: {
    width: 50,
    height: 50,
    borderRadius: BORDER_RADIUS.md,
  },
  shareSongInfo: {
    flex: 1,
    marginLeft: SPACING.md,
  },
  shareSongTitle: {
    fontSize: FONT_SIZES.md,
    fontWeight: '600',
    color: COLORS.textPrimary,
  },
  shareSongArtist: {
    fontSize: FONT_SIZES.sm,
    color: COLORS.textMuted,
    marginTop: 2,
  },
  externalShareButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: SPACING.md,
    paddingHorizontal: SPACING.lg,
    marginHorizontal: SPACING.lg,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.2)',
    borderRadius: BORDER_RADIUS.lg,
    gap: SPACING.sm,
  },
  externalShareText: {
    fontSize: FONT_SIZES.md,
    fontWeight: '500',
    flex: 1,
  },
  shareDivider: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: SPACING.lg,
    marginVertical: SPACING.lg,
  },
  shareDividerLine: {
    flex: 1,
    height: 1,
    backgroundColor: COLORS.border,
  },
  shareDividerText: {
    fontSize: FONT_SIZES.sm,
    color: COLORS.textMuted,
    marginHorizontal: SPACING.md,
  },
  shareLoadingContainer: {
    padding: SPACING.xxl,
    alignItems: 'center',
  },
  shareLoadingText: {
    fontSize: FONT_SIZES.md,
    color: COLORS.textMuted,
    marginTop: SPACING.md,
  },
  shareEmptyContainer: {
    padding: SPACING.xxl,
    alignItems: 'center',
  },
  shareEmptyText: {
    fontSize: FONT_SIZES.md,
    color: COLORS.textMuted,
    marginTop: SPACING.md,
  },
  shareUsersList: {
    maxHeight: 300,
    paddingHorizontal: SPACING.lg,
  },
  shareUserItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: SPACING.md,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  shareUserAvatar: {
    width: 44,
    height: 44,
    borderRadius: 22,
    overflow: 'hidden',
  },
  shareUserAvatarImage: {
    width: '100%',
    height: '100%',
  },
  shareUserAvatarPlaceholder: {
    width: '100%',
    height: '100%',
    justifyContent: 'center',
    alignItems: 'center',
  },
  shareUserAvatarText: {
    fontSize: FONT_SIZES.lg,
    fontWeight: '600',
  },
  shareUserInfo: {
    flex: 1,
    marginLeft: SPACING.md,
  },
  shareUserName: {
    fontSize: FONT_SIZES.md,
    fontWeight: '500',
    color: COLORS.textPrimary,
  },
  shareUserEmail: {
    fontSize: FONT_SIZES.sm,
    color: COLORS.textMuted,
    marginTop: 2,
  },
  shareSendButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    justifyContent: 'center',
    alignItems: 'center',
  },
  queueItemWrapper: {
    position: 'relative',
  },
  queueItemMenuButton: {
    padding: SPACING.xs,
    marginLeft: SPACING.sm,
  },
  queueItemMenu: {
    backgroundColor: COLORS.zinc900,
    borderWidth: 1,
    zIndex: 1000,
    borderColor: COLORS.zinc800,
    borderRadius: BORDER_RADIUS.md,
    marginHorizontal: SPACING.md,
    // marginTop: -SPACING.xs,
    // marginBottom: SPACING.sm,
    overflow: 'hidden',
    position: 'absolute',
    right: 0,
    top: 0,
  },
  queueItemMenuOption: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: SPACING.md,
    paddingHorizontal: SPACING.lg,
    gap: SPACING.md,
  },
  queueItemMenuText: {
    fontSize: FONT_SIZES.md,
    color: COLORS.textPrimary,
  },
});

export default SongDetailScreen;
