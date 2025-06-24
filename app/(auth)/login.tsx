import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Alert,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { Link } from 'expo-router';
import { colors, fontSizes, fontWeights, spacing } from '../../styles/theme';
import Card from '../../components/ui/card';
import Input from '../../components/ui/input';
import Button from '../../components/ui/button';
import Header from '../../components/ui/header';
import { useAuth } from '../../providers/auth-provider';
import { SafeAreaView } from 'react-native-safe-area-context';

export default function LoginScreen() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const { authState, login, clearError } = useAuth();

  // Clear error when component mounts or when user starts typing
  useEffect(() => {
    if (authState.error) {
      clearError();
    }
  }, [email, password]);

  // Show error alert when error occurs
  useEffect(() => {
    if (authState.error && !isSubmitting) {
      Alert.alert('Login Failed', authState.error);
    }
  }, [authState.error, isSubmitting]);

  const validateForm = () => {
    // Basic validation
    if (!email || !password) {
      Alert.alert('Error', 'Please fill in all fields');
      return false;
    }

    // Email validation
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      Alert.alert('Error', 'Please enter a valid email address');
      return false;
    }

    return true;
  };

  const handleLogin = async () => {
    if (!validateForm()) {
      return;
    }

    try {
      setIsSubmitting(true);

      // Call the login function
      await login(email, password);

      // If we reach here without error, login was successful
      // Navigation is handled automatically in the auth provider
    } catch (error) {
      // Error handling is done in the auth provider and useEffect above
      console.error('Login error:', error);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleForgotPassword = () => {
    Alert.alert(
      'Passwort vergessen',
      'Die Funktion zum Zurücksetzen des Passworts wird bald implementiert.',
      [{ text: 'OK' }]
    );
  };

  return (
    <SafeAreaView style={styles.container}>
      <Header title="Anmelden" showBackButton />
      <KeyboardAvoidingView
        style={styles.keyboardAvoidingView}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        keyboardVerticalOffset={Platform.OS === 'ios' ? 0 : 20}
      >
        <ScrollView
          contentContainerStyle={styles.scrollContent}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
          bounces={false}
        >
          <Card style={styles.card}>
            <Text style={styles.title}>Willkommen zurück</Text>
            <Text style={styles.subtitle}>
              Geben Sie Ihre Zugangsdaten ein, um auf Ihr Konto zuzugreifen
            </Text>

            <View style={styles.form}>
              <Input
                label="E-Mail"
                value={email}
                onChangeText={setEmail}
                placeholder="name@example.com"
                keyboardType="email-address"
                autoCapitalize="none"
                autoComplete="email"
                textContentType="emailAddress"
                editable={!authState.loading}
              />

              <Input
                label="Passwort"
                value={password}
                onChangeText={setPassword}
                placeholder="••••••••"
                secureTextEntry
                autoComplete="current-password"
                textContentType="password"
                editable={!authState.loading}
              />

              <TouchableOpacity
                style={styles.forgotPassword}
                onPress={handleForgotPassword}
                disabled={authState.loading || isSubmitting}
              >
                <Text
                  style={[
                    styles.forgotPasswordText,
                    (authState.loading || isSubmitting) && styles.linkDisabled,
                  ]}
                >
                  Passwort vergessen?
                </Text>
              </TouchableOpacity>

              <Button
                title="Anmelden"
                onPress={handleLogin}
                isLoading={authState.loading || isSubmitting}
                style={styles.loginButton}
                disabled={authState.loading || isSubmitting}
              />
            </View>
          </Card>

          <View style={styles.footer}>
            <Text style={styles.footerText}>Sie haben noch kein Konto? </Text>
            <Link href="/(auth)/register" asChild>
              <TouchableOpacity disabled={authState.loading || isSubmitting}>
                <Text
                  style={[
                    styles.registerLink,
                    (authState.loading || isSubmitting) && styles.linkDisabled,
                  ]}
                >
                  Registrieren
                </Text>
              </TouchableOpacity>
            </Link>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  keyboardAvoidingView: {
    flex: 1,
  },
  scrollContent: {
    flexGrow: 1,
    padding: spacing.lg,
    justifyContent: 'center',
    minHeight: '100%',
  },
  card: {
    padding: spacing.xl,
  },
  title: {
    fontSize: fontSizes.xxl,
    fontWeight: fontWeights.bold as any,
    color: colors.text,
    marginBottom: spacing.xs,
    textAlign: 'center',
  },
  subtitle: {
    fontSize: fontSizes.md,
    color: colors.textSecondary,
    marginBottom: spacing.xl,
    textAlign: 'center',
  },
  form: {
    width: '100%',
  },
  forgotPassword: {
    alignSelf: 'flex-end',
    marginBottom: spacing.lg,
  },
  forgotPasswordText: {
    fontSize: fontSizes.sm,
    color: colors.primary,
    fontWeight: fontWeights.medium as any,
  },
  loginButton: {
    marginTop: spacing.md,
  },
  footer: {
    flexDirection: 'row',
    justifyContent: 'center',
    marginTop: spacing.xl,
  },
  footerText: {
    fontSize: fontSizes.md,
    color: colors.textSecondary,
  },
  registerLink: {
    fontSize: fontSizes.md,
    color: colors.primary,
    fontWeight: fontWeights.medium as any,
  },
  linkDisabled: {
    opacity: 0.5,
  },
});
