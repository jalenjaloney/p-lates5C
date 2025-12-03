// app/(tabs)/menus.tsx
import { Ionicons } from '@expo/vector-icons';
import React, { useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  FlatList,
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';

import DateBanner from '@/components/datebanner';
import DishItem from '@/components/dishitem';
import Header from '@/components/header';
import { supabase } from '@/src/supabaseClient';

type HallId =
  | 'frank'
  | 'frary'
  | 'oldenborg'
  | 'collins'
  | 'malott'
  | 'mcconnell'
  | 'hoch';

const HALLS: { id: HallId; label: string; dbName: string }[] = [
  { id: 'frank', label: 'Frank', dbName: 'Frank' },
  { id: 'frary', label: 'Frary', dbName: 'Frary' },
  { id: 'oldenborg', label: 'Oldenborg', dbName: 'Oldenborg' },
  { id: 'collins', label: 'Collins', dbName: 'Collins' },
  { id: 'malott', label: 'Malott', dbName: 'Malott' },
  { id: 'mcconnell', label: 'McConnell', dbName: 'McConnell' },
  { id: 'hoch', label: 'Hoch', dbName: 'Hoch-Shanahan' },
];

type Dish = {
  college: string;
  dish: string;
  rating?: number;
  color?: string;
};

type MenuByMeal = {
  Breakfast?: Dish[];
  Lunch?: Dish[];
  Dinner?: Dish[];
};

type MenuItemRow = {
  meal: string | null;
  dish_name: string;
  description?: string | null;
  tags?: string[] | null;
  halls: { name: string | null } | null;
};

function normalizeMealName(raw: string | null | undefined): keyof MenuByMeal | null {
  const name = (raw ?? '').toLowerCase();
  if (name.includes('breakfast')) return 'Breakfast';
  if (name.includes('lunch')) return 'Lunch';
  if (name.includes('dinner')) return 'Dinner';
  if (name.includes('late')) return 'Dinner';
  return null;
}

function buildMenu(rows: MenuItemRow[], hallLabel: string): MenuByMeal {
  const menu: MenuByMeal = {};

  rows.forEach((row) => {
    const mealKey = normalizeMealName(row.meal);
    if (!mealKey) return;

    const bucket = (menu[mealKey] ??= []);
    bucket.push({
      college: hallLabel.toUpperCase(),
      dish: row.dish_name,
      rating: undefined,
    });
  });

  return menu;
}

export default function MenusScreen() {
  const [hall, setHall] = useState<HallId>('frank');
  const [open, setOpen] = useState(false);
  const [menu, setMenu] = useState<MenuByMeal>({});
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const todayIso = new Date().toISOString().slice(0, 10);

  useEffect(() => {
    async function fetchMenu() {
      const selected = HALLS.find((h) => h.id === hall);
      if (!selected || !supabase) {
        setMenu({});
        return;
      }

      setLoading(true);
      setError(null);

      try {
        const { data, error: err } = await supabase
          .from('menu_items')
          .select('meal, dish_name, description, tags, halls(name)')
          .eq('date_served', todayIso)
          .order('meal', { ascending: true })
          .order('dish_name', { ascending: true });

        if (err) {
          throw err;
        }

        const rows: MenuItemRow[] = (data ?? []) as MenuItemRow[];
        const filtered = rows.filter(
          (row) =>
            (row.halls?.name ?? '').toLowerCase() === selected.dbName.toLowerCase(),
        );
        setMenu(buildMenu(filtered, selected.label));
      } catch (e) {
        console.error('Failed to load menus for hall', hall, e);
        setError('Could not load this hall’s menu right now.');
        setMenu({});
      } finally {
        setLoading(false);
      }
    }

    fetchMenu();
  }, [hall, todayIso]);

  const breakfast = useMemo(() => menu.Breakfast ?? [], [menu]);
  const lunch = useMemo(() => menu.Lunch ?? [], [menu]);
  const dinner = useMemo(() => menu.Dinner ?? [], [menu]);

  return (
    <ScrollView contentContainerStyle={{ flexGrow: 1, paddingTop: 16 }}>
      <Header />
      <DateBanner />

      {/* Dropdown selector */}
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

      {/* -------- BREAKFAST -------- */}
      <Text style={styles.mealTitle}>Breakfast</Text>
      {breakfast.length === 0 ? (
        <Text style={styles.noItems}>No items</Text>
      ) : (
        <View style={{ paddingHorizontal: 16 }}>
          {breakfast.map((d, i) => (
            <DishItem
              key={`b-${i}`}
              college={d.college}
              dish={d.dish}
              rating={d.rating ?? 0}
              color={d.color ?? '#4361EE'}
            />
          ))}
        </View>
      )}

      {/* -------- LUNCH -------- */}
      <Text style={styles.mealTitle}>Lunch</Text>
      {lunch.length === 0 ? (
        <Text style={styles.noItems}>No items</Text>
      ) : (
        <View style={{ paddingHorizontal: 16 }}>
          {lunch.map((d, i) => (
            <DishItem
              key={`l-${i}`}
              college={d.college}
              dish={d.dish}
              rating={d.rating ?? 0}
              color={d.color ?? '#E6C229'}
            />
          ))}
        </View>
      )}

      {/* -------- DINNER -------- */}
      <Text style={styles.mealTitle}>Dinner</Text>
      {dinner.length === 0 ? (
        <Text style={styles.noItems}>No items</Text>
      ) : (
        <View style={{ paddingHorizontal: 16 }}>
          {dinner.map((d, i) => (
            <DishItem
              key={`d-${i}`}
              college={d.college}
              dish={d.dish}
              rating={d.rating ?? 0}
              color={d.color ?? '#007F5F'}
            />
          ))}
        </View>
      )}

      {/* Modal */}
      <Modal
        visible={open}
        transparent
        animationType="fade"
        onRequestClose={() => setOpen(false)}
      >
        <Pressable style={styles.backdrop} onPress={() => setOpen(false)} />
        <View style={styles.modalCard}>
          <Text style={styles.modalTitle}>Choose a hall</Text>
          <FlatList
            data={HALLS}
            keyExtractor={(item) => item.id}
            ItemSeparatorComponent={() => <View style={styles.sep} />}
            renderItem={({ item }) => {
              const selected = item.id === hall;
              return (
                <Pressable
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
            }}
          />
        </View>
      </Modal>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
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
  hallTitle: { fontSize: 22, fontWeight: '700', paddingHorizontal: 16, paddingVertical: 12 },
  mealTitle: { fontSize: 18, fontWeight: '700', paddingHorizontal: 16, marginTop: 8 },
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
  sep: { height: 1, backgroundColor: '#1f1f1f', marginHorizontal: 8 },
});
