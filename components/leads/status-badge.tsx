// components/leads/status-badge.tsx
import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import {
  colors,
  fontSizes,
  fontWeights,
  borderRadius,
  spacing,
} from '../../styles/theme';
import { StatusBadgeProps } from '../../types';

const StatusBadge: React.FC<StatusBadgeProps> = ({
  status,
  size = 'medium',
}) => {
  const getStatusColor = (status: 'Pending' | 'Finished') => {
    switch (status) {
      case 'Pending':
        return colors.pending;
      case 'Finished':
        return colors.success;
      default:
        return colors.textSecondary;
    }
  };

  const statusColor = getStatusColor(status);

  return (
    <View
      style={[
        styles.container,
        { backgroundColor: `${statusColor}20` }, // 20% opacity of the status color
        size === 'small' && styles.smallContainer,
      ]}
    >
      <View style={[styles.indicator, { backgroundColor: statusColor }]} />
      <Text
        style={[
          styles.text,
          { color: statusColor },
          size === 'small' && styles.smallText,
        ]}
      >
        {status}
      </Text>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: spacing.xs,
    paddingHorizontal: spacing.sm,
    borderRadius: borderRadius.full,
    alignSelf: 'flex-start',
  },
  smallContainer: {
    paddingVertical: 2,
    paddingHorizontal: spacing.xs,
  },
  indicator: {
    width: 8,
    height: 8,
    borderRadius: 4,
    marginRight: spacing.xs,
  },
  text: {
    fontSize: fontSizes.sm,
    fontWeight: '500', // Replace with a valid font weight value
  },
  smallText: {
    fontSize: fontSizes.xs,
  },
});

export default StatusBadge;
