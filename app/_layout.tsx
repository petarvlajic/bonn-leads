import AuthProvider from '@/providers/auth-provider';
import { Stack, useRouter, useSegments } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { StyleSheet } from 'react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { useAuth } from '@/providers/auth-provider';
import { useEffect, useState } from 'react';
import { fetchApi } from '@/utils/api';

function RootLayoutNav() {
  const { authState } = useAuth();
  const router = useRouter();
  const segments = useSegments();
  const [isCheckingProfile, setIsCheckingProfile] = useState(false);
  const [initialCheckDone, setInitialCheckDone] = useState(false);
  const [isMounted, setIsMounted] = useState(false);

  // Set mounted flag after first render
  useEffect(() => {
    setIsMounted(true);
  }, []);

  const checkProfile = async () => {
    if (!authState.isAuthenticated || isCheckingProfile) return;

    setIsCheckingProfile(true);
    try {
      const response = await fetchApi('/profile/me', {
        method: 'GET',
      });

      if (response.ok && response.statusCode !== 401) {
        // Profile check successful, redirect to home if not already there
        const inAppGroup = segments[0] === '(app)';
        if (!inAppGroup) {
          console.log('Redirecting to home');
          // Add small delay to ensure navigation is mounted
          setTimeout(() => {
            router.replace('/(app)/home');
          }, 100);
        }
      } else {
        // Profile check failed (401 or other error), redirect to index
        const inAuthGroup = segments[0] === '(auth)' || segments.length === 0;
        if (!inAuthGroup) {
          setTimeout(() => {
            router.replace('/');
          }, 100);
        }
      }
    } catch (error) {
      console.error('Profile check error:', error);
      // On error, redirect to index page
      const inAuthGroup = segments[0] === '(auth)' || segments.length === 0;
      if (!inAuthGroup) {
        setTimeout(() => {
          router.replace('/');
        }, 100);
      }
    } finally {
      setIsCheckingProfile(false);
      setInitialCheckDone(true);
    }
  };

  useEffect(() => {
    // Wait for auth provider to finish loading
    if (authState.loading) return;

    // Only check profile if user is authenticated
    if (authState.isAuthenticated && authState.user) {
      checkProfile();
    } else {
      // No authentication, ensure user is on auth pages
      const inAuthGroup = segments[0] === '(auth)' || segments.length === 0;
      if (!inAuthGroup) {
        setTimeout(() => {
          router.replace('/');
        }, 100);
      }
      setInitialCheckDone(true);
    }
  }, [authState.isAuthenticated, authState.loading, segments]);

  // Don't render navigation until auth state is loaded and initial check is done
  if (authState.loading || !initialCheckDone) {
    return null; // Or a loading screen component
  }

  return (
    <Stack>
      <Stack.Screen name="index" options={{ headerShown: false }} />
      <Stack.Screen name="(auth)" options={{ headerShown: false }} />
      <Stack.Screen name="(app)" options={{ headerShown: false }} />
    </Stack>
  );
}

export default function RootLayout() {
  return (
    <AuthProvider>
      <SafeAreaProvider style={styles.container}>
        <StatusBar style="auto" />
        <RootLayoutNav />
      </SafeAreaProvider>
    </AuthProvider>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
});
