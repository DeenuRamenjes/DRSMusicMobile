import React, { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  StatusBar,
  TextInput,
  ActivityIndicator,
  Image,
  FlatList,
  Modal,
  RefreshControl,
  Vibration,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Icon from 'react-native-vector-icons/Feather';
import { useNavigation } from '@react-navigation/native';
import { pick, types } from '@react-native-documents/picker';
import { COLORS, SPACING, FONT_SIZES, BORDER_RADIUS } from '../constants/theme';
import { useThemeStore } from '../store/useThemeStore';
import { useAuthStore } from '../store/useAuthStore';
import { useFriendsStore } from '../store/useFriendsStore';
import axiosInstance from '../api/axios';
import { CustomDialog, useDialog } from '../components/CustomDialog';

const SECURITY_PIN = '1288';
const SUPER_ADMIN_EMAIL = 'deenuramenjes29@gmail.com';

interface AdminUser {
  _id: string;
  name: string;
  email?: string;
  image?: string;
  googleId: string;
  createdAt?: string;
  likedSongs?: string[];
}

export const ManageUsersScreen = () => {
  const navigation = useNavigation();
  const { colors: themeColors } = useThemeStore();
  const { user: currentUser } = useAuthStore();
  const { onlineUsers } = useFriendsStore();
  const { dialogState, hideDialog, showSuccess, showError, showConfirm } = useDialog();

  // Check if current user is super admin
  const isSuperAdmin = currentUser?.emailAddress === SUPER_ADMIN_EMAIL;

  // PIN Protection State
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [pin, setPin] = useState('');
  const [pinError, setPinError] = useState(false);
  const [attempts, setAttempts] = useState(0);
  const [isLockedOut, setIsLockedOut] = useState(false);
  const pinInputRef = useRef<TextInput>(null);

  const [users, setUsers] = useState<AdminUser[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');

  // Edit modal state
  const [showEditModal, setShowEditModal] = useState(false);
  const [editingUser, setEditingUser] = useState<AdminUser | null>(null);
  const [editForm, setEditForm] = useState({ name: '', email: '', image: '' });
  const [isUpdating, setIsUpdating] = useState(false);
  const [newImageFile, setNewImageFile] = useState<{ uri: string; name: string; type: string } | null>(null);

  // Handle PIN input
  const handlePinChange = (value: string) => {
    // Only allow digits
    const cleanValue = value.replace(/[^0-9]/g, '').slice(0, 4);
    setPin(cleanValue);
    setPinError(false);

    // Auto-verify when 4 digits entered
    if (cleanValue.length === 4) {
      if (cleanValue === SECURITY_PIN) {
        setIsAuthenticated(true);
        Vibration.vibrate(50);
      } else {
        setPinError(true);
        Vibration.vibrate([0, 100, 50, 100]);
        setAttempts(prev => prev + 1);

        // Clear PIN after wrong attempt
        setTimeout(() => {
          setPin('');
          pinInputRef.current?.focus();
        }, 500);

        // Lock out after 5 failed attempts
        if (attempts >= 4) {
          setIsLockedOut(true);
        }
      }
    }
  };

  // Focus PIN input on mount
  useEffect(() => {
    if (!isAuthenticated) {
      setTimeout(() => pinInputRef.current?.focus(), 100);
    }
  }, [isAuthenticated]);

  // Fetch users from admin API (only when authenticated)
  const fetchUsers = useCallback(async () => {
    if (!isAuthenticated) return;

    try {
      setIsLoading(true);
      const { data } = await axiosInstance.get('/admin/users');
      setUsers(data.users || []);
    } catch (error: any) {
      console.error('Error fetching users:', error);
      showError('Error', error.response?.data?.message || 'Failed to fetch users');
    } finally {
      setIsLoading(false);
    }
  }, [isAuthenticated]);

  useEffect(() => {
    if (isAuthenticated) {
      fetchUsers();
    }
  }, [isAuthenticated, fetchUsers]);

  const onRefresh = async () => {
    setRefreshing(true);
    await fetchUsers();
    setRefreshing(false);
  };

  // Filtered users based on search
  const filteredUsers = useMemo(() => {
    const term = searchTerm.trim().toLowerCase();
    if (!term) return users;
    return users.filter(
      (user) =>
        (user.name || '').toLowerCase().includes(term) ||
        (user.email || '').toLowerCase().includes(term)
    );
  }, [users, searchTerm]);

  const formatDate = (dateString?: string) => {
    if (!dateString) return 'Unknown';
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });
  };

  const handleEditPress = (user: AdminUser) => {
    if (!isSuperAdmin) {
      showError('Access Denied', 'Only the super admin can edit users.');
      return;
    }

    setEditingUser(user);
    setEditForm({
      name: user.name || '',
      email: user.email || '',
      image: user.image || '',
    });
    setNewImageFile(null);
    setShowEditModal(true);
  };

  const handleDeletePress = (user: AdminUser) => {
    // Only super admin can delete users
    if (!isSuperAdmin) {
      showError('Access Denied', 'Only the super admin can delete users.');
      return;
    }

    showConfirm(
      'Delete User',
      `Are you sure you want to delete "${user.name}"? This action cannot be undone.`,
      async () => {
        try {
          await axiosInstance.delete(`/admin/users/${user._id}`);
          setUsers(prev => prev.filter(u => u._id !== user._id));
          showSuccess('Success', 'User deleted successfully');
        } catch (error: any) {
          console.error('Error deleting user:', error);
          showError('Error', error.response?.data?.message || 'Failed to delete user');
        }
      },
      'Delete',
      true
    );
  };

  const selectImage = async () => {
    try {
      const result = await pick({ type: [types.images] });
      if (result && result.length > 0) {
        const file = result[0];
        setNewImageFile({
          uri: file.uri,
          name: file.name || 'image.jpg',
          type: file.type || 'image/jpeg',
        });
      }
    } catch (err: any) {
      if (err?.code !== 'DOCUMENT_PICKER_CANCELED') {
        console.error('Error picking image:', err);
      }
    }
  };

  const handleSaveEdit = async () => {
    if (!editingUser) return;

    setIsUpdating(true);
    try {
      const formData = new FormData();
      formData.append('name', editForm.name);
      formData.append('email', editForm.email);

      if (newImageFile) {
        formData.append('imageFile', {
          uri: newImageFile.uri,
          name: newImageFile.name,
          type: newImageFile.type,
        } as any);
      }

      const { data } = await axiosInstance.put(`/admin/users/${editingUser._id}`, formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });

      // Update local state
      setUsers(prev => prev.map(u => u._id === editingUser._id ? data.user : u));
      setShowEditModal(false);
      showSuccess('Success', 'User updated successfully');
    } catch (error: any) {
      console.error('Error updating user:', error);
      showError('Error', error.response?.data?.message || 'Failed to update user');
    } finally {
      setIsUpdating(false);
    }
  };

  const renderUserItem = ({ item: user }: { item: AdminUser }) => {
    const isOnline = onlineUsers.has(user.googleId);

    return (
      <View style={styles.userCard}>
        <View style={styles.avatarContainer}>
          <Image
            source={{ uri: user.image || 'https://via.placeholder.com/50' }}
            style={styles.avatar}
          />
          <View style={[styles.onlineIndicator, isOnline ? { backgroundColor: themeColors.primary } : styles.offline]} />
        </View>
        <View style={styles.userInfo}>
          <Text style={styles.userName} numberOfLines={1}>
            {user.name || 'Unknown User'}
          </Text>
          <Text style={styles.userEmail} numberOfLines={1}>
            {user.email || 'No email'}
          </Text>
          <View style={styles.userMeta}>
            <View style={styles.metaItem}>
              <Icon name="calendar" size={12} color={COLORS.textMuted} />
              <Text style={styles.metaText}>Joined {formatDate(user.createdAt)}</Text>
            </View>
            <View style={styles.metaItem}>
              <Icon name="heart" size={12} color={COLORS.textMuted} />
              <Text style={styles.metaText}>{user.likedSongs?.length || 0} liked</Text>
            </View>
          </View>
        </View>
        <View style={styles.actionButtons}>
          <TouchableOpacity
            style={[styles.actionBtn, { backgroundColor: themeColors.primaryMuted }]}
            onPress={() => handleEditPress(user)}
          >
            <Icon name="edit-2" size={16} color={themeColors.primary} />
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.actionBtn, { backgroundColor: 'rgba(239, 68, 68, 0.1)' }]}
            onPress={() => handleDeletePress(user)}
          >
            <Icon name="trash-2" size={16} color="#ef4444" />
          </TouchableOpacity>
        </View>
      </View>
    );
  };

  // PIN Entry Screen
  if (!isAuthenticated) {
    return (
      <SafeAreaView style={styles.container} edges={['top']}>
        <StatusBar barStyle="light-content" backgroundColor={COLORS.background} />

        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
            <Icon name="arrow-left" size={24} color={COLORS.textPrimary} />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Security Check</Text>
          <View style={styles.headerRight} />
        </View>

        <View style={styles.pinContainer}>
          <View style={styles.lockIconContainer}>
            <Icon name="lock" size={48} color={themeColors.primary} />
          </View>

          <Text style={styles.pinTitle}>Enter PIN</Text>
          <Text style={styles.pinSubtitle}>
            Enter your 4-digit PIN to access user management
          </Text>

          {/* PIN Dots */}
          <View style={styles.pinDotsContainer}>
            {[0, 1, 2, 3].map((index) => (
              <View
                key={index}
                style={[
                  styles.pinDot,
                  pin.length > index && styles.pinDotFilled,
                  pinError && styles.pinDotError,
                  pin.length > index && { backgroundColor: pinError ? '#ef4444' : themeColors.primary },
                ]}
              />
            ))}
          </View>

          {pinError && (
            <Text style={styles.pinErrorText}>
              Incorrect PIN. {5 - attempts} attempts remaining.
            </Text>
          )}

          {/* Hidden Input */}
          <TextInput
            ref={pinInputRef}
            style={styles.hiddenInput}
            value={pin}
            onChangeText={handlePinChange}
            keyboardType="number-pad"
            maxLength={4}
            autoFocus
            secureTextEntry
          />

          {/* Keypad hint */}
          <TouchableOpacity
            style={styles.focusButton}
            onPress={() => pinInputRef.current?.focus()}
          >
            <Icon name="edit-3" size={16} color={COLORS.textMuted} />
            <Text style={styles.focusButtonText}>Tap to enter PIN</Text>
          </TouchableOpacity>
        </View>

        {/* Lockout Dialog */}
        <CustomDialog
          visible={isLockedOut}
          title="Access Denied"
          message="Too many failed attempts. Please try again later."
          type="error"
          buttons={[{ text: 'OK', onPress: () => navigation.goBack() }]}
          onClose={() => navigation.goBack()}
        />

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
  }

  // Loading state
  if (isLoading && users.length === 0) {
    return (
      <SafeAreaView style={styles.container} edges={['top']}>
        <StatusBar barStyle="light-content" backgroundColor={COLORS.background} />
        <View style={styles.header}>
          <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
            <Icon name="arrow-left" size={24} color={COLORS.textPrimary} />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Manage Users</Text>
          <View style={styles.headerRight} />
        </View>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={themeColors.primary} />
          <Text style={styles.loadingText}>Loading users...</Text>
        </View>
      </SafeAreaView>
    );
  }

  // Main User Management Screen
  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <StatusBar barStyle="light-content" backgroundColor={COLORS.background} />

      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
          <Icon name="arrow-left" size={24} color={COLORS.textPrimary} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Manage Users</Text>
        <View style={styles.headerRight}>
          <View style={styles.verifiedBadge}>
            <Icon name="shield" size={14} color={themeColors.primary} />
          </View>
        </View>
      </View>

      {/* Search Bar */}
      <View style={styles.searchContainer}>
        <Icon name="search" size={18} color={COLORS.textMuted} />
        <TextInput
          style={styles.searchInput}
          placeholder="Search users by name or email..."
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

      {/* User Count */}
      <View style={styles.countContainer}>
        <Text style={styles.countText}>{filteredUsers.length} users</Text>
      </View>

      {/* Users List */}
      <FlatList
        data={filteredUsers}
        keyExtractor={(item) => item._id}
        renderItem={renderUserItem}
        contentContainerStyle={styles.listContent}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            tintColor={themeColors.primary}
            colors={[themeColors.primary]}
          />
        }
        ListEmptyComponent={
          <View style={styles.emptyContainer}>
            <Icon name="users" size={48} color={COLORS.textMuted} />
            <Text style={styles.emptyText}>
              {searchTerm ? 'No users found' : 'No users yet'}
            </Text>
          </View>
        }
      />

      {/* Edit Modal */}
      <Modal
        visible={showEditModal}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setShowEditModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Edit User</Text>
              <TouchableOpacity onPress={() => setShowEditModal(false)}>
                <Icon name="x" size={24} color={COLORS.textPrimary} />
              </TouchableOpacity>
            </View>

            {/* User Image */}
            <TouchableOpacity style={styles.modalImageContainer} onPress={selectImage}>
              <Image
                source={{ uri: newImageFile?.uri || editForm.image || 'https://via.placeholder.com/100' }}
                style={styles.modalImage}
              />
              <View style={styles.cameraOverlay}>
                <Icon name="camera" size={20} color="#fff" />
              </View>
            </TouchableOpacity>

            {/* Name Input */}
            <Text style={styles.modalLabel}>Name</Text>
            <TextInput
              style={styles.modalInput}
              value={editForm.name}
              onChangeText={(text) => setEditForm(prev => ({ ...prev, name: text }))}
              placeholder="User name"
              placeholderTextColor={COLORS.textMuted}
            />

            {/* Email Input */}
            <Text style={styles.modalLabel}>Email</Text>
            <TextInput
              style={styles.modalInput}
              value={editForm.email}
              onChangeText={(text) => setEditForm(prev => ({ ...prev, email: text }))}
              placeholder="Email address"
              placeholderTextColor={COLORS.textMuted}
              keyboardType="email-address"
              autoCapitalize="none"
            />

            {/* Buttons */}
            <View style={styles.modalButtons}>
              <TouchableOpacity
                style={[styles.modalButton, styles.cancelButton]}
                onPress={() => setShowEditModal(false)}
              >
                <Text style={styles.cancelButtonText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.modalButton, { backgroundColor: themeColors.primary }]}
                onPress={handleSaveEdit}
                disabled={isUpdating}
              >
                {isUpdating ? (
                  <ActivityIndicator size="small" color="#fff" />
                ) : (
                  <Text style={styles.saveButtonText}>Save Changes</Text>
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
    alignItems: 'flex-end',
  },
  verifiedBadge: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: 'rgba(16, 185, 129, 0.15)',
    justifyContent: 'center',
    alignItems: 'center',
  },

  // PIN Screen Styles
  pinContainer: {
    // translateX: 120,  
    marginTop: 150,
    // flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    // paddingHorizontal: SPACING.xl,
  },
  lockIconContainer: {
    width: 100,
    height: 100,
    borderRadius: 50,
    backgroundColor: 'rgba(16, 185, 129, 0.1)',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: SPACING.xl,
  },
  pinTitle: {
    fontSize: FONT_SIZES.xxl,
    fontWeight: '700',
    color: COLORS.textPrimary,
    marginBottom: SPACING.sm,
  },
  pinSubtitle: {
    fontSize: FONT_SIZES.md,
    color: COLORS.textMuted,
    textAlign: 'center',
    marginBottom: SPACING.xl,
  },
  pinDotsContainer: {
    flexDirection: 'row',
    gap: SPACING.md,
    marginBottom: SPACING.lg,
  },
  pinDot: {
    width: 20,
    height: 20,
    borderRadius: 10,
    borderWidth: 2,
    borderColor: COLORS.zinc600,
    backgroundColor: 'transparent',
  },
  pinDotFilled: {
    borderColor: 'transparent',
  },
  pinDotError: {
    borderColor: '#ef4444',
  },
  pinErrorText: {
    fontSize: FONT_SIZES.sm,
    color: '#ef4444',
    marginBottom: SPACING.lg,
  },
  hiddenInput: {
    position: 'absolute',
    opacity: 0,
    height: 0,
    width: 0,
  },
  focusButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.xs,
    paddingVertical: SPACING.md,
    paddingHorizontal: SPACING.lg,
    backgroundColor: COLORS.zinc800,
    borderRadius: BORDER_RADIUS.lg,
    marginTop: SPACING.md,
  },
  focusButtonText: {
    color: COLORS.textMuted,
    fontSize: FONT_SIZES.sm,
  },

  // Main screen styles
  countContainer: {
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.xs,
  },
  countText: {
    fontSize: FONT_SIZES.sm,
    color: COLORS.textMuted,
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.zinc800,
    marginHorizontal: SPACING.md,
    marginVertical: SPACING.sm,
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.sm,
    borderRadius: BORDER_RADIUS.lg,
    gap: SPACING.sm,
  },
  searchInput: {
    flex: 1,
    fontSize: FONT_SIZES.md,
    color: COLORS.textPrimary,
  },
  listContent: {
    padding: SPACING.md,
    paddingBottom: SPACING.xxl,
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
    alignItems: 'center',
    paddingVertical: SPACING.xxl,
  },
  emptyText: {
    marginTop: SPACING.md,
    color: COLORS.textMuted,
    fontSize: FONT_SIZES.md,
  },
  userCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.zinc900,
    padding: SPACING.md,
    borderRadius: BORDER_RADIUS.lg,
    marginBottom: SPACING.sm,
  },
  avatarContainer: {
    position: 'relative',
  },
  avatar: {
    width: 50,
    height: 50,
    borderRadius: 25,
    backgroundColor: COLORS.zinc800,
  },
  onlineIndicator: {
    position: 'absolute',
    bottom: 2,
    right: 2,
    width: 12,
    height: 12,
    borderRadius: 6,
    borderWidth: 2,
    borderColor: COLORS.zinc900,
  },
  online: {
    backgroundColor: '#22c55e',
  },
  offline: {
    backgroundColor: COLORS.zinc600,
  },
  userInfo: {
    flex: 1,
    marginLeft: SPACING.md,
  },
  userName: {
    fontSize: FONT_SIZES.md,
    fontWeight: '600',
    color: COLORS.textPrimary,
  },
  userEmail: {
    fontSize: FONT_SIZES.sm,
    color: COLORS.textMuted,
    marginTop: 2,
  },
  userMeta: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: SPACING.xs,
    gap: SPACING.md,
  },
  metaItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  metaText: {
    fontSize: FONT_SIZES.xs,
    color: COLORS.textMuted,
  },
  actionButtons: {
    flexDirection: 'row',
    gap: SPACING.xs,
  },
  actionBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    justifyContent: 'center',
    alignItems: 'center',
  },
  // Modal styles
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.8)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: SPACING.lg,
  },
  modalContent: {
    width: '100%',
    backgroundColor: COLORS.zinc900,
    borderRadius: BORDER_RADIUS.xl,
    padding: SPACING.lg,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: SPACING.lg,
  },
  modalTitle: {
    fontSize: FONT_SIZES.xl,
    fontWeight: '700',
    color: COLORS.textPrimary,
  },
  modalImageContainer: {
    alignSelf: 'center',
    position: 'relative',
    marginBottom: SPACING.lg,
  },
  modalImage: {
    width: 100,
    height: 100,
    borderRadius: 50,
    backgroundColor: COLORS.zinc800,
  },
  cameraOverlay: {
    position: 'absolute',
    bottom: 0,
    right: 0,
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalLabel: {
    fontSize: FONT_SIZES.sm,
    fontWeight: '500',
    color: COLORS.textSecondary,
    marginBottom: SPACING.xs,
    marginTop: SPACING.sm,
  },
  modalInput: {
    backgroundColor: COLORS.zinc800,
    borderRadius: BORDER_RADIUS.md,
    padding: SPACING.sm,
    color: COLORS.textPrimary,
    fontSize: FONT_SIZES.md,
    borderWidth: 1,
    borderColor: COLORS.zinc700,
  },
  modalButtons: {
    flexDirection: 'row',
    gap: SPACING.sm,
    marginTop: SPACING.xl,
  },
  modalButton: {
    flex: 1,
    padding: SPACING.md,
    borderRadius: BORDER_RADIUS.md,
    alignItems: 'center',
    justifyContent: 'center',
  },
  cancelButton: {
    backgroundColor: COLORS.zinc800,
  },
  cancelButtonText: {
    color: COLORS.textSecondary,
    fontSize: FONT_SIZES.md,
    fontWeight: '600',
  },
  saveButtonText: {
    color: '#fff',
    fontSize: FONT_SIZES.md,
    fontWeight: '600',
  },
});

export default ManageUsersScreen;
