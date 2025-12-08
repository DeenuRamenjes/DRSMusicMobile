import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Dimensions,
  ActivityIndicator,
  StatusBar,
  Alert,
  Pressable,
  Modal,
} from 'react-native';
import LinearGradient from 'react-native-linear-gradient';
import { useNavigation, CommonActions } from '@react-navigation/native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { WebView } from 'react-native-webview';
import { COLORS, SPACING } from '../constants/theme';
import { useAuthStore } from '../store/useAuthStore';
import axiosInstance from '../api/axios';

const { height } = Dimensions.get('window');

// Clerk configuration - using clerk hosted pages
// The publishable key decodes to: game-bunny-97.clerk.accounts.dev
const CLERK_FRONTEND_API = 'https://game-bunny-97.accounts.dev';

export const LandingScreen = () => {
  const navigation = useNavigation();
  const { login } = useAuthStore();
  const [isSigningIn, setIsSigningIn] = useState(false);
  const [showWebView, setShowWebView] = useState(false);
  const [webViewUrl, setWebViewUrl] = useState('');

  // Handle Google Sign-In via Clerk WebView
  const handleGoogleSignIn = () => {
    console.log('Opening Clerk sign-in...');
    // Use Clerk's sign-in page - it has the Google option
    setWebViewUrl(`${CLERK_FRONTEND_API}/sign-in`);
    setShowWebView(true);
  };

  // Handle WebView navigation changes
  const handleWebViewNavigationChange = (navState: any) => {
    const { url, loading } = navState;
    console.log('WebView navigating to:', url);

    // Check for successful OAuth callback
    if (url.includes('oauth_callback') || url.includes('sso-callback')) {
      console.log('OAuth callback detected');
    }

    // Check if we're on the Clerk dashboard (successful login)
    if (url.includes('accounts.dev') && !loading) {
      // Try to get user info
    }
  };

  // Inject JS to detect successful login
  const injectedJS = `
    (function() {
      // Try to detect Clerk session
      if (typeof window !== 'undefined') {
        const checkSession = setInterval(() => {
          // Check if there's user info in the page
          if (window.Clerk && window.Clerk.user) {
            const user = window.Clerk.user;
            window.ReactNativeWebView.postMessage(JSON.stringify({
              type: 'auth_success',
              user: {
                id: user.id,
                firstName: user.firstName,
                lastName: user.lastName,
                email: user.primaryEmailAddress?.emailAddress,
                imageUrl: user.imageUrl
              }
            }));
            clearInterval(checkSession);
          }
        }, 500);
        
        // Stop checking after 30 seconds
        setTimeout(() => clearInterval(checkSession), 30000);
      }
    })();
    true;
  `;

  // Handle messages from WebView
  const handleWebViewMessage = (event: any) => {
    try {
      const data = JSON.parse(event.nativeEvent.data);
      console.log('WebView message:', data);
      
      if (data.type === 'auth_success' && data.user) {
        const { id, firstName, lastName, email, imageUrl } = data.user;
        const fullName = [firstName, lastName].filter(Boolean).join(' ') || 'User';
        handleAuthSuccess({
          id,
          name: fullName,
          email: email || '',
          imageUrl: imageUrl || '',
        });
      }
    } catch (e) {
      // Not JSON
    }
  };

  const handleAuthSuccess = async (userData: any) => {
    setShowWebView(false);
    setIsSigningIn(true);
    
    try {
      // Sync with backend
      try {
        await axiosInstance.post('/auth/callback', {
          id: userData.id,
          fullName: userData.name,
          imageUrl: userData.imageUrl,
        });
        console.log('Backend sync OK');
      } catch (err) {
        console.log('Backend sync skipped:', err);
      }

      login(
        {
          id: userData.id,
          clerkId: userData.id,
          name: userData.name,
          fullName: userData.name,
          emailAddress: userData.email,
          imageUrl: userData.imageUrl,
        },
        'clerk_session_token' // Placeholder token
      );

      navigation.dispatch(
        CommonActions.reset({
          index: 0,
          routes: [{ name: 'MainLayout' as never }],
        })
      );
    } catch (error: any) {
      Alert.alert('Error', 'Failed to complete sign in');
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

      console.log('✅ Mobile auth successful:', user.email);

      // Login with the real token from backend
      login(
        {
          id: user.id,
          clerkId: user.clerkId,
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
      Alert.alert('Error', error.response?.data?.message || 'Failed to login');
    } finally {
      setIsSigningIn(false);
    }
  };

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor="#000" />
      
      <LinearGradient
        colors={['#000000', '#0a0a1a', '#111827']}
        style={styles.gradient}
        pointerEvents="none"
      />

      <SafeAreaView style={styles.safeArea} edges={['top', 'bottom']}>
        {/* Logo */}
        <View style={styles.logoSection}>
          <View style={styles.logoCircle}>
            <Text style={styles.logoEmoji}>🎵</Text>
          </View>
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
          <Pressable
            style={({ pressed }) => [styles.googleButton, pressed && styles.pressed]}
            onPress={handleGoogleSignIn}
            disabled={isSigningIn}
          >
            <Text style={styles.googleG}>G</Text>
            <Text style={styles.googleText}>Continue with Google</Text>
          </Pressable>

          <Pressable
            style={({ pressed }) => [styles.demoButton, pressed && styles.demoPressed]}
            onPress={handleDemoLogin}
            disabled={isSigningIn}
          >
            {isSigningIn ? (
              <ActivityIndicator color={COLORS.primary} size="small" />
            ) : (
              <>
                <Text style={styles.demoEmoji}>👤</Text>
                <Text style={styles.demoText}>Continue as Demo User</Text>
              </>
            )}
          </Pressable>

          <Text style={styles.termsText}>
            By continuing, you agree to our Terms of Service and Privacy Policy
          </Text>
        </View>
      </SafeAreaView>

      {/* Clerk WebView Modal */}
      <Modal
        visible={showWebView}
        animationType="slide"
        onRequestClose={() => setShowWebView(false)}
      >
        <SafeAreaView style={styles.webViewContainer}>
          <View style={styles.webViewHeader}>
            <Pressable onPress={() => setShowWebView(false)} style={styles.closeBtn}>
              <Text style={styles.closeText}>✕ Cancel</Text>
            </Pressable>
            <Text style={styles.webViewTitle}>Sign In</Text>
            <View style={{ width: 80 }} />
          </View>
          <WebView
            source={{ 
              uri: webViewUrl || `${CLERK_FRONTEND_API}/sign-in`,
              headers: {
                'User-Agent': 'Mozilla/5.0 (Linux; Android 10) AppleWebKit/537.36 Chrome/91.0.4472.120 Mobile Safari/537.36'
              }
            }}
            style={styles.webView}
            onNavigationStateChange={handleWebViewNavigationChange}
            onMessage={handleWebViewMessage}
            injectedJavaScript={injectedJS}
            javaScriptEnabled={true}
            domStorageEnabled={true}
            thirdPartyCookiesEnabled={true}
            sharedCookiesEnabled={true}
            startInLoadingState={true}
            incognito={false}
            cacheEnabled={true}
            renderLoading={() => (
              <View style={styles.webViewLoading}>
                <ActivityIndicator size="large" color={COLORS.primary} />
                <Text style={styles.loadingText}>Loading Clerk Sign-In...</Text>
              </View>
            )}
            onError={(syntheticEvent) => {
              const { nativeEvent } = syntheticEvent;
              console.error('WebView error:', nativeEvent);
              Alert.alert('Error', 'Failed to load sign-in page. Please try demo login.');
              setShowWebView(false);
            }}
          />
        </SafeAreaView>
      </Modal>
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
    paddingTop: height * 0.06,
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
  googleG: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#4285F4',
    marginRight: 12,
  },
  googleText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#000000',
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
});
