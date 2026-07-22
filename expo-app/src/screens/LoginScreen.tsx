import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, SafeAreaView } from 'react-native';
import { Theme } from '../constants/theme';
import { LinearGradient } from 'expo-linear-gradient';
import { LogIn } from 'lucide-react-native';

interface LoginScreenProps {
  onLogin: () => void;
}

export default function LoginScreen({ onLogin }: LoginScreenProps) {
  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.content}>
        <View style={styles.header}>
          <Text style={styles.title}>YouTube Automation</Text>
          <Text style={styles.subtitle}>Streamline your content creation process</Text>
        </View>

        <View style={styles.buttonContainer}>
          <TouchableOpacity style={styles.googleButton} onPress={onLogin}>
            <LinearGradient
              colors={['#4285F4', '#34A853', '#FBBC04', '#EA4335']}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 0 }}
              style={styles.googleButtonGradient}
            >
              <View style={styles.googleButtonContent}>
                <LogIn size={24} color="#FFFFFF" />
                <Text style={styles.googleButtonText}>Continue with Google</Text>
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
