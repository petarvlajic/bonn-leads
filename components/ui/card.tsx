// components/ui/card.tsx
import React from 'react';
import { View, StyleSheet } from 'react-native';
import { colors, borderRadius, shadows, spacing } from '../../styles/theme';
import { CardProps } from '../../types';

const Card: React.FC<CardProps> = ({ children, style = {} }) => {
  return <View style={[styles.card, style]}>{children}</View>;
};

const styles = StyleSheet.create({
  card: {
    backgroundColor: colors.card,
    borderRadius: borderRadius.md,
    padding: spacing.lg,
    marginVertical: spacing.md,
    width: '100%',
    ...shadows.md,
  },
});

export default Card;
