import { Ionicons } from '@expo/vector-icons';
import React, { useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';

import DateBanner from '../../components/datebanner';
import DishItem from '../../components/dishitem';
import Header from '../../components/header';
import { supabase, hasSupabaseConfig } from '../supabaseClient';
import { UserAuth } from '../context/AuthContext';

const slugifyDish = (name) =>
  (name || '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '') || 'dish';

const HALLS = [
  { id: 'frank', label: 'Frank', dbName: 'Frank' },
  { id: 'frary', label: 'Frary', dbName: 'Frary' },
  { id: 'oldenborg', label: 'Oldenborg', dbName: 'Oldenborg' },
  { id: 'collins', label: 'Collins', dbName: 'Collins' },
  { id: 'malott', label: 'Malott', dbName: 'Malott' },
  { id: 'mcconnell', label: 'McConnell', dbName: 'McConnell' },
  { id: 'hoch', label: 'Hoch', dbName: 'Hoch-Shanahan' },
];

const normalizeMealName = (raw) => {
  const name = (raw ?? '').toLowerCase();
  if (name.includes('breakfast')) return 'Breakfast';
  if (name.includes('lunch')) return 'Lunch';
  if (name.includes('dinner')) return 'Dinner';
  if (name.includes('late')) return 'Dinner';
  return null;
};

const buildMenuByMealAndSection = (rows, hallLabel) => {
  const menu = {};

  rows.forEach((row) => {
    const mealKey = normalizeMealName(row.meal);
    if (!mealKey) return;

    const sectionKey = row.section?.trim() || 'Unlabeled';
    const mealBucket = (menu[mealKey] ??= {});
    const sectionBucket = (mealBucket[sectionKey] ??= []);

    sectionBucket.push({
      id: row.id || `${row.meal}-${row.dish_name}-${sectionKey}`,
      college: hallLabel.toUpperCase(),
      dish: row.dish_name,
      slug: row.slug || row.dishes?.slug,
      description: row.description,
      tags: row.tags,
      rating: row.rating,
    });
  });

  return menu;
};

const DashboardScreen = () => {
  const { session } = UserAuth();
  const navigation = useNavigation();
  const [hall, setHall] = useState('frank');
  const [menu, setMenu] = useState({});
  const [openMeals, setOpenMeals] = useState({});
  const [openSections, setOpenSections] = useState({});
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const todayIso = useMemo(() => new Date().toISOString().slice(0, 10), []);

  useEffect(() => {
    const fetchMenu = async () => {
      const selected = HALLS.find((h) => h.id === hall);
      if (!selected || !supabase || !hasSupabaseConfig) {
        setMenu({});
        setError(
          'Supabase is not configured. Set EXPO_PUBLIC_SUPABASE_URL and EXPO_PUBLIC_SUPABASE_ANON_KEY in your environment.'
        );
        return;
      }

      setLoading(true);
      setError('');

      try {
        const { data, error: err } = await supabase
          .from('menu_items')
          .select('id, meal, dish_name, section, description, tags, halls(name), dishes(id, name, slug)')
          .eq('date_served', todayIso)
          .order('meal', { ascending: true })
          .order('dish_name', { ascending: true });

        if (err) throw err;

        const rows = (data ?? []).filter(
          (row) => (row.halls?.name ?? '').toLowerCase() === selected.dbName.toLowerCase()
        );

        const dishIds = rows
          .map((r) => r.dishes?.id)
          .filter((id) => typeof id === 'number' || typeof id === 'string');

        let averages = {};
        if (dishIds.length && supabase) {
          const { data: ratingsData, error: ratingsErr } = await supabase
            .from('dish_ratings')
            .select('dish_id, rating')
            .in('dish_id', dishIds);
          if (ratingsErr) {
            console.error('Failed to load ratings', ratingsErr);
          } else {
            const buckets = new Map();
            ratingsData?.forEach((row) => {
              if (!row.dish_id) return;
              if (!buckets.has(row.dish_id)) buckets.set(row.dish_id, []);
              buckets.get(row.dish_id).push(row.rating);
            });
            averages = Object.fromEntries(
              Array.from(buckets.entries()).map(([id, ratings]) => [
                id,
                ratings.reduce((a, b) => a + b, 0) / ratings.length,
              ])
            );
          }
        }

        const rowsWithSlug = rows.map((r) => {
          const slug = r.dishes?.slug || slugifyDish(r.dishes?.name || r.dish_name);
          const rating = r.dishes?.id ? averages[r.dishes.id] ?? 0 : 0;
          return { ...r, slug, rating };
        });

        setMenu(buildMenuByMealAndSection(rowsWithSlug, selected.label));
      } catch (e) {
        console.error('Failed to load menus for hall', hall, e);
        setError('Could not load this hall’s menu right now.');
        setMenu({});
      } finally {
        setLoading(false);
      }
    };

    fetchMenu();
  }, [hall, todayIso]);

  const breakfast = useMemo(() => menu.Breakfast ?? {}, [menu]);
  const lunch = useMemo(() => menu.Lunch ?? {}, [menu]);
  const dinner = useMemo(() => menu.Dinner ?? {}, [menu]);

  const toggleMeal = (mealKey) => {
    setOpenMeals((prev) => ({ ...prev, [mealKey]: !prev[mealKey] }));
  };

  const toggleSection = (mealKey, sectionKey) => {
    const key = `${mealKey}-${sectionKey}`;
    setOpenSections((prev) => ({ ...prev, [key]: !prev[key] }));
  };

  return (
    <View style={styles.container}>
      <ScrollView
        style={{ flex: 1 }}
        contentContainerStyle={{ flexGrow: 1, paddingTop: 16, paddingBottom: 40 }}
      >
        <Header />
        <DateBanner />

        <View style={styles.selectorWrap}>
          <Text style={styles.selectorLabel}>Dining Hall</Text>
          <Pressable
            onPress={() => setOpen(true)}
            style={({ pressed }) => [styles.selectorBtn, pressed && { opacity: 0.9 }]}
            accessibilityRole="button"
            accessibilityLabel="Choose dining hall"
          >
            <Text style={styles.selectorText}>
              {HALLS.find((h) => h.id === hall)?.label ?? 'Select'}
            </Text>
            <Ionicons name="chevron-down" size={18} color="#111" />
          </Pressable>
        </View>

        {loading && (
          <View style={styles.loadingRow}>
            <ActivityIndicator size="small" color="#2563eb" />
            <Text style={styles.loadingText}>Loading menus…</Text>
          </View>
        )}

        {!!error && <Text style={styles.errorText}>{error}</Text>}

        {['Breakfast', 'Lunch', 'Dinner'].map((mealKey) => {
          const mealData = mealKey === 'Breakfast' ? breakfast : mealKey === 'Lunch' ? lunch : dinner;
          const sections = Object.entries(mealData).filter(([, dishes]) => (dishes ?? []).length > 0);
          if (sections.length === 0) return null;

          const isOpen = openMeals[mealKey] ?? false;

          return (
            <View key={mealKey} style={{ marginTop: 10 }}>
              <Pressable style={styles.mealHeader} onPress={() => toggleMeal(mealKey)}>
                <Text style={styles.mealTitle}>{mealKey}</Text>
                <Ionicons
                  name={isOpen ? 'chevron-up' : 'chevron-down'}
                  size={18}
                  color="#111"
                />
              </Pressable>
              {isOpen &&
                sections.map(([section, dishes]) => {
                  const sectionKey = `${mealKey}-${section}`;
                  const sectionOpen = openSections[sectionKey] ?? false;
                return (
                  <View key={sectionKey} style={styles.sectionBlock}>
                    <Pressable
                      style={styles.sectionHeader}
                      onPress={() => toggleSection(mealKey, section)}
                      >
                        <Text style={styles.sectionTitle}>{section}</Text>
                        <Ionicons
                          name={sectionOpen ? 'chevron-up' : 'chevron-down'}
                          size={16}
                          color="#4b5563"
                        />
                      </Pressable>

                      {sectionOpen && (
                        <View style={{ paddingHorizontal: 4 }}>
                          {dishes.map((d, i) => (
                            <Pressable
                              key={`${sectionKey}-${i}`}
                              style={styles.dishCard}
                              onPress={() => navigation.navigate('DishDetail', { hallSlug: hall, dishSlug: d.slug })}
                            >
                              <DishItem dish={d.dish} rating={d.rating ?? 0} interactive={false} />
                              {d.description ? (
                                <Text style={styles.dishDescription}>{d.description}</Text>
                              ) : null}
                              {Array.isArray(d.tags) && d.tags.length ? (
                                <View style={styles.tagRow}>
                                  {d.tags.map((tag) => (
                                    <View key={`${sectionKey}-${i}-${tag}`} style={styles.tagPill}>
                                      <Text style={styles.tagText}>{tag}</Text>
                                    </View>
                                  ))}
                                </View>
                              ) : null}
                            </Pressable>
                          ))}
                        </View>
                      )}
                    </View>
                  );
                })}
            </View>
          );
        })}
      </ScrollView>

      <Modal
        visible={open}
        transparent
        animationType="fade"
        onRequestClose={() => setOpen(false)}
      >
        <Pressable style={styles.backdrop} onPress={() => setOpen(false)} />
        <View style={styles.modalCard}>
          <Text style={styles.modalTitle}>Choose a hall</Text>
          {HALLS.map((item) => {
            const selected = item.id === hall;
            return (
              <Pressable
                key={item.id}
                onPress={() => {
                  setHall(item.id);
                  setOpen(false);
                }}
                style={[styles.optionRow, selected && styles.optionRowSelected]}
              >
                <Text style={[styles.optionText, selected && styles.optionTextSelected]}>
                  {item.label}
                </Text>
                {selected && <Ionicons name="checkmark" size={18} color="#fff" />}
              </Pressable>
            );
          })}
        </View>
      </Modal>
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f4f4f5' },
  selectorWrap: { paddingHorizontal: 16, paddingBottom: 8, marginTop: 20, gap: 6 },
  selectorLabel: { fontSize: 13, color: '#666' },
  selectorBtn: {
    borderWidth: 1,
    borderColor: '#e5e5e5',
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 12,
    backgroundColor: '#fff',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  selectorText: { fontSize: 16, color: '#111', fontWeight: '600' },
  mealHeader: {
    paddingHorizontal: 16,
    paddingVertical: 10,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  mealTitle: { fontSize: 18, fontWeight: '700', color: '#111' },
  noItems: { paddingHorizontal: 16, color: '#666', marginBottom: 8 },
  loadingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 16,
    paddingVertical: 8,
  },
  loadingText: { color: '#4b5563' },
  errorText: {
    paddingHorizontal: 16,
    paddingVertical: 4,
    color: '#b91c1c',
  },
  backdrop: { flex: 1, backgroundColor: 'rgba(0,0,0,0.25)' },
  modalCard: {
    position: 'absolute',
    left: 16,
    right: 16,
    top: 120,
    backgroundColor: '#111',
    borderRadius: 16,
    paddingVertical: 10,
    paddingHorizontal: 12,
  },
  modalTitle: { color: '#fff', fontWeight: '700', fontSize: 14, marginBottom: 6, opacity: 0.85 },
  optionRow: {
    paddingVertical: 12,
    paddingHorizontal: 10,
    borderRadius: 10,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  optionRowSelected: { backgroundColor: '#222' },
  optionText: { color: '#ddd', fontSize: 16 },
  optionTextSelected: { color: '#fff', fontWeight: '700' },
  sectionBlock: {
    marginHorizontal: 16,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: '#e5e5e5',
    borderRadius: 12,
    backgroundColor: '#fafafa',
    overflow: 'hidden',
  },
  sectionHeader: {
    paddingHorizontal: 12,
    paddingVertical: 10,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#f3f4f6',
  },
  sectionTitle: { fontWeight: '700', color: '#111', fontSize: 16 },
  dishCard: {
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderTopWidth: 1,
    borderTopColor: '#ececec',
    gap: 6,
    backgroundColor: '#fff',
  },
  dishDescription: { color: '#6b7280' },
  tagRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  tagPill: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 999,
    backgroundColor: '#dbeafe',
  },
  tagText: { color: '#1d4ed8', fontSize: 12, fontWeight: '600' },
});

export default DashboardScreen;
