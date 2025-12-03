import React, { useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { useNavigation, useRoute } from '@react-navigation/native';
import { UserAuth } from '../context/AuthContext';
import { supabase, hasSupabaseConfig } from '../supabaseClient';
import { formatTitle } from '../utils/text';

const UserProfileScreen = () => {
  const route = useRoute();
  const navigation = useNavigation();
  const { handle: handleParam } = route.params ?? {};
  const { session } = UserAuth();
  const [profile, setProfile] = useState(null);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);
  const [counts, setCounts] = useState({ followers: 0, following: 0 });
  const [isFollowing, setIsFollowing] = useState(false);
  const [reviews, setReviews] = useState([]);
  const [likedIds, setLikedIds] = useState(new Set());
  const [reviewsError, setReviewsError] = useState('');
  const [reviewsLoading, setReviewsLoading] = useState(false);

  const sanitizedHandle = useMemo(() => {
    const base = (handleParam || '').trim().replace(/^@/, '');
    return `@${base}`;
  }, [handleParam]);
  const canFollow = Boolean(session?.user?.id);

  useEffect(() => {
    async function fetchProfile() {
      setLoading(true);
      setError('');
      try {
        if (!hasSupabaseConfig || !supabase) {
          setError('Supabase is not configured.');
          setLoading(false);
          return;
        }
        const { data, error: err } = await supabase
          .from('user_profiles')
          .select('user_id, handle, full_name, school, bio')
          .eq('handle', sanitizedHandle)
          .maybeSingle();
        if (err) throw err;
        if (!data) {
          setError('User not found');
          setProfile(null);
          setLoading(false);
          return;
        }
        setProfile(data);

        const [{ count: followerCount }, { count: followingCount }, { data: followRow }] =
          await Promise.all([
            supabase
              .from('user_follows')
              .select('id', { count: 'exact', head: true })
              .eq('followed_id', data.user_id),
            supabase
              .from('user_follows')
              .select('id', { count: 'exact', head: true })
              .eq('follower_id', data.user_id),
            session?.user?.id
              ? supabase
                  .from('user_follows')
                  .select('id')
                  .eq('follower_id', session.user.id)
                  .eq('followed_id', data.user_id)
                  .maybeSingle()
              : Promise.resolve({ data: null }),
          ]);
        setCounts({
          followers: followerCount || 0,
          following: followingCount || 0,
        });
        setIsFollowing(Boolean(followRow?.id));
      } catch (err) {
        console.error('Failed to load profile', err);
        setError('Could not load this profile right now.');
      } finally {
        setLoading(false);
      }
    }
    fetchProfile();
  }, [sanitizedHandle, session?.user?.id, hasSupabaseConfig, supabase]);

  useEffect(() => {
    async function fetchReviews() {
      if (!profile?.user_id || !hasSupabaseConfig || !supabase) return;
      setReviewsLoading(true);
      setReviewsError('');
      try {
        const { data, error: revErr } = await supabase
          .from('dish_ratings')
          .select(
            'id, rating, comment, created_at, dishes(name, slug, halls(name)), review_likes(count), user_id, rater_handle'
          )
          .eq('user_id', profile.user_id);
        if (revErr) throw revErr;
        setReviews(data || []);
        if (session?.user?.id && data?.length) {
          const ids = data.map((r) => r.id);
          const { data: liked } = await supabase
            .from('review_likes')
            .select('rating_id')
            .eq('user_id', session.user.id)
            .in('rating_id', ids);
          setLikedIds(new Set((liked || []).map((r) => r.rating_id)));
        }
      } catch (err) {
        console.error('Failed to load reviews', err);
        setReviewsError('Could not load reviews right now.');
      } finally {
        setReviewsLoading(false);
      }
    }
    fetchReviews();
  }, [profile?.user_id, session?.user?.id, hasSupabaseConfig, supabase]);

  const toggleFollow = async () => {
    if (!session?.user?.id || !profile?.user_id || session.user.id === profile.user_id) return;
    if (!hasSupabaseConfig || !supabase) return;
    if (isFollowing) {
      const { error: delErr } = await supabase
        .from('user_follows')
        .delete()
        .eq('follower_id', session.user.id)
        .eq('followed_id', profile.user_id);
      if (!delErr) {
        setIsFollowing(false);
        setCounts((prev) => ({ ...prev, followers: Math.max(0, prev.followers - 1) }));
      }
    } else {
      const { error: insErr } = await supabase
        .from('user_follows')
        .upsert({ follower_id: session.user.id, followed_id: profile.user_id });
      if (!insErr) {
        setIsFollowing(true);
        setCounts((prev) => ({ ...prev, followers: prev.followers + 1 }));
      }
    }
  };

  const toggleLike = async (ratingId, liked) => {
    if (!session?.user?.id || !hasSupabaseConfig || !supabase) {
      setReviewsError('Sign in to like reviews.');
      return;
    }
    if (liked) {
      const { error: delErr } = await supabase
        .from('review_likes')
        .delete()
        .eq('rating_id', ratingId)
        .eq('user_id', session.user.id);
      if (!delErr) {
        setLikedIds((prev) => {
          const next = new Set(prev);
          next.delete(ratingId);
          return next;
        });
      }
    } else {
      const { error: insErr } = await supabase
        .from('review_likes')
        .upsert({ rating_id: ratingId, user_id: session.user.id });
      if (!insErr) {
        setLikedIds((prev) => new Set(prev).add(ratingId));
      }
    }
  };

  if (loading) {
    return (
      <View style={[styles.container, styles.centered]}>
        <ActivityIndicator size="large" color="#2563eb" />
      </View>
    );
  }
  if (error) {
    return (
      <View style={[styles.container, styles.centered]}>
        <Text style={styles.error}>{error}</Text>
      </View>
    );
  }
  if (!profile) {
    return (
      <View style={[styles.container, styles.centered]}>
        <Text style={styles.muted}>Profile not found.</Text>
      </View>
    );
  }

  const avatarLetter = (profile.full_name || 'U').slice(0, 1).toUpperCase();
  const isOwn = session?.user?.id === profile.user_id;

  return (
    <ScrollView contentContainerStyle={styles.container}>
      <View style={styles.topbar}>
        <TouchableOpacity onPress={() => navigation.goBack()}>
          <Text style={styles.link}>← Back</Text>
        </TouchableOpacity>
      </View>

      <View style={styles.card}>
        <Text style={styles.handle}>{profile.handle}</Text>
        <View style={styles.avatar}>
          <Text style={styles.avatarText}>{avatarLetter}</Text>
        </View>
        <Text style={styles.name}>{profile.full_name || 'Unnamed'}</Text>
        <Text style={styles.school}>{profile.school || '5C'}</Text>
        {profile.bio ? <Text style={styles.bio}>{profile.bio}</Text> : null}

        <View style={styles.counts}>
          <View style={styles.countBlock}>
            <Text style={styles.countNumber}>{counts.followers}</Text>
            <Text style={styles.countLabel}>Followers</Text>
          </View>
          <View style={styles.countBlock}>
            <Text style={styles.countNumber}>{counts.following}</Text>
            <Text style={styles.countLabel}>Following</Text>
          </View>
        </View>

        {!isOwn && (
          <TouchableOpacity
            style={isFollowing ? styles.secondaryButton : styles.primaryButton}
            onPress={toggleFollow}
            disabled={!canFollow}
          >
            <Text style={isFollowing ? styles.secondaryText : styles.primaryText}>
              {canFollow ? (isFollowing ? 'Following' : 'Follow') : 'Sign in'}
            </Text>
          </TouchableOpacity>
        )}

        <View style={styles.reviews}>
          <Text style={styles.sectionTitle}>Reviews</Text>
          {reviewsError ? (
            <Text style={styles.error}>{reviewsError}</Text>
          ) : reviewsLoading ? (
            <View style={styles.centered}>
              <ActivityIndicator size="small" color="#2563eb" />
            </View>
          ) : reviews.length ? (
            <View style={styles.reviewGrid}>
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
                    <Pressable
                      key={rev.id}
                      style={styles.reviewCard}
                      onPress={() => {
                        if (rev.dishes?.slug && rev.dishes?.halls?.name) {
                          navigation.navigate('DishDetail', {
                            hallSlug: rev.dishes.halls.name,
                            dishSlug: rev.dishes.slug,
                          });
                        }
                      }}
                      android_ripple={{ color: '#e5e7eb' }}
                    >
                      <Text style={styles.reviewTitle}>
                        {rev.dishes?.name ? formatTitle(rev.dishes.name) : 'Dish'}
                      </Text>
                      <Text style={styles.reviewRating}>
                        {'★'.repeat(rev.rating)}
                        {'☆'.repeat(Math.max(0, 5 - rev.rating))}
                      </Text>
                      {rev.comment ? <Text style={styles.reviewComment}>{rev.comment}</Text> : null}
                      <View style={styles.reviewFooter}>
                        <Text style={styles.reviewDate}>
                          {new Date(rev.created_at).toLocaleDateString()}
                        </Text>
                        <TouchableOpacity
                          style={[styles.likeButton, isLiked && styles.likeButtonActive]}
                          onPress={() => toggleLike(rev.id, isLiked)}
                        >
                          <Text style={isLiked ? styles.likeTextActive : styles.likeText}>♥ {likes}</Text>
                        </TouchableOpacity>
                      </View>
                    </Pressable>
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
    flexGrow: 1,
    padding: 16,
    backgroundColor: '#f4f4f5',
    gap: 12,
  },
  centered: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  topbar: {
    marginBottom: 8,
  },
  link: {
    color: '#2563eb',
    fontWeight: '600',
  },
  card: {
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 16,
    gap: 12,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.08,
    shadowRadius: 10,
  },
  handle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#111827',
    textAlign: 'center',
  },
  avatar: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: '#dbeafe',
    alignItems: 'center',
    justifyContent: 'center',
    alignSelf: 'center',
  },
  avatarText: {
    fontSize: 24,
    fontWeight: '700',
    color: '#1d4ed8',
  },
  name: {
    fontSize: 22,
    fontWeight: '700',
    textAlign: 'center',
    color: '#111827',
  },
  school: {
    textAlign: 'center',
    color: '#6b7280',
  },
  bio: {
    textAlign: 'center',
    color: '#374151',
  },
  counts: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 24,
  },
  countBlock: {
    alignItems: 'center',
  },
  countNumber: {
    fontSize: 18,
    fontWeight: '700',
  },
  countLabel: {
    color: '#6b7280',
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
  secondaryButton: {
    borderWidth: 1,
    borderColor: '#2563eb',
    paddingVertical: 12,
    borderRadius: 12,
    alignItems: 'center',
  },
  secondaryText: {
    color: '#2563eb',
    fontWeight: '700',
  },
  reviews: {
    gap: 8,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#111827',
  },
  reviewGrid: {
    gap: 10,
  },
  reviewCard: {
    borderWidth: 1,
    borderColor: '#e5e7eb',
    borderRadius: 12,
    padding: 12,
    gap: 4,
  },
  reviewTitle: {
    fontWeight: '700',
    color: '#111827',
  },
  reviewRating: {
    color: '#f59e0b',
  },
  reviewComment: {
    color: '#374151',
  },
  reviewFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 6,
  },
  reviewDate: {
    color: '#6b7280',
    fontSize: 12,
  },
  likeButton: {
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
  error: {
    color: '#b91c1c',
  },
});

export default UserProfileScreen;
