import React, { useEffect, useMemo, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  ActivityIndicator,
  Pressable,
  TouchableOpacity,
} from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useTheme } from '@/hooks/useTheme';
import { tokens } from '@/constants/tokens';
import { supabase, hasSupabaseConfig } from '@/src/supabaseClient';
import { proxyEnabled, proxyGet } from '@/src/supabaseProxy';
import RatingStars from '@/components/rating-stars';
import { toTitleCase } from '@/utils/text';
import { UserAuth } from '@/src/context/AuthContext';
import { RateDishModal } from '@/components/features/RateDishModal';

type DishDetail = {
  id: number;
  name: string;
  description?: string | null;
  ingredients?: string | null;
  allergens?: string[] | null;
  dietary_choices?: string[] | null;
  nutrients?: string | null;
  tags?: string[] | null;
  hallName?: string | null;
};

type DishReview = {
  id: number;
  rating: number;
  comment?: string | null;
  created_at?: string | null;
  rater_handle?: string | null;
  user_id?: string | null;
  review_likes?: Array<{ count: number }>;
};

type MenuOccurrence = {
  id?: number;
  date_served: string;
  meal: string;
  section?: string | null;
};

const POMONA_NUTRIENTS = [
  'Calories (kcal)',
  'Total Lipid/Fat (g)',
  'Saturated fatty acid (g)',
  'Trans Fat (g)',
  'Cholesterol (mg)',
  'Sodium (mg)',
  'Carbohydrate (g)',
  'Total Dietary Fiber (g)',
  'Total Sugars (g)',
  'Added Sugar (g)',
  'Protein (g)',
  'Vitamin C (mg)',
  'Calcium (mg)',
  'Iron (mg)',
  'Vitamin A (mcg RAE)',
  'Phosphorus (mg)',
  'Potassium (mg)',
  'Vitamin D(iu)',
];

