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
  Modal,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Icon from 'react-native-vector-icons/Feather';
import { useNavigation } from '@react-navigation/native';
import { COLORS, SPACING, FONT_SIZES, BORDER_RADIUS } from '../constants/theme';
import { useThemeStore } from '../store/useThemeStore';
import axiosInstance from '../api/axios';
import { CustomDialog, useDialog } from '../components/CustomDialog';

interface Stats {
  totalUsers: number;
  totalSongs: number;
  totalAlbums: number;
  totalArtists: number;
}

export const AdminScreen = () => {
  const navigation = useNavigation();
  const { colors: themeColors } = useThemeStore();
  const { dialogState, hideDialog, showSuccess, showError } = useDialog();
  
  // Stats state
  const [stats, setStats] = useState<Stats | null>(null);
  const [isLoadingStats, setIsLoadingStats] = useState(true);
  
  // Notification modal state
  const [isNotificationModalOpen, setIsNotificationModalOpen] = useState(false);
  const [notificationTitle, setNotificationTitle] = useState('');
  const [notificationMessage, setNotificationMessage] = useState('');
  const [isSendingNotification, setIsSendingNotification] = useState(false);

  // Fetch stats on mount
  useEffect(() => {
    fetchStats();
  }, []);

  const fetchStats = async () => {
    setIsLoadingStats(true);
    try {
      const response = await axiosInstance.get('/stats');
      setStats(response.data);
    } catch (error) {
      console.error('Failed to fetch stats:', error);
      showError('Error', 'Failed to fetch statistics');
    } finally {
      setIsLoadingStats(false);
    }
  };

  const sendNotification = async () => {
    if (!notificationMessage.trim()) {
      showError('Error', 'Please enter a notification message');
      return;
    }

    setIsSendingNotification(true);
    try {
      const response = await axiosInstance.post('/admin/notifications', {
        title: notificationTitle.trim() || 'DRS Music',
        message: notificationMessage.trim(),
      });
      
      const connectedCount = response.data?.connectedClients || 0;
      setNotificationTitle('');
      setNotificationMessage('');
      setIsNotificationModalOpen(false);
      showSuccess('Success', `Notification sent to ${connectedCount} connected user(s)!`);
    } catch (error: any) {
      console.error('Failed to send notification:', error);
      showError('Error', error.response?.data?.message || 'Failed to send notification');
    } finally {
      setIsSendingNotification(false);
    }
  };

  const adminMenuItems = [
    { 
      icon: 'bell', 
      label: 'Send Notification', 
      description: 'Send broadcast notification to all users',
      onPress: () => setIsNotificationModalOpen(true),
    },
    { 
      icon: 'music', 
      label: 'Manage Songs', 
      description: 'Add, edit, or remove songs',
      onPress: () => (navigation as any).navigate('ManageSongs'),
    },
    { 
      icon: 'disc', 
      label: 'Manage Albums', 
      description: 'Create and manage albums',
      onPress: () => (navigation as any).navigate('ManageAlbums'),
    },
    { 
      icon: 'users', 
      label: 'Manage Users', 
      description: 'View and manage user accounts',
      onPress: () => (navigation as any).navigate('ManageUsers'),
    },
    { 
      icon: 'upload', 
      label: 'Upload Music', 
      description: 'Upload new songs to the library',
      onPress: () => (navigation as any).navigate('UploadSong'),
    },
  ];
  

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <StatusBar barStyle="light-content" backgroundColor={COLORS.background} />
      
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity 
          onPress={() => navigation.goBack()} 
          style={styles.backButton}
        >
          <Icon name="arrow-left" size={24} color={COLORS.textPrimary} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Admin Dashboard</Text>
        <TouchableOpacity onPress={fetchStats} style={styles.refreshButton}>
          <Icon name="refresh-cw" size={20} color={COLORS.textPrimary} />
        </TouchableOpacity>
      </View>

      <ScrollView 
        style={styles.content}
        contentContainerStyle={styles.contentContainer}
        showsVerticalScrollIndicator={false}
      >
        {/* Admin Badge */}
        <View style={[styles.adminBadge, { backgroundColor: themeColors.primaryMuted }]}>
          <Icon name="shield" size={24} color={themeColors.primary} />
          <View style={styles.adminBadgeText}>
            <Text style={[styles.adminTitle, { color: themeColors.primary }]}>
              Administrator Access
            </Text>
            <Text style={styles.adminSubtitle}>
              You have full access to manage the app
            </Text>
          </View>
        </View>

        {/* Quick Stats */}
        <Text style={styles.sectionTitle}>Statistics</Text>
        <View style={styles.statsContainer}>
          <View style={[styles.statCard, { borderColor: themeColors.primaryMuted }]}>
            <Icon name="users" size={20} color={themeColors.primary} />
            {isLoadingStats ? (
              <ActivityIndicator size="small" color={themeColors.primary} />
            ) : (
              <Text style={styles.statNumber}>{stats?.totalUsers ?? '--'}</Text>
            )}
            <Text style={styles.statLabel}>Users</Text>
          </View>
          <View style={[styles.statCard, { borderColor: themeColors.primaryMuted }]}>
            <Icon name="music" size={20} color={themeColors.primary} />
            {isLoadingStats ? (
              <ActivityIndicator size="small" color={themeColors.primary} />
            ) : (
              <Text style={styles.statNumber}>{stats?.totalSongs ?? '--'}</Text>
            )}
            <Text style={styles.statLabel}>Songs</Text>
          </View>
          <View style={[styles.statCard, { borderColor: themeColors.primaryMuted }]}>
            <Icon name="disc" size={20} color={themeColors.primary} />
            {isLoadingStats ? (
              <ActivityIndicator size="small" color={themeColors.primary} />
            ) : (
              <Text style={styles.statNumber}>{stats?.totalAlbums ?? '--'}</Text>
            )}
            <Text style={styles.statLabel}>Albums</Text>
          </View>
        </View>

        {/* Artists stat in separate row */}
        <View style={styles.artistsStatContainer}>
          <View style={[styles.artistsStatCard, { borderColor: themeColors.primaryMuted }]}>
            <Icon name="mic" size={20} color={themeColors.primary} />
            {isLoadingStats ? (
              <ActivityIndicator size="small" color={themeColors.primary} />
            ) : (
              <Text style={styles.statNumber}>{stats?.totalArtists ?? '--'}</Text>
            )}
            <Text style={styles.statLabel}>Artists</Text>
          </View>
        </View>

        {/* Menu Items */}
        <Text style={styles.sectionTitle}>Management</Text>
        <View style={styles.menuContainer}>
          {adminMenuItems.map((item, index) => (
            <TouchableOpacity 
              key={index}
              style={styles.menuItem}
              activeOpacity={0.7}
              onPress={item.onPress}
            >
              <View style={[styles.menuIconContainer, { backgroundColor: themeColors.primaryMuted }]}>
                <Icon name={item.icon} size={20} color={themeColors.primary} />
              </View>
              <View style={styles.menuContent}>
                <Text style={styles.menuLabel}>{item.label}</Text>
                <Text style={styles.menuDescription}>{item.description}</Text>
              </View>
              <Icon name="chevron-right" size={20} color={COLORS.textMuted} />
            </TouchableOpacity>
          ))}
        </View>
      </ScrollView>

      {/* Notification Modal */}
      <Modal
        visible={isNotificationModalOpen}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setIsNotificationModalOpen(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContainer}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Send Broadcast Notification</Text>
              <TouchableOpacity onPress={() => setIsNotificationModalOpen(false)}>
                <Icon name="x" size={24} color={COLORS.textPrimary} />
              </TouchableOpacity>
            </View>

            <View style={styles.modalBody}>
              <Text style={styles.inputLabel}>Title (Optional)</Text>
              <TextInput
                style={styles.textInput}
                placeholder="e.g., New Feature Alert!"
                placeholderTextColor={COLORS.textMuted}
                value={notificationTitle}
                onChangeText={setNotificationTitle}
                maxLength={50}
              />

              <Text style={styles.inputLabel}>Message *</Text>
              <TextInput
                style={[styles.textInput, styles.textArea]}
                placeholder="Enter your notification message..."
                placeholderTextColor={COLORS.textMuted}
                value={notificationMessage}
                onChangeText={setNotificationMessage}
                multiline
                numberOfLines={4}
                textAlignVertical="top"
                maxLength={200}
              />
              <Text style={styles.characterCount}>
                {notificationMessage.length}/200 characters
              </Text>

              <View style={styles.infoBox}>
                <Icon name="info" size={16} color={themeColors.primary} />
                <Text style={styles.infoText}>
                  This notification will be sent to all users with the app installed via WebSocket broadcast.
                </Text>
              </View>
            </View>

            <View style={styles.modalFooter}>
              <TouchableOpacity 
                style={styles.cancelButton}
                onPress={() => setIsNotificationModalOpen(false)}
              >
                <Text style={styles.cancelButtonText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity 
                style={[
                  styles.sendButton, 
                  { backgroundColor: themeColors.primary },
                  isSendingNotification && styles.sendButtonDisabled
                ]}
                onPress={sendNotification}
                disabled={isSendingNotification}
              >
                {isSendingNotification ? (
                  <ActivityIndicator size="small" color={COLORS.textPrimary} />
                ) : (
                  <>
                    <Icon name="send" size={18} color={COLORS.textPrimary} />
                    <Text style={styles.sendButtonText}>Send to All</Text>
                  </>
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
  refreshButton: {
    padding: SPACING.xs,
  },
  content: {
    flex: 1,
  },
  contentContainer: {
    padding: SPACING.md,
    paddingBottom: SPACING.xxl,
  },
  adminBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: SPACING.md,
    borderRadius: BORDER_RADIUS.lg,
    marginBottom: SPACING.lg,
    gap: SPACING.md,
  },
  adminBadgeText: {
    flex: 1,
  },
  adminTitle: {
    fontSize: FONT_SIZES.md,
    fontWeight: '600',
  },
  adminSubtitle: {
    fontSize: FONT_SIZES.sm,
    color: COLORS.textMuted,
    marginTop: 2,
  },
  sectionTitle: {
    fontSize: FONT_SIZES.lg,
    fontWeight: '600',
    color: COLORS.textPrimary,
    marginBottom: SPACING.md,
  },
  statsContainer: {
    flexDirection: 'row',
    gap: SPACING.sm,
    marginBottom: SPACING.sm,
  },
  statCard: {
    flex: 1,
    alignItems: 'center',
    padding: SPACING.md,
    backgroundColor: COLORS.zinc900,
    borderRadius: BORDER_RADIUS.md,
    borderWidth: 1,
    gap: SPACING.xs,
  },
  artistsStatContainer: {
    marginBottom: SPACING.lg,
  },
  artistsStatCard: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: SPACING.md,
    backgroundColor: COLORS.zinc900,
    borderRadius: BORDER_RADIUS.md,
    borderWidth: 1,
    gap: SPACING.md,
  },
  statNumber: {
    fontSize: FONT_SIZES.xl,
    fontWeight: '700',
    color: COLORS.textPrimary,
  },
  statLabel: {
    fontSize: FONT_SIZES.xs,
    color: COLORS.textMuted,
  },
  menuContainer: {
    backgroundColor: COLORS.zinc900,
    borderRadius: BORDER_RADIUS.lg,
    overflow: 'hidden',
    marginBottom: SPACING.lg,
  },
  menuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: SPACING.md,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.zinc800,
    gap: SPACING.md,
  },
  menuIconContainer: {
    width: 40,
    height: 40,
    borderRadius: BORDER_RADIUS.md,
    alignItems: 'center',
    justifyContent: 'center',
  },
  menuContent: {
    flex: 1,
  },
  menuLabel: {
    fontSize: FONT_SIZES.md,
    fontWeight: '500',
    color: COLORS.textPrimary,
  },
  menuDescription: {
    fontSize: FONT_SIZES.sm,
    color: COLORS.textMuted,
    marginTop: 2,
  },
  comingSoonBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: SPACING.md,
    backgroundColor: COLORS.zinc900,
    borderRadius: BORDER_RADIUS.md,
    gap: SPACING.sm,
  },
  comingSoonText: {
    flex: 1,
    fontSize: FONT_SIZES.sm,
    color: COLORS.textMuted,
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
    maxWidth: 400,
    backgroundColor: COLORS.zinc900,
    borderRadius: BORDER_RADIUS.lg,
    overflow: 'hidden',
  },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: SPACING.md,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.zinc800,
  },
  modalTitle: {
    fontSize: FONT_SIZES.lg,
    fontWeight: '600',
    color: COLORS.textPrimary,
  },
  modalBody: {
    padding: SPACING.md,
  },
  inputLabel: {
    fontSize: FONT_SIZES.sm,
    fontWeight: '500',
    color: COLORS.textSecondary,
    marginBottom: SPACING.xs,
  },
  textInput: {
    backgroundColor: COLORS.zinc800,
    borderRadius: BORDER_RADIUS.md,
    padding: SPACING.sm,
    color: COLORS.textPrimary,
    fontSize: FONT_SIZES.md,
    marginBottom: SPACING.md,
    borderWidth: 1,
    borderColor: COLORS.zinc700,
  },
  textArea: {
    height: 100,
    textAlignVertical: 'top',
  },
  characterCount: {
    fontSize: FONT_SIZES.xs,
    color: COLORS.textMuted,
    textAlign: 'right',
    marginTop: -SPACING.sm,
    marginBottom: SPACING.md,
  },
  infoBox: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    padding: SPACING.sm,
    backgroundColor: COLORS.zinc800,
    borderRadius: BORDER_RADIUS.md,
    gap: SPACING.sm,
  },
  infoText: {
    flex: 1,
    fontSize: FONT_SIZES.sm,
    color: COLORS.textMuted,
  },
  modalFooter: {
    flexDirection: 'row',
    padding: SPACING.md,
    gap: SPACING.sm,
    borderTopWidth: 1,
    borderTopColor: COLORS.zinc800,
  },
  cancelButton: {
    flex: 1,
    padding: SPACING.sm,
    borderRadius: BORDER_RADIUS.md,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: COLORS.zinc800,
  },
  cancelButtonText: {
    fontSize: FONT_SIZES.md,
    fontWeight: '500',
    color: COLORS.textSecondary,
  },
  sendButton: {
    flex: 1,
    flexDirection: 'row',
    padding: SPACING.sm,
    borderRadius: BORDER_RADIUS.md,
    alignItems: 'center',
    justifyContent: 'center',
    gap: SPACING.xs,
  },
  sendButtonDisabled: {
    opacity: 0.7,
  },
  sendButtonText: {
    fontSize: FONT_SIZES.md,
    fontWeight: '600',
    color: COLORS.textPrimary,
  },
});

export default AdminScreen;
