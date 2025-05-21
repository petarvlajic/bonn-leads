// components/ui/header.tsx
import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors, fontSizes, fontWeights, spacing } from '../../styles/theme';
import { router } from 'expo-router';
import { AppHeaderProps } from '../../types';

const Header: React.FC<AppHeaderProps> = ({
  title,
  showBackButton = false,
  rightComponent = null,
}) => {
  return (
    <View style={styles.container}>
      <View style={styles.leftContainer}>
        {showBackButton && (
          <TouchableOpacity
            onPress={() => router.back()}
            style={styles.backButton}
          >
            <Ionicons name="arrow-back" size={24} color={colors.text} />
          </TouchableOpacity>
        )}
      </View>

      <Text style={styles.title}>{title}</Text>

      <View style={styles.rightContainer}>{rightComponent}</View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    height: 56,
    backgroundColor: colors.card,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
    paddingHorizontal: spacing.md,
  },
  leftContainer: {
    position: 'absolute',
    left: spacing.md,
    zIndex: 10,
  },
  rightContainer: {
    position: 'absolute',
    right: spacing.md,
    zIndex: 10,
  },
  title: {
    fontSize: fontSizes.lg,
    fontWeight: '600', // Replace with a valid fontWeight value
    color: colors.text,
    flex: 1,
    textAlign: 'center',
  },
  backButton: {
    padding: spacing.xs,
  },
});

export default Header;
