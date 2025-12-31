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
  Pressable,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native'
import Slider from '@react-native-community/slider';
import Icon from 'react-native-vector-icons/Feather';
import { COLORS, SPACING, FONT_SIZES, BORDER_RADIUS, DIMENSIONS, ACCENT_COLORS } from '../constants/theme';
import { useAuthStore } from '../store/useAuthStore';
import { usePlayerStore } from '../store/usePlayerStore';
import { useThemeStore } from '../store/useThemeStore';
import { useEqualizerStore, EQ_PRESETS, EQ_BANDS, PresetKey, BandId } from '../store/useEqualizerStore';
import { useBackendStore, BACKEND_SERVERS, USE_DEPLOYMENT } from '../config';
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
  onChange,
  themeColor,
}: {
  value: string;
  options: { value: string; label: string }[];
  onChange: (v: string) => void;
  themeColor?: string;
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const currentLabel = options.find(o => o.value === value)?.label || value;
  const activeColor = themeColor || COLORS.primary;

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
                  option.value === value && { color: activeColor },
                ]}>
                  {option.label}
                </Text>
                {option.value === value && (
                  <Text style={[styles.selectModalCheck, { color: activeColor }]}>✓</Text>
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

  // Backend server selection
  const {
    selectedServerId,
    setSelectedServer,
    loadSelectedServer,
    serverHealthStatus,
    checkAllServersHealth,
    checkServerHealth
  } = useBackendStore();

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
    gaplessPlayback: false,
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
  const [showEqualizerModal, setShowEqualizerModal] = useState(false);

  // Equalizer store
  const {
    enabled: eqEnabled,
    preset: eqPreset,
    customBands,
    setEnabled: setEqEnabled,
    setPreset: setEqPreset,
    setBandValue,
    resetCustomBands,
    getBandValues,
    loadFromSettings: loadEqFromSettings,
  } = useEqualizerStore();

  // Handle server switching
  const handleServerSwitch = async (serverId: string) => {
    if (serverId === selectedServerId) return;

    const server = BACKEND_SERVERS.find(s => s.id === serverId);
    showConfirm(
      'Switch Server',
      `Switch to ${server?.name}?`,
      async () => {
        await setSelectedServer(serverId);
        // showError('Server Changed', 'Please restart the app for changes to take effect.');
      },
      'Switch',
      false
    );
  };

  // Load backend server preference and check health on mount
  useEffect(() => {
    loadSelectedServer();
    // Check health of all servers when Settings opens
    checkAllServersHealth();
  }, []);

  // Auto-save equalizer settings when they change
  useEffect(() => {
    // Skip initial render and when loading
    if (isLoading) return;

    // Debounce save to avoid too many API calls
    const saveTimeout = setTimeout(() => {
      saveSettings(settings);
    }, 500);

    return () => clearTimeout(saveTimeout);
  }, [eqEnabled, eqPreset, customBands]);

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

          // Load equalizer settings
          loadEqFromSettings(bs);
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
            // Equalizer settings
            equalizerEnabled: eqEnabled,
            equalizerPreset: eqPreset,
            customBands: customBands,
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
          <Text style={[styles.backIcon, { color: themeColors.primary }]}>←</Text>
          <Text style={[styles.backText, { color: themeColors.primary }]}>Back</Text>
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
          {/* <SettingItem label="Audio Quality">
            <SelectOption
              value={settings.audioQuality}
              options={[
                { value: 'low', label: 'Low' },
                { value: 'normal', label: 'Normal' },
                { value: 'high', label: 'High' },
              ]}
              onChange={(v) => update('audioQuality', v)}
              themeColor={themeColors.primary}
            />
          </SettingItem> */}
          <SettingItem label="Shuffle">
            <Toggle enabled={isShuffle} onChange={() => update('shuffle', !isShuffle)} themeColor={themeColors.primary} />
          </SettingItem>
          <SettingItem label="Repeat">
            <Toggle enabled={isLooping} onChange={() => update('loop', !isLooping)} themeColor={themeColors.primary} />
          </SettingItem>
          <SettingItem label="Crossfade">
            <Toggle enabled={settings.crossfade} onChange={() => update('crossfade', !settings.crossfade)} themeColor={themeColors.primary} />
          </SettingItem>
          {/* <SettingItem label="Gapless Playback" border={false}>
            <Toggle enabled={settings.gaplessPlayback} onChange={() => update('gaplessPlayback', !settings.gaplessPlayback)} themeColor={themeColors.primary} />
          </SettingItem> */}
          {/* <SettingItem label="Normalize Volume" border={false}>
            <Toggle enabled={settings.normalizeVolume} onChange={() => update('normalizeVolume', !settings.normalizeVolume)} themeColor={themeColors.primary} />
          </SettingItem> */}
        </Section>

        {/* EQUALIZER */}
        <SectionHeader icon="🎚️" title="EQUALIZER" />
        <Section>
          <SettingItem label="Enable Equalizer">
            <Toggle
              enabled={eqEnabled}
              onChange={() => setEqEnabled(!eqEnabled)}
              themeColor={themeColors.primary}
            />
          </SettingItem>

          {eqEnabled && (
            <>
              {/* Preset Grid */}
              <View style={styles.eqPresetContainer}>
                <Text style={styles.eqPresetLabel}>Presets</Text>
                <View style={styles.eqPresetGrid}>
                  {(Object.keys(EQ_PRESETS) as PresetKey[]).map((key) => {
                    const preset = EQ_PRESETS[key];
                    const isActive = eqPreset === key;
                    return (
                      <TouchableOpacity
                        key={key}
                        style={[
                          styles.eqPresetButton,
                          isActive && { backgroundColor: themeColors.primary, borderColor: themeColors.primary }
                        ]}
                        onPress={() => {
                          setEqPreset(key);
                          if (key === 'custom') {
                            setShowEqualizerModal(true);
                          }
                        }}
                      >
                        <Text style={styles.eqPresetIcon}>{preset.icon}</Text>
                        <Text style={[
                          styles.eqPresetName,
                          isActive && { color: '#fff' }
                        ]}>{preset.name}</Text>
                      </TouchableOpacity>
                    );
                  })}
                </View>
              </View>

              {/* Custom EQ Button */}
              <TouchableOpacity
                style={styles.eqCustomButton}
                onPress={() => setShowEqualizerModal(true)}
              >
                <Icon name="sliders" size={18} color={themeColors.primary} />
                <Text style={[styles.eqCustomButtonText, { color: themeColors.primary }]}>
                  Customize Equalizer
                </Text>
                <Icon name="chevron-right" size={18} color={COLORS.textMuted} />
              </TouchableOpacity>
            </>
          )}
        </Section>

        {/* Custom Equalizer Modal */}
        <Modal
          visible={showEqualizerModal}
          animationType="slide"
          transparent={true}
          onRequestClose={() => setShowEqualizerModal(false)}
        >
          <View style={styles.eqModalOverlay}>
            <View style={styles.eqModalContent}>
              {/* Modal Header */}
              <View style={styles.eqModalHeader}>
                <Text style={styles.eqModalTitle}>Custom Equalizer</Text>
                <TouchableOpacity onPress={() => setShowEqualizerModal(false)}>
                  <Icon name="x" size={24} color={COLORS.textPrimary} />
                </TouchableOpacity>
              </View>

              {/* Preset Info */}
              <View style={styles.eqModalPresetInfo}>
                <Text style={styles.eqModalPresetLabel}>
                  Current: <Text style={{ color: themeColors.primary }}>{EQ_PRESETS[eqPreset].name}</Text>
                </Text>
              </View>

              {/* Band Sliders */}
              <View style={styles.eqBandsContainer}>
                {EQ_BANDS.map((band) => {
                  const bandValues = getBandValues();
                  const value = bandValues[band.id];
                  return (
                    <View key={band.id} style={styles.eqBandColumn}>
                      <Text style={styles.eqBandValue}>
                        {value > 0 ? `+${value}` : value}
                      </Text>
                      <View style={styles.eqSliderContainer}>
                        <Slider
                          style={styles.eqSlider}
                          value={value}
                          minimumValue={-12}
                          maximumValue={12}
                          step={1}
                          minimumTrackTintColor={themeColors.primary}
                          maximumTrackTintColor={COLORS.zinc700}
                          thumbTintColor={themeColors.primary}
                          onValueChange={(v) => setBandValue(band.id, v)}
                        />
                      </View>
                      <Text style={styles.eqBandLabel}>{band.label}</Text>
                    </View>
                  );
                })}
              </View>

              {/* dB Labels */}
              <View style={styles.eqDbLabels}>
                <Text style={styles.eqDbLabel}>+12 dB</Text>
                <Text style={styles.eqDbLabel}>0 dB</Text>
                <Text style={styles.eqDbLabel}>-12 dB</Text>
              </View>

              {/* Actions */}
              <View style={styles.eqModalActions}>
                <TouchableOpacity
                  style={styles.eqResetButton}
                  onPress={resetCustomBands}
                >
                  <Icon name="refresh-cw" size={16} color={COLORS.textMuted} />
                  <Text style={styles.eqResetButtonText}>Reset to Flat</Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={[styles.eqDoneButton, { backgroundColor: themeColors.primary }]}
                  onPress={() => setShowEqualizerModal(false)}
                >
                  <Text style={styles.eqDoneButtonText}>Done</Text>
                </TouchableOpacity>
              </View>
            </View>
          </View>
        </Modal>

        {/* APPEARANCE */}
        <SectionHeader icon="🎨" title="APPEARANCE" />
        <Section>
          <SettingItem label="Accent Color">
            <ColorPicker selected={settings.accentColor} onChange={(c) => update('accentColor', c)} />
          </SettingItem>
          <SettingItem label="Compact Mode" border={false}>
            <Toggle enabled={settings.compactMode} onChange={() => update('compactMode', !settings.compactMode)} themeColor={themeColors.primary} />
          </SettingItem>
          {/* <SettingItem label="Layout" border={false}>
            <SelectOption
              value={settings.layout}
              options={[
                { value: 'default', label: 'Default' },
                { value: 'compact', label: 'Compact' },
                { value: 'comfortable', label: 'Comfortable' },
              ]}
              onChange={(v) => update('layout', v)}
              themeColor={themeColors.primary}
            />
          </SettingItem> */}
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
              <Text style={[styles.settingValueText, { color: themeColors.primary }]}>
                Manage →
              </Text>
            </View>
          </TouchableOpacity>
          {/* <SettingItem label="Download Quality">
            <SelectOption
              value={settings.downloadQuality}
              options={[
                { value: 'low', label: 'Low' },
                { value: 'normal', label: 'Normal' },
                { value: 'high', label: 'High' },
              ]}
              onChange={(v) => update('downloadQuality', v)}
              themeColor={themeColors.primary}
            />
          </SettingItem>
          <SettingItem label="Wi-Fi Only">
            <Toggle enabled={settings.downloadOverWifi} onChange={() => update('downloadOverWifi', !settings.downloadOverWifi)} themeColor={themeColors.primary} />
          </SettingItem>
          <SettingItem label="Auto Download" border={false}>
            <Toggle enabled={settings.autoDownload} onChange={() => update('autoDownload', !settings.autoDownload)} themeColor={themeColors.primary} />
          </SettingItem> */}
        </Section>

        {/* PRIVACY */}
        {/* <SectionHeader icon="🛡️" title="PRIVACY" />
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
              themeColor={themeColors.primary}
            />
          </SettingItem>
          <SettingItem label="Show Listening Activity">
            <Toggle enabled={settings.showListeningActivity} onChange={() => update('showListeningActivity', !settings.showListeningActivity)} themeColor={themeColors.primary} />
          </SettingItem>
          <SettingItem label="Allow Friend Requests" border={false}>
            <Toggle enabled={settings.allowFriendRequests} onChange={() => update('allowFriendRequests', !settings.allowFriendRequests)} themeColor={themeColors.primary} />
          </SettingItem>
        </Section> */}

        {/* NOTIFICATIONS */}
        {/* <SectionHeader icon="🔔" title="NOTIFICATIONS" />
        <Section>
          <SettingItem label="Email Notifications">
            <Toggle enabled={settings.emailNotifications} onChange={() => update('emailNotifications', !settings.emailNotifications)} themeColor={themeColors.primary} />
          </SettingItem>
          <SettingItem label="Push Notifications">
            <Toggle enabled={settings.pushNotifications} onChange={() => update('pushNotifications', !settings.pushNotifications)} themeColor={themeColors.primary} />
          </SettingItem>
          <SettingItem label="New Releases">
            <Toggle enabled={settings.newReleases} onChange={() => update('newReleases', !settings.newReleases)} themeColor={themeColors.primary} />
          </SettingItem>
          <SettingItem label="Friend Activity" border={false}>
            <Toggle enabled={settings.friendActivity} onChange={() => update('friendActivity', !settings.friendActivity)} themeColor={themeColors.primary} />
          </SettingItem>
        </Section> */}

        {/* SERVER - Only show when using deployment */}
        {USE_DEPLOYMENT && (
          <>
            <SectionHeader icon="🌐" title="SERVER" />
            <Section>
              {BACKEND_SERVERS.map((server, index) => {
                const isSelected = selectedServerId === server.id;
                const isLast = index === BACKEND_SERVERS.length - 1;
                const healthStatus = serverHealthStatus[server.id] || 'unknown';

                const getHealthBadge = () => {
                  switch (healthStatus) {
                    case 'online':
                      return { color: '#10b981', text: 'Online', icon: '●' };
                    case 'offline':
                      return { color: '#ef4444', text: 'Offline', icon: '●' };
                    case 'checking':
                      return { color: '#f59e0b', text: 'Checking...', icon: '○' };
                    default:
                      return { color: COLORS.textMuted, text: '', icon: '' };
                  }
                };
                const badge = getHealthBadge();

                return (
                  <TouchableOpacity
                    key={server.id}
                    style={[
                      styles.settingItem,
                      !isLast && styles.settingItemBorder
                    ]}
                    onPress={() => handleServerSwitch(server.id)}
                    onLongPress={() => checkServerHealth(server.id)}
                  >
                    <View style={styles.serverInfo}>
                      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                        <Text style={styles.settingLabel}>{server.name}</Text>
                        {isSelected && (
                          <View style={{
                            backgroundColor: themeColors.primaryMuted,
                            paddingHorizontal: 8,
                            paddingVertical: 2,
                            borderRadius: 10
                          }}>
                            <Text style={{ fontSize: 10, color: themeColors.primary, fontWeight: '600' }}>ACTIVE</Text>
                          </View>
                        )}
                      </View>
                      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 2 }}>
                        {badge.text && (
                          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
                            <Text style={{ color: badge.color, fontSize: 10 }}>{badge.icon}</Text>
                            <Text style={{ color: badge.color, fontSize: 12 }}>{badge.text}</Text>
                          </View>
                        )}
                        {server.description && badge.text && (
                          <Text style={{ color: COLORS.textMuted, fontSize: 12 }}>•</Text>
                        )}
                        {server.description && (
                          <Text style={styles.serverDescription}>{server.description}</Text>
                        )}
                      </View>
                    </View>
                    {isSelected ? (
                      <Text style={[styles.checkmark, { color: themeColors.primary }]}>✓</Text>
                    ) : (
                      <Text style={styles.actionIcon}>○</Text>
                    )}
                  </TouchableOpacity>
                );
              })}
              {/* Refresh health status button */}
              <TouchableOpacity
                style={[styles.settingItem, { justifyContent: 'center' }]}
                onPress={checkAllServersHealth}
              >
                <Text style={{ color: themeColors.primary, fontSize: 14, fontWeight: '500' }}>
                  ↻ Check Server Status
                </Text>
              </TouchableOpacity>
            </Section>
          </>
        )}

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

  // Server Switching
  serverInfo: {
    flex: 1,
  },
  serverDescription: {
    fontSize: FONT_SIZES.xs,
    color: COLORS.textMuted,
    marginTop: 2,
  },
  checkmark: {
    fontSize: 20,
    fontWeight: '600',
  },

  // Equalizer Styles
  eqPresetContainer: {
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.md,
    borderTopWidth: 1,
    borderTopColor: COLORS.zinc800,
  },
  eqPresetLabel: {
    fontSize: FONT_SIZES.sm,
    color: COLORS.textMuted,
    marginBottom: SPACING.sm,
  },
  eqPresetGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: SPACING.sm,
  },
  eqPresetButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.sm,
    backgroundColor: COLORS.zinc800,
    borderRadius: BORDER_RADIUS.lg,
    borderWidth: 1,
    borderColor: COLORS.zinc700,
    gap: SPACING.xs,
  },
  eqPresetIcon: {
    fontSize: 16,
  },
  eqPresetName: {
    fontSize: FONT_SIZES.sm,
    color: COLORS.textPrimary,
    fontWeight: '500',
  },
  eqCustomButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.lg,
    borderTopWidth: 1,
    borderTopColor: COLORS.zinc800,
    gap: SPACING.sm,
  },
  eqCustomButtonText: {
    flex: 1,
    fontSize: FONT_SIZES.md,
    fontWeight: '500',
  },

  // Equalizer Modal
  eqModalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.8)',
    justifyContent: 'flex-end',
  },
  eqModalContent: {
    backgroundColor: COLORS.zinc900,
    borderTopLeftRadius: BORDER_RADIUS.xxl,
    borderTopRightRadius: BORDER_RADIUS.xxl,
    paddingBottom: SPACING.xxl,
  },
  eqModalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: SPACING.lg,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.zinc800,
  },
  eqModalTitle: {
    fontSize: FONT_SIZES.xl,
    fontWeight: '700',
    color: COLORS.textPrimary,
  },
  eqModalPresetInfo: {
    paddingHorizontal: SPACING.lg,
    paddingVertical: SPACING.md,
  },
  eqModalPresetLabel: {
    fontSize: FONT_SIZES.sm,
    color: COLORS.textMuted,
  },
  eqBandsContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingHorizontal: SPACING.xs,
    paddingVertical: SPACING.lg,
  },
  eqBandColumn: {
    alignItems: 'center',
    width: 32,
  },
  eqBandValue: {
    fontSize: 10,
    fontWeight: '600',
    color: COLORS.textPrimary,
    marginBottom: SPACING.xs,
  },
  eqSliderContainer: {
    height: 120,
    justifyContent: 'center',
  },
  eqSlider: {
    width: 120,
    height: 32,
    transform: [{ rotate: '-90deg' }],
  },
  eqBandLabel: {
    fontSize: 9,
    color: COLORS.textMuted,
    marginTop: SPACING.xs,
  },
  eqDbLabels: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingHorizontal: SPACING.xxl,
    marginBottom: SPACING.lg,
  },
  eqDbLabel: {
    fontSize: FONT_SIZES.xs,
    color: COLORS.textMuted,
  },
  eqModalActions: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingHorizontal: SPACING.lg,
    gap: SPACING.md,
  },
  eqResetButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: SPACING.md,
    backgroundColor: COLORS.zinc800,
    borderRadius: BORDER_RADIUS.lg,
    gap: SPACING.sm,
  },
  eqResetButtonText: {
    fontSize: FONT_SIZES.md,
    color: COLORS.textMuted,
    fontWeight: '500',
  },
  eqDoneButton: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: SPACING.md,
    borderRadius: BORDER_RADIUS.lg,
  },
  eqDoneButtonText: {
    fontSize: FONT_SIZES.md,
    color: '#fff',
    fontWeight: '600',
  },
});
