import React, { ReactNode } from 'react';
import { View, StyleSheet, ViewStyle } from 'react-native';
import { useTheme } from '@/hooks/useTheme';
import { tokens } from '@/constants/tokens';

type CardVariant = 'default' | 'outlined' | 'elevated';
type CardPadding = 'none' | 'sm' | 'md' | 'lg';

type CardProps = {
  children: ReactNode;
  variant?: CardVariant;
  padding?: CardPadding;
  style?: ViewStyle;
};

export function Card({ children, variant = 'default', padding = 'md', style }: CardProps) {
  const { colors } = useTheme();

  // Padding values
  const paddingValues: Record<CardPadding, number> = {
    none: 0,
    sm: tokens.space.sm,
    md: tokens.space.md,
    lg: tokens.space.lg,
  };

  // Variant styles
  const variantStyles: Record<CardVariant, ViewStyle> = {
    default: {
      backgroundColor: colors.surface,
      borderWidth: 1,
      borderColor: colors.border,
      ...tokens.shadow.none,
    },
    outlined: {
      backgroundColor: colors.surface,
      borderWidth: 1,
      borderColor: colors.borderStrong,
      ...tokens.shadow.none,
    },
    elevated: {
      backgroundColor: colors.surface,
      borderWidth: 0,
      ...tokens.shadow.md,
    },
  };

  return (
    <View
      style={[
        styles.card,
        variantStyles[variant],
        { padding: paddingValues[padding] },
        style,
      ]}
    >
      {children}
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    borderRadius: tokens.radius.xxl,
    overflow: 'hidden',
  },
});
