import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { LogIn } from 'lucide-react-native';
import * as WebBrowser from 'expo-web-browser';
import * as Linking from 'expo-linking';
import { useAuth } from '../contexts/AuthContext';
import { API_BASE_URL } from '../api/client';
import { Theme } from '../constants/theme';

export default function LoginScreen() {
  const { login } = useAuth();
  const [loading, setLoading] = useState(false);

  // Correct URI for Expo Go (exp://...) and standalone builds (expoapp://...)
  const redirectUri = Linking.createURL('auth/callback');

  const handleLogin = async () => {
    setLoading(true);
    try {
      const authUrl = `${API_BASE_URL}/api/v1/auth/google?redirectUri=${encodeURIComponent(redirectUri)}`;
      const result = await WebBrowser.openAuthSessionAsync(authUrl, redirectUri);

      if (result.type === 'success' && result.url) {
        const url = new URL(result.url);
        const token = url.searchParams.get('token');
        if (token) {
          await login(token); // persists to SecureStore and updates context
        } else {
          Alert.alert('Sign-in failed', 'No token received from server.');
        }
      } else if (result.type === 'cancel') {
        // User dismissed — do nothing
      } else {
        Alert.alert('Sign-in failed', 'Authentication was not completed.');
      }
    } catch {
      Alert.alert('Sign-in failed', 'Something went wrong. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.content}>
        <View style={styles.header}>
          <Text style={styles.title}>YouTube Automation</Text>
          <Text style={styles.subtitle}>Streamline your content creation process</Text>
        </View>

        <View style={styles.buttonContainer}>
          <TouchableOpacity
            style={[styles.googleButton, loading && styles.disabled]}
            onPress={handleLogin}
            disabled={loading}
          >
            <LinearGradient
              colors={['#4285F4', '#34A853', '#FBBC04', '#EA4335']}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 0 }}
              style={styles.googleButtonGradient}
            >
              <View style={styles.googleButtonContent}>
                {loading ? (
                  <ActivityIndicator size="small" color="#FFFFFF" />
                ) : (
                  <LogIn size={24} color="#FFFFFF" />
                )}
                <Text style={styles.googleButtonText}>
                  {loading ? 'Signing in...' : 'Continue with Google'}
                </Text>
              </View>
            </LinearGradient>
          </TouchableOpacity>
        </View>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Theme.colors.primary,
  },
  content: {
    flex: 1,
    padding: Theme.spacing.xl,
    justifyContent: 'center',
  },
  header: {
    marginBottom: 60,
  },
  title: {
    fontSize: 32,
    fontFamily: Theme.fonts.outfit.bold,
    color: Theme.colors.textPrimary,
    marginBottom: Theme.spacing.sm,
  },
  subtitle: {
    fontSize: 16,
    fontFamily: Theme.fonts.outfit.regular,
    color: Theme.colors.textSecondary,
  },
  buttonContainer: {
    width: '100%',
  },
  googleButton: {
    width: '100%',
    borderRadius: Theme.radius.full,
    overflow: 'hidden',
    shadowColor: Theme.colors.shadow,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
  },
  disabled: {
    opacity: 0.6,
  },
  googleButtonGradient: {
    paddingVertical: 16,
    paddingHorizontal: 24,
  },
  googleButtonContent: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: Theme.spacing.md,
  },
  googleButtonText: {
    fontSize: 18,
    fontFamily: Theme.fonts.outfit.semibold,
    color: '#FFFFFF',
  },
});
