import React from 'react';
import {
  TouchableOpacity,
  Text,
  StyleSheet,
  ActivityIndicator,
  ViewStyle,
  TextStyle,
} from 'react-native';
import { useTheme } from '@/hooks/useTheme';
import { tokens } from '@/constants/tokens';

type ButtonVariant = 'primary' | 'secondary' | 'ghost';
type ButtonSize = 'sm' | 'md' | 'lg';

type ButtonProps = {
  label: string;
  onPress: () => void;
  variant?: ButtonVariant;
  size?: ButtonSize;
  disabled?: boolean;
  loading?: boolean;
  fullWidth?: boolean;
  style?: ViewStyle;
  textStyle?: TextStyle;
  accessibilityLabel?: string;
  accessibilityHint?: string;
};

export function Button({
  label,
  onPress,
  variant = 'primary',
  size = 'md',
  disabled = false,
  loading = false,
  fullWidth = false,
  style,
  textStyle,
  accessibilityLabel,
  accessibilityHint,
}: ButtonProps) {
  const { colors } = useTheme();

  const isDisabled = disabled || loading;

  // Variant styles
  const variantStyles: Record<ButtonVariant, ViewStyle> = {
    primary: {
      backgroundColor: colors.accent,
      borderWidth: 0,
    },
    secondary: {
      backgroundColor: 'transparent',
      borderWidth: 1,
      borderColor: colors.ink,
    },
    ghost: {
      backgroundColor: 'transparent',
      borderWidth: 1,
      borderColor: colors.border,
    },
  };

  // Text color by variant
  const textColorByVariant: Record<ButtonVariant, string> = {
    primary: '#FFFFFF',
    secondary: colors.ink,
    ghost: colors.ink,
  };

  // Size styles
  const sizeStyles: Record<ButtonSize, { height: number; paddingHorizontal: number; fontSize: number }> = {
    sm: { height: 48, paddingHorizontal: 12, fontSize: tokens.fontSize.caption },
    md: { height: 48, paddingHorizontal: 20, fontSize: tokens.fontSize.body },
    lg: { height: 56, paddingHorizontal: 24, fontSize: tokens.fontSize.h3 },
  };

  const currentSize = sizeStyles[size];

  return (
    <TouchableOpacity
      onPress={onPress}
      disabled={isDisabled}
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel || label}
      accessibilityHint={accessibilityHint}
      accessibilityState={{ disabled: isDisabled }}
      style={[
        styles.button,
        variantStyles[variant],
        {
          height: currentSize.height,
          paddingHorizontal: currentSize.paddingHorizontal,
        },
        fullWidth && styles.fullWidth,
        isDisabled && { opacity: tokens.opacity.disabled },
        style,
      ]}
    >
      {loading ? (
        <ActivityIndicator
          size="small"
          color={variant === 'primary' ? '#FFFFFF' : colors.ink}
        />
      ) : (
        <Text
          style={[
            styles.text,
            {
              color: textColorByVariant[variant],
              fontSize: currentSize.fontSize,
              fontFamily: tokens.font.bodySemibold,
            },
            textStyle,
          ]}
        >
          {label.toUpperCase()}
        </Text>
      )}
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  button: {
    borderRadius: tokens.radius.lg,
    alignItems: 'center',
    justifyContent: 'center',
    minWidth: tokens.touchTarget.min,
  },
  fullWidth: {
    width: '100%',
  },
  text: {
    letterSpacing: tokens.letterSpacing.wide,
    fontWeight: '600',
  },
});
