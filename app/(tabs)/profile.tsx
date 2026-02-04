import React, { useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
  Platform,
  Image,
  useWindowDimensions,
} from 'react-native';
import { Link } from 'expo-router';
import { UserAuth } from '../../src/context/AuthContext';
import { supabase, hasSupabaseConfig } from '../../src/supabaseClient';
import { UI } from '@/constants/ui';
import { toTitleCase } from '@/utils/text';
import RatingStars from '@/components/rating-stars';

const HANDLE_COOLDOWN_DAYS = 30;

const tagColors: Record<string, { bg: string; fg: string }> = {
  VG: { bg: '#2E7D32', fg: '#FFFFFF' },
  V: { bg: '#9E9D24', fg: '#FFFFFF' },
  GF: { bg: '#1976D2', fg: '#FFFFFF' },
  B: { bg: '#C62828', fg: '#FFFFFF' },
  L: { bg: '#6A1B9A', fg: '#FFFFFF' },
  P: { bg: '#EF6C00', fg: '#FFFFFF' },
  PK: { bg: '#5D4037', fg: '#FFFFFF' },
  H: { bg: '#1565C0', fg: '#FFFFFF' },
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

const deriveSchoolFromEmail = (email: string) => {
  const domain = (email || '').split('@')[1]?.toLowerCase() || '';
  if (domain.includes('pomona')) return 'Pomona';
  if (domain.includes('pitzer')) return 'Pitzer';
  if (domain.includes('scripps')) return 'Scripps';
  if (domain.includes('cmc') || domain.includes('claremontmckenna')) return 'Claremont McKenna';
  if (domain.includes('hmc') || domain.includes('harveymudd')) return 'Harvey Mudd';
  return 'The Claremont Colleges';
};

export default function Profile() {
  const { session, updateProfile, signOutUser } = UserAuth();
  const [editing, setEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [status, setStatus] = useState('');
  const [form, setForm] = useState({ handle: '', name: '', school: '', bio: '' });
  const [counts, setCounts] = useState({ followers: 0, following: 0 });
  const { width } = useWindowDimensions();
  const reviewColumns = width < 768 ? 2 : 3;
  const reviewItemWidth = reviewColumns === 2 ? '48%' : '32%';
  const [reviews, setReviews] = useState<
    Array<{
      id: number;
      rating: number;
      comment?: string | null;
      image_url?: string | null;
      tags?: string[] | null;
      created_at?: string | null;
      dishName?: string | null;
      hallName?: string | null;
    }>
  >([]);
  const [reviewsLoading, setReviewsLoading] = useState(false);

  const emailHandle = session?.user?.email?.split('@')[0] || 'platesuser';
  const derivedSchool = deriveSchoolFromEmail(session?.user?.email || '');
  const profile = useMemo(
    () => ({
      handle: session?.user?.user_metadata?.handle || `@${emailHandle}`,
      name: session?.user?.user_metadata?.full_name || 'Your Name',
      school: derivedSchool,
      bio: session?.user?.user_metadata?.bio || '',
      lastHandleChange: session?.user?.user_metadata?.last_handle_change || null,
    }),
    [emailHandle, session?.user?.user_metadata, derivedSchool],
  );

  useEffect(() => {
    setForm({
      handle: profile.handle.replace(/^@/, ''),
      name: profile.name,
      school: profile.school,
      bio: profile.bio,
    });
  }, [profile.handle, profile.name, profile.school, profile.bio]);

  useEffect(() => {
    async function ensureProfileRow() {
      if (!session?.user?.id || !hasSupabaseConfig || !supabase) return;
      await supabase.from('user_profiles').upsert({
        user_id: session.user.id,
        handle: profile.handle,
        full_name: profile.name,
        school: profile.school,
        bio: profile.bio,
      });
    }
    ensureProfileRow();
  }, [session?.user?.id, profile.handle, profile.name, profile.school, profile.bio]);

  useEffect(() => {
    async function fetchCounts() {
      if (!session?.user?.id || !hasSupabaseConfig || !supabase) return;
      const [{ data: followers }, { data: following }] = await Promise.all([
        supabase.from('user_follows').select('id').eq('followed_id', session.user.id),
        supabase.from('user_follows').select('id').eq('follower_id', session.user.id),
      ]);
      setCounts({ followers: followers?.length || 0, following: following?.length || 0 });
    }
    fetchCounts();
  }, [session?.user?.id]);

  useEffect(() => {
    async function fetchReviews() {
      if (!session?.user?.id || !hasSupabaseConfig || !supabase) return;
      setReviewsLoading(true);
      const { data, error: revErr } = await supabase
        .from('dish_ratings')
        .select('id, rating, comment, image_url, created_at, dishes(name, tags, halls(name))')
        .eq('user_id', session.user.id)
        .order('created_at', { ascending: false });
      if (revErr) {
        console.error('Failed to load reviews', revErr);
        setReviews([]);
      } else {
        setReviews(
            (data || []).map((row: any) => ({
              id: row.id,
              rating: row.rating,
              comment: row.comment,
              image_url: row.image_url,
              tags: row.dishes?.tags ?? null,
              created_at: row.created_at,
              dishName: row.dishes?.name ?? null,
              hallName: row.dishes?.halls?.name ?? null,
            }))
        );
      }
      setReviewsLoading(false);
    }
    fetchReviews();
  }, [session?.user?.id]);

  const handleSave = async () => {
    setError('');
    setStatus('');
    setSaving(true);
    try {
      const sanitizedHandle = form.handle.trim().replace(/^@+/, '');
      const currentHandle = profile.handle.replace(/^@/, '');
      const handleChanged = sanitizedHandle !== currentHandle;

      if (!sanitizedHandle) {
        setError('Handle is required');
        setSaving(false);
        return;
      }

      if (handleChanged && profile.lastHandleChange) {
        const lastChange = new Date(profile.lastHandleChange);
        const now = new Date();
        const diffHours = (now.getTime() - lastChange.getTime()) / (1000 * 60 * 60);
        const cooldownHours = HANDLE_COOLDOWN_DAYS * 24;
        if (diffHours < cooldownHours) {
          const remainingDays = Math.ceil((cooldownHours - diffHours) / 24);
          setError(`You can update your handle again in ${remainingDays} day(s).`);
          setSaving(false);
          return;
        }
      }

      const payload: Record<string, string> = {
        handle: sanitizedHandle ? `@${sanitizedHandle}` : profile.handle,
        full_name: form.name,
        school: profile.school,
        bio: form.bio,
      };
      if (handleChanged) {
        payload.last_handle_change = new Date().toISOString();
      }

      const { success, error: err } = await updateProfile(payload);
      if (!success) {
        setError(err || 'Could not save profile');
        return;
      }

      if (hasSupabaseConfig && supabase) {
        await supabase.from('user_profiles').upsert({
          user_id: session.user.id,
          handle: payload.handle,
          full_name: form.name,
          school: profile.school,
          bio: form.bio,
        });
      }

      setStatus('Profile updated');
      setEditing(false);
    } finally {
      setSaving(false);
    }
  };

  const handleCancel = () => {
    setEditing(false);
    setError('');
    setStatus('');
    setForm({
      handle: profile.handle.replace(/^@/, ''),
      name: profile.name,
      school: profile.school,
      bio: profile.bio,
    });
  };

  const handleChange = (field: keyof typeof form) => (value: string) => {
    setForm((prev) => ({ ...prev, [field]: value }));
  };

  const avatarLetter = profile.name.slice(0, 1).toUpperCase();

  if (session === undefined) {
    return (
      <View style={[styles.container, styles.centered]}>
        <ActivityIndicator size="large" color={UI.colors.accent} />
      </View>
    );
  }

  if (!session) {
    return (
      <View style={[styles.container, styles.centered]}>
        <View style={styles.authActions}>
          <Link href="/signin" asChild>
            <TouchableOpacity style={styles.primaryButton}>
              <Text style={styles.primaryText}>Sign in</Text>
            </TouchableOpacity>
          </Link>
          <Link href="/signup" asChild>
            <TouchableOpacity style={styles.secondaryButton}>
              <Text style={styles.secondaryText}>Create account</Text>
            </TouchableOpacity>
          </Link>
        </View>
      </View>
    );
  }

  return (
    <ScrollView style={styles.scroll} contentContainerStyle={styles.container}>
      <View style={styles.card}>
        <View style={styles.handleRow}>
          {editing ? (
            <View style={styles.handleInput}>
              <Text style={styles.handleAt}>@</Text>
              <TextInput
                style={styles.handleField}
                value={form.handle}
                onChangeText={handleChange('handle')}
                maxLength={20}
                autoCapitalize="none"
              />
            </View>
          ) : (
            <Text style={styles.handleText}>{profile.handle}</Text>
          )}
        </View>

        <View style={styles.avatar}>
          <Text style={styles.avatarText}>{avatarLetter}</Text>
        </View>

        {editing ? (
          <TextInput
            style={styles.input}
            value={form.name}
            onChangeText={handleChange('name')}
            placeholder="Name"
          />
        ) : (
          <Text style={styles.name}>{profile.name}</Text>
        )}

        <Text style={styles.school}>{profile.school}</Text>

        {editing ? (
          <TextInput
            style={[styles.input, styles.textarea]}
            value={form.bio}
            onChangeText={handleChange('bio')}
            placeholder="Bio"
            multiline
            numberOfLines={3}
          />
        ) : (
          <Text style={styles.bio}>{profile.bio || 'Add a short bio.'}</Text>
        )}

        {!editing && (
          <>
            <View style={styles.counts}>
              <Link href={{ pathname: '/social', params: { initialRoute: 'followers' } }} asChild>
                <TouchableOpacity style={styles.countBlock}>
                  <Text style={styles.countNumber}>{counts.followers}</Text>
                  <Text style={styles.countLabel}>Followers</Text>
                </TouchableOpacity>
              </Link>
              <Link href={{ pathname: '/social', params: { initialRoute: 'following' } }} asChild>
                <TouchableOpacity style={styles.countBlock}>
                  <Text style={styles.countNumber}>{counts.following}</Text>
                  <Text style={styles.countLabel}>Following</Text>
                </TouchableOpacity>
              </Link>
            </View>

            <View style={styles.quickLinks}>
              <Link href="/favorites" asChild>
                <TouchableOpacity style={styles.quickLink}>
                  <Text style={styles.quickLinkIcon}>♥</Text>
                  <Text style={styles.quickLinkText}>Favorites</Text>
                </TouchableOpacity>
              </Link>
            </View>

            <View style={styles.reviewSection}>
              <Text style={styles.sectionTitle}>Your Reviews</Text>
              {reviewsLoading ? (
                <ActivityIndicator size="small" color={UI.colors.accent} />
              ) : reviews.length === 0 ? (
                <Text style={styles.muted}>No reviews yet.</Text>
              ) : (
                <View style={styles.reviewGrid}>
                  {reviews.map((review) => (
                    <View key={review.id} style={[styles.reviewCard, { width: reviewItemWidth }]}>
                      {review.image_url ? (
                        <Image source={{ uri: review.image_url }} style={styles.reviewImage} />
                      ) : (
                        <View style={styles.reviewImagePlaceholder}>
                          <Text style={styles.reviewPlaceholderText}>NO IMAGE</Text>
                        </View>
                      )}
                      <View style={styles.reviewBody}>
                        <View style={styles.reviewTitleRow}>
                          <Text style={styles.reviewDish} numberOfLines={1}>
                            {toTitleCase(review.dishName || 'Dish')}
                          </Text>
                          {toDietTags(review.tags).length > 0 && (
                            <View style={styles.reviewTagsInline}>
                              {toDietTags(review.tags).map((tag, idx) => {
                                const color = tagColors[tag];
                                return (
                                  <View
                                    key={`${review.id}-${tag}-${idx}`}
                                    style={[styles.reviewTag, { backgroundColor: color.bg }]}
                                  >
                                    <Text style={[styles.reviewTagText, { color: color.fg }]}>
                                      {tag}
                                    </Text>
                                  </View>
                                );
                              })}
                            </View>
                          )}
                        </View>
                        {review.hallName ? (
                          <Text style={styles.reviewHall} numberOfLines={1}>
                            {toTitleCase(review.hallName)}
                          </Text>
                        ) : null}
                        <RatingStars rating={review.rating} interactive={false} />
                        {review.comment ? (
                          <Text style={styles.reviewComment} numberOfLines={2}>
                            {review.comment}
                          </Text>
                        ) : null}
                      </View>
                    </View>
                  ))}
                </View>
              )}
            </View>
          </>
        )}

        {status ? <Text style={styles.status}>{status}</Text> : null}
        {error ? <Text style={styles.error}>{error}</Text> : null}

        {editing ? (
          <View style={styles.actions}>
            <TouchableOpacity
              style={[styles.primaryButton, saving && styles.disabledButton]}
              onPress={handleSave}
              disabled={saving}
            >
              <Text style={styles.primaryText}>{saving ? 'Saving…' : 'Save changes'}</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.secondaryButton} onPress={handleCancel}>
              <Text style={styles.secondaryText}>Cancel</Text>
            </TouchableOpacity>
          </View>
        ) : (
          <>
            <TouchableOpacity style={styles.primaryButton} onPress={() => setEditing(true)}>
              <Text style={styles.primaryText}>Edit profile</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.ghostButton} onPress={() => signOutUser()}>
              <Text style={styles.ghostText}>Sign out</Text>
            </TouchableOpacity>
          </>
        )}
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  scroll: {
    flex: 1,
    backgroundColor: UI.colors.background,
  },
  reviewTags: {
    flexDirection: 'row',
    gap: 6,
  },
  reviewTag: {
    width: 16,
    height: 16,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  reviewTagText: {
    fontSize: 7,
    fontWeight: '700',
    letterSpacing: 0.6,
  },
  container: {
    flexGrow: 1,
    flex: 1,
    padding: 16,
    backgroundColor: UI.colors.background,
    gap: 12,
    paddingBottom: 120,
  },
  centered: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  ghostButton: {
    marginTop: 8,
    paddingVertical: 12,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#f9c9b5',
    alignItems: 'center',
  },
  ghostText: {
    color: UI.colors.accentWarm,
    fontWeight: '700',
  },
  card: {
    backgroundColor: UI.colors.surface,
    borderRadius: UI.radius.card,
    padding: 16,
    gap: 12,
    elevation: 2,
    shadowColor: UI.shadow.color,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.08,
    shadowRadius: 12,
    borderWidth: 1,
    borderColor: UI.colors.border,
  },
  handleRow: {
    alignItems: 'center',
  },
  handleText: {
    fontSize: 18,
    fontWeight: '700',
    color: UI.colors.ink,
    fontFamily: UI.font.display,
  },
  handleInput: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: UI.colors.border,
    borderRadius: 14,
    paddingHorizontal: 10,
    paddingVertical: 8,
    gap: 4,
    backgroundColor: UI.colors.surfaceMuted,
  },
  handleAt: {
    color: UI.colors.inkMuted,
    fontWeight: '700',
    fontFamily: UI.font.body,
  },
  handleField: {
    flex: 1,
    fontSize: 16,
  },
  avatar: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: '#d1fae5',
    alignItems: 'center',
    justifyContent: 'center',
    alignSelf: 'center',
  },
  avatarText: {
    fontSize: 24,
    fontWeight: '700',
    color: UI.colors.accent,
  },
  name: {
    fontSize: 22,
    fontWeight: '700',
    textAlign: 'center',
    color: UI.colors.ink,
    fontFamily: UI.font.display,
  },
  school: {
    textAlign: 'center',
    color: UI.colors.inkMuted,
    fontFamily: UI.font.body,
  },
  bio: {
    textAlign: 'center',
    color: UI.colors.inkSoft,
    fontFamily: UI.font.body,
  },
  input: {
    borderWidth: 1,
    borderColor: UI.colors.border,
    borderRadius: 14,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 16,
    backgroundColor: UI.colors.surfaceMuted,
  },
  textarea: {
    minHeight: 80,
    textAlignVertical: 'top',
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
    color: UI.colors.inkMuted,
    fontFamily: UI.font.body,
  },
  quickLinks: {
    gap: 8,
    marginTop: 4,
  },
  quickLink: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: UI.colors.border,
    backgroundColor: UI.colors.surface,
  },
  quickLinkIcon: {
    fontSize: 18,
    color: '#db2777',
  },
  quickLinkText: {
    fontSize: 15,
    fontWeight: '600',
    color: UI.colors.ink,
    fontFamily: UI.font.body,
  },
  reviewSection: {
    marginTop: 8,
    gap: 8,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: UI.colors.ink,
    fontFamily: UI.font.display,
  },
  reviewGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    rowGap: 12,
  },
  reviewCard: {
    borderWidth: 1,
    borderColor: UI.colors.border,
    borderRadius: 14,
    backgroundColor: UI.colors.surface,
    gap: 4,
    overflow: 'hidden',
  },
  reviewImage: {
    width: '100%',
    height: 120,
    resizeMode: 'cover',
  },
  reviewImagePlaceholder: {
    width: '100%',
    height: 120,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: UI.colors.surfaceMuted,
  },
  reviewPlaceholderText: {
    fontSize: 10,
    letterSpacing: 1.2,
    color: UI.colors.inkMuted,
    fontFamily: UI.font.mono,
  },
  reviewBody: {
    padding: 12,
    gap: 4,
  },
  reviewTags: {
    flexDirection: 'row',
    gap: 6,
  },
  reviewTag: {
    width: 16,
    height: 16,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  reviewTagText: {
    fontSize: 7,
    fontWeight: '700',
    letterSpacing: 0.6,
  },
  reviewTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  reviewTagsInline: {
    flexDirection: 'row',
    gap: 6,
  },
  reviewDish: {
    fontSize: 15,
    fontWeight: '700',
    color: UI.colors.ink,
    fontFamily: UI.font.body,
  },
  reviewHall: {
    fontSize: 12,
    color: UI.colors.inkMuted,
    fontFamily: UI.font.mono,
  },
  reviewRating: {
    fontSize: 12,
    color: UI.colors.inkMuted,
    fontFamily: UI.font.body,
  },
  reviewComment: {
    fontSize: 13,
    color: UI.colors.inkSoft,
    fontFamily: UI.font.body,
  },
  status: {
    color: UI.colors.accent,
    textAlign: 'center',
  },
  error: {
    color: UI.colors.accentWarm,
    textAlign: 'center',
  },
  actions: {
    flexDirection: 'row',
    gap: 8,
  },
  authActions: {
    marginTop: 16,
    width: '100%',
    gap: 10,
    ...(Platform.OS === 'web' ? { maxWidth: 360, alignSelf: 'center' } : null),
  },
  primaryButton: {
    flex: 1,
    backgroundColor: UI.colors.ink,
    paddingVertical: 12,
    borderRadius: 14,
    alignItems: 'center',
  },
  disabledButton: {
    opacity: 0.7,
  },
  primaryText: {
    color: '#fff',
    fontWeight: '700',
  },
  secondaryButton: {
    flex: 1,
    borderWidth: 1,
    borderColor: UI.colors.ink,
    paddingVertical: 12,
    borderRadius: 14,
    alignItems: 'center',
  },
  secondaryText: {
    color: UI.colors.ink,
    fontWeight: '700',
  },
  muted: {
    color: UI.colors.inkMuted,
  },
});
