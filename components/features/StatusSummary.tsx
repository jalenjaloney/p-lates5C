import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { useTheme } from '@/hooks/useTheme';
import { tokens } from '@/constants/tokens';
import { Rule } from '../primitives/Rule';

type StatusSummaryProps = {
  openCount: number;
  dishCount: number;
};

export function StatusSummary({ openCount, dishCount }: StatusSummaryProps) {
  const { colors } = useTheme();

  return (
    <View style={styles.container}>
      <Rule variant="thin" spacing="sm" />

      <View style={styles.content}>
        <View style={styles.stat}>
          <Text
            style={[
              styles.statNumber,
              {
                color: colors.ink,
                fontFamily: tokens.font.displayBlack,
              },
            ]}
          >
            {openCount}
          </Text>
          <Text
            style={[
              styles.statLabel,
              {
                color: colors.inkMuted,
                fontFamily: tokens.font.mono,
              },
            ]}
          >
            {openCount === 1 ? 'HALL OPEN' : 'HALLS OPEN'}
          </Text>
        </View>

        <View style={[styles.divider, { backgroundColor: colors.border }]} />

        <View style={styles.stat}>
          <Text
            style={[
              styles.statNumber,
              {
                color: colors.ink,
                fontFamily: tokens.font.displayBlack,
              },
            ]}
          >
            {dishCount}
          </Text>
          <Text
            style={[
              styles.statLabel,
              {
                color: colors.inkMuted,
                fontFamily: tokens.font.mono,
              },
            ]}
          >
            DISHES AVAILABLE
          </Text>
        </View>
      </View>

      <Rule variant="thin" spacing="sm" />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    paddingVertical: tokens.space.md,
  },
  content: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    alignItems: 'center',
    paddingVertical: tokens.space.lg,
  },
  stat: {
    alignItems: 'center',
    gap: tokens.space.xxs,
  },
  statNumber: {
    fontSize: tokens.fontSize.hero,
    fontWeight: '800',
    letterSpacing: tokens.letterSpacing.tight,
    lineHeight: tokens.fontSize.hero * tokens.lineHeight.compressed,
  },
  statLabel: {
    fontSize: tokens.fontSize.label,
    letterSpacing: tokens.letterSpacing.wider,
    fontWeight: '400',
  },
  divider: {
    width: 1,
    height: 48,
  },
});
