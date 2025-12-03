import React, { useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
  Pressable,
  TouchableOpacity,
} from 'react-native';
import { useNavigation, useRoute } from '@react-navigation/native';
import { supabase, hasSupabaseConfig } from '../supabaseClient';
import { UserAuth } from '../context/AuthContext';
import { formatTitle } from '../utils/text';

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

const DishDetailScreen = () => {
  const route = useRoute();
  const navigation = useNavigation();
  const { hallSlug, dishSlug } = route.params ?? {};
  const { session } = UserAuth();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [dish, setDish] = useState(null);
  const [occurrences, setOccurrences] = useState([]);
  const [reviews, setReviews] = useState([]);
  const [reviewsLoading, setReviewsLoading] = useState(false);
  const [reviewsError, setReviewsError] = useState('');
  const [likedIds, setLikedIds] = useState(new Set());
  const [rating, setRating] = useState(0);
  const [comment, setComment] = useState('');
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (!hasSupabaseConfig || !supabase) {
      setDish(null);
      setOccurrences([]);
      setReviews([]);
      setLikedIds(new Set());
      setError(
        'Supabase is not configured. Set EXPO_PUBLIC_SUPABASE_URL and EXPO_PUBLIC_SUPABASE_ANON_KEY in your environment.'
      );
      return;
    }

    async function fetchDish() {
      if (!dishSlug || !hallSlug) return;
      setLoading(true);
      setError('');
      try {
        const { data, error: err } = await supabase
          .from('dishes')
          .select(
            'id, name, slug, description, ingredients, allergens, dietary_choices, nutrients, tags, halls!inner(name, campus)'
          )
          .eq('slug', dishSlug)
          .eq('halls.name', hallSlug)
          .maybeSingle();
        if (err) throw err;
        setDish(data);

        if (data?.id) {
          const { data: occ, error: occErr } = await supabase
            .from('menu_items')
            .select('id, date_served, meal, section')
            .eq('dish_id', data.id)
            .order('date_served', { ascending: false });
          if (occErr) throw occErr;
          setOccurrences(occ || []);
        } else {
          setOccurrences([]);
        }
      } catch (e) {
        console.error('Failed to load dish', e);
        setError('Could not load this dish right now.');
      } finally {
        setLoading(false);
      }
    }
    fetchDish();
  }, [dishSlug, hallSlug, hasSupabaseConfig, supabase]);

  const refreshReviews = async (dishIdParam = dish?.id) => {
    if (!dishIdParam || !hasSupabaseConfig || !supabase) return;
    setReviewsLoading(true);
    setReviewsError('');
    const { data: revs, error: revErr } = await supabase
      .from('dish_ratings')
      .select('id, rating, comment, created_at, rater_handle, user_id, review_likes(count)')
      .eq('dish_id', dishIdParam)
      .order('created_at', { ascending: false });
    if (revErr) {
      console.error('Failed to load reviews', revErr);
      setReviewsError('Could not load reviews right now.');
    } else {
      setReviews(revs || []);
      if (session?.user?.id && revs?.length) {
        const ids = revs.map((r) => r.id);
        const { data: liked } = await supabase
          .from('review_likes')
          .select('rating_id')
          .eq('user_id', session.user.id)
          .in('rating_id', ids);
        setLikedIds(new Set((liked || []).map((r) => r.rating_id)));
      } else {
        setLikedIds(new Set());
      }
    }
    setReviewsLoading(false);
  };

  useEffect(() => {
    if (dish?.id) {
      refreshReviews(dish.id);
    }
  }, [dish?.id, session?.user?.id, hasSupabaseConfig, supabase]);

  const userReview = useMemo(
    () => reviews.find((r) => r.user_id === session?.user?.id),
    [reviews, session?.user?.id],
  );

  useEffect(() => {
    if (userReview) {
      setRating(userReview.rating);
      setComment(userReview.comment || '');
    }
  }, [userReview]);

  const handleSubmitReview = async () => {
    setReviewsError('');
    if (!session?.user?.id) {
      setReviewsError('Please sign in to leave a review.');
      return;
    }
    if (!hasSupabaseConfig || !supabase) {
      setReviewsError('Supabase is not configured.');
      return;
    }
    if (rating < 1 || rating > 5) {
      setReviewsError('Select a rating between 1 and 5.');
      return;
    }
    setSubmitting(true);
    try {
      const handle = session.user.user_metadata?.handle || session.user.email?.split('@')[0];
      const payload = {
        dish_id: dish.id,
        rating,
        comment: comment.trim() || null,
        rater_handle: handle ? `@${handle.replace(/^@/, '')}` : null,
        user_id: session.user.id,
      };
      const { error: upsertErr } = await supabase
        .from('dish_ratings')
        .upsert(payload, { onConflict: 'dish_id,user_id', ignoreDuplicates: false });
      if (upsertErr) {
        console.error('Failed to save review', upsertErr);
        setReviewsError('Could not save your review. Please try again.');
      } else {
        await refreshReviews(dish.id);
      }
    } finally {
      setSubmitting(false);
    }
  };

  const toggleLike = async (ratingId, liked) => {
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
        await refreshReviews(dish.id);
      }
    } else {
      const { error: insErr } = await supabase
        .from('review_likes')
        .upsert({ rating_id: ratingId, user_id: session.user.id });
      if (insErr) {
        console.error('Like failed', insErr);
      } else {
        setLikedIds((prev) => new Set(prev).add(ratingId));
        await refreshReviews(dish.id);
      }
    }
  };

  if (loading) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator size="large" color="#2563eb" />
        <Text style={styles.muted}>Loading…</Text>
      </View>
    );
  }

  if (error) {
    return (
      <View style={styles.centered}>
        <Text style={styles.error}>{error}</Text>
      </View>
    );
  }

  if (!dish) {
    return (
      <View style={styles.centered}>
        <Text style={styles.muted}>Dish not found.</Text>
      </View>
    );
  }

  const renderList = (items) =>
    Array.isArray(items) && items.length ? (
      <View style={styles.list}>
        {items.map((item) => (
          <Text style={styles.listItem} key={item}>
            - {item}
          </Text>
        ))}
      </View>
    ) : (
      <Text style={styles.muted}>None listed.</Text>
    );

  const renderNutrients = (raw) => {
    if (!raw) return <Text style={styles.muted}>Not provided.</Text>;
    const entries = raw.split('|').map((v) => v.trim()).filter(Boolean);

    const parsedPairs = entries
      .map((entry) => {
        const [label, ...rest] = entry.split(':');
        const value = rest.join(':').trim();
        return label && value ? { label: label.trim(), value } : null;
      })
      .filter((p) => p && p.value && p.value.toUpperCase() !== 'NA');

    const pairs =
      parsedPairs.length > 0
        ? parsedPairs
        : POMONA_NUTRIENTS.map((label, idx) => ({
            label,
            value: entries[idx] || '',
          })).filter((p) => p.value && p.value.toUpperCase() !== 'NA');

    if (!pairs.length) return <Text style={styles.muted}>Not provided.</Text>;

    return (
      <View style={styles.list}>
        {pairs.map((p) => (
          <Text style={styles.listItem} key={p.label}>
            <Text style={styles.bold}>{p.label}:</Text> {p.value}
          </Text>
        ))}
      </View>
    );
  };

  return (
    <ScrollView contentContainerStyle={styles.container}>
      <Pressable style={styles.backLink} onPress={() => navigation.goBack()}>
        <Text style={styles.backText}>← Back to menus</Text>
      </Pressable>
      <View style={styles.header}>
        <View>
          <Text style={styles.title}>{formatTitle(dish.name)}</Text>
          <Text style={styles.meta}>{formatTitle(dish.halls?.name || 'Unknown hall')}</Text>
        </View>
        {dish.tags?.length ? (
          <View style={styles.tagRow}>
            {dish.tags.map((tag) => (
              <View key={tag} style={styles.tagPill}>
                <Text style={styles.tagText}>{formatTitle(tag)}</Text>
              </View>
            ))}
          </View>
        ) : null}
      </View>

      {dish.description ? <Text style={styles.description}>{dish.description}</Text> : null}

      <View style={styles.grid}>
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Ingredients</Text>
          {dish.ingredients ? (
            <Text style={styles.muted}>{dish.ingredients}</Text>
          ) : (
            <Text style={styles.muted}>Not provided.</Text>
          )}
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Allergens</Text>
          {renderList(dish.allergens)}
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Dietary Choices</Text>
          {renderList(dish.dietary_choices)}
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Nutrients</Text>
          {renderNutrients(dish.nutrients)}
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Served On</Text>
          {occurrences.length ? (
            <View style={styles.list}>
              {occurrences.map((occ) => (
                <Text key={occ.id} style={styles.listItem}>
                  {occ.date_served}
                </Text>
              ))}
            </View>
          ) : (
            <Text style={styles.muted}>No occurrences found.</Text>
          )}
        </View>

        <View style={styles.section}>
          <View style={styles.reviewHeader}>
            <Text style={styles.sectionTitle}>Reviews</Text>
            <View style={styles.reviewBadge}>
              <Text style={styles.reviewBadgeText}>{reviews.length}</Text>
            </View>
          </View>

          {session ? (
            <>
              <View style={styles.ratingRow}>
                {[1, 2, 3, 4, 5].map((value) => (
                  <Pressable
                    key={value}
                    style={[styles.star, rating >= value && styles.starActive]}
                    onPress={() => setRating(value)}
                  >
                    <Text style={styles.starText}>★</Text>
                  </Pressable>
                ))}
                <Text style={styles.ratingLabel}>{rating ? `${rating}/5` : 'Rate'}</Text>
              </View>

              <TextInput
                style={[styles.input, styles.textarea]}
                placeholder="Leave a comment (optional)"
                value={comment}
                onChangeText={setComment}
                multiline
                numberOfLines={3}
              />
              <TouchableOpacity
                style={[styles.primaryButton, submitting && styles.disabledButton]}
                onPress={handleSubmitReview}
                disabled={submitting}
              >
                <Text style={styles.primaryText}>
                  {submitting ? 'Saving…' : userReview ? 'Update review' : 'Post review'}
                </Text>
              </TouchableOpacity>
            </>
          ) : (
            <Text style={styles.muted}>Sign in to leave a review.</Text>
          )}
          {reviewsError ? <Text style={styles.error}>{reviewsError}</Text> : null}

          {reviewsLoading ? (
            <View style={styles.centered}>
              <ActivityIndicator size="small" color="#2563eb" />
            </View>
          ) : reviews.length ? (
            <View style={styles.reviewList}>
              {reviews
                .slice()
                .sort((a, b) => {
                  const aLikes = a.review_likes?.[0]?.count || 0;
                  const bLikes = b.review_likes?.[0]?.count || 0;
                  if (bLikes === aLikes) {
                    return new Date(b.created_at) - new Date(a.created_at);
                  }
                  return bLikes - aLikes;
                })
                .map((rev) => {
                  const likes = rev.review_likes?.[0]?.count || 0;
                  const isLiked = likedIds.has(rev.id);
                  return (
                    <View key={rev.id} style={styles.reviewCard}>
                      <View style={styles.reviewMeta}>
                        <Text style={styles.reviewHandle}>
                          {rev.user_id === session?.user?.id ? 'You' : rev.rater_handle || 'Anonymous'}
                        </Text>
                        <Text style={styles.reviewDate}>
                          {new Date(rev.created_at).toLocaleDateString()}
                        </Text>
                      </View>
                      <Text style={styles.reviewRating}>
                        {'★'.repeat(rev.rating)}
                        {'☆'.repeat(Math.max(0, 5 - rev.rating))}
                      </Text>
                      {rev.comment ? <Text style={styles.reviewComment}>{rev.comment}</Text> : null}
                      <TouchableOpacity
                        style={[styles.likeButton, isLiked && styles.likeButtonActive]}
                        onPress={() => toggleLike(rev.id, isLiked)}
                      >
                        <Text style={isLiked ? styles.likeTextActive : styles.likeText}>♥ {likes}</Text>
                      </TouchableOpacity>
                    </View>
                  );
                })}
            </View>
          ) : (
            <Text style={styles.muted}>No reviews yet.</Text>
          )}
        </View>
      </View>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    padding: 24,
    gap: 16,
    backgroundColor: '#fff',
  },
  centered: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 12,
    padding: 24,
    backgroundColor: '#fff',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 16,
  },
  backLink: {
    paddingVertical: 4,
  },
  backText: {
    color: '#2563eb',
    fontWeight: '600',
  },
  title: {
    fontSize: 28,
    fontWeight: '700',
    color: '#111827',
  },
  meta: {
    color: '#6b7280',
    marginTop: 4,
  },
  description: {
    color: '#374151',
  },
  tagRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    justifyContent: 'flex-end',
  },
  tagPill: {
    backgroundColor: '#dbeafe',
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 6,
  },
  tagText: {
    color: '#1d4ed8',
    fontWeight: '600',
  },
  grid: {
    gap: 16,
  },
  section: {
    borderWidth: 1,
    borderColor: '#e5e7eb',
    borderRadius: 16,
    padding: 16,
    backgroundColor: '#f9fafb',
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    marginBottom: 8,
    color: '#111827',
  },
  list: {
    gap: 6,
  },
  listItem: {
    color: '#374151',
  },
  input: {
    borderWidth: 1,
    borderColor: '#d1d5db',
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 10,
    backgroundColor: '#fff',
  },
  textarea: {
    minHeight: 80,
    textAlignVertical: 'top',
  },
  reviewHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  reviewBadge: {
    backgroundColor: '#e0f2fe',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 999,
  },
  reviewBadgeText: {
    color: '#0369a1',
    fontWeight: '700',
  },
  ratingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  star: {
    width: 36,
    height: 36,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: '#e5e7eb',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#fff',
  },
  starActive: {
    backgroundColor: '#fef9c3',
    borderColor: '#f59e0b',
  },
  starText: {
    color: '#f59e0b',
    fontSize: 18,
  },
  ratingLabel: {
    color: '#374151',
    fontWeight: '600',
  },
  primaryButton: {
    backgroundColor: '#2563eb',
    paddingVertical: 12,
    borderRadius: 12,
    alignItems: 'center',
  },
  primaryText: {
    color: '#fff',
    fontWeight: '700',
  },
  disabledButton: {
    opacity: 0.7,
  },
  reviewList: {
    gap: 12,
  },
  reviewCard: {
    borderWidth: 1,
    borderColor: '#e5e7eb',
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
    fontWeight: '700',
    color: '#111827',
  },
  reviewDate: {
    color: '#6b7280',
  },
  reviewRating: {
    color: '#f59e0b',
  },
  reviewComment: {
    color: '#374151',
  },
  likeButton: {
    alignSelf: 'flex-start',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#e5e7eb',
  },
  likeButtonActive: {
    borderColor: '#ef4444',
    backgroundColor: '#ffe4e6',
  },
  likeText: {
    color: '#374151',
    fontWeight: '600',
  },
  likeTextActive: {
    color: '#b91c1c',
    fontWeight: '700',
  },
  muted: {
    color: '#6b7280',
  },
  bold: {
    fontWeight: '600',
  },
  error: {
    color: '#b91c1c',
  },
});

export default DishDetailScreen;
