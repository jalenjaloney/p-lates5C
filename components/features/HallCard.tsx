import React, { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { useTheme } from '@/hooks/useTheme';
import { tokens } from '@/constants/tokens';
import { Rule } from '../primitives/Rule';
import { Dateline } from '../primitives/Dateline';
import { HallStatusInfo, getMealLabel, formatTime } from '@/utils/hall-status';
import { NormalizedMenuItem } from '@/hooks/useMenuData';
import { getHallDisplayName } from '@/constants/hall-hours';

type HallCardProps = {
  hallName: string;
  statusInfo: HallStatusInfo;
  topDishes: NormalizedMenuItem[];
  onViewAll?: () => void;
};

export function HallCard({ hallName, statusInfo, topDishes, onViewAll }: HallCardProps) {
  const { colors } = useTheme();
  const [isExpanded, setIsExpanded] = useState(statusInfo.status === 'open');
  const displayName = getHallDisplayName(hallName);

  const statusLabel =
    statusInfo.status === 'open' && statusInfo.currentMeal && statusInfo.closesAt
      ? `${getMealLabel(statusInfo.currentMeal)} · Closes ${formatTime(statusInfo.closesAt)}`
      : statusInfo.nextMeal
      ? `Opens at ${formatTime(statusInfo.nextMeal.startsAt)}`
      : 'Closed';

  const dishesShown = isExpanded ? topDishes : topDishes.slice(0, 5);
  const remainingCount = topDishes.length - dishesShown.length;

  const getStatusColor = () => {
    switch (statusInfo.status) {
      case 'open':
        return colors.success;
      case 'closing-soon':
        return colors.warning;
      default:
        return colors.inkMuted;
    }
  };

  return (
    <View style={styles.card}>
      <TouchableOpacity
        onPress={() => setIsExpanded(!isExpanded)}
        activeOpacity={0.7}
        accessibilityRole="button"
        accessibilityLabel={`${displayName}, ${statusLabel}`}
        accessibilityHint="Tap to expand or collapse"
      >
        {/* Header with status */}
        <View style={styles.header}>
          <View style={styles.statusRow}>
            <View style={[styles.statusIndicator, { backgroundColor: getStatusColor() }]} />
            <Dateline>{statusLabel}</Dateline>
          </View>
        </View>

        {/* Hall Name - Dramatic Typography */}
        <Text
          style={[
            styles.hallName,
            {
              color: colors.ink,
              fontFamily: tokens.font.displayBlack,
            },
          ]}
        >
          {displayName.toUpperCase()}
        </Text>

        {/* Meal Type Subhead */}
        {statusInfo.currentMeal && (
          <Text
            style={[
              styles.mealType,
              {
                color: colors.inkMuted,
                fontFamily: tokens.font.bodySemibold,
              },
            ]}
          >
            {getMealLabel(statusInfo.currentMeal).toUpperCase()}
          </Text>
        )}
      </TouchableOpacity>

      {isExpanded && topDishes.length > 0 && (
        <>
          <Rule variant="thin" spacing="sm" />

          <View style={styles.dishList}>
            {dishesShown.map((dish, index) => (
              <View key={`${dish.id}-${index}`} style={styles.dishRow}>
                <Text style={[styles.bullet, { color: colors.accent }]}>●</Text>
                <Text
                  style={[
                    styles.dishName,
                    {
                      color: colors.ink,
                      fontFamily: tokens.font.body,
                    },
                  ]}
                >
                  {dish.displayName}
                </Text>
              </View>
            ))}

            {remainingCount > 0 && onViewAll && (
              <TouchableOpacity onPress={onViewAll} style={styles.viewAllButton}>
                <Text
                  style={[
                    styles.viewAllText,
                    {
                      color: colors.accent,
                      fontFamily: tokens.font.mono,
                    },
                  ]}
                >
                  VIEW ALL {remainingCount + dishesShown.length} ITEMS →
                </Text>
              </TouchableOpacity>
            )}
          </View>
        </>
      )}

      {isExpanded && topDishes.length === 0 && (
        <>
          <Rule variant="thin" spacing="sm" />
          <Text
            style={[
              styles.emptyText,
              {
                color: colors.inkMuted,
                fontFamily: tokens.font.body,
              },
            ]}
          >
            No menu available for this meal
          </Text>
        </>
      )}

      <Rule variant="thin" spacing="md" />
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    paddingHorizontal: tokens.space.lg,
    paddingTop: tokens.space.md,
  },
  header: {
    marginBottom: tokens.space.xs,
  },
  statusRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: tokens.space.xs,
  },
  statusIndicator: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  hallName: {
    fontSize: tokens.fontSize.h1,
    fontWeight: '800',
    letterSpacing: tokens.letterSpacing.tight,
    lineHeight: tokens.fontSize.h1 * tokens.lineHeight.tight,
    marginBottom: tokens.space.xxs,
  },
  mealType: {
    fontSize: tokens.fontSize.label,
    letterSpacing: tokens.letterSpacing.wider,
    fontWeight: '600',
    marginBottom: tokens.space.sm,
  },
  dishList: {
    gap: tokens.space.xs,
    paddingVertical: tokens.space.sm,
  },
  dishRow: {
    flexDirection: 'row',
    gap: tokens.space.sm,
    paddingVertical: tokens.space.xxs,
  },
  bullet: {
    fontSize: 8,
    lineHeight: tokens.fontSize.body * tokens.lineHeight.relaxed,
  },
  dishName: {
    flex: 1,
    fontSize: tokens.fontSize.body,
    lineHeight: tokens.fontSize.body * tokens.lineHeight.relaxed,
  },
  viewAllButton: {
    marginTop: tokens.space.sm,
    paddingVertical: tokens.space.xs,
  },
  viewAllText: {
    fontSize: tokens.fontSize.label,
    letterSpacing: tokens.letterSpacing.wide,
    fontWeight: '400',
  },
  emptyText: {
    fontSize: tokens.fontSize.caption,
    fontStyle: 'italic',
    paddingVertical: tokens.space.sm,
  },
});
