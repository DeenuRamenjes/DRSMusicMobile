import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Image,
  Switch,
  ActivityIndicator,
  Modal,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import { COLORS, SPACING, FONT_SIZES, BORDER_RADIUS, DIMENSIONS, ACCENT_COLORS } from '../constants/theme';
import { useAuthStore } from '../store/useAuthStore';
import { usePlayerStore } from '../store/usePlayerStore';
import { useThemeStore } from '../store/useThemeStore';
import axiosInstance from '../api/axios';
import { CustomDialog, useDialog } from '../components/CustomDialog';

// Toggle Component - iOS Style
const Toggle = ({ enabled, onChange, themeColor }: { enabled: boolean; onChange: () => void; themeColor?: string }) => (
  <Switch
    trackColor={{ false: COLORS.zinc600, true: themeColor || COLORS.primary }}
    thumbColor={COLORS.textPrimary}
    ios_backgroundColor={COLORS.zinc600}
    onValueChange={onChange}
    value={enabled}
    style={{ transform: [{ scaleX: 0.9 }, { scaleY: 0.9 }] }}
  />
);

// Setting Item Component
const SettingItem = ({
  label,
  value,
  children,
  border = true,
}: {
  label: string;
  value?: string;
  children?: React.ReactNode;
  border?: boolean;
}) => (
  <View style={[styles.settingItem, border && styles.settingItemBorder]}>
    <Text style={styles.settingLabel}>{label}</Text>
    <View style={styles.settingValue}>
      {value && <Text style={styles.settingValueText}>{value}</Text>}
      {children}
    </View>
  </View>
);

// Section Header
const SectionHeader = ({ icon, title }: { icon: string; title: string }) => (
  <View style={styles.sectionHeader}>
    <View style={styles.sectionIconContainer}>
      <Text style={styles.sectionIcon}>{icon}</Text>
    </View>
    <Text style={styles.sectionTitle}>{title}</Text>
  </View>
);

// Section Container
const Section = ({ children }: { children: React.ReactNode }) => (
  <View style={styles.section}>
    {children}
  </View>
);

// Color Picker
const ColorPicker = ({ selected, onChange }: { selected: string; onChange: (color: string) => void }) => (
  <View style={styles.colorPicker}>
    {ACCENT_COLORS.map(color => (
      <TouchableOpacity
        key={color.id}
        onPress={() => onChange(color.id)}
        style={[
          styles.colorOption,
          { backgroundColor: color.hex },
          selected === color.id && styles.colorOptionSelected,
        ]}
      >
        {selected === color.id && (
          <Text style={styles.colorCheck}>✓</Text>
        )}
      </TouchableOpacity>
    ))}
  </View>
);

