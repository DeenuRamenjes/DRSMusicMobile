import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Animated,
  TouchableOpacity,
  Dimensions,
  AppState,
} from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import Icon from 'react-native-vector-icons/Feather';
import { COLORS, SPACING, FONT_SIZES, BORDER_RADIUS } from '../constants/theme';
import { useThemeStore } from '../store/useThemeStore';
import { setNotificationCallback } from '../store/useFriendsStore';
import { createNotificationChannel, showMessageNotification, showGeneralNotification } from '../services/NotificationService';

interface Notification {
  id: string;
  title: string;
  message: string;
  timestamp: number;
}

const { width } = Dimensions.get('window');

export const NotificationBanner: React.FC = () => {
  const [notification, setNotification] = useState<Notification | null>(null);
  const slideAnim = useRef(new Animated.Value(-100)).current;
  const { colors: themeColors } = useThemeStore();
  const insets = useSafeAreaInsets();
  const appStateRef = useRef(AppState.currentState);

  // Initialize notification channels on mount
  useEffect(() => {
    createNotificationChannel();
  }, []);

  // Set up the notification callback
  useEffect(() => {
    setNotificationCallback((title: string, body: string, data?: any) => {
      const newNotification: Notification = {
        id: data?.id || Date.now().toString(),
        title,
        message: body,
        timestamp: Date.now(),
      };
      
      // Show in-app banner
      setNotification(newNotification);
      
      // Also show system push notification if data indicates it's a message
      if (data?.userId) {
        showMessageNotification(title, body, data);
      }
    });

    // Track app state
    const subscription = AppState.addEventListener('change', (nextAppState) => {
      appStateRef.current = nextAppState;
    });

    return () => {
      setNotificationCallback(() => {});
      subscription.remove();
    };
  }, []);

  // Animate in/out when notification changes
  useEffect(() => {
    if (notification) {
      // Slide in
      Animated.spring(slideAnim, {
        toValue: 0,
        useNativeDriver: true,
        tension: 80,
        friction: 10,
      }).start();

      // Auto-dismiss after 5 seconds
      const timer = setTimeout(() => {
        dismissNotification();
      }, 5000);

      return () => clearTimeout(timer);
    }
  }, [notification]);

  const dismissNotification = () => {
    Animated.timing(slideAnim, {
      toValue: -150,
      duration: 300,
      useNativeDriver: true,
    }).start(() => {
      setNotification(null);
    });
  };

  if (!notification) return null;

  return (
    <Animated.View
      style={[
        styles.container,
        {
          transform: [{ translateY: slideAnim }],
          top: insets.top + SPACING.xs,
        },
      ]}
    >
      <TouchableOpacity
        style={[styles.banner, { borderColor: themeColors.primary }]}
        activeOpacity={0.9}
        onPress={dismissNotification}
      >
        <View style={[styles.iconContainer, { backgroundColor: themeColors.primaryMuted }]}>
          <Icon name="bell" size={20} color={themeColors.primary} />
        </View>
        <View style={styles.content}>
          <Text style={styles.title} numberOfLines={1}>
            {notification.title}
          </Text>
          <Text style={styles.message} numberOfLines={2}>
            {notification.message}
          </Text>
        </View>
        <TouchableOpacity onPress={dismissNotification} style={styles.closeButton}>
          <Icon name="x" size={16} color={COLORS.textMuted} />
        </TouchableOpacity>
      </TouchableOpacity>
    </Animated.View>
  );
};

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    left: SPACING.md,
    right: SPACING.md,
    zIndex: 9999,
    elevation: 9999,
  },
  banner: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.zinc900,
    borderRadius: BORDER_RADIUS.lg,
    padding: SPACING.sm,
    gap: SPACING.sm,
    borderWidth: 1,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
  },
  iconContainer: {
    width: 40,
    height: 40,
    borderRadius: BORDER_RADIUS.md,
    alignItems: 'center',
    justifyContent: 'center',
  },
  content: {
    flex: 1,
  },
  title: {
    fontSize: FONT_SIZES.md,
    fontWeight: '600',
    color: COLORS.textPrimary,
  },
  message: {
    fontSize: FONT_SIZES.sm,
    color: COLORS.textSecondary,
    marginTop: 2,
  },
  closeButton: {
    padding: SPACING.xs,
  },
});

export default NotificationBanner;
