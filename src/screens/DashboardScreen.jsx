import React, { useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { supabase, hasSupabaseConfig } from '../supabaseClient';
import { UserAuth } from '../context/AuthContext';
import { formatTitle } from '../utils/text';

const mealOrder = ['breakfast', 'lunch', 'dinner', 'late_night'];
const mealLabels = {
  breakfast: 'Breakfast',
  lunch: 'Lunch',
  dinner: 'Dinner',
  late_night: 'Late Night',
};

function slugifyDish(name) {
  return (name || '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '') || 'dish';
}

function normalizeMeal(raw) {
  const name = (raw ?? '').toLowerCase();
  if (name.includes('breakfast')) return 'breakfast';
  if (name.includes('lunch')) return 'lunch';
  if (name.includes('dinner')) return 'dinner';
  if (name.includes('late')) return 'late_night';
  return null;
}

function groupRows(rows) {
  const byHall = new Map();

  rows.forEach((row) => {
    const meal = normalizeMeal(row.meal);
    if (!meal) return;

    const hallName = row.halls?.name || 'Unknown Hall';
    const campus = row.halls?.campus || '';
    if (!byHall.has(hallName)) byHall.set(hallName, { hallName, campus, meals: {} });
    const bucket = byHall.get(hallName);
    if (!bucket.meals[meal]) bucket.meals[meal] = {};
    const mealBucket = bucket.meals[meal];
    const sectionKey = row.section?.trim() || 'Unlabeled';
    if (!mealBucket[sectionKey]) mealBucket[sectionKey] = [];
    mealBucket[sectionKey].push(row);
  });

  return Array.from(byHall.values())
    .map((entry) => ({
      ...entry,
      meals: Object.fromEntries(
        mealOrder
          .filter((m) => entry.meals[m])
          .map((meal) => [
            meal,
            Object.fromEntries(
              Object.entries(entry.meals[meal])
                .sort(([a], [b]) => a.localeCompare(b))
                .map(([section, dishes]) => [
                  section,
                  dishes.sort((a, b) =>
                    (a.displayName || a.dish_name).localeCompare(b.displayName || b.dish_name)
                  ),
                ]),
            ),
          ]),
      ),
    }))
    .sort((a, b) => a.hallName.localeCompare(b.hallName));
}

const DashboardScreen = () => {
  const todayIso = new Date().toISOString().slice(0, 10);
  const [selectedDate, setSelectedDate] = useState(todayIso);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [rows, setRows] = useState([]);
  const [signOutError, setSignOutError] = useState('');

  const navigation = useNavigation();
  const { signOutUser, session } = UserAuth();

  useEffect(() => {
    if (!hasSupabaseConfig || !supabase) {
      setRows([]);
      setError(
        'Supabase is not configured. Set EXPO_PUBLIC_SUPABASE_URL and EXPO_PUBLIC_SUPABASE_ANON_KEY in your environment.'
      );
      return;
    }

    async function fetchMenus() {
      setLoading(true);
      setError('');
      try {
        const pageSize = 1000; // Supabase REST default max rows per request.
        let page = 0;
        let allRows = [];

        // Pull pages until fewer than pageSize rows are returned.
        // Sorting is reapplied per page; grouping later re-sorts dishes/sections.
        while (true) {
          const from = page * pageSize;
          const to = from + pageSize - 1;
          const { data, error: err } = await supabase
            .from('menu_items')
            .select('id, date_served, meal, dish_name, section, description, tags, dishes(name, slug), halls(name, campus)')
            .eq('date_served', selectedDate)
            .order('meal', { ascending: true })
            .order('dish_name', { ascending: true })
            .range(from, to);
          if (err) throw err;
          if (data?.length) allRows = allRows.concat(data);
          if (!data || data.length < pageSize) break;
          page += 1;
        }

        const normalized = (allRows || []).map((r) => {
          const displayName = r.dishes?.name || r.dish_name;
          const slug = r.dishes?.slug || slugifyDish(displayName);
          return { ...r, displayName, slug };
        });

        setRows(normalized);
      } catch (e) {
        console.error('Failed to load menus', e);
        setError('Could not load menus right now.');
      } finally {
        setLoading(false);
      }
    }

    fetchMenus();
  }, [selectedDate]);

  const grouped = useMemo(() => groupRows(rows), [rows]);
  const [expanded, setExpanded] = useState({});
  const [sectionExpanded, setSectionExpanded] = useState({});

  const handleSignOut = async () => {
    setSignOutError('');
    if (!session) {
      navigation.navigate('Signin');
      return;
    }
    try {
      await signOutUser();
    } catch (e) {
      console.error('Failed to sign out', e);
      setSignOutError('Unable to sign out. Please try again.');
    }
  };

  const toggleSection = (hallName, meal, section) => {
    const key = `${hallName}-${meal}-${section}`;
    setSectionExpanded((prev) => ({ ...prev, [key]: !prev[key] }));
  };

  const handleDishPress = (hallName, slug) => {
    navigation.navigate('DishDetail', { hallSlug: hallName, dishSlug: slug });
  };

  const handleGoProfile = () => {
    navigation.navigate('Profile');
  };

  const handleGoSearch = () => {
    navigation.navigate('Search');
  };

  const toggleHall = (hallName) => {
    setExpanded((prev) => ({ ...prev, [hallName]: !prev[hallName] }));
  };

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <View>
          <Text style={styles.title}>Menus</Text>
          <Text style={styles.subtitle}>Tap a dish to see nutrients and history.</Text>
        </View>
        <Pressable style={styles.signOutButton} onPress={handleSignOut}>
          <Text style={styles.signOutText}>{session ? 'Sign out' : 'Sign in'}</Text>
        </Pressable>
      </View>

      <View style={styles.dateRow}>
        <Text style={styles.label}>Menu date</Text>
        <TextInput
          value={selectedDate}
          onChangeText={(value) => setSelectedDate(value.slice(0, 10))}
          placeholder="YYYY-MM-DD"
          maxLength={10}
          style={styles.dateInput}
        />
      </View>
      <View style={styles.shortcuts}>
        <Pressable style={styles.shortcutButton} onPress={handleGoProfile}>
          <Text style={styles.shortcutText}>Profile</Text>
        </Pressable>
        <Pressable style={styles.shortcutButton} onPress={handleGoSearch}>
          <Text style={styles.shortcutText}>Search</Text>
        </Pressable>
      </View>
      {!!signOutError && <Text style={styles.error}>{signOutError}</Text>}
      {!!error && <Text style={styles.error}>{error}</Text>}

      {loading ? (
        <View style={styles.loader}>
          <ActivityIndicator size="large" color="#2563eb" />
          <Text style={styles.muted}>Loading menus…</Text>
        </View>
      ) : (
        <ScrollView contentContainerStyle={styles.scrollContent}>
          {grouped.length === 0 ? (
            <Text style={styles.muted}>No menus for this date.</Text>
          ) : (
            grouped.map((hall) => (
              <View key={hall.hallName} style={styles.hallCard}>
                <Pressable style={styles.hallHeader} onPress={() => toggleHall(hall.hallName)}>
                  <View style={styles.hallTitleRow}>
                    <Text style={styles.hallTitle}>{formatTitle(hall.hallName)}</Text>
                    {hall.campus ? (
                      <Text style={styles.hallMeta}> · {formatTitle(hall.campus)}</Text>
                    ) : null}
                  </View>
                  <Text style={styles.collapseIcon}>{expanded[hall.hallName] ? '▴' : '▾'}</Text>
                </Pressable>
                {expanded[hall.hallName] &&
                  mealOrder
                    .filter((meal) => hall.meals[meal])
                    .map((meal) => (
                      <View key={`${hall.hallName}-${meal}`} style={styles.mealBlock}>
                        <Text style={styles.mealTitle}>{mealLabels[meal] || formatTitle(meal)}</Text>
                        {Object.entries(hall.meals[meal]).map(([section, dishes]) => (
                          <View key={`${hall.hallName}-${meal}-${section}`} style={styles.sectionBlock}>
                            <Pressable
                              style={styles.sectionHeader}
                              onPress={() => toggleSection(hall.hallName, meal, section)}
                            >
                              <Text style={styles.sectionTitle}>{formatTitle(section)}</Text>
                              <Text style={styles.collapseIcon}>
                                {sectionExpanded[`${hall.hallName}-${meal}-${section}`] ? '▴' : '▾'}
                              </Text>
                            </Pressable>
                            {sectionExpanded[`${hall.hallName}-${meal}-${section}`] &&
                              dishes.map((dish) => (
                                <Pressable
                                  key={`${hall.hallName}-${meal}-${section}-${dish.dish_name}`}
                                  style={styles.dishCard}
                                  onPress={() => handleDishPress(hall.hallName, dish.slug)}
                                >
                                  <Text style={styles.dishName}>{formatTitle(dish.displayName)}</Text>
                                  {dish.description ? (
                                    <Text style={styles.dishDescription}>{dish.description}</Text>
                                  ) : null}
                                  {Array.isArray(dish.tags) && dish.tags.length ? (
                                    <View style={styles.tagRow}>
                                      {dish.tags.map((tag) => (
                                        <View key={`${dish.dish_name}-${tag}`} style={styles.tagPill}>
                                          <Text style={styles.tagText}>{formatTitle(tag)}</Text>
                                        </View>
                                      ))}
                                    </View>
                                  ) : null}
                                </Pressable>
                              ))}
                          </View>
                        ))}
                      </View>
                    ))}
              </View>
            ))
          )}
        </ScrollView>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f4f4f5',
    paddingHorizontal: 16,
    paddingTop: 24,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
    gap: 12,
  },
  title: {
    fontSize: 28,
    fontWeight: '700',
    color: '#111827',
  },
  subtitle: {
    color: '#6b7280',
  },
  signOutButton: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: '#e11d48',
  },
  signOutText: {
    color: '#e11d48',
    fontWeight: '600',
  },
  dateRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginBottom: 8,
  },
  label: {
    fontWeight: '600',
    color: '#374151',
  },
  shortcuts: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 8,
  },
  shortcutButton: {
    flex: 1,
    paddingVertical: 10,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#d1d5db',
    alignItems: 'center',
    backgroundColor: '#fff',
  },
  shortcutText: {
    color: '#2563eb',
    fontWeight: '600',
  },
  dateInput: {
    flex: 1,
    borderWidth: 1,
    borderColor: '#d1d5db',
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 10,
    backgroundColor: '#fff',
    fontSize: 16,
  },
  loader: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 12,
  },
  scrollContent: {
    paddingBottom: 48,
    gap: 16,
  },
  hallCard: {
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
  hallHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 4,
  },
  hallTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  hallTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#111827',
  },
  hallMeta: {
    fontSize: 14,
    fontWeight: '400',
    color: '#6b7280',
  },
  collapseIcon: {
    fontSize: 20,
    fontWeight: '900',
    color: '#1f2937',
    paddingHorizontal: 4,
  },
  hallMeta: {
    color: '#6b7280',
  },
  mealBlock: {
    borderTopWidth: 1,
    borderTopColor: '#f3f4f6',
    paddingTop: 12,
    gap: 8,
  },
  mealTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#1f2937',
  },
  sectionBlock: {
    borderWidth: 1,
    borderColor: '#e5e7eb',
    borderRadius: 12,
    padding: 12,
    gap: 8,
    backgroundColor: '#fafafa',
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  sectionTitle: {
    fontWeight: '600',
    color: '#4b5563',
  },
  dishCard: {
    borderRadius: 12,
    backgroundColor: '#fff',
    padding: 12,
    gap: 6,
    borderWidth: 1,
    borderColor: '#e5e7eb',
  },
  dishName: {
    fontWeight: '600',
    color: '#111827',
  },
  dishDescription: {
    color: '#6b7280',
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
  error: {
    color: '#b91c1c',
    marginBottom: 8,
  },
  muted: {
    color: '#6b7280',
    textAlign: 'center',
  },
});

export default DashboardScreen;
