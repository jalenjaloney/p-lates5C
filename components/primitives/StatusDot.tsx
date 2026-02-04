import React from 'react';
import { View, Text, StyleSheet, ViewStyle, TextStyle } from 'react-native';
import { useTheme } from '@/hooks/useTheme';
import { tokens } from '@/constants/tokens';

type StatusType = 'open' | 'closed' | 'closing-soon';

type StatusDotProps = {
  status: StatusType;
  label: string;
  style?: ViewStyle;
  textStyle?: TextStyle;
  showDot?: boolean;
};

export function StatusDot({ status, label, style, textStyle, showDot = true }: StatusDotProps) {
  const { colors } = useTheme();

  // Status colors
  const statusColors: Record<StatusType, string> = {
    open: colors.success,
    closed: colors.inkMuted,
    'closing-soon': colors.warning,
  };

  const dotColor = statusColors[status];

  return (
    <View style={[styles.container, style]}>
      {showDot && (
        <View
          style={[styles.dot, { backgroundColor: dotColor }]}
          accessibilityLabel={`Status: ${status.replace('-', ' ')}`}
        />
      )}
      <Text
        style={[
          styles.label,
          {
            color: colors.inkMuted,
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
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: tokens.space.xs,
  },
  dot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  label: {
    fontSize: tokens.fontSize.label,
    letterSpacing: tokens.letterSpacing.wide,
    fontWeight: '400',
  },
});