export default function DishDetailScreen() {
  const { colors } = useTheme();
  const router = useRouter();
  const { session } = UserAuth();
  const params = useLocalSearchParams();
  const dishId = useMemo(() => Number(params.id), [params.id]);
  const [dish, setDish] = useState<DishDetail | null>(null);
  const [rating, setRating] = useState<number | null>(null);
  const [ratingCount, setRatingCount] = useState(0);
  const [occurrences, setOccurrences] = useState<MenuOccurrence[]>([]);
  const [reviews, setReviews] = useState<DishReview[]>([]);
  const [reviewsLoading, setReviewsLoading] = useState(false);
  const [reviewsError, setReviewsError] = useState('');
  const [likedIds, setLikedIds] = useState(new Set<number>());
  const [reviewModalOpen, setReviewModalOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const load = async () => {
      if (!dishId || Number.isNaN(dishId)) return;
      if (!hasSupabaseConfig || !supabase) {
        setError('Supabase is not configured.');
        return;
      }
      setLoading(true);
      setError(null);
      try {
        if (proxyEnabled) {
          const dishPayload = await proxyGet<{ dish: any }>('/api/dish', { dishId });
          const ratingPayload = await proxyGet<{ avg: number | null; count: number }>(
            '/api/dish-rating-stats',
            { dishId }
          );
          const occPayload = await proxyGet<{ occurrences: MenuOccurrence[] }>(
            '/api/dish-occurrences',
            { dishId }
          );
          const data = dishPayload.dish;
          setDish({
            id: data.id,
            name: data.name,
            description: data.description,
            ingredients: data.ingredients,
            allergens: data.allergens,
            dietary_choices: data.dietary_choices,
            nutrients: data.nutrients,
            tags: data.tags,
            hallName: data.halls?.name ?? null,
          });
          setRating(ratingPayload.avg ?? null);
          setRatingCount(ratingPayload.count ?? 0);
          setOccurrences(occPayload.occurrences || []);
        } else {
          const { data, error: dishErr } = await supabase
            .from('dishes')
            .select('id, name, description, ingredients, allergens, dietary_choices, nutrients, tags, halls(name)')
            .eq('id', dishId)
            .single();
          if (dishErr) throw dishErr;

          const { data: ratingRows, error: ratingErr } = await supabase
            .from('dish_ratings')
            .select('rating')
            .eq('dish_id', dishId)
            .order('created_at', { ascending: false });
          if (ratingErr) throw ratingErr;

          const avg =
            ratingRows && ratingRows.length
              ? Math.round((ratingRows.reduce((sum: number, r: any) => sum + (r.rating || 0), 0) / ratingRows.length) * 10) / 10
              : null;

          const { data: occRows, error: occErr } = await supabase
            .from('menu_items')
            .select('id, date_served, meal, section')
            .eq('dish_id', dishId)
            .order('date_served', { ascending: false });
          if (occErr) throw occErr;

          setDish({
            id: data.id,
            name: data.name,
            description: data.description,
            ingredients: data.ingredients,
            allergens: data.allergens,
            dietary_choices: data.dietary_choices,
            nutrients: data.nutrients,
            tags: data.tags,
            hallName: data.halls?.name ?? null,
          });
          setRating(avg);
          setRatingCount(ratingRows?.length ?? 0);
          setOccurrences(occRows || []);
        }
      } catch (e) {
        console.error('Failed to load dish', e);
        setError('Could not load this dish.');
      } finally {
        setLoading(false);
      }
    };
    load();
  }, [dishId]);

  const refreshReviews = async () => {
    if (!dishId || !hasSupabaseConfig || !supabase) return;
    setReviewsLoading(true);
    setReviewsError('');
    if (proxyEnabled) {
      try {
        const payload = await proxyGet<{ reviews: DishReview[] }>('/api/dish-reviews', { dishId });
        setReviews(payload.reviews || []);
        setLikedIds(new Set());
      } catch (err) {
        console.error('Failed to load reviews', err);
        setReviewsError('Could not load reviews right now.');
      } finally {
        setReviewsLoading(false);
      }
      return;
    }
    const { data: revs, error: revErr } = await supabase
      .from('dish_ratings')
      .select('id, rating, comment, created_at, rater_handle, user_id, review_likes(count)')
      .eq('dish_id', dishId)
      .order('created_at', { ascending: false });
    if (revErr) {
      console.error('Failed to load reviews', revErr);
      setReviewsError('Could not load reviews right now.');
    } else {
      setReviews(revs || []);
      if (session?.user?.id && revs?.length) {
        const ids = revs.map((r: any) => r.id);
        const { data: liked } = await supabase
          .from('review_likes')
          .select('rating_id')
          .eq('user_id', session.user.id)
          .in('rating_id', ids);
        setLikedIds(new Set((liked || []).map((r: any) => r.rating_id)));
      } else {
        setLikedIds(new Set());
      }
    }
    setReviewsLoading(false);
  };

  useEffect(() => {
    refreshReviews();
  }, [dishId, session?.user?.id]);

  const toggleLike = async (ratingId: number, liked: boolean) => {
    if (!session?.user?.id) {
      setReviewsError('Sign in to like reviews.');
      return;
    }
    if (!hasSupabaseConfig || !supabase) return;
    if (liked) {
      const { error: delErr } = await supabase
        .from('review_likes')
        .delete()
        .eq('rating_id', ratingId)
        .eq('user_id', session.user.id);
      if (delErr) {
        console.error('Unlike failed', delErr);
      } else {
        setLikedIds((prev) => {
          const next = new Set(prev);
          next.delete(ratingId);
          return next;
        });
        await refreshReviews();
      }
    } else {
      const { error: insErr } = await supabase
        .from('review_likes')
        .upsert({ rating_id: ratingId, user_id: session.user.id });
      if (insErr) {
        console.error('Like failed', insErr);
      } else {
        setLikedIds((prev) => new Set(prev).add(ratingId));
        await refreshReviews();
      }
    }
  };

  const renderList = (items?: string[] | null) =>
    Array.isArray(items) && items.length ? (
      <View style={styles.list}>
        {items.map((item) => (
          <Text style={[styles.listItem, { color: colors.inkSoft, fontFamily: tokens.font.body }]} key={item}>
            - {item}
          </Text>
        ))}
      </View>
    ) : (
      <Text style={[styles.muted, { color: colors.inkMuted, fontFamily: tokens.font.body }]}>Not provided.</Text>
    );

  const renderNutrients = (raw?: string | null) => {
    if (!raw) return <Text style={[styles.muted, { color: colors.inkMuted, fontFamily: tokens.font.body }]}>Not provided.</Text>;
    const entries = raw.split('|').map((v) => v.trim()).filter(Boolean);
    const parsedPairs = entries
      .map((entry) => {
        const [label, ...rest] = entry.split(':');
        const value = rest.join(':').trim();
        return label && value ? { label: label.trim(), value } : null;
      })
      .filter((p) => p && p.value && p.value.toUpperCase() !== 'NA') as Array<{ label: string; value: string }>;

    const pairs =
      parsedPairs.length > 0
        ? parsedPairs
        : POMONA_NUTRIENTS.map((label, idx) => ({
            label,
            value: entries[idx] || '',
          })).filter((p) => p.value && p.value.toUpperCase() !== 'NA');

    if (!pairs.length) return <Text style={[styles.muted, { color: colors.inkMuted, fontFamily: tokens.font.body }]}>Not provided.</Text>;

    return (
      <View style={styles.list}>
        {pairs.map((p) => (
          <Text style={[styles.listItem, { color: colors.inkSoft, fontFamily: tokens.font.body }]} key={p.label}>
            <Text style={[styles.bold, { color: colors.ink, fontFamily: tokens.font.bodySemibold }]}>{p.label}:</Text> {p.value}
          </Text>
        ))}
      </View>
    );
  };

  const handleBack = () => {
    if (typeof router.canGoBack === 'function' && router.canGoBack()) {
      router.back();
    } else {
      router.replace('/(tabs)/menus');
    }
  };

  return (
    <ScrollView contentContainerStyle={[styles.container, { backgroundColor: colors.background }]}>
      {loading && (
        <View style={styles.center}>
          <ActivityIndicator size="large" color={colors.accent} />
        </View>
      )}

      {error && (
        <View style={styles.section}>
          <Text style={[styles.errorText, { color: colors.error, fontFamily: tokens.font.bodySemibold }]}>
            {error}
          </Text>
        </View>
      )}

      {!loading && dish && (
        <View style={styles.section}>
          <Pressable style={styles.backLink} onPress={handleBack}>
            <Text style={[styles.backText, { color: colors.accent, fontFamily: tokens.font.bodySemibold }]}>
              ← Back
            </Text>
          </Pressable>
          <Text style={[styles.title, { color: colors.ink, fontFamily: tokens.font.displayBlack }]}>
            {toTitleCase(dish.name)}
          </Text>
          {dish.hallName ? (
            <Text style={[styles.subtitle, { color: colors.inkMuted, fontFamily: tokens.font.mono }]}>
              {dish.hallName}
            </Text>
          ) : null}
          <View style={styles.ratingRow}>
            {rating !== null ? <RatingStars rating={rating} interactive={false} /> : null}
            {rating !== null ? (
              <Text style={[styles.ratingText, { color: colors.inkMuted, fontFamily: tokens.font.body }]}>
                {rating.toFixed(1)} / 5 · {ratingCount} review{ratingCount === 1 ? '' : 's'}
              </Text>
            ) : (
              <Text style={[styles.ratingText, { color: colors.inkMuted, fontFamily: tokens.font.body }]}>
                No ratings yet
              </Text>
            )}
          </View>
          {dish.description ? (
            <Text style={[styles.description, { color: colors.inkSoft, fontFamily: tokens.font.body }]}>
              {dish.description}
            </Text>
          ) : null}

          <View style={styles.sectionBlock}>
            <Text style={[styles.sectionTitle, { color: colors.ink, fontFamily: tokens.font.bodySemibold }]}>
              Ingredients
            </Text>
            {dish.ingredients ? (
              <Text style={[styles.muted, { color: colors.inkMuted, fontFamily: tokens.font.body }]}>
                {dish.ingredients}
              </Text>
            ) : (
              <Text style={[styles.muted, { color: colors.inkMuted, fontFamily: tokens.font.body }]}>Not provided.</Text>
            )}
          </View>

          <View style={styles.sectionBlock}>
            <Text style={[styles.sectionTitle, { color: colors.ink, fontFamily: tokens.font.bodySemibold }]}>
              Allergens
            </Text>
            {renderList(dish.allergens)}
          </View>

          <View style={styles.sectionBlock}>
            <Text style={[styles.sectionTitle, { color: colors.ink, fontFamily: tokens.font.bodySemibold }]}>
              Dietary Choices
            </Text>
            {renderList(dish.dietary_choices)}
          </View>

          <View style={styles.sectionBlock}>
            <Text style={[styles.sectionTitle, { color: colors.ink, fontFamily: tokens.font.bodySemibold }]}>
              Nutrients
            </Text>
            {renderNutrients(dish.nutrients)}
          </View>

          <View style={styles.sectionBlock}>
            <Text style={[styles.sectionTitle, { color: colors.ink, fontFamily: tokens.font.bodySemibold }]}>
              Served On
            </Text>
            {occurrences.length ? (
              <View style={styles.list}>
                {occurrences.map((occ) => (
                  <Text
                    key={`${occ.date_served}-${occ.meal}-${occ.section ?? 'none'}-${occ.id ?? '0'}`}
                    style={[styles.listItem, { color: colors.inkSoft, fontFamily: tokens.font.body }]}
                  >
                    {occ.date_served} · {occ.meal.toUpperCase()}
                    {occ.section ? ` · ${occ.section}` : ''}
                  </Text>
                ))}
              </View>
            ) : (
              <Text style={[styles.muted, { color: colors.inkMuted, fontFamily: tokens.font.body }]}>
                No occurrences found.
              </Text>
            )}
          </View>

          <View style={styles.sectionBlock}>
            <View style={styles.reviewHeader}>
              <Text style={[styles.sectionTitle, { color: colors.ink, fontFamily: tokens.font.bodySemibold }]}>
                Reviews
              </Text>
              <View style={[styles.reviewBadge, { backgroundColor: colors.surfaceAlt }]}>
                <Text style={[styles.reviewBadgeText, { color: colors.ink, fontFamily: tokens.font.bodySemibold }]}>
                  {reviews.length}
                </Text>
              </View>
            </View>

            <TouchableOpacity
              style={[styles.primaryButton, { backgroundColor: colors.accent }]}
              onPress={() => setReviewModalOpen(true)}
            >
              <Text style={[styles.primaryText, { fontFamily: tokens.font.bodySemibold }]}>Review this dish</Text>
            </TouchableOpacity>

            {reviewsError ? (
              <Text style={[styles.errorText, { color: colors.error, fontFamily: tokens.font.body }]}>
                {reviewsError}
              </Text>
            ) : null}

            {reviewsLoading ? (
              <View style={styles.center}>
                <ActivityIndicator size="small" color={colors.accent} />
              </View>
            ) : reviews.length ? (
              <View style={styles.reviewList}>
                {reviews
                  .slice()
                  .sort((a, b) => {
                    const aLikes = a.review_likes?.[0]?.count || 0;
                    const bLikes = b.review_likes?.[0]?.count || 0;
                    if (bLikes === aLikes) {
                      return new Date(b.created_at || '').getTime() - new Date(a.created_at || '').getTime();
                    }
                    return bLikes - aLikes;
                  })
                  .map((rev) => {
                    const likes = rev.review_likes?.[0]?.count || 0;
                    const isLiked = likedIds.has(rev.id);
                    return (
                      <View key={rev.id} style={[styles.reviewCard, { borderColor: colors.border }]}>
                        <View style={styles.reviewMeta}>
                          <Text style={[styles.reviewHandle, { color: colors.ink, fontFamily: tokens.font.bodySemibold }]}>
                            {rev.user_id === session?.user?.id ? 'You' : rev.rater_handle || 'Anonymous'}
                          </Text>
                          <Text style={[styles.reviewDate, { color: colors.inkMuted, fontFamily: tokens.font.mono }]}>
                            {rev.created_at ? new Date(rev.created_at).toLocaleDateString() : ''}
                          </Text>
                        </View>
                        <View style={styles.reviewRatingRow}>
                          <RatingStars rating={rev.rating} interactive={false} />
                          <Text style={[styles.reviewRatingValue, { color: colors.inkMuted, fontFamily: tokens.font.body }]}>
                            {Number(rev.rating).toFixed(1)}
                          </Text>
                        </View>
                        {rev.comment ? (
                          <Text style={[styles.reviewComment, { color: colors.inkSoft, fontFamily: tokens.font.body }]}>
                            {rev.comment}
                          </Text>
                        ) : null}
                        <TouchableOpacity
                          style={[
                            styles.likeButton,
                            { borderColor: isLiked ? colors.accentWarm : colors.border },
                            isLiked ? styles.likeButtonActive : null,
                          ]}
                          onPress={() => toggleLike(rev.id, isLiked)}
                        >
                          <Text style={[isLiked ? styles.likeTextActive : styles.likeText, { fontFamily: tokens.font.bodySemibold }]}>
                            ♥ {likes}
                          </Text>
                        </TouchableOpacity>
                      </View>
                    );
                  })}
              </View>
            ) : (
              <Text style={[styles.muted, { color: colors.inkMuted, fontFamily: tokens.font.body }]}>
                No reviews yet.
              </Text>
            )}
          </View>
          <RateDishModal
            visible={reviewModalOpen}
            onClose={() => {
              setReviewModalOpen(false);
              refreshReviews();
            }}
            dishId={dish.id}
            dishName={dish.name}
          />
        </View>
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flexGrow: 1,
  },
  section: {
    paddingHorizontal: tokens.space.lg,
    paddingVertical: tokens.space.lg,
    gap: tokens.space.sm,
  },
  center: {
    paddingVertical: tokens.space.xxl,
    alignItems: 'center',
  },
  title: {
    fontSize: tokens.fontSize.h1,
    letterSpacing: tokens.letterSpacing.tight,
  },
  subtitle: {
    fontSize: tokens.fontSize.caption,
    letterSpacing: tokens.letterSpacing.wider,
  },
  backLink: {
    paddingVertical: 4,
  },
  backText: {
    fontSize: tokens.fontSize.body,
  },
  ratingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: tokens.space.xs,
    marginTop: tokens.space.xs,
  },
  ratingText: {
    fontSize: tokens.fontSize.caption,
  },
  description: {
    fontSize: tokens.fontSize.body,
    lineHeight: tokens.fontSize.body * tokens.lineHeight.relaxed,
  },
  sectionBlock: {
    borderWidth: 1,
    borderRadius: tokens.radius.lg,
    padding: tokens.space.md,
    gap: tokens.space.xs,
    borderColor: '#e5e7eb',
    backgroundColor: '#f9fafb',
  },
  sectionTitle: {
    fontSize: tokens.fontSize.body,
  },
  list: {
    gap: 6,
  },
  listItem: {
    fontSize: tokens.fontSize.caption,
  },
  muted: {
    fontSize: tokens.fontSize.caption,
  },
  bold: {
    fontWeight: '600',
  },
  reviewHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  reviewBadge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 999,
  },
  reviewBadgeText: {
    fontSize: tokens.fontSize.caption,
  },
  primaryButton: {
    marginTop: tokens.space.sm,
    paddingVertical: 12,
    borderRadius: 12,
    alignItems: 'center',
  },
  primaryText: {
    color: '#fff',
  },
  reviewList: {
    gap: 12,
    marginTop: tokens.space.sm,
  },
  reviewCard: {
    borderWidth: 1,
    borderRadius: 12,
    padding: 12,
    gap: 6,
    backgroundColor: '#fff',
  },
  reviewMeta: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  reviewHandle: {
    fontSize: tokens.fontSize.caption,
  },
  reviewDate: {
    fontSize: tokens.fontSize.tiny,
  },
  reviewRatingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: tokens.space.xs,
  },
  reviewRatingValue: {
    fontSize: tokens.fontSize.caption,
  },
  reviewComment: {
    fontSize: tokens.fontSize.caption,
  },
  likeButton: {
    alignSelf: 'flex-start',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 10,
    borderWidth: 1,
  },
  likeButtonActive: {
    backgroundColor: '#ffe4e6',
  },
  likeText: {
    color: '#374151',
  },
  likeTextActive: {
    color: '#b91c1c',
  },
  errorText: {
    fontSize: tokens.fontSize.body,
  },
});
