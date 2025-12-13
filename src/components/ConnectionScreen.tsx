import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ActivityIndicator,
  TouchableOpacity,
  Animated,
  Easing,
  Image,
  Modal,
  Pressable,
} from 'react-native';
import { COLORS, SPACING, FONT_SIZES, BORDER_RADIUS } from '../constants/theme';
import { useConnectionStore } from '../store/useConnectionStore';
import { useThemeStore } from '../store/useThemeStore';
import { useOfflineMusicStore } from '../store/useOfflineMusicStore';
import { useBackendStore, BACKEND_SERVERS, USE_DEPLOYMENT } from '../config';
import { CustomDialog, useDialog } from './CustomDialog';
import Icon from 'react-native-vector-icons/Feather';

const DRSLogo = require('../assets/DRS-Logo.png');

interface ConnectionScreenProps {
  onRetry?: () => void;
  onOfflinePress?: () => void;
}

export const ConnectionScreen = ({ onRetry, onOfflinePress }: ConnectionScreenProps) => {
  const { 
    isConnecting, 
    connectionError, 
    retryCount, 
    maxRetries,
    checkConnection 
  } = useConnectionStore();
  const { colors: themeColors } = useThemeStore();
  const { downloadedSongs, setOfflineMode } = useOfflineMusicStore();
  const { selectedServerId, setSelectedServer, loadSelectedServer } = useBackendStore();
  const { dialogState, hideDialog, showError, showConfirm } = useDialog();
  const [serverMenuVisible, setServerMenuVisible] = useState(false);
  
  // Pulsing animation for the icon
  const pulseAnim = React.useRef(new Animated.Value(1)).current;
  const spinAnim = React.useRef(new Animated.Value(0)).current;

  useEffect(() => {
    loadSelectedServer();
  }, []);

  useEffect(() => {
    // Pulse animation
    Animated.loop(
      Animated.sequence([
        Animated.timing(pulseAnim, {
          toValue: 1.1,
          duration: 1000,
          easing: Easing.inOut(Easing.ease),
          useNativeDriver: true,
        }),
        Animated.timing(pulseAnim, {
          toValue: 1,
          duration: 1000,
          easing: Easing.inOut(Easing.ease),
          useNativeDriver: true,
        }),
      ])
    ).start();

    // Spin animation for the icon
    Animated.loop(
      Animated.timing(spinAnim, {
        toValue: 1,
        duration: 3000,
        easing: Easing.linear,
        useNativeDriver: true,
      })
    ).start();
  }, []);

  const spin = spinAnim.interpolate({
    inputRange: [0, 1],
    outputRange: ['0deg', '360deg'],
  });

  const handleRetry = () => {
    checkConnection();
    onRetry?.();
  };

  const handleOfflineMode = () => {
    setOfflineMode(true);
    onOfflinePress?.();
  };

  const handleServerSwitch = async (serverId: string) => {
    if (serverId === selectedServerId) {
      setServerMenuVisible(false);
      return;
    }
    
    setServerMenuVisible(false);
    
    const server = BACKEND_SERVERS.find(s => s.id === serverId);
    showConfirm(
      'Switch Server',
      `Switch to ${server?.name}? The app will try to connect to the new server.`,
      async () => {
        await setSelectedServer(serverId);
        // Retry connection with new server
        setTimeout(() => {
          checkConnection();
          onRetry?.();
        }, 500);
      },
      'Switch',
      false
    );
  };

  const getSelectedServerName = () => {
    const server = BACKEND_SERVERS.find(s => s.id === selectedServerId);
    return server?.name || 'Select Server';
  };

  const isMaxRetriesReached = retryCount >= maxRetries;
  const hasDownloadedSongs = downloadedSongs.length > 0;


  return (
    <View style={styles.container}>
      <View style={styles.content}>
        {/* Animated Icon */}
        <Animated.View 
          style={[
            styles.iconContainer,
            { 
              transform: [
                { rotate: spin }
              ] 
            }
          ]}
        >
            <Image source={DRSLogo} style={{ width: 100, height: 100 }} />
        </Animated.View>

        {/* Status Text */}
        <Text style={styles.title}>
          {isMaxRetriesReached ? 'Unable to Connect' : 'Connecting to Server'}
        </Text>
        
        <Text style={styles.subtitle}>
          {connectionError || 'Please wait while we connect to the server...'}
        </Text>

        {/* Progress Indicator */}
        {!isMaxRetriesReached && (
          <View style={styles.progressContainer}>
            <ActivityIndicator 
              size="small" 
              color={themeColors.primary} 
            />
            <Text style={styles.progressText}>
              Attempt {retryCount + 1} of {maxRetries}
            </Text>
          </View>
        )}

        {/* Info Box */}
        <View style={[styles.infoBox, { backgroundColor: themeColors.primaryMuted }]}>
          <Icon name="info" size={16} color={themeColors.primary} />
          <Text style={[styles.infoText, { color: themeColors.primary }]}>
            The server uses a free plan and may take up to 1 Minute to wake up. 
            Thanks for your patience!
          </Text>
        </View>

        {/* Retry Button (shown after max retries) */}
        {isMaxRetriesReached && (
          <TouchableOpacity 
            style={[styles.retryButton, { backgroundColor: themeColors.primary }]}
            onPress={handleRetry}
          >
            <Icon name="refresh-cw" size={18} color={COLORS.textPrimary} />
            <Text style={styles.retryButtonText}>Try Again</Text>
          </TouchableOpacity>
        )}

        {/* Offline Mode Option */}
        <TouchableOpacity 
          style={[
            styles.offlineButton,
            hasDownloadedSongs && { backgroundColor: themeColors.primaryMuted, paddingHorizontal: SPACING.lg, borderRadius: 30 }
          ]}
          onPress={handleOfflineMode}
        >
          <Icon name="download" size={16} color={hasDownloadedSongs ? themeColors.primary : COLORS.textMuted} />
          <Text style={[
            styles.offlineButtonText,
            hasDownloadedSongs && { color: themeColors.primary, fontWeight: '600' }
          ]}>
            {hasDownloadedSongs 
              ? `Use Offline Mode (${downloadedSongs.length} songs)`
              : 'Use Offline Mode'
            }
          </Text>
        </TouchableOpacity>

        {/* Server Selection - Only show when using deployment */}
        {USE_DEPLOYMENT && (
          <TouchableOpacity 
            style={styles.serverButton}
            onPress={() => setServerMenuVisible(true)}
          >
            <Icon name="server" size={16} color={COLORS.textMuted} />
            <Text style={styles.serverButtonText}>
              Server: {getSelectedServerName()}
            </Text>
            <Icon name="chevron-down" size={14} color={COLORS.textMuted} />
          </TouchableOpacity>
        )}
      </View>

      {/* Footer */}
      <View style={styles.footer}>
        <Text style={styles.footerText}>DRS Music</Text>
        <Text style={styles.footerSubtext}>Your music, anywhere</Text>
      </View>

      {/* Server Selection Modal */}
      {USE_DEPLOYMENT && (
        <Modal
          visible={serverMenuVisible}
          transparent
          animationType="fade"
          onRequestClose={() => setServerMenuVisible(false)}
        >
          <Pressable style={styles.modalOverlay} onPress={() => setServerMenuVisible(false)}>
            <View style={styles.serverMenuContainer}>
              <Text style={styles.serverMenuTitle}>Select Server</Text>
              <Text style={styles.serverMenuSubtitle}>
                Choose a server to connect to
              </Text>
              {BACKEND_SERVERS.map((server) => {
                const isSelected = selectedServerId === server.id;
                return (
                  <TouchableOpacity
                    key={server.id}
                    style={[styles.serverOption, isSelected && styles.serverOptionSelected]}
                    onPress={() => handleServerSwitch(server.id)}
                  >
                    <View style={styles.serverOptionInfo}>
                      <Text style={[styles.serverOptionName, isSelected && { color: themeColors.primary }]}>
                        {server.name}
                      </Text>
                      {server.description && (
                        <Text style={styles.serverOptionDesc}>{server.description}</Text>
                      )}
                    </View>
                    {isSelected && (
                      <Icon name="check" size={20} color={themeColors.primary} />
                    )}
                  </TouchableOpacity>
                );
              })}
            </View>
          </Pressable>
        </Modal>
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
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
    justifyContent: 'center',
    alignItems: 'center',
  },
  content: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: SPACING.xxl,
  },
  iconContainer: {
    marginBottom: SPACING.xl,
  },
  iconCircle: {
    width: 100,
    height: 100,
    borderRadius: 50,
    borderWidth: 3,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
  },
  title: {
    fontSize: FONT_SIZES.xxl,
    fontWeight: '700',
    color: COLORS.textPrimary,
    marginBottom: SPACING.sm,
    textAlign: 'center',
  },
  subtitle: {
    fontSize: FONT_SIZES.md,
    color: COLORS.textMuted,
    textAlign: 'center',
    marginBottom: SPACING.lg,
    lineHeight: 22,
  },
  progressContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.sm,
    marginBottom: SPACING.xl,
  },
  progressText: {
    fontSize: FONT_SIZES.sm,
    color: COLORS.textMuted,
  },
  infoBox: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    padding: SPACING.md,
    borderRadius: 12,
    gap: SPACING.sm,
    marginBottom: SPACING.xl,
    maxWidth: 320,
  },
  infoText: {
    flex: 1,
    fontSize: FONT_SIZES.sm,
    lineHeight: 20,
  },
  retryButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: SPACING.sm,
    paddingVertical: SPACING.md,
    paddingHorizontal: SPACING.xl,
    borderRadius: 30,
    marginBottom: SPACING.md,
  },
  retryButtonText: {
    fontSize: FONT_SIZES.md,
    fontWeight: '600',
    color: COLORS.textPrimary,
  },
  offlineButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.xs,
    paddingVertical: SPACING.md,
  },
  offlineButtonText: {
    fontSize: FONT_SIZES.md,
    color: COLORS.textMuted,
  },
  footer: {
    paddingBottom: SPACING.xxl,
    alignItems: 'center',
  },
  footerText: {
    fontSize: FONT_SIZES.lg,
    fontWeight: '600',
    color: COLORS.textMuted,
  },
  footerSubtext: {
    fontSize: FONT_SIZES.sm,
    color: COLORS.textDim,
    marginTop: 4,
  },
  // Server menu styles
  serverButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.xs,
    paddingVertical: SPACING.sm,
    marginTop: SPACING.md,
  },
  serverButtonText: {
    fontSize: FONT_SIZES.sm,
    color: COLORS.textMuted,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: SPACING.lg,
  },
  serverMenuContainer: {
    backgroundColor: COLORS.zinc900,
    borderRadius: BORDER_RADIUS.lg,
    width: '100%',
    maxWidth: 320,
    borderWidth: 1,
    borderColor: COLORS.zinc700,
    padding: SPACING.lg,
  },
  serverMenuTitle: {
    fontSize: FONT_SIZES.lg,
    fontWeight: '600',
    color: COLORS.textPrimary,
    textAlign: 'center',
  },
  serverMenuSubtitle: {
    fontSize: FONT_SIZES.sm,
    color: COLORS.textMuted,
    textAlign: 'center',
    marginTop: SPACING.xs,
    marginBottom: SPACING.lg,
  },
  serverOption: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: SPACING.md,
    paddingHorizontal: SPACING.md,
    borderRadius: BORDER_RADIUS.md,
    marginBottom: SPACING.xs,
  },
  serverOptionSelected: {
    backgroundColor: 'rgba(16, 185, 129, 0.1)',
  },
  serverOptionInfo: {
    flex: 1,
  },
  serverOptionName: {
    fontSize: FONT_SIZES.md,
    fontWeight: '500',
    color: COLORS.textPrimary,
  },
  serverOptionDesc: {
    fontSize: FONT_SIZES.xs,
    color: COLORS.textMuted,
    marginTop: 2,
  },
});

export default ConnectionScreen;
