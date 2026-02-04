import React, { useState } from 'react';
import { View, Text, StyleSheet, Modal, ScrollView, TouchableOpacity } from 'react-native';
import { useTheme } from '@/hooks/useTheme';
import { tokens } from '@/constants/tokens';
import { DishRow } from './DishRow';
import { StatusDot } from '../primitives/StatusDot';
import { Button } from '../primitives/Button';
import type { GroupedByHall, mealOrder, MealKey } from '@/hooks/useMenuData';
import { getHallStatus, getMealLabel, formatTime } from '@/utils/hall-status';
import { getHallDisplayName } from '@/constants/hall-hours';

type HallDetailModalProps = {
  visible: boolean;
  hallData: GroupedByHall | null;
  onClose: () => void;
  onRateDish?: () => void;
};

const mealTabs: MealKey[] = ['breakfast', 'lunch', 'dinner', 'late_night'];

export function HallDetailModal({ visible, hallData, onClose, onRateDish }: HallDetailModalProps) {
  const { colors } = useTheme();
  const [activeMeal, setActiveMeal] = useState<MealKey>('lunch');

  if (!hallData) return null;

  const statusInfo = getHallStatus(hallData.hallName);
  const displayName = getHallDisplayName(hallData.hallName);
  const statusLabel =
    statusInfo.status === 'open' && statusInfo.closesAt
      ? `${getMealLabel(statusInfo.currentMeal)} · Closes ${formatTime(statusInfo.closesAt)}`
      : statusInfo.nextMeal
      ? `Opens at ${formatTime(statusInfo.nextMeal.startsAt)}`
      : 'Closed';

  const availableMeals = mealTabs.filter((meal) => hallData.meals[meal]);
  const currentMealSections = hallData.meals[activeMeal] || {};

  return (
    <Modal visible={visible} animationType="slide" onRequestClose={onClose}>
      <View style={[styles.container, { backgroundColor: colors.background }]}>
        <View style={[styles.header, { borderBottomColor: colors.border }]}>
          <View>
            <StatusDot status={statusInfo.status} label={statusLabel} />
            <Text style={[styles.title, { color: colors.ink, fontFamily: tokens.font.display }]}>
              {displayName}
            </Text>
          </View>
          <TouchableOpacity
            onPress={onClose}
            style={styles.closeButton}
            accessibilityRole="button"
            accessibilityLabel="Close"
          >
            <Text style={[styles.closeIcon, { color: colors.ink }]}>✕</Text>
          </TouchableOpacity>
        </View>

        {availableMeals.length > 0 && (
          <View style={styles.mealTabs}>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.tabsContent}>
              {availableMeals.map((meal) => {
                const isActive = meal === activeMeal;
                return (
                  <TouchableOpacity
                    key={meal}
                    onPress={() => setActiveMeal(meal)}
                    style={[
                      styles.tab,
                      {
                        backgroundColor: isActive ? colors.ink : colors.surface,
                        borderColor: colors.border,
                      },
                    ]}
                  >
                    <Text
                      style={[
                        styles.tabText,
                        {
                          color: isActive ? '#FFFFFF' : colors.ink,
                          fontFamily: tokens.font.bodySemibold,
                        },
                      ]}
                    >
                      {getMealLabel(meal)}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </ScrollView>
          </View>
        )}

        <ScrollView style={styles.content} contentContainerStyle={styles.contentInner}>
          {Object.keys(currentMealSections).length === 0 ? (
            <View style={styles.emptyState}>
              <Text style={[styles.emptyText, { color: colors.inkMuted, fontFamily: tokens.font.body }]}>
                No menu available for this meal
              </Text>
            </View>
          ) : (
            Object.entries(currentMealSections).map(([section, dishes]) => (
              <View key={section} style={styles.section}>
                <Text style={[styles.sectionTitle, { color: colors.inkMuted, fontFamily: tokens.font.mono }]}>
                  {section.toUpperCase()}
                </Text>
                {dishes.map((dish) => (
                  <DishRow
                    key={dish.id}
                    name={dish.displayName}
                    tags={dish.tags}
                    rating={null}
                  />
                ))}
              </View>
            ))
          )}
        </ScrollView>

        {onRateDish && (
          <View style={[styles.footer, { borderTopColor: colors.border, backgroundColor: colors.background }]}>
            <Button label="Rate a Dish" onPress={onRateDish} variant="primary" fullWidth />
          </View>
        )}
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    padding: tokens.space.md,
    borderBottomWidth: 1,
    paddingTop: tokens.space.xl,
  },
  title: {
    fontSize: tokens.fontSize.hero,
    fontWeight: '800',
    marginTop: tokens.space.xs,
  },
  closeButton: {
    padding: tokens.space.xs,
    minWidth: tokens.touchTarget.min,
    minHeight: tokens.touchTarget.min,
    justifyContent: 'center',
    alignItems: 'center',
  },
  closeIcon: {
    fontSize: 24,
  },
  mealTabs: {
    borderBottomWidth: 1,
    borderBottomColor: '#E0DCD5',
  },
  tabsContent: {
    paddingHorizontal: tokens.space.md,
    paddingVertical: tokens.space.sm,
    gap: tokens.space.xs,
  },
  tab: {
    paddingVertical: tokens.space.xs,
    paddingHorizontal: tokens.space.md,
    borderRadius: tokens.radius.pill,
    borderWidth: 1,
  },
  tabText: {
    fontSize: tokens.fontSize.caption,
    fontWeight: '600',
  },
  content: {
    flex: 1,
  },
  contentInner: {
    padding: tokens.space.md,
  },
  section: {
    marginBottom: tokens.space.lg,
  },
  sectionTitle: {
    fontSize: tokens.fontSize.label,
    letterSpacing: tokens.letterSpacing.wide,
    marginBottom: tokens.space.sm,
  },
  emptyState: {
    paddingVertical: tokens.space.xxl,
    alignItems: 'center',
  },
  emptyText: {
    fontSize: tokens.fontSize.body,
  },
  footer: {
    padding: tokens.space.md,
    borderTopWidth: 1,
  },
});
