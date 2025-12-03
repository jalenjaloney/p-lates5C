import React, { useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { supabase, hasSupabaseConfig } from '../supabaseClient';
import { UserAuth } from '../context/AuthContext';
import { formatTitle } from '../utils/text';

const SearchScreen = () => {
  const { session } = UserAuth();
  const [query, setQuery] = useState('');
  const [results, setResults] = useState([]);
  const [dishResults, setDishResults] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [followingIds, setFollowingIds] = useState(new Set());
  const [suggestions, setSuggestions] = useState([]);
  const [hasSearched, setHasSearched] = useState(false);
  const navigation = useNavigation();

  const currentUserId = session?.user?.id;

  const fetchFollowing = async () => {
    if (!currentUserId || !hasSupabaseConfig || !supabase) return;
    const { data, error: followErr } = await supabase
      .from('user_follows')
      .select('followed_id')
      .eq('follower_id', currentUserId);
    if (followErr) {
      console.error('Failed to load following', followErr);
      return;
    }
    setFollowingIds(new Set((data || []).map((r) => r.followed_id)));
  };

  useEffect(() => {
    fetchFollowing();
  }, [currentUserId, hasSupabaseConfig, supabase]);

  const handleSearch = async () => {
    setError('');
    setLoading(true);
    setHasSearched(true);
    try {
      const term = query.trim();
      if (!term) {
        setResults([]);
        setDishResults([]);
        setSuggestions([]);
        setLoading(false);
        return;
      }
      if (!hasSupabaseConfig || !supabase) {
        setError('Supabase is not configured.');
        setLoading(false);
        return;
      }
      const [{ data: users, error: userErr }, { data: dishes, error: dishErr }] = await Promise.all([
        supabase
          .from('user_profiles')
          .select('user_id, handle, full_name, school')
          .or(`handle.ilike.%${term}%,full_name.ilike.%${term}%`)
          .limit(20),
        supabase
          .from('dishes')
          .select('id, name, slug, tags, halls(name, campus), description')
          .or(`name.ilike.%${term}%,description.ilike.%${term}%`)
          .order('name', { ascending: true })
          .limit(20),
      ]);
      if (userErr || dishErr) throw userErr || dishErr;

      const filtered = (users || []).filter((row) => row.user_id !== currentUserId);
      const unique = [];
      const seen = new Set();
      filtered.forEach((row) => {
        if (!seen.has(row.user_id)) {
          seen.add(row.user_id);
          unique.push(row);
        }
      });
      setResults(unique);
      setDishResults(dishes || []);
      setSuggestions([]);
    } catch (err) {
      console.error('Search failed', err);
      setError('Could not search right now.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    const term = query.trim();
    if (!term || !hasSupabaseConfig || !supabase) {
      setSuggestions([]);
      return;
    }
    const timer = setTimeout(async () => {
      const [userRes, dishRes] = await Promise.all([
        supabase
          .from('user_profiles')
          .select('user_id, handle, full_name, school')
          .ilike('handle', `%${term}%`)
          .order('handle', { ascending: true })
          .limit(5),
        supabase
          .from('dishes')
          .select('id, name, slug, halls(name)')
          .ilike('name', `%${term}%`)
          .order('name', { ascending: true })
          .limit(5),
      ]);
      if (!userRes.error && !dishRes.error) {
        const lowerTerm = term.toLowerCase();
        const score = (label) => (label.toLowerCase().startsWith(lowerTerm) ? 0 : 1);
        const combined = [
          ...(dishRes.data || []).map((d) => ({
            type: 'dish',
            label: d.name,
            hall: d.halls?.name,
            slug: d.slug,
          })),
          ...(userRes.data || [])
            .filter((row) => row.user_id !== currentUserId)
            .map((u) => ({
              type: 'user',
              label: u.handle,
              handle: u.handle,
            })),
        ]
          .sort((a, b) => {
            const scoreDiff = score(a.label) - score(b.label);
            if (scoreDiff !== 0) return scoreDiff;
            return a.label.localeCompare(b.label);
          })
          .slice(0, 6);
        setSuggestions(combined);
      }
    }, 200);
    return () => clearTimeout(timer);
  }, [query, currentUserId, hasSupabaseConfig, supabase]);

  const toggleFollow = async (userId, isFollowing) => {
    if (!currentUserId || !hasSupabaseConfig || !supabase) return;
    if (isFollowing) {
      const { error: delErr } = await supabase
        .from('user_follows')
        .delete()
        .eq('follower_id', currentUserId)
        .eq('followed_id', userId);
      if (delErr) {
        console.error('Unfollow failed', delErr);
      } else {
        setFollowingIds((prev) => {
          const next = new Set(prev);
          next.delete(userId);
          return next;
        });
      }
    } else {
      const { error: insErr } = await supabase
        .from('user_follows')
        .upsert({ follower_id: currentUserId, followed_id: userId });
      if (insErr) {
        console.error('Follow failed', insErr);
      } else {
        setFollowingIds((prev) => new Set(prev).add(userId));
      }
    }
  };

  const rendered = useMemo(
    () =>
      results.map((user) => {
        const isFollowing = followingIds.has(user.user_id);
        const canFollow = Boolean(session?.user?.id);
        return (
          <View key={user.user_id} style={styles.personRow}>
            <View>
              <Text style={styles.personHandle}>{user.handle}</Text>
              <Text style={styles.personMeta}>{`${user.full_name || 'Unnamed'} · ${user.school || '5C'}`}</Text>
            </View>
            <View style={styles.personActions}>
              <Pressable
                onPress={() =>
                  navigation.navigate('UserProfile', {
                    handle: encodeURIComponent(user.handle.replace(/^@/, '')),
                  })
                }
              >
                <Text style={styles.link}>View</Text>
              </Pressable>
              <TouchableOpacity
                style={isFollowing ? styles.secondaryButton : styles.primaryButton}
                onPress={() => toggleFollow(user.user_id, isFollowing)}
                disabled={!canFollow}
              >
                <Text style={isFollowing ? styles.secondaryText : styles.primaryText}>
                  {canFollow ? (isFollowing ? 'Following' : 'Follow') : 'Sign in'}
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        );
      }),
    [navigation, results, followingIds],
  );

  return (
    <ScrollView contentContainerStyle={styles.container}>
      <View style={styles.card}>
        <Text style={styles.title}>Search plates5C</Text>
        <View style={styles.searchRow}>
          <TextInput
            value={query}
            onChangeText={setQuery}
            placeholder="Search users or dishes"
            style={styles.input}
            returnKeyType="search"
            onSubmitEditing={handleSearch}
          />
          <TouchableOpacity
            style={[styles.button, loading && styles.buttonDisabled]}
            onPress={handleSearch}
            disabled={loading}
          >
            <Text style={styles.buttonText}>{loading ? 'Searching…' : 'Search'}</Text>
          </TouchableOpacity>
        </View>
        {!session && (
          <Text style={styles.helperText}>Sign in to follow users or post reviews.</Text>
        )}

        {suggestions.length > 0 && (
          <View style={styles.suggestions}>
            {suggestions.map((s, idx) => {
              if (s.type === 'dish') {
                return (
                  <Pressable
                    key={`suggest-dish-${idx}-${s.slug}`}
                    style={styles.suggestionPill}
                    onPress={() =>
                      navigation.navigate('DishDetail', { hallSlug: s.hall, dishSlug: s.slug })
                    }
                  >
                    <Text style={styles.suggestionText}>
                      {formatTitle(s.label)}
                      {s.hall ? ` · ${formatTitle(s.hall)}` : ''}
                    </Text>
                  </Pressable>
                );
              }
              return (
                <Pressable
                  key={`suggest-user-${idx}-${s.handle}`}
                  style={styles.suggestionPill}
                  onPress={() =>
                    navigation.navigate('UserProfile', {
                      handle: encodeURIComponent(s.handle.replace(/^@/, '')),
                    })
                  }
                >
                  <Text style={styles.suggestionText}>{s.label}</Text>
                </Pressable>
              );
            })}
          </View>
        )}

        {error ? <Text style={styles.error}>{error}</Text> : null}

        {loading ? (
          <View style={styles.centered}>
            <ActivityIndicator size="small" color="#2563eb" />
          </View>
        ) : (
          <View style={styles.results}>
            {dishResults.length > 0 && (
              <View style={styles.section}>
                <Text style={styles.sectionTitle}>Dishes</Text>
                {dishResults.map((dish) => (
                  <Pressable
                    key={dish.id}
                    style={styles.dishCard}
                    onPress={() =>
                      navigation.navigate('DishDetail', { hallSlug: dish.halls?.name, dishSlug: dish.slug })
                    }
                  >
                    <Text style={styles.dishName}>{formatTitle(dish.name)}</Text>
                    {dish.halls?.name ? <Text style={styles.dishMeta}>{formatTitle(dish.halls.name)}</Text> : null}
                    {dish.description ? <Text style={styles.dishDescription}>{dish.description}</Text> : null}
                    {dish.tags?.length ? (
                      <View style={styles.tagRow}>
                        {dish.tags.slice(0, 4).map((tag) => (
                          <View key={`${dish.id}-${tag}`} style={styles.tagPill}>
                            <Text style={styles.tagText}>{formatTitle(tag)}</Text>
                          </View>
                        ))}
                      </View>
                    ) : null}
                  </Pressable>
                ))}
              </View>
            )}

            {results.length > 0 && (
              <View style={styles.section}>
                <Text style={styles.sectionTitle}>People</Text>
                {rendered}
              </View>
            )}
          </View>
        )}

        {hasSearched &&
        !loading &&
        results.length === 0 &&
        dishResults.length === 0 &&
        !error &&
        query.trim() &&
        suggestions.length === 0 ? (
          <Text style={styles.muted}>No results found.</Text>
        ) : null}
      </View>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flexGrow: 1,
    padding: 16,
    backgroundColor: '#f4f4f5',
  },
  card: {
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 16,
    gap: 12,
    elevation: 1,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 6,
  },
  title: {
    fontSize: 22,
    fontWeight: '700',
    color: '#111827',
  },
  searchRow: {
    flexDirection: 'row',
    gap: 8,
  },
  input: {
    flex: 1,
    borderWidth: 1,
    borderColor: '#d1d5db',
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 10,
    backgroundColor: '#fff',
  },
  button: {
    paddingHorizontal: 14,
    paddingVertical: 12,
    backgroundColor: '#2563eb',
    borderRadius: 12,
  },
  buttonDisabled: {
    opacity: 0.7,
  },
  buttonText: {
    color: '#fff',
    fontWeight: '700',
  },
  suggestions: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  suggestionPill: {
    backgroundColor: '#e0f2fe',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 999,
  },
  suggestionText: {
    color: '#0369a1',
    fontWeight: '600',
  },
  results: {
    gap: 12,
  },
  section: {
    gap: 8,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#1f2937',
  },
  dishCard: {
    borderWidth: 1,
    borderColor: '#e5e7eb',
    borderRadius: 12,
    padding: 12,
    gap: 6,
    backgroundColor: '#fff',
  },
  dishName: {
    fontWeight: '700',
    color: '#111827',
  },
  dishMeta: {
    color: '#6b7280',
  },
  dishDescription: {
    color: '#374151',
  },
  tagRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  tagPill: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 999,
    backgroundColor: '#dbeafe',
  },
  tagText: {
    color: '#1d4ed8',
    fontSize: 12,
    fontWeight: '600',
  },
  personRow: {
    borderWidth: 1,
    borderColor: '#e5e7eb',
    borderRadius: 12,
    padding: 12,
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 12,
    alignItems: 'center',
  },
  personHandle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#111827',
  },
  personMeta: {
    color: '#6b7280',
  },
  personActions: {
    alignItems: 'flex-end',
    gap: 6,
  },
  link: {
    color: '#2563eb',
    fontWeight: '600',
  },
  primaryButton: {
    backgroundColor: '#2563eb',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 10,
  },
  primaryText: {
    color: '#fff',
    fontWeight: '700',
  },
  secondaryButton: {
    borderWidth: 1,
    borderColor: '#2563eb',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 10,
  },
  secondaryText: {
    color: '#2563eb',
    fontWeight: '700',
  },
  muted: {
    color: '#6b7280',
  },
  centered: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  error: {
    color: '#b91c1c',
  },
});

export default SearchScreen;
