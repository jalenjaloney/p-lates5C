import React from 'react';
import { View, Text, StyleSheet, ViewStyle, TextStyle } from 'react-native';
import { useTheme } from '@/hooks/useTheme';
import { tokens } from '@/constants/tokens';

type BadgeVariant = 'default' | 'success' | 'warning' | 'accent' | 'muted';
type BadgeSize = 'sm' | 'md';

type BadgeProps = {
  label: string;
  variant?: BadgeVariant;
  size?: BadgeSize;
  style?: ViewStyle;
  textStyle?: TextStyle;
};

export function Badge({ label, variant = 'default', size = 'sm', style, textStyle }: BadgeProps) {
  const { colors } = useTheme();

  // Variant colors
  const variantStyles: Record<BadgeVariant, { backgroundColor: string; color: string }> = {
    default: {
      backgroundColor: colors.surfaceAlt,
      color: colors.ink,
    },
    success: {
      backgroundColor: colors.success + '20', // 20 = 12% opacity in hex
      color: colors.success,
    },
    warning: {
      backgroundColor: colors.warning + '20',
      color: colors.warning,
    },
    accent: {
      backgroundColor: colors.accentMuted,
      color: colors.accent,
    },
    muted: {
      backgroundColor: colors.surfaceAlt,
      color: colors.inkMuted,
    },
  };

  // Size styles
  const sizeStyles: Record<BadgeSize, { paddingVertical: number; paddingHorizontal: number; fontSize: number }> = {
    sm: { paddingVertical: 4, paddingHorizontal: 8, fontSize: tokens.fontSize.tiny },
    md: { paddingVertical: 6, paddingHorizontal: 12, fontSize: tokens.fontSize.label },
  };

  const currentSize = sizeStyles[size];
  const currentVariant = variantStyles[variant];

  return (
    <View
      style={[
        styles.badge,
        {
          backgroundColor: currentVariant.backgroundColor,
          paddingVertical: currentSize.paddingVertical,
          paddingHorizontal: currentSize.paddingHorizontal,
        },
        style,
      ]}
    >
      <Text
        style={[
          styles.text,
          {
            color: currentVariant.color,
            fontSize: currentSize.fontSize,
            fontFamily: tokens.font.mono,
          },
          textStyle,
        ]}
      >
        {label.toUpperCase()}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  badge: {
    borderRadius: tokens.radius.pill,
    alignSelf: 'flex-start',
  },
  text: {
    letterSpacing: tokens.letterSpacing.wide,
    fontWeight: '400',
  },
});
