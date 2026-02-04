import React, { useState, useMemo, useEffect } from 'react';
import { StyleSheet, ScrollView, View, Text, TouchableOpacity, useWindowDimensions } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useBottomTabBarHeight } from '@react-navigation/bottom-tabs';
import { useTheme } from '@/hooks/useTheme';
import { useRouter } from 'expo-router';
import { tokens } from '@/constants/tokens';
import { HALL_NAMES, getHallDisplayName } from '@/constants/hall-hours';
import { HALL_TO_SCHOOL, SCHOOL_COLORS } from '@/constants/school-colors';
import { useMenuData } from '@/hooks/useMenuData';
import { Rule } from '@/components/primitives/Rule';
import { SearchBar } from '@/components/features/SearchBar';
import DateBanner from '@/components/datebanner';
import { getHallStatus } from '@/utils/hall-status';
import { DishRow } from '@/components/features/DishRow';
import { toTitleCase } from '@/utils/text';

type MealPeriod = 'breakfast' | 'lunch' | 'dinner' | 'late_night';

export default function MenusScreen() {
  const { colors } = useTheme();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const tabBarHeight = useBottomTabBarHeight();
  const { width, height } = useWindowDimensions();
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString());
  const [searchQuery, setSearchQuery] = useState('');
  const [searchOpen, setSearchOpen] = useState(false);
  const [recentSearches, setRecentSearches] = useState<string[]>([]);
  const [expandedHalls, setExpandedHalls] = useState<Set<string>>(new Set());
  const [selectedMealByHall, setSelectedMealByHall] = useState<Record<string, MealPeriod>>({});
  const [collapsedSections, setCollapsedSections] = useState<Record<string, boolean>>({});
  const [topStackHeight, setTopStackHeight] = useState(0);
  const [searchBarHeight, setSearchBarHeight] = useState(0);
  const { loading, error, groupedByHall, latestAvailableDate } = useMenuData(selectedDate);
  const isCompact = width < 430;
  const rowPaddingVertical = tokens.space.xxs;
  const rowPaddingHorizontal = tokens.space.sm;
  const topBarPadding = tokens.space.xs;
  const rowGap = 0;
  const hallSecondaryBars: Record<string, string> = {
    Hoch: 'rgb(234, 170, 0)',
    McConnell: 'rgb(247, 130, 29)',
    Malott: 'rgb(74, 165, 131)',
    Collins: 'rgb(218, 44, 70)',
    Frary: 'rgb(57, 120, 220)',
    Frank: 'rgb(57, 120, 220)',
    Oldenborg: 'rgb(57, 120, 220)'
  };

  const toggleHall = (hallName: string) => {
    setExpandedHalls((prev) => {
      const next = new Set(prev);
      if (next.has(hallName)) {
        next.delete(hallName);
      } else {
        next.add(hallName);
      }
      return next;
    });
  };
  const setDefaultMeal = (hallName: string, mealPeriods: MealPeriod[]) => {
    if (!mealPeriods.length) return;
    setSelectedMealByHall((prev) => (prev[hallName] ? prev : { ...prev, [hallName]: mealPeriods[0] }));
  };
  const selectMeal = (hallName: string, period: MealPeriod) => {
    setSelectedMealByHall((prev) => ({ ...prev, [hallName]: period }));
  };
  const commitSearch = (term: string) => {
    const trimmed = term.trim();
    if (!trimmed) return;
    setSearchQuery(trimmed);
    setRecentSearches((prev) => [trimmed, ...prev.filter((item) => item !== trimmed)].slice(0, 6));
    setSearchOpen(false);
  };
  const toggleSection = (hallName: string, period: MealPeriod, section: string) => {
    const key = `${hallName}__${period}__${section}`;
    setCollapsedSections((prev) => ({ ...prev, [key]: !prev[key] }));
  };

  const hallsData = useMemo(() => {
    return HALL_NAMES.map((hallName) => {
      const hallData = groupedByHall.find((h) => h.hallName === hallName);
      const school = HALL_TO_SCHOOL[hallName];
      const schoolColors = SCHOOL_COLORS[school];

      return {
        hallName,
        school,
        schoolColors,
        meals: hallData?.meals || {},
      };
    });
  }, [groupedByHall]);

  const dishSuggestions = useMemo(() => {
    const terms: Array<{
      display: string;
      hallName: string;
      dishId: number | null;
      searchText: string;
    }> = [];
    const seen = new Set<string>();
    hallsData.forEach((hall) => {
      const hallName = getHallDisplayName(hall.hallName);
      Object.values(hall.meals || {}).forEach((meal) => {
        Object.values(meal || {}).forEach((items) => {
          (items || []).forEach((item) => {
            if (!item.displayName) return;
            const key = `${item.displayName.toLowerCase()}__${hallName.toLowerCase()}`;
            if (seen.has(key)) return;
            seen.add(key);
            terms.push({
              display: item.displayName,
              hallName,
              dishId: item.dishId ?? null,
              searchText: `${item.displayName} ${hallName}`.toLowerCase(),
            });
          });
        });
      });
    });
    return terms;
  }, [hallsData]);

  const normalizedQuery = searchQuery.trim().toLowerCase();
  const suggestions = useMemo(() => {
    if (!normalizedQuery) return [];
    const tokens = normalizedQuery.split(/\s+/).filter(Boolean);
    return dishSuggestions
      .filter((term) => tokens.every((token) => term.searchText.includes(token)))
      .slice(0, 8);
  }, [normalizedQuery, dishSuggestions]);
  const hallTitleFill = 0.85;
  const availableRowsHeight = height - topStackHeight - tabBarHeight - insets.bottom;
  const rowCount = hallsData.length || 1;
  const baseRowHeight = Math.max(48, Math.floor(availableRowsHeight / rowCount));
  const remainder = Math.max(0, availableRowsHeight - baseRowHeight * rowCount);
  const hallTitleFontSize = Math.max(24, Math.floor(baseRowHeight * hallTitleFill));
  const hallTitleLineHeight = Math.floor(hallTitleFontSize * tokens.lineHeight.tight);

  const getMealPeriods = (meals: Record<string, any>): MealPeriod[] => {
    const periods: MealPeriod[] = [];
    if (meals.breakfast) periods.push('breakfast');
    if (meals.lunch) periods.push('lunch');
    if (meals.dinner) periods.push('dinner');
    if (meals.late_night) periods.push('late_night');
    return periods;
  };

  const getMealLabel = (period: MealPeriod): string => {
    const labels: Record<MealPeriod, string> = {
      breakfast: 'BREAKFAST',
      lunch: 'LUNCH',
      dinner: 'DINNER',
      late_night: 'LATE NIGHT',
    };
    return labels[period];
  };

  useEffect(() => {
    console.log('[MenusScreen] latestAvailableDate:', latestAvailableDate, 'selectedDate:', selectedDate);
    if (!latestAvailableDate) {
      console.log('[MenusScreen] No latestAvailableDate, skipping redirect');
      return;
    }
    const latestDateStr = latestAvailableDate.slice(0, 10);
    const selectedDateStr = selectedDate.slice(0, 10);
    console.log('[MenusScreen] Comparing dates:', latestDateStr, 'vs', selectedDateStr);
    if (latestDateStr === selectedDateStr) {
      console.log('[MenusScreen] Dates match, skipping redirect');
      return;
    }
    console.log('[MenusScreen] Redirecting to latest available date:', latestAvailableDate);
    setSelectedDate(latestAvailableDate);
  }, [latestAvailableDate, selectedDate]);

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        <View
          style={styles.topStack}
          onLayout={(event) => {
            if (searchOpen) return;
            const nextHeight = Math.round(event.nativeEvent.layout.height);
            if (nextHeight && nextHeight !== topStackHeight) {
              setTopStackHeight(nextHeight);
            }
          }}
        >
          {/* Top Search */}
          <View
            style={[styles.topBar, { padding: topBarPadding }]}
            onLayout={(event) => {
              const nextHeight = Math.round(event.nativeEvent.layout.height);
              if (nextHeight && nextHeight !== searchBarHeight) {
                setSearchBarHeight(nextHeight);
              }
            }}
          >
            <SearchBar
              mode="input"
              placeholder="Search"
              value={searchQuery}
              onChangeText={setSearchQuery}
              onFocus={() => setSearchOpen(true)}
              onBlur={() => {
                setTimeout(() => {
                  setSearchOpen(false);
                }, 150);
              }}
              onSubmitEditing={() => commitSearch(searchQuery)}
            />
          </View>

          {searchOpen && (
            <View
              style={[
                styles.searchPanel,
                {
                  backgroundColor: colors.surface,
                  borderColor: colors.border,
                  top: topBarPadding + searchBarHeight,
                },
              ]}
            >
              {normalizedQuery.length === 0 ? (
                <View style={styles.searchSection}>
                  <Text style={[styles.searchLabel, { color: colors.inkMuted, fontFamily: tokens.font.mono }]}>
                    RECENT
                  </Text>
                  {recentSearches.length === 0 ? (
                    <Text style={[styles.searchEmpty, { color: colors.inkMuted, fontFamily: tokens.font.body }]}>
                      No recent searches
                    </Text>
                  ) : (
                    recentSearches.map((term) => (
                      <TouchableOpacity
                        key={term}
                        onPress={() => {
                          const tokens = term.toLowerCase().split(/\s+/).filter(Boolean);
                          const match = dishSuggestions.find((s) =>
                            tokens.every((token) => s.searchText.includes(token))
                          );
                          if (match?.dishId) {
                            commitSearch(match.display);
                            router.push(`/dish/${match.dishId}`);
                            setSearchOpen(false);
                            return;
                          }
                          commitSearch(term);
                        }}
                        style={styles.searchItem}
                        activeOpacity={0.7}
                      >
                        <View style={styles.searchRow}>
                          <Text style={[styles.searchItemText, { color: colors.ink, fontFamily: tokens.font.body }]}>
                            {toTitleCase(term)}
                          </Text>
                        </View>
                      </TouchableOpacity>
                    ))
                  )}
                </View>
              ) : (
                <View style={styles.searchSection}>
                  <Text style={[styles.searchLabel, { color: colors.inkMuted, fontFamily: tokens.font.mono }]}>
                    SUGGESTIONS
                  </Text>
                  {suggestions.length === 0 ? (
                    <Text style={[styles.searchEmpty, { color: colors.inkMuted, fontFamily: tokens.font.body }]}>
                      No matches
                    </Text>
                  ) : (
                    suggestions.map((term) => (
                      <TouchableOpacity
                        key={`${term.display}-${term.hallName ?? 'hall'}`}
                        onPress={() => {
                          if (term.dishId) {
                            commitSearch(term.display);
                            router.push(`/dish/${term.dishId}`);
                            setSearchOpen(false);
                            return;
                          }
                          commitSearch(term.display);
                        }}
                        style={styles.searchItem}
                        activeOpacity={0.7}
                      >
                        <View style={styles.searchRow}>
                          <Text
                            style={[
                              styles.searchItemText,
                              {
                                color: colors.ink,
                                fontFamily: tokens.font.body,
                              },
                            ]}
                          >
                            {toTitleCase(term.display)}
                          </Text>
                          {term.hallName ? (
                            <Text
                              style={[
                                styles.searchItemText,
                                {
                                  color:
                                    SCHOOL_COLORS[HALL_TO_SCHOOL[term.hallName]]?.primary || colors.inkMuted,
                                  fontFamily: tokens.font.body,
                                },
                              ]}
                            >
                              {toTitleCase(term.hallName)}
                            </Text>
                          ) : null}
                        </View>
                      </TouchableOpacity>
                    ))
                  )}
                </View>
              )}
            </View>
          )}

          <View style={styles.spacing} />

          <DateBanner selectedDate={selectedDate} onChange={setSelectedDate} />

          <View style={styles.spacing} />
        </View>

        {loading ? (
          <View style={styles.loadingContainer}>
            <Text style={[styles.loadingText, { color: colors.inkMuted, fontFamily: tokens.font.mono }]}>
              LOADING MENUS…
            </Text>
          </View>
        ) : null}

        {error ? (
          <View style={styles.section}>
            <View style={[styles.errorBanner, { backgroundColor: colors.accentMuted, borderColor: colors.accent }]}>
              <Text style={[styles.errorText, { color: colors.accent, fontFamily: tokens.font.bodySemibold }]}>
                ERROR: {error}
              </Text>
            </View>
          </View>
        ) : null}


        {/* Hall Rows */}
        {!loading && hallsData.map((hall, index) => {
          const isExpanded = expandedHalls.has(hall.hallName);
          const mealPeriods = getMealPeriods(hall.meals);
          const hasMeals = mealPeriods.length > 0;
          const rowHeight = baseRowHeight + (index === rowCount - 1 ? remainder : 0);
          const currentMeal = getHallStatus(hall.hallName).currentMeal as MealPeriod | null;
          const selectedMeal =
            selectedMealByHall[hall.hallName] ||
            (currentMeal && mealPeriods.includes(currentMeal) ? currentMeal : null) ||
            mealPeriods[0];
          const mealBarColor = hallSecondaryBars[hall.hallName] || hall.schoolColors.primary;

          return (
            <View key={hall.hallName}>
              <TouchableOpacity
                onPress={() => {
                  toggleHall(hall.hallName);
                  if (!isExpanded) {
                    setDefaultMeal(hall.hallName, mealPeriods);
                  }
                }}
                style={[
                  styles.hallRow,
                  {
                    backgroundColor: hall.schoolColors.primary,
                    paddingVertical: rowPaddingVertical,
                    paddingHorizontal: rowPaddingHorizontal,
                    height: rowHeight,
                  },
                ]}
                activeOpacity={0.8}
              >
                <View style={[styles.hallRowContent, { gap: rowGap }]}>
                  {/* Color Bar */}
                  <View
                    style={[
                      styles.colorBar,
                      { backgroundColor: hall.schoolColors.primary, height: hallTitleLineHeight },
                    ]}
                  />

                  {/* Hall Info */}
                  <View style={styles.hallInfo}>
                    <Text
                      numberOfLines={1}
                      adjustsFontSizeToFit
                      minimumFontScale={0.4}
                      allowFontScaling={false}
                      style={[
                        styles.hallName,
                        {
                          color: '#FFFCF8',
                          fontFamily: tokens.font.displayBlack,
                          fontSize: hallTitleFontSize,
                          lineHeight: hallTitleLineHeight,
                        },
                      ]}
                    >
                      {getHallDisplayName(hall.hallName).toUpperCase()}
                    </Text>
                    {/* School subtitle removed */}
                  </View>

                  {/* Expand Indicator */}
                  {!isCompact && (
                    <View style={styles.expandIndicator}>
                      <Text
                      style={[
                        styles.expandIcon,
                        { color: '#FFFCF8', fontSize: hallTitleFontSize, lineHeight: hallTitleLineHeight },
                      ]}
                      >
                        {isExpanded ? '▾' : '▸'}
                      </Text>
                    </View>
                  )}
                </View>
              </TouchableOpacity>

              {/* Expanded Menu Content */}
              {isExpanded && (
                <View style={styles.menuContent}>
                  {!hasMeals && (
                    <View style={styles.emptyMeal}>
                      <Text
                        style={[
                          styles.emptyText,
                          { color: colors.inkMuted, fontFamily: tokens.font.body },
                        ]}
                      >
                        No menu available for this date
                      </Text>
                    </View>
                  )}

                  {hasMeals && (
                    <>
                      <View style={[styles.mealBar, { backgroundColor: mealBarColor }]}>
                        {mealPeriods.map((period) => {
                          const isActive = selectedMeal === period;
                          return (
                            <TouchableOpacity
                              key={period}
                              onPress={() => selectMeal(hall.hallName, period)}
                              style={[
                                styles.mealTab,
                                isActive && styles.mealTabActive,
                              ]}
                              activeOpacity={0.8}
                            >
                              <Text
                                style={[
                                  styles.mealTabText,
                                  {
                                    color: isActive ? colors.ink : '#FFFCF8',
                                    fontFamily: tokens.font.bodySemibold,
                                  },
                                ]}
                              >
                                {getMealLabel(period)}
                              </Text>
                            </TouchableOpacity>
                          );
                        })}
                      </View>

                      <View style={styles.mealContent}>
                        {Object.keys(hall.meals[selectedMeal] || {}).map((section) => {
                          const items = hall.meals[selectedMeal]?.[section] || [];
                          const key = `${hall.hallName}__${selectedMeal}__${section}`;
                          const isCollapsed = collapsedSections[key] ?? true;
                          return (
                            <View key={section} style={styles.dishSection}>
                              <TouchableOpacity
                                onPress={() => toggleSection(hall.hallName, selectedMeal, section)}
                                style={styles.sectionHeader}
                                activeOpacity={0.8}
                              >
                                <Text
                                  style={[
                                    styles.sectionLabel,
                                    {
                                      color: colors.inkMuted,
                                      fontFamily: tokens.font.mono,
                                    },
                                  ]}
                                >
                                  {section.toUpperCase()}
                                </Text>
                                <Text style={[styles.sectionChevron, { color: colors.inkMuted }]}>
                                  {isCollapsed ? '›' : '⌄'}
                                </Text>
                              </TouchableOpacity>
                              {!isCollapsed &&
                                items.map((item: any, idx: number) => (
                                  <TouchableOpacity
                                    key={`${item.id}-${idx}`}
                                    onPress={() => {
                                      if (item.dishId) {
                                        router.push(`/dish/${item.dishId}`);
                                      }
                                    }}
                                    activeOpacity={0.7}
                                  >
                                  <DishRow
                                    name={toTitleCase(item.displayName)}
                                    tags={item.tags}
                                    rating={item.rating ?? 0}
                                  />
                                  </TouchableOpacity>
                                ))}
                            </View>
                          );
                        })}
                      </View>
                    </>
                  )}
                </View>
              )}
            </View>
          );
        })}

      </ScrollView>

    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  scrollContent: {
    flexGrow: 1,
  },
  topBar: {
    padding: 0,
  },
  topStack: {
    position: 'relative',
    zIndex: 10,
  },
  searchPanel: {
    position: 'absolute',
    left: tokens.space.xs,
    right: tokens.space.xs,
    borderWidth: 1,
    paddingVertical: tokens.space.xs,
    paddingHorizontal: tokens.space.sm,
    borderRadius: tokens.radius.md,
    zIndex: 20,
  },
  searchSection: {
    gap: tokens.space.xs,
  },
  searchLabel: {
    fontSize: tokens.fontSize.tiny,
    letterSpacing: tokens.letterSpacing.widest,
  },
  searchItem: {
    paddingVertical: tokens.space.xs,
  },
  searchRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: tokens.space.xs,
  },
  searchItemText: {
    fontSize: tokens.fontSize.body,
  },
  searchEmpty: {
    fontSize: tokens.fontSize.caption,
  },
  spacing: {
    height: tokens.space.sm,
  },
  section: {
    paddingHorizontal: tokens.space.lg,
    paddingVertical: tokens.space.md,
  },
  loadingContainer: {
    paddingVertical: tokens.space.xxl,
    alignItems: 'center',
  },
  loadingText: {
    fontSize: tokens.fontSize.caption,
    letterSpacing: tokens.letterSpacing.wider,
  },
  errorBanner: {
    padding: tokens.space.md,
    borderTopWidth: 2,
    borderBottomWidth: 2,
  },
  errorText: {
    fontSize: tokens.fontSize.caption,
    letterSpacing: tokens.letterSpacing.wide,
    fontWeight: '600',
  },
  hallRow: {
    paddingVertical: tokens.space.md,
    paddingHorizontal: tokens.space.lg,
    shadowColor: '#000',
    shadowOpacity: .1,
    shadowRadius: 20,
    shadowOffset: { width: 0, height: 1 },
    elevation: 1,
  },
  hallRowContent: {
    flexDirection: 'row',
    alignItems: 'center',
    height: '100%',
    gap: tokens.space.md,
  },
  colorBar: {
    width: 4,
    height: 48,
    borderRadius: 2,
  },
  hallInfo: {
    flex: 1,
    gap: 0,
    justifyContent: 'center',
    height: '100%',
  },
  hallName: {
    fontWeight: '800',
    letterSpacing: tokens.letterSpacing.tight,
    flexShrink: 1,
    includeFontPadding: false,
  },
  schoolName: {
    fontSize: tokens.fontSize.label,
    letterSpacing: tokens.letterSpacing.wider,
    fontWeight: '400',
  },
  expandIndicator: {
    alignItems: 'flex-end',
    gap: tokens.space.xxs,
  },
  expandIcon: {
    fontSize: 20,
  },
  mealCount: {
    fontSize: tokens.fontSize.label,
    letterSpacing: tokens.letterSpacing.wide,
  },
  menuContent: {
    paddingHorizontal: 0,
    paddingTop: 0,
    paddingBottom: tokens.space.md,
  },
  emptyMeal: {
    paddingVertical: tokens.space.lg,
    alignItems: 'center',
  },
  emptyText: {
    fontSize: tokens.fontSize.caption,
    fontStyle: 'italic',
  },
  mealBar: {
    flexDirection: 'row',
    padding: tokens.space.xxs,
    gap: tokens.space.xxs,
    width: '100%',
  },
  mealTab: {
    flex: 1,
    paddingVertical: tokens.space.xs,
    alignItems: 'center',
  },
  mealTabActive: {
    backgroundColor: '#FFFFFF',
    opacity: 0.5
  },
  mealTabText: {
    fontSize: tokens.fontSize.label,
    letterSpacing: tokens.letterSpacing.wide,
    fontWeight: '600',
  },
  mealContent: {
    backgroundColor: '#FFFFFF',
    paddingHorizontal: tokens.space.lg,
    paddingTop: tokens.space.md,
    paddingBottom: tokens.space.md,
  },
  dishSection: {
    marginBottom: tokens.space.md,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  sectionLabel: {
    fontSize: tokens.fontSize.label,
    letterSpacing: tokens.letterSpacing.wider,
    fontWeight: '400',
    marginBottom: tokens.space.xs,
  },
  sectionChevron: {
    fontSize: tokens.fontSize.h3,
    fontWeight: '300',
  },
});
