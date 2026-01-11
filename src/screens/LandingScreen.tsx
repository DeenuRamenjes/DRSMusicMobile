import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Dimensions,
  ActivityIndicator,
  StatusBar,
  Pressable,
  Modal,
  Image,
  TextInput,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { useNavigation, CommonActions } from '@react-navigation/native';
import { SafeAreaView } from 'react-native-safe-area-context';
import {
  GoogleSignin,
  statusCodes,
} from '@react-native-google-signin/google-signin';
import { COLORS, SPACING } from '../constants/theme';
import { useAuthStore } from '../store/useAuthStore';
import { useThemeStore } from '../store/useThemeStore';
import { USE_DEPLOYMENT } from '../config';
import axiosInstance from '../api/axios';
import { CustomDialog, useDialog } from '../components/CustomDialog';
const DRSLogo = require('../assets/DRS-Logo.png');

const { height } = Dimensions.get('window');

// Google Sign-In Configuration
// Web Client ID from Firebase project drs-music-ea7c6 (207781069300)
const WEB_CLIENT_ID = '207781069300-4lpf8lsjfp5ind0lf8r4boln7c4ajotp.apps.googleusercontent.com';

export const LandingScreen = () => {
  const navigation = useNavigation();
  const { login } = useAuthStore();
  const { colors: themeColors } = useThemeStore();
  const { dialogState, hideDialog, showError } = useDialog();
  const [isSigningIn, setIsSigningIn] = useState(false);

  // Email login states
  const [showEmailLogin, setShowEmailLogin] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');

  // Configure Google Sign-In on mount
  useEffect(() => {
    GoogleSignin.configure({
      webClientId: WEB_CLIENT_ID,
      offlineAccess: false,
    });
  }, []);

  // Handle Google Sign-In via native SDK
  const handleGoogleSignIn = async () => {
    if (isSigningIn) return;
    setIsSigningIn(true);

    try {
      // Check if Google Play Services are available
      await GoogleSignin.hasPlayServices({ showPlayServicesUpdateDialog: true });

      // Perform the sign-in
      const response = await GoogleSignin.signIn();

      if (response.type === 'success' && response.data?.user) {
        const { user } = response.data;

        // Call our backend with the Google user info
        await handleAuthSuccess({
          id: user.id,
          name: user.name || user.givenName || 'User',
          email: user.email,
          imageUrl: user.photo || '',
        });
      } else {
        // User cancelled or sign-in was not successful
        setIsSigningIn(false);
      }
    } catch (error: any) {
      console.error('Google Sign-In Error:', error);
      setIsSigningIn(false);

      if (error.code === statusCodes.SIGN_IN_CANCELLED) {
        // User cancelled - no need to show error
      } else if (error.code === statusCodes.IN_PROGRESS) {
        showError('Sign In', 'Sign in is already in progress');
      } else if (error.code === statusCodes.PLAY_SERVICES_NOT_AVAILABLE) {
        showError('Error', 'Google Play Services is not available');
      } else {
        showError('Error', error.message || 'Failed to sign in with Google');
      }
    }
  };

  const handleAuthSuccess = async (userData: any) => {
    setIsSigningIn(true);

    try {
      // Get a proper mobile token from the backend
      const response = await axiosInstance.post('/auth/mobile', {
        email: userData.email || '',
        name: userData.name,
        imageUrl: userData.imageUrl,
        googleId: userData.id, // Pass Google ID for sync
      });

      const { user, token } = response.data;

      if (!user || !token) {
        throw new Error('Invalid response from auth server');
      }

      login(
        {
          id: user.id || user._id,
          googleId: user.googleId || userData.id,
          name: user.name || userData.name,
          fullName: user.fullName || userData.name,
          emailAddress: user.email || userData.email,
          imageUrl: user.imageUrl || userData.imageUrl,
        },
        token
      );

      navigation.dispatch(
        CommonActions.reset({
          index: 0,
          routes: [{ name: 'MainLayout' as never }],
        })
      );
    } catch (error: any) {
      console.error('Auth error:', error);
      showError('Error', 'Failed to complete sign in');
    } finally {
      setIsSigningIn(false);
    }
  };

  const handleDemoLogin = async () => {
    if (isSigningIn) return;
    setIsSigningIn(true);

    try {
      // Use the mobile auth endpoint to get a proper token
      const response = await axiosInstance.post('/auth/mobile', {
        email: 'demo@drsmusic.com',
        name: 'DRS User',
        imageUrl: '',
      });

      const { user, token } = response.data;

      if (!user || !token) {
        throw new Error('Invalid response from auth server');
      }

      login(
        {
          id: user.id,
          googleId: user.googleId,
          name: user.name,
          fullName: user.name,
          emailAddress: user.email,
          imageUrl: user.imageUrl || '',
        },
        token  // Use the real token from backend
      );

      navigation.dispatch(
        CommonActions.reset({
          index: 0,
          routes: [{ name: 'MainLayout' as never }],
        })
      );
    } catch (error: any) {
      console.error('Mobile auth error:', error);
      showError('Error', error.response?.data?.message || 'Failed to login');
    } finally {
      setIsSigningIn(false);
    }
  };

  // Handle Email/Password Login
  const handleEmailLogin = async () => {
    if (isSigningIn) return;

    // Validate inputs
    if (!email.trim()) {
      showError('Error', 'Please enter your email address');
      return;
    }
    if (!password.trim()) {
      showError('Error', 'Please enter your password');
      return;
    }

    setIsSigningIn(true);

    try {
      // Call the email login endpoint
      const response = await axiosInstance.post('/auth/email-login', {
        email: email.trim().toLowerCase(),
        password: password,
      });

      const { user, token } = response.data;

      if (!user || !token) {
        throw new Error('Invalid response from auth server');
      }

      // Close modal and clear inputs
      setShowEmailLogin(false);
      setEmail('');
      setPassword('');

      login(
        {
          id: user.id || user._id,
          googleId: user.googleId,
          name: user.name,
          fullName: user.name,
          emailAddress: user.email,
          imageUrl: user.imageUrl || '',
        },
        token
      );

      navigation.dispatch(
        CommonActions.reset({
          index: 0,
          routes: [{ name: 'MainLayout' as never }],
        })
      );
    } catch (error: any) {
      console.error('Email login error:', error);
      const errorMessage = error.response?.data?.message || 'Invalid email or password';
      showError('Login Failed', errorMessage);
    } finally {
      setIsSigningIn(false);
    }
  };

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor="#000" />

      <SafeAreaView style={styles.safeArea} edges={['top', 'bottom']}>
        {/* Logo */}
        <View style={styles.logoSection}>
          <Image source={DRSLogo} style={styles.DRSLogo} />
          <Text style={styles.appName}>DRS Music</Text>
          <Text style={styles.tagline}>Your music, your way</Text>
        </View>

        {/* Features */}
        <View style={styles.featuresSection}>
          <FeatureRow icon="🎧" title="High Quality Audio" desc="Stream in HD quality" />
          <FeatureRow icon="📥" title="Offline Mode" desc="Download and listen anywhere" />
          <FeatureRow icon="👥" title="Social Features" desc="Connect with friends" />
        </View>

        {/* Buttons */}
        <View style={styles.buttonSection}>
          {/* <Text style={styles.loginText}>Login with Google</Text> */}
          <Pressable
            style={({ pressed }) => [styles.googleButton, pressed && styles.pressed]}
            onPress={handleGoogleSignIn}
            disabled={isSigningIn}
          >
            <Image
              source={{ uri: 'https://www.google.com/favicon.ico' }}
              style={styles.googleLogo}
              resizeMode="contain"
              defaultSource={{ uri: 'https://www.google.com/favicon.ico' }}
            />
            <Text style={styles.googleText}>Continue with Google</Text>
          </Pressable>

          <Text style={styles.loginText}>or</Text>

          {/* Email Login Button */}
          <Pressable
            style={({ pressed }) => [styles.emailButton, pressed && styles.emailButtonPressed]}
            onPress={() => setShowEmailLogin(true)}
            disabled={isSigningIn}
          >
            <Text style={styles.emailIcon}>✉️</Text>
            <Text style={styles.emailButtonText}>Sign in with Email</Text>
          </Pressable>

          {/* Demo login - only show in local development */}
          {!USE_DEPLOYMENT && (
            <Pressable
              style={({ pressed }) => [
                styles.demoButton,
                { borderColor: themeColors.primary, backgroundColor: themeColors.primary + '30' },
                pressed && styles.demoPressed
              ]}
              onPress={handleDemoLogin}
              disabled={isSigningIn}
            >
              {isSigningIn ? (
                <ActivityIndicator color={themeColors.primary} size="small" />
              ) : (
                <>
                  <Text style={styles.demoEmoji}>👤</Text>
                  <Text style={[styles.demoText, { color: themeColors.primary }]}>Continue as Demo User</Text>
                </>
              )}
            </Pressable>
          )}

          <Text style={styles.termsText}>
            By continuing, you agree to our Terms of Service and Privacy Policy
          </Text>
        </View>
      </SafeAreaView>

      {/* Email Login Modal */}
      <Modal
        visible={showEmailLogin}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setShowEmailLogin(false)}
      >
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
          style={styles.emailModalOverlay}
        >
          <View style={styles.emailModalContent}>
            <View style={styles.emailModalHeader}>
              <Text style={styles.emailModalTitle}>Sign In</Text>
              <Pressable onPress={() => { setShowEmailLogin(false); setEmail(''); setPassword(''); }}>
                <Text style={styles.emailModalClose}>✕</Text>
              </Pressable>
            </View>

            <Text style={styles.emailModalSubtitle}>
              Sign in with your email. Google users can also use this to set up email/password login.
            </Text>

            <View style={styles.inputContainer}>
              <Text style={styles.inputLabel}>Email</Text>
              <TextInput
                style={styles.textInput}
                placeholder="your@email.com"
                placeholderTextColor={COLORS.textMuted}
                value={email}
                onChangeText={setEmail}
                keyboardType="email-address"
                autoCapitalize="none"
                autoCorrect={false}
              />
            </View>

            <View style={styles.inputContainer}>
              <Text style={styles.inputLabel}>Password</Text>
              <TextInput
                style={styles.textInput}
                placeholder="••••••••"
                placeholderTextColor={COLORS.textMuted}
                value={password}
                onChangeText={setPassword}
                secureTextEntry={true}
                autoCapitalize="none"
              />
            </View>

            <Pressable
              style={({ pressed }) => [
                styles.emailLoginButton,
                { backgroundColor: themeColors.primary },
                pressed && { opacity: 0.8 }
              ]}
              onPress={handleEmailLogin}
              disabled={isSigningIn}
            >
              {isSigningIn ? (
                <ActivityIndicator color="#fff" size="small" />
              ) : (
                <Text style={styles.emailLoginButtonText}>Sign In</Text>
              )}
            </Pressable>

            {/* <Text style={styles.emailModalNote}>
              Google users can also use this to set up email/password login.
            </Text> */}
          </View>
        </KeyboardAvoidingView>
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
    </View>
  );
};