// Select Component
const SelectOption = ({ 
  value, 
  options, 
  onChange 
}: { 
  value: string; 
  options: { value: string; label: string }[]; 
  onChange: (v: string) => void;
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const currentLabel = options.find(o => o.value === value)?.label || value;

  return (
    <>
      <TouchableOpacity 
        style={styles.selectButton}
        onPress={() => setIsOpen(true)}
      >
        <Text style={styles.selectText}>{currentLabel}</Text>
        <Text style={styles.selectArrow}>›</Text>
      </TouchableOpacity>
      
      <Modal
        visible={isOpen}
        transparent
        animationType="fade"
        onRequestClose={() => setIsOpen(false)}
      >
        <TouchableOpacity 
          style={styles.selectModalOverlay}
          activeOpacity={1}
          onPress={() => setIsOpen(false)}
        >
          <View style={styles.selectModalContent}>
            {options.map(option => (
              <TouchableOpacity
                key={option.value}
                style={[
                  styles.selectModalOption,
                  option.value === value && styles.selectModalOptionActive,
                ]}
                onPress={() => {
                  onChange(option.value);
                  setIsOpen(false);
                }}
              >
                <Text style={[
                  styles.selectModalOptionText,
                  option.value === value && styles.selectModalOptionTextActive,
                ]}>
                  {option.label}
                </Text>
                {option.value === value && (
                  <Text style={styles.selectModalCheck}>✓</Text>
                )}
              </TouchableOpacity>
            ))}
          </View>
        </TouchableOpacity>
      </Modal>
    </>
  );
};

export const SettingsScreen = () => {
  const navigation = useNavigation();
  const { user, logout, isAuthenticated } = useAuthStore();
  const { dialogState, hideDialog, showError, showConfirm } = useDialog();
  const { 
    audioQuality, 
    setAudioQuality, 
    crossfade, 
    toggleCrossfade,
    isShuffle,
    isLooping,
    toggleShuffle,
    toggleLoop,
  } = usePlayerStore();
  
  const {
    accentColor: themeAccentColor,
    compactMode: themeCompactMode,
    setAccentColor: setThemeAccentColor,
    setCompactMode: setThemeCompactMode,
    colors: themeColors,
  } = useThemeStore();
  
  const [settings, setSettings] = useState({
    emailNotifications: true,
    pushNotifications: false,
    newReleases: true,
    friendActivity: true,
    profileVisibility: 'public',
    showListeningActivity: true,
    allowFriendRequests: true,
    audioQuality: 'high',
    crossfade: false,
    gaplessPlayback: true,
    normalizeVolume: false,
    shuffle: false,
    loop: false,
    accentColor: 'emerald',
    compactMode: false,
    layout: 'default',
    downloadQuality: 'high',
    downloadOverWifi: true,
    autoDownload: false,
  });

  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

  useEffect(() => {
    const loadSettings = async () => {
      try {
        const response = await axiosInstance.get('/users/me/settings');
        const bs = response.data;
        
        if (bs) {
          setSettings(prev => ({
            ...prev,
            audioQuality: bs.playback?.audioQuality || prev.audioQuality,
            crossfade: bs.playback?.crossfade ?? prev.crossfade,
            gaplessPlayback: bs.playback?.gaplessPlayback ?? prev.gaplessPlayback,
            normalizeVolume: bs.playback?.normalizeVolume ?? prev.normalizeVolume,
            shuffle: bs.playback?.shuffle ?? prev.shuffle,
            loop: bs.playback?.loop ?? prev.loop,
            accentColor: bs.display?.accentColor || prev.accentColor,
            compactMode: bs.display?.compactMode ?? prev.compactMode,
            layout: bs.display?.layout || prev.layout,
            downloadQuality: bs.downloads?.downloadQuality || prev.downloadQuality,
            downloadOverWifi: bs.downloads?.downloadOverWifi ?? prev.downloadOverWifi,
            autoDownload: bs.downloads?.autoDownload ?? prev.autoDownload,
            profileVisibility: bs.privacy?.profileVisibility || prev.profileVisibility,
            showListeningActivity: bs.privacy?.showListeningActivity ?? prev.showListeningActivity,
            allowFriendRequests: bs.privacy?.allowFriendRequests ?? prev.allowFriendRequests,
            emailNotifications: bs.notifications?.emailNotifications ?? prev.emailNotifications,
            pushNotifications: bs.notifications?.pushNotifications ?? prev.pushNotifications,
            newReleases: bs.notifications?.newReleases ?? prev.newReleases,
            friendActivity: bs.notifications?.friendActivity ?? prev.friendActivity,
          }));
          
          // Sync player store with backend settings
          if (bs.playback?.audioQuality) setAudioQuality(bs.playback.audioQuality);
          // Sync shuffle/loop only if they differ from current state
          if (bs.playback?.shuffle !== undefined && bs.playback.shuffle !== isShuffle) {
            toggleShuffle();
          }
          if (bs.playback?.loop !== undefined && bs.playback.loop !== isLooping) {
            toggleLoop();
          }
          
          // Sync theme store with backend settings
          if (bs.display?.accentColor) {
            setThemeAccentColor(bs.display.accentColor);
          }
          if (bs.display?.compactMode !== undefined) {
            setThemeCompactMode(bs.display.compactMode);
          }
        }
      } catch (error) {
        console.warn('Failed to load settings:', error);
      } finally {
        setIsLoading(false);
      }
    };
    
    if (isAuthenticated) {
      loadSettings();
    } else {
      setIsLoading(false);
    }
  }, [isAuthenticated]);

  const saveSettings = async (updated: typeof settings) => {
    setIsSaving(true);
    try {
      await axiosInstance.put('/users/me/settings', {
        settings: {
          playback: { 
            audioQuality: updated.audioQuality, 
            crossfade: updated.crossfade, 
            gaplessPlayback: updated.gaplessPlayback, 
            normalizeVolume: updated.normalizeVolume,
            shuffle: updated.shuffle,
            loop: updated.loop,
          },
          display: { 
            accentColor: updated.accentColor, 
            compactMode: updated.compactMode, 
            layout: updated.layout 
          },
          downloads: { 
            downloadQuality: updated.downloadQuality, 
            downloadOverWifi: updated.downloadOverWifi, 
            autoDownload: updated.autoDownload 
          },
          privacy: { 
            profileVisibility: updated.profileVisibility, 
            showListeningActivity: updated.showListeningActivity, 
            allowFriendRequests: updated.allowFriendRequests 
          },
          notifications: { 
            emailNotifications: updated.emailNotifications, 
            pushNotifications: updated.pushNotifications, 
            newReleases: updated.newReleases, 
            friendActivity: updated.friendActivity 
          }
        }
      });
    } catch (error) {
      console.error('Failed to save:', error);
    } finally {
      setIsSaving(false);
    }
  };

  const update = (key: string, value: any) => {
    const updated = { ...settings, [key]: value };
    setSettings(updated);
    
    // Sync player store with settings changes
    if (key === 'audioQuality') setAudioQuality(value);
    if (key === 'crossfade' && value !== crossfade) toggleCrossfade();
    if (key === 'shuffle' && value !== isShuffle) toggleShuffle();
    if (key === 'loop' && value !== isLooping) toggleLoop();
    
    // Sync theme store with settings changes
    if (key === 'accentColor') setThemeAccentColor(value);
    if (key === 'compactMode') setThemeCompactMode(value);
    
    saveSettings(updated);
  };

  const handleSignOut = () => {
    showConfirm(
      'Sign Out',
      'Are you sure you want to sign out?',
      () => logout(),
      'Sign Out',
      true
    );
  };

  const handleDeleteAccount = () => {
    showConfirm(
      'Delete Account',
      'This will permanently delete your account and all your data. This action cannot be undone.',
      async () => {
        try {
          await axiosInstance.delete('/users/me');
          logout();
        } catch (error) {
          console.error('Failed to delete account:', error);
          showError('Error', 'Failed to delete account');
        }
      },
      'Delete',
      true
    );
  };

  if (!isAuthenticated || !user) {
    return (
      <View style={styles.notSignedInContainer}>
        <Text style={styles.notSignedInIcon}>⚙️</Text>
        <Text style={styles.notSignedInText}>Please sign in to access settings</Text>
      </View>
    );
  }

  if (isLoading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={themeColors.primary} />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity 
          onPress={() => navigation.goBack()}
          style={styles.backButton}
        >
          <Text style={styles.backIcon}>←</Text>
          <Text style={styles.backText}>Back</Text>
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Settings</Text>
        <View style={styles.headerRight}>
          {isSaving && (
            <ActivityIndicator size="small" color={themeColors.primary} />
          )}
        </View>
      </View>

      <ScrollView 
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* Profile Card */}
        <View style={styles.profileCard}>
          {user.imageUrl ? (
            <Image
              source={{ uri: user.imageUrl }}
              style={styles.profileImage}
            />
          ) : (
            <View style={[styles.profileImage, styles.profileImagePlaceholder]}>
              <Text style={styles.profileImageIcon}>👤</Text>
            </View>
          )}
          <View style={styles.profileInfo}>
            <Text style={styles.profileName}>{user.fullName || 'User'}</Text>
            <Text style={styles.profileEmail}>{user.emailAddress}</Text>
          </View>
        </View>

        {/* PLAYBACK */}
        <SectionHeader icon="🎧" title="PLAYBACK" />
        <Section>
          <SettingItem label="Audio Quality">
            <SelectOption
              value={settings.audioQuality}
              options={[
                { value: 'low', label: 'Low' },
                { value: 'normal', label: 'Normal' },
                { value: 'high', label: 'High' },
              ]}
              onChange={(v) => update('audioQuality', v)}
            />
          </SettingItem>
          <SettingItem label="Shuffle">
            <Toggle enabled={isShuffle} onChange={() => update('shuffle', !isShuffle)} />
          </SettingItem>
          <SettingItem label="Repeat">
            <Toggle enabled={isLooping} onChange={() => update('loop', !isLooping)} />
          </SettingItem>
          <SettingItem label="Crossfade">
            <Toggle enabled={settings.crossfade} onChange={() => update('crossfade', !settings.crossfade)} />
          </SettingItem>
          <SettingItem label="Gapless Playback">
            <Toggle enabled={settings.gaplessPlayback} onChange={() => update('gaplessPlayback', !settings.gaplessPlayback)} />
          </SettingItem>
          <SettingItem label="Normalize Volume" border={false}>
            <Toggle enabled={settings.normalizeVolume} onChange={() => update('normalizeVolume', !settings.normalizeVolume)} />
          </SettingItem>
        </Section>

        {/* APPEARANCE */}
        <SectionHeader icon="🎨" title="APPEARANCE" />
        <Section>
          <SettingItem label="Accent Color">
            <ColorPicker selected={settings.accentColor} onChange={(c) => update('accentColor', c)} />
          </SettingItem>
          <SettingItem label="Compact Mode">
            <Toggle enabled={settings.compactMode} onChange={() => update('compactMode', !settings.compactMode)} />
          </SettingItem>
          <SettingItem label="Layout" border={false}>
            <SelectOption
              value={settings.layout}
              options={[
                { value: 'default', label: 'Default' },
                { value: 'compact', label: 'Compact' },
                { value: 'comfortable', label: 'Comfortable' },
              ]}
              onChange={(v) => update('layout', v)}
            />
          </SettingItem>
        </Section>

        {/* DOWNLOADS */}
        <SectionHeader icon="📥" title="DOWNLOADS" />
        <Section>
          <TouchableOpacity 
            style={[styles.settingItem, styles.settingItemBorder]}
            onPress={() => (navigation as any).navigate('OfflineMusic')}
          >
            <Text style={styles.settingLabel}>Offline Music</Text>
            <View style={styles.settingValue}>
              <Text style={[styles.settingValueText, { color: COLORS.primary }]}>
                Manage →
              </Text>
            </View>
          </TouchableOpacity>
          <SettingItem label="Download Quality">
            <SelectOption
              value={settings.downloadQuality}
              options={[
                { value: 'low', label: 'Low' },
                { value: 'normal', label: 'Normal' },
                { value: 'high', label: 'High' },
              ]}
              onChange={(v) => update('downloadQuality', v)}
            />
          </SettingItem>
          <SettingItem label="Wi-Fi Only">
            <Toggle enabled={settings.downloadOverWifi} onChange={() => update('downloadOverWifi', !settings.downloadOverWifi)} />
          </SettingItem>
          <SettingItem label="Auto Download" border={false}>
            <Toggle enabled={settings.autoDownload} onChange={() => update('autoDownload', !settings.autoDownload)} />
          </SettingItem>
        </Section>

        {/* PRIVACY */}
        <SectionHeader icon="🛡️" title="PRIVACY" />
        <Section>
          <SettingItem label="Profile Visibility">
            <SelectOption
              value={settings.profileVisibility}
              options={[
                { value: 'public', label: 'Public' },
                { value: 'friends', label: 'Friends' },
                { value: 'private', label: 'Private' },
              ]}
              onChange={(v) => update('profileVisibility', v)}
            />
          </SettingItem>
          <SettingItem label="Show Listening Activity">
            <Toggle enabled={settings.showListeningActivity} onChange={() => update('showListeningActivity', !settings.showListeningActivity)} />
          </SettingItem>
          <SettingItem label="Allow Friend Requests" border={false}>
            <Toggle enabled={settings.allowFriendRequests} onChange={() => update('allowFriendRequests', !settings.allowFriendRequests)} />
          </SettingItem>
        </Section>

        {/* NOTIFICATIONS */}
        <SectionHeader icon="🔔" title="NOTIFICATIONS" />
        <Section>
          <SettingItem label="Email Notifications">
            <Toggle enabled={settings.emailNotifications} onChange={() => update('emailNotifications', !settings.emailNotifications)} />
          </SettingItem>
          <SettingItem label="Push Notifications">
            <Toggle enabled={settings.pushNotifications} onChange={() => update('pushNotifications', !settings.pushNotifications)} />
          </SettingItem>
          <SettingItem label="New Releases">
            <Toggle enabled={settings.newReleases} onChange={() => update('newReleases', !settings.newReleases)} />
          </SettingItem>
          <SettingItem label="Friend Activity" border={false}>
            <Toggle enabled={settings.friendActivity} onChange={() => update('friendActivity', !settings.friendActivity)} />
          </SettingItem>
        </Section>

        {/* ACCOUNT */}
        <SectionHeader icon="👤" title="ACCOUNT" />
        <Section>
          <TouchableOpacity 
            style={[styles.settingItem, styles.settingItemBorder]}
            onPress={handleSignOut}
          >
            <Text style={styles.settingLabel}>Sign Out</Text>
            <Text style={styles.actionIcon}>→</Text>
          </TouchableOpacity>
          <TouchableOpacity 
            style={styles.settingItem}
            onPress={handleDeleteAccount}
          >
            <Text style={styles.deleteLabel}>Delete Account</Text>
            <Text style={styles.deleteIcon}>🗑️</Text>
          </TouchableOpacity>
        </Section>

        {/* App Version */}
        <Text style={styles.versionText}>Version 1.0.0</Text>

        {/* Bottom spacing */}
        <View style={{ height: DIMENSIONS.playbackHeight + SPACING.xxl }} />
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
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: COLORS.background,
  },
  notSignedInContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: COLORS.background,
  },
  notSignedInIcon: {
    fontSize: 48,
    marginBottom: SPACING.lg,
    opacity: 0.5,
  },
  notSignedInText: {
    fontSize: FONT_SIZES.md,
    color: COLORS.textMuted,
  },

  // Header
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: SPACING.lg,
    paddingVertical: SPACING.lg,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(63, 63, 70, 0.5)',
    backgroundColor: 'rgba(0, 0, 0, 0.9)',
  },
  backButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.xs,
  },
  backIcon: {
    fontSize: 20,
    color: COLORS.primary,
  },
  backText: {
    fontSize: FONT_SIZES.lg,
    color: COLORS.primary,
  },
  headerTitle: {
    fontSize: FONT_SIZES.lg,
    fontWeight: '600',
    color: COLORS.textPrimary,
  },
  headerRight: {
    width: 64,
    alignItems: 'flex-end',
  },

  // Scroll View
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: SPACING.lg,
  },

  // Profile Card
  profileCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.lg,
    marginTop: SPACING.xl,
    marginBottom: SPACING.xxl,
    padding: SPACING.lg,
    backgroundColor: 'rgba(24, 24, 27, 0.5)',
    borderRadius: BORDER_RADIUS.xxl,
  },
  profileImage: {
    width: 64,
    height: 64,
    borderRadius: 32,
  },
  profileImagePlaceholder: {
    backgroundColor: COLORS.zinc700,
    justifyContent: 'center',
    alignItems: 'center',
  },
  profileImageIcon: {
    fontSize: 32,
  },
  profileInfo: {
    flex: 1,
    minWidth: 0,
  },
  profileName: {
    fontSize: FONT_SIZES.lg,
    fontWeight: '600',
    color: COLORS.textPrimary,
  },
  profileEmail: {
    fontSize: FONT_SIZES.md,
    color: COLORS.textMuted,
    marginTop: 2,
  },

  // Section Header
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.md,
    marginBottom: SPACING.xs,
    marginTop: SPACING.xxl,
  },
  sectionIconContainer: {
    width: 32,
    height: 32,
    borderRadius: BORDER_RADIUS.lg,
    // backgroundColor: COLORS.primary,
    justifyContent: 'center',
    alignItems: 'center',
  },
  sectionIcon: {
    fontSize: 16,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: COLORS.textMuted,
    letterSpacing: 1,
  },

  // Section
  section: {
    backgroundColor: 'rgba(24, 24, 27, 0.5)',
    borderRadius: BORDER_RADIUS.xl,
    paddingHorizontal: SPACING.lg,
    marginBottom: SPACING.lg,
  },

  // Setting Item
  settingItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: SPACING.md,
  },
  settingItemBorder: {
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(63, 63, 70, 0.6)',
  },
  settingLabel: {
    fontSize: 15,
    color: COLORS.textPrimary,
  },
  settingValue: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.sm,
  },
  settingValueText: {
    fontSize: 15,
    color: COLORS.textMuted,
  },
  actionIcon: {
    fontSize: 20,
    color: COLORS.textMuted,
  },
  deleteLabel: {
    fontSize: 15,
    color: COLORS.error,
  },
  deleteIcon: {
    fontSize: 20,
  },

  // Color Picker
  colorPicker: {
    flexDirection: 'row',
    gap: SPACING.sm,
  },
  colorOption: {
    width: 28,
    height: 28,
    borderRadius: 14,
    justifyContent: 'center',
    alignItems: 'center',
  },
  colorOptionSelected: {
    borderWidth: 2,
    borderColor: COLORS.textPrimary,
  },
  colorCheck: {
    fontSize: 14,
    fontWeight: 'bold',
    color: COLORS.textPrimary,
  },

  // Select
  selectButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.xs,
  },
  selectText: {
    fontSize: 15,
    color: COLORS.textMuted,
  },
  selectArrow: {
    fontSize: 18,
    color: COLORS.textMuted,
  },
  selectModalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.8)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: SPACING.xl,
  },
  selectModalContent: {
    backgroundColor: COLORS.zinc800,
    borderRadius: BORDER_RADIUS.xl,
    width: '100%',
    maxWidth: 300,
    overflow: 'hidden',
  },
  selectModalOption: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: SPACING.lg,
    paddingVertical: SPACING.lg,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(63, 63, 70, 0.5)',
  },
  selectModalOptionActive: {
    backgroundColor: 'rgba(16, 185, 129, 0.1)',
  },
  selectModalOptionText: {
    fontSize: 16,
    color: COLORS.textPrimary,
  },
  selectModalOptionTextActive: {
    color: COLORS.primary,
  },
  selectModalCheck: {
    fontSize: 18,
    color: COLORS.primary,
  },

  // Version
  versionText: {
    textAlign: 'center',
    fontSize: 13,
    color: COLORS.textDim,
    marginTop: SPACING.xxl,
  },
});
