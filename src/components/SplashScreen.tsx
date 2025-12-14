import React, { useEffect, useRef, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Animated,
  Easing,
  Image,
  Dimensions,
} from 'react-native';
import Icon from 'react-native-vector-icons/Feather';
import { COLORS, FONT_SIZES, SPACING } from '../constants/theme';
import { useThemeStore } from '../store/useThemeStore';

const DRSLogo = require('../assets/DRS-Logo.png');
const { width: SCREEN_WIDTH } = Dimensions.get('window');

interface SplashScreenProps {
  onAnimationComplete?: () => void;
  message?: string;
}

export const SplashScreen = ({ 
  onAnimationComplete, 
  message = 'Loading...',
}: SplashScreenProps) => {
  const { colors: themeColors } = useThemeStore();
  const [animationDone, setAnimationDone] = useState(false);
  
  // Animation values
  const logoOpacity = useRef(new Animated.Value(0)).current;
  const logoScale = useRef(new Animated.Value(0.5)).current;
  const contentTranslateX = useRef(new Animated.Value(120)).current; // Content starts offset to right (only logo visible at center)
  const textOpacity = useRef(new Animated.Value(0)).current;
  const messageOpacity = useRef(new Animated.Value(0)).current;
  const pulseAnim = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    // Animation sequence
    const runAnimation = () => {
      // Step 1: Logo appears at CENTER of screen (0-600ms)
      // The whole row starts shifted right so only logo appears centered
      Animated.parallel([
        Animated.timing(logoOpacity, {
          toValue: 1,
          duration: 500,
          useNativeDriver: true,
        }),
        Animated.spring(logoScale, {
          toValue: 1,
          tension: 50,
          friction: 7,
          useNativeDriver: true,
        }),
      ]).start(() => {
        // Step 2: Move the whole row left to center it, revealing text (600-1200ms)
        setTimeout(() => {
          Animated.parallel([
            // Move content left to center the full logo+text
            Animated.timing(contentTranslateX, {
              toValue: 0,
              duration: 600,
              easing: Easing.out(Easing.cubic),
              useNativeDriver: true,
            }),
            // Text fades in (slightly delayed)
            Animated.sequence([
              Animated.delay(150),
              Animated.timing(textOpacity, {
                toValue: 1,
                duration: 400,
                easing: Easing.out(Easing.ease),
                useNativeDriver: true,
              }),
            ]),
          ]).start(() => {
            // Step 3: Show message and footer (1200-1600ms)
            Animated.timing(messageOpacity, {
              toValue: 1,
              duration: 400,
              useNativeDriver: true,
            }).start(() => {
              // Wait 1.5 seconds for user to see the complete splash with footer
              setTimeout(() => {
                setAnimationDone(true);
              }, 1500);
            });
          });
        }, 400);
      });
    };

    runAnimation();

    // Subtle pulse after animation settles
    setTimeout(() => {
      Animated.loop(
        Animated.sequence([
          Animated.timing(pulseAnim, {
            toValue: 1.03,
            duration: 1200,
            easing: Easing.inOut(Easing.ease),
            useNativeDriver: true,
          }),
          Animated.timing(pulseAnim, {
            toValue: 1,
            duration: 1200,
            easing: Easing.inOut(Easing.ease),
            useNativeDriver: true,
          }),
        ])
      ).start();
    }, 1800);
  }, []);

  // Notify parent when animation completes
  useEffect(() => {
    if (animationDone && onAnimationComplete) {
      onAnimationComplete();
    }
  }, [animationDone, onAnimationComplete]);

  return (
    <View style={styles.container}>
      {/* Brand Row - Logo and Text together */}
      <Animated.View
        style={[
          styles.brandRow,
          {
            transform: [{ translateX: contentTranslateX }],
          },
        ]}
      >
        {/* Logo */}
        <Animated.View
          style={[
            styles.logoContainer,
            {
              opacity: logoOpacity,
              transform: [
                { scale: Animated.multiply(logoScale, pulseAnim) },
              ],
            },
          ]}
        >
          <Image source={DRSLogo} style={styles.logo} resizeMode="contain" />
        </Animated.View>

        {/* Text */}
        <Animated.View
          style={[
            styles.textContainer,
            {
              opacity: textOpacity,
            },
          ]}
        >
          <Text style={styles.appName}>
            DRS <Text style={[styles.appNameAccent, { color: themeColors.primary }]}>Music</Text>
          </Text>
        </Animated.View>
      </Animated.View>

      {/* Loading Message */}
      <Animated.View style={[styles.messageContainer, { opacity: messageOpacity }]}>
        <Text style={styles.message}>{message}</Text>
      </Animated.View>

      {/* Tagline Footer */}
      <Animated.View 
        style={[
          styles.footer, 
          { opacity: messageOpacity }
        ]}
      >
        <Icon name="disc" size={18} color={themeColors.primary} />
        <Text style={styles.footerText}>Your music, anywhere</Text>
        <Icon name="disc" size={18} color={themeColors.primary} />
      </Animated.View>
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
  brandRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  logoContainer: {
    width: 100,
    height: 100,
    justifyContent: 'center',
    alignItems: 'center',
  },
  logo: {
    width: 95,
    height: 95,
  },
  textContainer: {
    marginLeft: SPACING.sm,
  },
  appName: {
    fontSize: 42,
    fontWeight: '700',
    color: COLORS.textPrimary,
  },
  appNameAccent: {
    fontWeight: '700',
  },
  messageContainer: {
    marginTop: SPACING.xxl,
    alignItems: 'center',
  },
  message: {
    fontSize: FONT_SIZES.md,
    color: COLORS.textMuted,
  },
  footer: {
    position: 'absolute',
    bottom: SPACING.xxl,
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.sm,
  },
  footerText: {
    fontSize: FONT_SIZES.sm,
    color: COLORS.textMuted,
    fontWeight: '500',
  },
});

export default SplashScreen;
