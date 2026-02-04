import React, { useEffect, useMemo, useState } from 'react';
import { StyleSheet, View, Text, ScrollView, Image, TouchableOpacity, useWindowDimensions } from 'react-native';
import { useTheme } from '@/hooks/useTheme';
import { tokens } from '@/constants/tokens';
import { useMenuData, MealKey, NormalizedMenuItem } from '@/hooks/useMenuData';
import { toTitleCase } from '@/utils/text';
import { supabase, hasSupabaseConfig } from '@/src/supabaseClient';
import RatingStars from '@/components/rating-stars';
import { useRouter } from 'expo-router';
import { getHallStatus } from '@/utils/hall-status';
import { HALL_NAMES } from '@/constants/hall-hours';

export default function HomeScreen() {
  const { colors } = useTheme();
  const { width } = useWindowDimensions();
  const gridColumns = width < 768 ? 2 : 3;
  const gridItemWidth = gridColumns === 2 ? '48%' : '32%';
  const router = useRouter();
  const [selectedDate] = useState(new Date().toISOString());
  const { groupedByMeal } = useMenuData(selectedDate);
  const [reviews, setReviews] = useState<
    Array<{
      id: number;
      rating: number;
      comment?: string | null;
      image_url?: string | null;
      dishName?: string | null;
      hallName?: string | null;
    }>
  >([]);
  const [dishImages, setDishImages] = useState<Record<number, string>>({});
  const [dishTopReviews, setDishTopReviews] = useState<Record<number, string[]>>({});

  const tagColors: Record<string, { bg: string; fg: string }> = {
    VG: { bg: '#2E7D32', fg: '#FFFFFF' },  // vegan green
    V: { bg: '#9E9D24', fg: '#FFFFFF' },   // vegetarian yellow-green
    GF: { bg: '#1976D2', fg: '#FFFFFF' },  // gluten-free blue
    B: { bg: '#C62828', fg: '#FFFFFF' },   // beef
    L: { bg: '#6A1B9A', fg: '#FFFFFF' },   // lamb
    P: { bg: '#EF6C00', fg: '#FFFFFF' },   // poultry
    PK: { bg: '#5D4037', fg: '#FFFFFF' },  // pork
    H: { bg: '#1565C0', fg: '#FFFFFF' },   // halal
  };

  const toDietTags = (tags?: string[] | null) =>
    (tags || [])
      .map((tag) => tag.toLowerCase())
      .map((tag) => {
        if (tag.includes('gluten')) return 'GF';
        if (tag.includes('vegan') || tag === 'vg') return 'VG';
        if (tag.includes('vegetarian') || tag === 'veg') return 'V';
        if (tag.includes('beef')) return 'B';
        if (tag.includes('lamb')) return 'L';
        if (tag.includes('poultry') || tag.includes('chicken') || tag.includes('turkey')) return 'P';
        if (tag.includes('pork')) return 'PK';
        if (tag.includes('halal')) return 'H';
        return null;
      })
      .filter(Boolean) as Array<'VG' | 'V' | 'GF' | 'B' | 'L' | 'P' | 'PK' | 'H'>;

  const popularByMeal = useMemo(() => {
    const byMeal: Record<string, NormalizedMenuItem[]> = {};
    groupedByMeal.forEach((mealGroup) => {
      const dishes = mealGroup.halls.flatMap((hall) => hall.dishes);
      const scored = dishes
        .map((dish) => {
          const count = dish.ratingCount ?? 0;
          const avg = dish.rating ?? 0;
          const score = avg * Math.log10(count + 1);
          return { dish, score };
        })
        .sort((a, b) => b.score - a.score)
        .map((item) => item.dish);
      byMeal[mealGroup.meal] = scored.slice(0, 6);
    });
    return byMeal;
  }, [groupedByMeal]);

  const currentOrNextMeal = useMemo(() => {
    const refHall = HALL_NAMES[0];
    const status = getHallStatus(refHall);
    return status.currentMeal || status.nextMeal?.meal || null;
  }, []);

  const popularDishIds = useMemo(() => {
    const ids = new Set<number>();
    Object.values(popularByMeal).forEach((list) => {
      list.forEach((dish) => {
        if (dish.dishId) ids.add(dish.dishId);
      });
    });
    return Array.from(ids);
  }, [popularByMeal]);

  useEffect(() => {
    const loadDishImages = async () => {
      if (!hasSupabaseConfig || !supabase) return;
      if (popularDishIds.length === 0) return;
      const { data, error } = await supabase
        .from('dish_ratings')
        .select('dish_id, image_url, created_at')
        .in('dish_id', popularDishIds)
        .not('image_url', 'is', null)
        .order('created_at', { ascending: false });
      if (error) {
        console.error('Failed to load dish images', error);
        return;
      }
      const map: Record<number, string> = {};
      (data || []).forEach((row: any) => {
        if (row.image_url && map[row.dish_id] == null) {
          map[row.dish_id] = row.image_url;
        }
      });
      setDishImages(map);
    };
    loadDishImages();
  }, [popularDishIds]);

  useEffect(() => {
    const loadDishTopReviews = async () => {
      if (!hasSupabaseConfig || !supabase) return;
      if (popularDishIds.length === 0) return;
      const { data, error } = await supabase
        .from('dish_ratings')
        .select('dish_id, comment, created_at, review_likes(count)')
        .in('dish_id', popularDishIds)
        .not('comment', 'is', null)
        .order('created_at', { ascending: false });
      if (error) {
        console.error('Failed to load dish reviews', error);
        return;
      }
      const bestByDish: Record<number, { comment: string; likes: number; created_at: string }> = {};
      (data || []).forEach((row: any) => {
        if (!row.dish_id || !row.comment) return;
        const likes = row.review_likes?.[0]?.count || 0;
        const created = row.created_at || '';
        const current = bestByDish[row.dish_id];
        if (!current) {
          bestByDish[row.dish_id] = { comment: row.comment, likes, created_at: created };
          return;
        }
        if (likes > current.likes) {
          bestByDish[row.dish_id] = { comment: row.comment, likes, created_at: created };
          return;
        }
        if (likes === current.likes && created > current.created_at) {
          bestByDish[row.dish_id] = { comment: row.comment, likes, created_at: created };
        }
      });
      const map: Record<number, string[]> = {};
      Object.entries(bestByDish).forEach(([dishId, entry]) => {
        map[Number(dishId)] = [entry.comment];
      });
      setDishTopReviews(map);
    };
    loadDishTopReviews();
  }, [popularDishIds]);

  useEffect(() => {
    const loadReviews = async () => {
      if (!hasSupabaseConfig || !supabase) return;
      const { data, error } = await supabase
        .from('dish_ratings')
        .select('id, rating, comment, image_url, dishes(name, halls(name))')
        .or('comment.is.not.null,image_url.is.not.null')
        .order('created_at', { ascending: false })
        .limit(6);
      if (error) {
        console.error('Failed to load reviews', error);
        return;
      }
      setReviews(
        (data || []).map((row: any) => ({
          id: row.id,
          rating: row.rating,
          comment: row.comment,
          image_url: row.image_url,
          dishName: row.dishes?.name ?? null,
          hallName: row.dishes?.halls?.name ?? null,
        }))
      );
    };
    loadReviews();
  }, []);

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        <View style={styles.hero}>
          <Text style={[styles.heroText, { color: colors.ink, fontFamily: tokens.font.displayBlack }]}>
            PLATES5C
          </Text>
          <Text style={[styles.dateText, { color: colors.inkMuted, fontFamily: tokens.font.mono }]}>
            {new Date().toLocaleDateString('en-US', {
              weekday: 'long',
              month: 'long',
              day: 'numeric',
              year: 'numeric',
            }).replace(',', ' |')}
          </Text>
        </View>

        {currentOrNextMeal ? (
          <View style={styles.section}>
            <Text style={[styles.sectionTitle, { color: colors.inkMuted, fontFamily: tokens.font.mono }]}>
              {currentOrNextMeal.toUpperCase().replace('_', ' ')}
            </Text>
            <View style={styles.sectionBody}>
              {(popularByMeal[currentOrNextMeal] || []).length === 0 ? (
                <Text style={[styles.sectionEmpty, { color: colors.inkMuted, fontFamily: tokens.font.body }]}>
                  No dishes yet
                </Text>
              ) : (
                <View style={styles.grid}>
                  {(popularByMeal[currentOrNextMeal] || []).map((dish, index) => (
                    <TouchableOpacity
                      key={`${currentOrNextMeal}-${dish.dishId ?? 'dish'}-${index}`}
                      onPress={() => router.push(`/dish/${dish.dishId}`)}
                      activeOpacity={0.7}
                      style={[styles.gridItem, { width: gridItemWidth }]}
                    >
                      <View style={styles.gridCard}>
                        {dishImages[dish.dishId] ? (
                          <Image source={{ uri: dishImages[dish.dishId] }} style={styles.gridImage} />
                        ) : (
                          <View style={styles.gridImagePlaceholder}>
                            <Text style={[styles.placeholderText, { color: colors.inkMuted, fontFamily: tokens.font.mono }]}>
                              NO IMAGE
                            </Text>
                          </View>
                        )}
                        <View style={styles.gridBody}>
                          <View style={styles.gridTitleRow}>
                            <Text
                              numberOfLines={1}
                              ellipsizeMode="tail"
                              style={[styles.gridTitle, { color: colors.ink, fontFamily: tokens.font.bodySemibold }]}
                            >
                              {toTitleCase(dish.displayName)}
                            </Text>
                            {toDietTags(dish.tags).length > 0 && (
                              <View style={styles.gridTagsInline}>
                                {toDietTags(dish.tags).map((tag, idx) => {
                                  const color = tagColors[tag];
                                  return (
                                    <View
                                      key={`${tag}-${idx}`}
                                      style={[styles.gridTag, { backgroundColor: color.bg }]}
                                    >
                                      <Text style={[styles.gridTagText, { color: color.fg, fontFamily: tokens.font.mono }]}>
                                        {tag}
                                      </Text>
                                    </View>
                                  );
                                })}
                              </View>
                            )}
                          </View>
                          <View style={styles.gridRating}>
                            <RatingStars rating={dish.rating ?? 0} interactive={false} />
                            <Text style={[styles.gridRatingText, { color: colors.inkMuted, fontFamily: tokens.font.body }]}>
                              {(dish.rating ?? 0).toFixed(1)}
                            </Text>
                          </View>
                          {(dishTopReviews[dish.dishId] || []).length > 0 && (
                            <View style={styles.gridReviewLines}>
                              {(dishTopReviews[dish.dishId] || []).map((line, idx) => (
                                <Text
                                  key={`${dish.dishId}-review-${idx}`}
                                  numberOfLines={1}
                                  style={[styles.gridReviewText, { color: colors.inkSoft, fontFamily: tokens.font.body }]}
                                >
                                  “{line}”
                                </Text>
                              ))}
                            </View>
                          )}
                        </View>
                      </View>
                    </TouchableOpacity>
                  ))}
                </View>
              )}
            </View>
          </View>
        ) : null}

        {(['breakfast', 'lunch', 'dinner', 'late_night'] as MealKey[])
          .filter((meal) => meal !== currentOrNextMeal)
          .map((meal) => (
          <View key={meal} style={styles.section}>
            <Text style={[styles.sectionTitle, { color: colors.inkMuted, fontFamily: tokens.font.mono }]}>
              {meal.toUpperCase().replace('_', ' ')}
            </Text>
            <View style={styles.sectionBody}>
              {(popularByMeal[meal] || []).length === 0 ? (
                <Text style={[styles.sectionEmpty, { color: colors.inkMuted, fontFamily: tokens.font.body }]}>
                  No dishes yet
                </Text>
              ) : (
                <View style={styles.grid}>
                  {(popularByMeal[meal] || []).map((dish, index) => (
                    <TouchableOpacity
                      key={`${meal}-${dish.dishId ?? 'dish'}-${index}`}
                      onPress={() => router.push(`/dish/${dish.dishId}`)}
                      activeOpacity={0.7}
                      style={[styles.gridItem, { width: gridItemWidth }]}
                    >
                      <View style={styles.gridCard}>
                        {dishImages[dish.dishId] ? (
                          <Image source={{ uri: dishImages[dish.dishId] }} style={styles.gridImage} />
                        ) : (
                           <View style={styles.gridImagePlaceholder}>
                            <Text style={[styles.placeholderText, { color: colors.inkMuted, fontFamily: tokens.font.mono }]}>
                              NO IMAGE
                            </Text>
                          </View>
                        )}
                        <View style={styles.gridBody}>
                          <View style={styles.gridTitleRow}>
                            <Text
                              numberOfLines={1}
                              ellipsizeMode="tail"
                              style={[styles.gridTitle, { color: colors.ink, fontFamily: tokens.font.bodySemibold }]}
                            >
                              {toTitleCase(dish.displayName)}
                            </Text>
                            {toDietTags(dish.tags).length > 0 && (
                              <View style={styles.gridTagsInline}>
                                {toDietTags(dish.tags).map((tag, idx) => {
                                  const color = tagColors[tag];
                                  return (
                                    <View
                                      key={`${tag}-${idx}`}
                                      style={[styles.gridTag, { backgroundColor: color.bg }]}
                                    >
                                      <Text style={[styles.gridTagText, { color: color.fg, fontFamily: tokens.font.mono }]}>
                                        {tag}
                                      </Text>
                                    </View>
                                  );
                                })}
                              </View>
                            )}
                          </View>
                          <View style={styles.gridRating}>
                            <RatingStars rating={dish.rating ?? 0} interactive={false} />
                            <Text style={[styles.gridRatingText, { color: colors.inkMuted, fontFamily: tokens.font.body }]}>
                              {(dish.rating ?? 0).toFixed(1)}
                            </Text>
                          </View>
                          {(dishTopReviews[dish.dishId] || []).length > 0 && (
                            <View style={styles.gridReviewLines}>
                              {(dishTopReviews[dish.dishId] || []).map((line, idx) => (
                                <Text
                                  key={`${dish.dishId}-review-${idx}`}
                                  numberOfLines={1}
                                  style={[styles.gridReviewText, { color: colors.inkSoft, fontFamily: tokens.font.body }]}
                                >
                                  “{line}”
                                </Text>
                              ))}
                            </View>
                          )}
                        </View>
                      </View>
                    </TouchableOpacity>
                  ))}
                </View>
              )}
            </View>
          </View>
        ))}

      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  scrollContent: {
    paddingBottom: tokens.space.xl,
  },
  hero: {
    justifyContent: 'flex-start',
    paddingTop: tokens.space.md,
    paddingHorizontal: tokens.space.lg,
  },
  heroText: {
    fontSize: tokens.fontSize.display,
    letterSpacing: tokens.letterSpacing.tight,
    maxWidth: '100%',
    flexShrink: 1,
  },
  dateText: {
    marginTop: tokens.space.xs,
    fontSize: tokens.fontSize.caption,
    letterSpacing: 0,
  },
  section: {
    paddingHorizontal: tokens.space.lg,
    paddingTop: tokens.space.lg,
  },
  sectionTitle: {
    fontSize: tokens.fontSize.label,
    letterSpacing: tokens.letterSpacing.widest,
  },
  sectionBody: {
    marginTop: tokens.space.sm,
  },
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    rowGap: tokens.space.sm,
  },
  gridItem: {
    width: '32%',
  },
  gridCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: tokens.radius.lg,
    overflow: 'hidden',
  },
  gridImage: {
    width: '100%',
    height: 120,
    resizeMode: 'cover',
  },
  gridImagePlaceholder: {
    width: '100%',
    height: 120,
    backgroundColor: '#F5F2ED',
    alignItems: 'center',
    justifyContent: 'center',
  },
  placeholderText: {
    fontSize: tokens.fontSize.tiny,
    letterSpacing: tokens.letterSpacing.wide,
  },
  gridBody: {
    padding: tokens.space.sm,
    gap: tokens.space.xxs,
  },
  gridTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: tokens.space.xs,
  },
  gridTagsInline: {
    flexDirection: 'row',
    gap: tokens.space.xxs,
  },
  gridTag: {
    width: 18,
    height: 18,
    borderRadius: 9,
    justifyContent: 'center',
    alignItems: 'center',
  },
  gridTagText: {
    fontSize: 8,
    letterSpacing: tokens.letterSpacing.wide,
    fontWeight: '600',
  },
  gridTitle: {
    fontSize: tokens.fontSize.body,
    flexShrink: 1,
  },
  gridRating: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: tokens.space.xxs,
  },
  gridRatingText: {
    fontSize: tokens.fontSize.caption,
  },
  gridReviewLines: {
    gap: tokens.space.xxs,
    marginTop: tokens.space.xxs,
  },
  gridReviewText: {
    fontSize: tokens.fontSize.caption,
  },
  sectionEmpty: {
    fontSize: tokens.fontSize.caption,
  },
  reviewList: {
    gap: tokens.space.sm,
    marginTop: tokens.space.sm,
  },
  reviewCard: {
    marginTop: tokens.space.sm,
    borderRadius: tokens.radius.lg,
    overflow: 'hidden',
    backgroundColor: '#FFFFFF',
  },
  reviewImage: {
    width: '100%',
    height: 220,
    resizeMode: 'cover',
  },
  reviewBody: {
    padding: tokens.space.md,
    gap: tokens.space.xs,
  },
  reviewTitle: {
    fontSize: tokens.fontSize.h3,
  },
  reviewHall: {
    fontSize: tokens.fontSize.caption,
    letterSpacing: tokens.letterSpacing.wider,
  },
  reviewRating: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: tokens.space.xs,
  },
  reviewRatingText: {
    fontSize: tokens.fontSize.caption,
  },
  reviewComment: {
    fontSize: tokens.fontSize.body,
  },
});
