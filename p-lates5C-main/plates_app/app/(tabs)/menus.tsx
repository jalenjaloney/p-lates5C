// app/(tabs)/menus.tsx
import { Ionicons } from '@expo/vector-icons';
import React, { useMemo, useState } from 'react';
import {
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

type HallId =
  | 'frank'
  | 'frary'
  | 'oldenborg'
  | 'collins'
  | 'malott'
  | 'mcconnell'
  | 'hoch';

const HALLS: { id: HallId; label: string }[] = [
  { id: 'frank', label: 'Frank' },
  { id: 'frary', label: 'Frary' },
  { id: 'oldenborg', label: 'Oldenborg' },
  { id: 'collins', label: 'Collins' },
  { id: 'malott', label: 'Malott' },
  { id: 'mcconnell', label: 'McConnell' },
  { id: 'hoch', label: 'Hoch' },
];

// ---- SAMPLE DATA (replace with real fetch later) ----
type Dish = { college: string; dish: string; rating?: number; color?: string };
type MenuByMeal = { Breakfast?: Dish[]; Lunch?: Dish[]; Dinner?: Dish[] };

const SAMPLE: Record<HallId, MenuByMeal> = {
  frank: {
    Breakfast: [
      { college: 'FRANK', dish: 'Scramble & Hash Browns', rating: 4, color: '#4361EE' },
    ],
    Lunch: [{ college: 'FRANK', dish: 'Grilled Chicken Sandwich', rating: 4, color: '#E6C229' }],
    Dinner: [{ college: 'FRANK', dish: 'Pasta Bar', rating: 4, color: '#D11149' }],
  },
  frary: {
    Breakfast: [
      { college: 'FRARY', dish: 'Scramble & Hash Browns', rating: 4, color: '#4361EE' },
    ],
    Lunch: [
      { college: 'FRARY', dish: 'Grilled Chicken Sandwich', rating: 4, color: '#E6C229' },
    ],
    Dinner: [
      { college: 'FRARY', dish: 'Pasta Bar', rating: 5, color: '#D11149' },
    ],
  },

  oldenborg: {
    Breakfast: [
      { college: 'OLDENBORG', dish: 'Scramble & Hash Browns', rating: 4, color: '#4361EE' },
    ],
    Lunch: [
      { college: 'OLDENBORG', dish: 'Grilled Chicken Sandwich', rating: 4, color: '#E6C229' },
    ],
    Dinner: [
      { college: 'OLDENBORG', dish: 'Pasta Bar', rating: 5, color: '#D11149' },
    ],
  },

  collins: {
    Breakfast: [
      { college: 'COLLINS', dish: 'Scramble & Hash Browns', rating: 4, color: '#4361EE' },
    ],
    Lunch: [
      { college: 'COLLINS', dish: 'Grilled Chicken Sandwich', rating: 4, color: '#E6C229' },
    ],
    Dinner: [
      { college: 'COLLINS', dish: 'Pasta Bar', rating: 5, color: '#D11149' },
    ],
  },

  malott: {
    Breakfast: [
      { college: 'MALOTT', dish: 'Scramble & Hash Browns', rating: 4, color: '#4361EE' },
    ],
    Lunch: [
      { college: 'MALOTT', dish: 'Grilled Chicken Sandwich', rating: 4, color: '#E6C229' },
    ],
    Dinner: [
      { college: 'MALOTT', dish: 'Pasta Bar', rating: 5, color: '#D11149' },
    ],
  },

  mcconnell: {
    Breakfast: [
      { college: 'MCCONNELL', dish: 'Scramble & Hash Browns', rating: 4, color: '#4361EE' },
    ],
    Lunch: [
      { college: 'MCCONNELL', dish: 'Grilled Chicken Sandwich', rating: 4, color: '#E6C229' },
    ],
    Dinner: [
      { college: 'MCCONNELL', dish: 'Pasta Bar', rating: 5, color: '#D11149' },
    ],
  },

  hoch: {
    Breakfast: [
      { college: 'HOCH', dish: 'Scramble & Hash Browns', rating: 4, color: '#4361EE' },
    ],
    Lunch: [
      { college: 'HOCH', dish: 'Grilled Chicken Sandwich', rating: 4, color: '#E6C229' },
    ],
    Dinner: [
      { college: 'HOCH', dish: 'Pasta Bar', rating: 5, color: '#D11149' },
    ],
  },
};
// -----------------------------------------------------

export default function MenusScreen() {
  const [hall, setHall] = useState<HallId>('frank');
  const [open, setOpen] = useState(false);

  const menu = useMemo(() => SAMPLE[hall] ?? {}, [hall]);

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
            {HALLS.find(h => h.id === hall)?.label ?? 'Select'}
          </Text>
          <Ionicons name="chevron-down" size={18} color="#111" />
        </Pressable>
      </View>

      {/* -------- BREAKFAST -------- */}
<Text style={styles.mealTitle}>Breakfast</Text>
{(menu.Breakfast ?? []).length === 0 ? (
  <Text style={styles.noItems}>No items</Text>
) : (
  <View style={{ paddingHorizontal: 16 }}>
    {(menu.Breakfast ?? []).map((d, i) => (
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
{(menu.Lunch ?? []).length === 0 ? (
  <Text style={styles.noItems}>No items</Text>
) : (
  <View style={{ paddingHorizontal: 16 }}>
    {(menu.Lunch ?? []).map((d, i) => (
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
{(menu.Dinner ?? []).length === 0 ? (
  <Text style={styles.noItems}>No items</Text>
) : (
  <View style={{ paddingHorizontal: 16 }}>
    {(menu.Dinner ?? []).map((d, i) => (
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
