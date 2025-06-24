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

export default function RegisterScreen() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const { authState, register, clearError } = useAuth();

  // Clear error when component mounts or when user starts typing
  useEffect(() => {
    if (authState.error) {
      clearError();
    }
  }, [email, password, confirmPassword]);

  // Show error alert when error occurs
  useEffect(() => {
    if (authState.error && !authState.loading && !isSubmitting) {
      Alert.alert('Registrierung fehlgeschlagen', authState.error);
    }
  }, [authState.error, authState.loading, isSubmitting]);

  const validateForm = () => {
    // Basic validation
    if (!email || !password || !confirmPassword) {
      Alert.alert('Fehler', 'Bitte füllen Sie alle Felder aus');
      return false;
    }

    // Email validation
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      Alert.alert('Fehler', 'Bitte geben Sie eine gültige E-Mail-Adresse ein');
      return false;
    }

    // Password length validation
    if (password.length < 6) {
      Alert.alert('Fehler', 'Das Passwort muss mindestens 6 Zeichen lang sein');
      return false;
    }

    // Password match validation
    if (password !== confirmPassword) {
      Alert.alert('Fehler', 'Die Passwörter stimmen nicht überein');
      return false;
    }

    return true;
  };

  const handleRegister = async () => {
    if (!validateForm()) {
      return;
    }

    setIsSubmitting(true);

    // Call the register function with email, password, and confirmPassword (rpassword)
    await register(email, password, confirmPassword);

    setIsSubmitting(false);

    // If we reach here and there's no error, registration was successful
    // Navigation is handled automatically in the auth provider
  };

  return (
    <SafeAreaView style={styles.container}>
      <Header title="Registrieren" showBackButton />
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
            <Text style={styles.title}>Ein Konto erstellen</Text>
            <Text style={styles.subtitle}>
              Geben Sie Ihre Daten ein, um Ihr Konto zu erstellen
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
                autoComplete="new-password"
                textContentType="newPassword"
                editable={!authState.loading}
              />

              <Input
                label="Passwort bestätigen"
                value={confirmPassword}
                onChangeText={setConfirmPassword}
                placeholder="••••••••"
                secureTextEntry
                autoComplete="new-password"
                textContentType="newPassword"
                editable={!authState.loading}
              />

              <Button
                title="Registrieren"
                onPress={handleRegister}
                isLoading={authState.loading || isSubmitting}
                style={styles.registerButton}
                disabled={authState.loading || isSubmitting}
              />
            </View>
          </Card>

          <View style={styles.footer}>
            <Text style={styles.footerText}>Haben Sie bereits ein Konto? </Text>
            <Link href="/(auth)/login" asChild>
              <TouchableOpacity disabled={authState.loading || isSubmitting}>
                <Text
                  style={[
                    styles.loginLink,
                    (authState.loading || isSubmitting) && styles.linkDisabled,
                  ]}
                >
                  Anmelden
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
  registerButton: {
    marginTop: spacing.lg,
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
  loginLink: {
    fontSize: fontSizes.md,
    color: colors.primary,
    fontWeight: fontWeights.medium as any,
  },
  linkDisabled: {
    opacity: 0.5,
  },
});