const FeatureRow = ({ icon, title, desc }: { icon: string; title: string; desc: string }) => (
  <View style={styles.featureRow}>
    <Text style={styles.featureEmoji}>{icon}</Text>
    <View>
      <Text style={styles.featureTitle}>{title}</Text>
      <Text style={styles.featureDesc}>{desc}</Text>
    </View>
  </View>
);

const styles = StyleSheet.create({
  DRSLogo: {
    width: 120,
    height: 120,
  },
  loginText: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#fff',
    textAlign: 'center',
    // marginTop: 16,
    marginBottom: 16,
  },
  container: {
    flex: 1,
    backgroundColor: '#000',
  },
  gradient: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
  },
  safeArea: {
    flex: 1,
  },
  logoSection: {
    alignItems: 'center',
    paddingTop: height * 0.08,
    paddingBottom: SPACING.xl,
  },
  logoCircle: {
    width: 100,
    height: 100,
    borderRadius: 30,
    backgroundColor: COLORS.primary,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16,
  },
  logoEmoji: {
    fontSize: 48,
  },
  appName: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#FFFFFF',
  },
  tagline: {
    fontSize: 16,
    color: '#888888',
    marginTop: 8,
  },
  featuresSection: {
    flex: 1,
    paddingHorizontal: 24,
    justifyContent: 'center',
  },
  featureRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 20,
  },
  featureEmoji: {
    fontSize: 28,
    marginRight: 16,
    width: 50,
    textAlign: 'center',
  },
  featureTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  featureDesc: {
    fontSize: 13,
    color: '#888888',
    marginTop: 2,
  },
  buttonSection: {
    paddingHorizontal: 24,
    paddingBottom: 24,
  },
  googleButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#FFFFFF',
    paddingVertical: 16,
    borderRadius: 30,
    marginBottom: 12,
  },
  pressed: {
    backgroundColor: '#E0E0E0',
    transform: [{ scale: 0.98 }],
  },
  googleLogo: {
    width: 24,
    height: 24,
    marginRight: 12,
  },
  googleText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#000000ff',
  },
  demoButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: COLORS.primary,
    paddingVertical: 14,
    borderRadius: 30,
    marginBottom: 16,
  },
  demoPressed: {
    backgroundColor: COLORS.primary + '30',
  },
  demoEmoji: {
    fontSize: 18,
    marginRight: 8,
  },
  demoText: {
    fontSize: 16,
    fontWeight: '600',
    color: COLORS.primary,
  },
  termsText: {
    fontSize: 12,
    color: '#666666',
    textAlign: 'center',
  },
  // WebView styles
  webViewContainer: {
    flex: 1,
    backgroundColor: '#fff',
  },
  webViewHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#ddd',
    backgroundColor: '#fff',
  },
  closeBtn: {
    padding: 8,
  },
  closeText: {
    color: '#007AFF',
    fontSize: 16,
    fontWeight: '500',
  },
  webViewTitle: {
    color: '#000',
    fontSize: 17,
    fontWeight: '600',
  },
  webView: {
    flex: 1,
    backgroundColor: '#fff',
  },
  webViewLoading: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#fff',
  },
  loadingText: {
    marginTop: 12,
    color: '#666',
    fontSize: 14,
  },
  // Email Login Button styles
  emailButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'transparent',
    borderWidth: 2,
    borderColor: '#71717a',
    paddingVertical: 14,
    borderRadius: 30,
    marginBottom: 12,
  },
  emailButtonPressed: {
    backgroundColor: 'rgba(113, 113, 122, 0.2)',
  },
  emailIcon: {
    fontSize: 18,
    marginRight: 8,
  },
  emailButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  // Email Modal styles
  emailModalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.8)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  emailModalContent: {
    width: '100%',
    maxWidth: 400,
    backgroundColor: '#18181b',
    borderRadius: 24,
    padding: 24,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
  },
  emailModalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  emailModalTitle: {
    fontSize: 24,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  emailModalClose: {
    fontSize: 24,
    color: '#71717a',
    padding: 4,
  },
  emailModalSubtitle: {
    fontSize: 14,
    color: '#71717a',
    marginBottom: 24,
  },
  inputContainer: {
    marginBottom: 16,
  },
  inputLabel: {
    fontSize: 14,
    fontWeight: '500',
    color: '#FFFFFF',
    marginBottom: 8,
  },
  textInput: {
    backgroundColor: '#27272a',
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 14,
    fontSize: 16,
    color: '#FFFFFF',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
  },
  emailLoginButton: {
    paddingVertical: 16,
    borderRadius: 30,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 8,
    marginBottom: 16,
  },
  emailLoginButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  emailModalNote: {
    fontSize: 12,
    color: '#71717a',
    textAlign: 'center',
  },
});
