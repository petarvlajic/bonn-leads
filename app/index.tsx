import React from 'react';
import { View, Text, StyleSheet, Image } from 'react-native';
import { Link } from 'expo-router';
import { colors, fontSizes, fontWeights, spacing } from '../styles/theme';
import Button from '../components/ui/button';

export default function WelcomeScreen() {
  return (
    <View style={styles.container}>
      <View style={styles.content}>
        <Text style={styles.title}>Job Lead Verwaltung</Text>
        <Text style={styles.subtitle}>
          Verwalten Sie Ihre Job-Leads effizient und behalten Sie den Überblick
          über Aufgaben
        </Text>
        <View style={styles.buttonContainer}>
          <Link href="/(auth)/login" asChild>
            <Button
              title="Anmelden"
              variant="primary"
              fullWidth
              style={styles.button}
            />
          </Link>
          <Link href="/(auth)/register" asChild>
            <Button
              title="Registrieren"
              variant="outline"
              fullWidth
              style={styles.button}
            />
          </Link>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  content: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: spacing.xl,
  },
  title: {
    fontSize: fontSizes.xxxl,
    fontWeight: fontWeights.bold as any,
    color: colors.text,
    marginBottom: spacing.md,
    textAlign: 'center',
  },
  subtitle: {
    fontSize: fontSizes.md,
    fontWeight: fontWeights.normal as any,
    color: colors.textSecondary,
    textAlign: 'center',
    marginBottom: spacing.xxl,
  },
  buttonContainer: {
    width: '100%',
    marginTop: spacing.lg,
  },
  button: {
    marginBottom: spacing.md,
  },
});
