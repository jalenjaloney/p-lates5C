import React, { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  ScrollView,
  StyleSheet,
  Text,
  View,
  Pressable,
} from 'react-native';
import { useNavigation, useRoute } from '@react-navigation/native';
import { supabase, hasSupabaseConfig } from '../supabaseClient';

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
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [dish, setDish] = useState(null);
  const [occurrences, setOccurrences] = useState([]);

  useEffect(() => {
    if (!hasSupabaseConfig || !supabase) {
      setDish(null);
      setOccurrences([]);
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
  }, [dishSlug, hallSlug]);

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
          <Text style={styles.title}>{dish.name}</Text>
          <Text style={styles.meta}>{dish.halls?.name || 'Unknown hall'}</Text>
        </View>
        {dish.tags?.length ? (
          <View style={styles.tagRow}>
            {dish.tags.map((tag) => (
              <View key={tag} style={styles.tagPill}>
                <Text style={styles.tagText}>{tag}</Text>
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
