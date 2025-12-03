import React, { useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  Pressable,
  TouchableOpacity,
  View,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { UserAuth } from '../context/AuthContext';
import { supabase, hasSupabaseConfig } from '../supabaseClient';
import { formatTitle } from '../utils/text';

const HANDLE_COOLDOWN_DAYS = 30;

const deriveSchoolFromEmail = (email) => {
  const domain = (email || '').split('@')[1]?.toLowerCase() || '';
  if (domain.includes('pomona')) return 'Pomona';
  if (domain.includes('pitzer')) return 'Pitzer';
  if (domain.includes('scripps')) return 'Scripps';
  if (domain.includes('cmc') || domain.includes('claremontmckenna')) return 'Claremont McKenna';
  if (domain.includes('hmc') || domain.includes('harveymudd')) return 'Harvey Mudd';
  return 'The Claremont Colleges';
};

const ProfileScreen = () => {
  const { session, updateProfile, signOutUser } = UserAuth();
  const navigation = useNavigation();
  const [editing, setEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [status, setStatus] = useState('');
  const [form, setForm] = useState({ handle: '', name: '', school: '', bio: '' });
  const [reviews, setReviews] = useState([]);
  const [reviewsLoading, setReviewsLoading] = useState(false);
  const [reviewsError, setReviewsError] = useState('');
  const [counts, setCounts] = useState({ followers: 0, following: 0 });

  if (session === undefined) {
    return (
      <View style={[styles.container, styles.centered]}>
        <ActivityIndicator size="large" color="#2563eb" />
      </View>
    );
  }
  if (!session) {
    return (
      <View style={[styles.container, styles.centered]}>
        <Text style={styles.muted}>Sign in to view your profile.</Text>
        <TouchableOpacity style={styles.primaryButton} onPress={() => navigation.navigate('Signin')}>
          <Text style={styles.primaryText}>Sign in</Text>
        </TouchableOpacity>
      </View>
    );
  }

  const emailHandle = session?.user?.email?.split('@')[0] || 'platesuser';
  const derivedSchool = deriveSchoolFromEmail(session?.user?.email || '');
  const profile = useMemo(
    () => ({
      handle: session?.user?.user_metadata?.handle || `@${emailHandle}`,
      name: session?.user?.user_metadata?.full_name || 'John Doe',
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

  const avatarLetter = profile.name.slice(0, 1).toUpperCase();
  const isLoggedIn = Boolean(session);

  useEffect(() => {
    async function fetchReviews() {
      if (!session?.user?.id || !hasSupabaseConfig || !supabase) return;
      setReviewsLoading(true);
      setReviewsError('');
      try {
        const { data, error } = await supabase
          .from('dish_ratings')
          .select('id, rating, comment, created_at, dishes(name, slug, halls(name)), review_likes(count)')
          .eq('user_id', session.user.id)
          .order('created_at', { ascending: false });
        if (error) throw error;
        setReviews(data || []);
      } catch (err) {
        console.error('Failed to load reviews', err);
        setReviewsError('Could not load your reviews right now.');
      } finally {
        setReviewsLoading(false);
      }
    }
    fetchReviews();
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
  }, [session?.user?.id, profile.handle, profile.name, profile.school, profile.bio, hasSupabaseConfig, supabase]);

  useEffect(() => {
    async function fetchCounts() {
      if (!session?.user?.id || !hasSupabaseConfig || !supabase) return;
      const { data: followers } = await supabase
        .from('user_follows')
        .select('id, follower_id')
        .eq('followed_id', session.user.id);
      const { data: following } = await supabase
        .from('user_follows')
        .select('id, followed_id')
        .eq('follower_id', session.user.id);
      setCounts({
        followers: followers?.length || 0,
        following: following?.length || 0,
      });
    }
    fetchCounts();
  }, [session?.user?.id, hasSupabaseConfig, supabase]);

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
        const diffHours = (now - lastChange) / (1000 * 60 * 60);
        const cooldownHours = HANDLE_COOLDOWN_DAYS * 24;
        if (diffHours < cooldownHours) {
          const remainingDays = Math.ceil((cooldownHours - diffHours) / 24);
          setError(`You can update your handle again in ${remainingDays} day(s).`);
          setSaving(false);
          return;
        }
      }

      const payload = {
        handle: sanitizedHandle ? `@${sanitizedHandle}` : undefined,
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
      } else {
        setStatus('Profile updated');
        setEditing(false);
        if (hasSupabaseConfig && supabase) {
          await supabase.from('user_profiles').upsert({
            user_id: session.user.id,
            handle: sanitizedHandle ? `@${sanitizedHandle}` : profile.handle,
            full_name: form.name,
            school: profile.school,
            bio: form.bio,
          });
        }
      }
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

  const handleChange = (field) => (value) => {
    setForm((prev) => ({ ...prev, [field]: value }));
  };

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
          <Text style={styles.bio}>{profile.bio}</Text>
        )}

        {!editing && (
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

        {!editing && (
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
                {reviews.map((rev) => (
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
                      {rev.dishes?.halls?.name ? ` · ${formatTitle(rev.dishes.halls.name)}` : ''}
                    </Text>
                    <Text style={styles.reviewRating}>
                      {'★'.repeat(rev.rating)}
                      {'☆'.repeat(Math.max(0, 5 - rev.rating))}
                    </Text>
                    {rev.comment ? <Text style={styles.reviewComment}>{rev.comment}</Text> : null}
                    <View style={styles.reviewFooterRow}>
                      <Text style={styles.reviewDate}>
                        {new Date(rev.created_at).toLocaleDateString()}
                      </Text>
                      <Text style={styles.reviewLikes}>
                        ♥ {rev.review_likes?.[0]?.count || 0}
                      </Text>
                    </View>
                  </Pressable>
                ))}
              </View>
            ) : (
              <Text style={styles.muted}>No reviews yet.</Text>
            )}
          </View>
        )}
      </View>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  scroll: {
    flex: 1,
    backgroundColor: '#f4f4f5',
  },
  container: {
    flexGrow: 1,
    flex: 1,
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
  ghostButton: {
    marginTop: 8,
    paddingVertical: 12,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#fecdd3',
    alignItems: 'center',
  },
  ghostText: {
    color: '#ef4444',
    fontWeight: '700',
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
  handleRow: {
    alignItems: 'center',
  },
  handleText: {
    fontSize: 18,
    fontWeight: '700',
    color: '#111827',
  },
  handleInput: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#d1d5db',
    borderRadius: 12,
    paddingHorizontal: 10,
    paddingVertical: 8,
    gap: 4,
  },
  handleAt: {
    color: '#6b7280',
    fontWeight: '700',
  },
  handleField: {
    flex: 1,
    fontSize: 16,
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
  schoolNote: {
    textAlign: 'center',
    color: '#9ca3af',
    fontSize: 12,
  },
  bio: {
    textAlign: 'center',
    color: '#374151',
  },
  input: {
    borderWidth: 1,
    borderColor: '#d1d5db',
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 16,
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
    color: '#6b7280',
  },
  status: {
    color: '#0ea5e9',
    textAlign: 'center',
  },
  error: {
    color: '#b91c1c',
    textAlign: 'center',
  },
  actions: {
    flexDirection: 'row',
    gap: 8,
  },
  primaryButton: {
    flex: 1,
    backgroundColor: '#2563eb',
    paddingVertical: 12,
    borderRadius: 12,
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
  reviewFooterRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  reviewLikes: {
    color: '#b91c1c',
    fontWeight: '700',
  },
  reviewDate: {
    color: '#6b7280',
    fontSize: 12,
  },
  muted: {
    color: '#6b7280',
  },
});

export default ProfileScreen;
