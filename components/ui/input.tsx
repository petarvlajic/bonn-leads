// components/ui/input.tsx
import React from 'react';
import { View, Text, TextInput, StyleSheet } from 'react-native';
import {
  colors,
  fontSizes,
  fontWeights,
  borderRadius,
  spacing,
} from '../../styles/theme';
import { InputProps } from '../../types';

const Input: React.FC<InputProps> = ({
  label,
  value,
  onChangeText,
  placeholder,
  secureTextEntry = false,
  error,
  keyboardType = 'default',
  autoCapitalize = 'none',
  editable = true,
  rightIcon,
}) => {
  return (
    <View style={styles.container}>
      {label && <Text style={styles.label}>{label}</Text>}
      <View style={styles.inputWrapper}>
        <TextInput
          style={[
            styles.input,
            ...(error ? [styles.inputError] : []),
            ...(rightIcon ? [{ paddingRight: spacing.xl }] : []),
            ...(!editable ? [styles.inputDisabled] : []),
          ]}
          value={value}
          onChangeText={onChangeText}
          placeholder={placeholder}
          placeholderTextColor={colors.textSecondary}
          secureTextEntry={secureTextEntry}
          keyboardType={keyboardType}
          autoCapitalize={autoCapitalize}
          editable={editable}
        />
        {rightIcon && (
          <View style={styles.rightIconContainer}>{rightIcon}</View>
        )}
      </View>
      {error && <Text style={styles.errorText}>{error}</Text>}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    marginBottom: spacing.md,
    width: '100%',
  },
  label: {
    fontSize: fontSizes.md,
    fontWeight: '500', // Replace with a valid fontWeight value
    color: colors.text,
    marginBottom: spacing.xs,
  },
  inputWrapper: {
    position: 'relative',
    width: '100%',
  },
  input: {
    backgroundColor: colors.inputBackground,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: borderRadius.md,
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.md,
    fontSize: fontSizes.md,
    color: colors.text,
    width: '100%',
  },
  inputError: {
    borderColor: colors.error,
  },
  inputDisabled: {
    backgroundColor: colors.background,
    color: colors.textSecondary,
  },
  errorText: {
    color: colors.error,
    fontSize: fontSizes.sm,
    marginTop: spacing.xs,
  },
  rightIconContainer: {
    position: 'absolute',
    right: spacing.md,
    top: 0,
    height: '100%',
    justifyContent: 'center',
  },
});

export default Input;
