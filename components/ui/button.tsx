// components/ui/button.tsx
import React, { forwardRef } from 'react';
import {
  TouchableOpacity,
  Text,
  StyleSheet,
  ActivityIndicator,
  View,
} from 'react-native';
import {
  colors,
  fontSizes,
  fontWeights,
  borderRadius,
  spacing,
} from '../../styles/theme';
import { ButtonProps } from '../../types';

const Button = forwardRef<TouchableOpacity, ButtonProps>(
  (
    {
      title,
      onPress,
      variant = 'primary',
      icon,
      isLoading = false,
      disabled = false,
      fullWidth = true,
      style = {},
      ...props
    },
    ref
  ) => {
    const getButtonStyles = () => {
      switch (variant) {
        case 'primary':
          return {
            backgroundColor: disabled ? '#9CA3AF' : colors.primary,
            borderColor: disabled ? '#9CA3AF' : colors.primary,
          };
        case 'outline':
          return {
            backgroundColor: 'transparent',
            borderColor: colors.primary,
            borderWidth: 1,
          };
        case 'ghost':
          return {
            backgroundColor: 'transparent',
            borderColor: 'transparent',
          };
        case 'link':
          return {
            backgroundColor: 'transparent',
            borderColor: 'transparent',
            paddingVertical: 0,
            paddingHorizontal: 0,
          };
        default:
          return {
            backgroundColor: disabled ? '#9CA3AF' : colors.primary,
            borderColor: disabled ? '#9CA3AF' : colors.primary,
          };
      }
    };

    const getTextStyles = () => {
      switch (variant) {
        case 'primary':
          return {
            color: '#FFFFFF',
          };
        case 'outline':
        case 'ghost':
        case 'link':
          return {
            color: colors.primary,
          };
        default:
          return {
            color: '#FFFFFF',
          };
      }
    };

    const buttonStyleVariant = getButtonStyles();
    const textStyleVariant = getTextStyles();

    return (
      <TouchableOpacity
        ref={ref}
        style={[
          styles.button,
          buttonStyleVariant,
          fullWidth && styles.fullWidth,
          style,
        ]}
        onPress={onPress}
        disabled={disabled || isLoading}
        activeOpacity={0.8}
        {...props}
      >
        {isLoading ? (
          <ActivityIndicator
            size="small"
            color={variant === 'primary' ? '#FFFFFF' : colors.primary}
          />
        ) : (
          <View style={styles.contentContainer}>
            {icon && <View style={styles.iconContainer}>{icon}</View>}
            <Text style={[styles.text, textStyleVariant]}>{title}</Text>
          </View>
        )}
      </TouchableOpacity>
    );
  }
);

Button.displayName = 'Button';

const styles = StyleSheet.create({
  button: {
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.lg,
    borderRadius: borderRadius.md,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
  },
  fullWidth: {
    width: '100%',
  },
  text: {
    fontSize: fontSizes.md,
    fontWeight: fontWeights.medium as any,
    textAlign: 'center',
  },
  contentContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  iconContainer: {
    marginRight: spacing.sm,
  },
});

export default Button;
