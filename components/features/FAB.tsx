import React from 'react';
import { TouchableOpacity, Text, StyleSheet } from 'react-native';
import { useTheme } from '@/hooks/useTheme';
import { tokens } from '@/constants/tokens';

type FABProps = {
  label: string;
  onPress: () => void;
  icon?: string;
};

export function FAB({ label, onPress, icon = '✦' }: FABProps) {
  const { colors } = useTheme();

  return (
    <TouchableOpacity
      onPress={onPress}
      style={[
        styles.fab,
        {
          backgroundColor: colors.accent,
          borderColor: colors.ink,
          ...tokens.shadow.lg,
        },
      ]}
      accessibilityRole="button"
      accessibilityLabel={label}
    >
      <Text
        style={[
          styles.label,
          {
            color: '#FFFFFF',
            fontFamily: tokens.font.bodySemibold,
          },
        ]}
      >
        {label.toUpperCase()}
      </Text>
      <Text style={styles.icon}>{icon}</Text>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  fab: {
    position: 'absolute',
    bottom: 90, // Above tab bar
    right: tokens.space.md,
    flexDirection: 'row',
    alignItems: 'center',
    gap: tokens.space.sm,
    paddingVertical: tokens.space.md,
    paddingHorizontal: tokens.space.lg,
    borderRadius: tokens.radius.sm,
    borderWidth: 2,
    minHeight: tokens.touchTarget.min,
  },
  icon: {
    fontSize: 16,
  },
  label: {
    fontSize: tokens.fontSize.caption,
    letterSpacing: tokens.letterSpacing.wider,
    fontWeight: '600',
  },
});
