import React, { useState, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Modal,
  ActivityIndicator,
  SafeAreaView,
} from 'react-native';
import { WebView, WebViewNavigation } from 'react-native-webview';
import { COLORS, SPACING, FONT_SIZES, BORDER_RADIUS } from '../constants/theme';

// Clerk configuration
const CLERK_PUBLISHABLE_KEY = 'pk_test_Z2FtZS1idW5ueS05Ny5jbGVyay5hY2NvdW50cy5kZXYk';

// Extract domain from publishable key
const getClerkDomain = (): string => {
  try {
    // pk_test_Z2FtZS1idW5ueS05Ny5jbGVyay5hY2NvdW50cy5kZXYk
    // The base64 part decodes to: game-bunny-97.clerk.accounts.dev
    const base64Part = CLERK_PUBLISHABLE_KEY.split('_')[2];
    // Remove trailing $ if present
    const cleanBase64 = base64Part.replace(/\$+$/, '');
    // Decode base64
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/=';
    let decoded = '';
    let i = 0;
    const input = cleanBase64.replace(/[^A-Za-z0-9\+\/\=]/g, '');
    while (i < input.length) {
      const enc1 = chars.indexOf(input.charAt(i++));
      const enc2 = chars.indexOf(input.charAt(i++));
      const enc3 = chars.indexOf(input.charAt(i++));
      const enc4 = chars.indexOf(input.charAt(i++));
      const chr1 = (enc1 << 2) | (enc2 >> 4);
      const chr2 = ((enc2 & 15) << 4) | (enc3 >> 2);
      const chr3 = ((enc3 & 3) << 6) | enc4;
      decoded += String.fromCharCode(chr1);
      if (enc3 !== 64) decoded += String.fromCharCode(chr2);
      if (enc4 !== 64) decoded += String.fromCharCode(chr3);
    }
    return decoded;
  } catch (e) {
    return 'game-bunny-97.clerk.accounts.dev';
  }
};

const CLERK_DOMAIN = getClerkDomain();
const CLERK_FRONTEND_API = `https://${CLERK_DOMAIN}`;

interface ClerkAuthWebViewProps {
  visible: boolean;
  onClose: () => void;
  onSuccess: (userData: {
    userId: string;
    name: string;
    email: string;
    imageUrl: string;
  }) => void;
}

export const ClerkAuthWebView: React.FC<ClerkAuthWebViewProps> = ({
  visible,
  onClose,
  onSuccess,
}) => {
  const webViewRef = useRef<WebView>(null);
  const [isLoading, setIsLoading] = useState(true);

  // Build the Clerk OAuth URL for Google Sign-In
  const getAuthUrl = () => {
    // Use Clerk's hosted sign-in page
    return `${CLERK_FRONTEND_API}/sign-in?redirect_url=${encodeURIComponent('https://drsmusic.app/auth-callback')}`;
  };

  const handleNavigationStateChange = (navState: WebViewNavigation) => {
    const { url } = navState;
    console.log('WebView URL:', url);

    // Check for successful authentication
    // Clerk redirects to the callback URL with session info
    if (url.includes('auth-callback') || url.includes('__clerk_status=verified')) {
      // Extract user info from the session
      handleAuthSuccess(url);
    }

    // Handle OAuth completion
    if (url.includes('sso-callback') || url.includes('oauth_callback')) {
      // OAuth callback - wait for redirect
      console.log('OAuth callback detected');
    }
  };

  const handleAuthSuccess = async (url: string) => {
    // For now, extract basic info and let the main app handle full sync
    // In production, you'd parse the JWT or session token from the URL
    onSuccess({
      userId: 'clerk_' + Date.now(),
      name: 'Google User',
      email: 'user@gmail.com',
      imageUrl: '',
    });
    onClose();
  };

  // Inject JavaScript to capture user data after sign-in
  const injectedJS = `
    (function() {
      // Listen for Clerk session changes
      if (window.Clerk) {
        window.Clerk.addListener(({ user }) => {
          if (user) {
            window.ReactNativeWebView.postMessage(JSON.stringify({
              type: 'user_signed_in',
              userId: user.id,
              name: user.fullName || user.firstName + ' ' + user.lastName,
              email: user.primaryEmailAddress?.emailAddress,
              imageUrl: user.imageUrl
            }));
          }
        });
      }
      
      // Also check for existing session
      setTimeout(() => {
        if (window.Clerk && window.Clerk.user) {
          const user = window.Clerk.user;
          window.ReactNativeWebView.postMessage(JSON.stringify({
            type: 'user_signed_in',
            userId: user.id,
            name: user.fullName || (user.firstName + ' ' + user.lastName).trim(),
            email: user.primaryEmailAddress?.emailAddress,
            imageUrl: user.imageUrl
          }));
        }
      }, 2000);
    })();
    true;
  `;

  const handleMessage = (event: { nativeEvent: { data: string } }) => {
    try {
      const data = JSON.parse(event.nativeEvent.data);
      if (data.type === 'user_signed_in' && data.userId) {
        onSuccess({
          userId: data.userId,
          name: data.name || 'User',
          email: data.email || '',
          imageUrl: data.imageUrl || '',
        });
        onClose();
      }
    } catch (e) {
      console.log('WebView message parse error:', e);
    }
  };

  return (
    <Modal
      visible={visible}
      animationType="slide"
      presentationStyle="pageSheet"
      onRequestClose={onClose}
    >
      <SafeAreaView style={styles.container}>
        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity onPress={onClose} style={styles.closeButton}>
            <Text style={styles.closeText}>✕ Cancel</Text>
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Sign In</Text>
          <View style={styles.placeholder} />
        </View>

        {/* Loading Indicator */}
        {isLoading && (
          <View style={styles.loadingOverlay}>
            <ActivityIndicator size="large" color={COLORS.primary} />
            <Text style={styles.loadingText}>Loading sign-in...</Text>
          </View>
        )}

        {/* WebView */}
        <WebView
          ref={webViewRef}
          source={{ uri: getAuthUrl() }}
          style={styles.webView}
          onNavigationStateChange={handleNavigationStateChange}
          onLoadStart={() => setIsLoading(true)}
          onLoadEnd={() => setIsLoading(false)}
          onMessage={handleMessage}
          injectedJavaScript={injectedJS}
          javaScriptEnabled={true}
          domStorageEnabled={true}
          thirdPartyCookiesEnabled={true}
          sharedCookiesEnabled={true}
          userAgent="Mozilla/5.0 (Linux; Android 10) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.120 Mobile Safari/537.36"
        />
      </SafeAreaView>
    </Modal>
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
    paddingHorizontal: SPACING.lg,
    paddingVertical: SPACING.md,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
    backgroundColor: COLORS.backgroundSecondary,
  },
  closeButton: {
    paddingVertical: SPACING.sm,
    paddingHorizontal: SPACING.md,
  },
  closeText: {
    color: COLORS.primary,
    fontSize: FONT_SIZES.md,
    fontWeight: '500',
  },
  headerTitle: {
    fontSize: FONT_SIZES.lg,
    fontWeight: 'bold',
    color: COLORS.textPrimary,
  },
  placeholder: {
    width: 80,
  },
  webView: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  loadingOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: COLORS.background,
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 10,
  },
  loadingText: {
    color: COLORS.textMuted,
    marginTop: SPACING.md,
    fontSize: FONT_SIZES.md,
  },
});
