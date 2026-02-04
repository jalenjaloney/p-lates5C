import React from 'react';
import { Text, StyleSheet } from 'react-native';
import { useTheme } from '@/hooks/useTheme';
import { tokens } from '@/constants/tokens';

type DatelineProps = {
  children: string;
  variant?: 'caps' | 'normal';
};

export function Dateline({ children, variant = 'caps' }: DatelineProps) {
  const { colors } = useTheme();

  return (
    <Text
      style={[
        styles.text,
        variant === 'caps' && styles.caps,
        {
          color: colors.inkMuted,
          fontFamily: tokens.font.mono,
        },
      ]}
    >
      {variant === 'caps' ? children.toUpperCase() : children}
    </Text>
  );
}

const styles = StyleSheet.create({
  text: {
    fontSize: tokens.fontSize.caption,
  },
  caps: {
    letterSpacing: tokens.letterSpacing.wide,
    fontSize: tokens.fontSize.label,
  },
});
