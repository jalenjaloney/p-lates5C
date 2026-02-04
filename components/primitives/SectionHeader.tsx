import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { useTheme } from '@/hooks/useTheme';
import { tokens } from '@/constants/tokens';

type SectionHeaderProps = {
  label: string;
  variant?: 'primary' | 'secondary';
};

export function SectionHeader({ label, variant = 'primary' }: SectionHeaderProps) {
  const { colors } = useTheme();

  return (
    <View style={styles.container}>
      <Text
        style={[
          styles.text,
          variant === 'primary' ? styles.primary : styles.secondary,
          {
            color: variant === 'primary' ? colors.ink : colors.inkMuted,
            fontFamily: tokens.font.bodySemibold,
          },
        ]}
      >
        {label.toUpperCase()}
      </Text>
      <View style={[styles.underline, { backgroundColor: colors.ink }]} />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    marginBottom: tokens.space.md,
  },
  text: {
    letterSpacing: tokens.letterSpacing.wider,
    fontWeight: '600',
    marginBottom: tokens.space.xxs,
  },
  primary: {
    fontSize: tokens.fontSize.caption,
  },
  secondary: {
    fontSize: tokens.fontSize.label,
  },
  underline: {
    height: 2,
    width: 32,
  },
});
