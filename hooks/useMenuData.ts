import { useCallback, useEffect, useMemo, useState } from 'react';

import { supabase, hasSupabaseConfig } from '@/src/supabaseClient';
import { normalizeHallName } from '@/constants/hall-hours';

export const mealOrder = ['breakfast', 'lunch', 'dinner', 'late_night'] as const;
export type MealKey = (typeof mealOrder)[number];

export const mealLabels: Record<MealKey, string> = {
  breakfast: 'Breakfast',
  lunch: 'Lunch',
  dinner: 'Dinner',
  late_night: 'Late Night',
};

export type NormalizedMenuItem = {
  id: string | number;
  dishId: number;
  displayName: string;
  slug: string;
  description?: string | null;
  tags?: string[] | null;
  hallName: string;
  campus?: string | null;
  meal: MealKey;
  section?: string | null;
  rating?: number | null;
  ratingCount?: number;
};

export type GroupedByHall = {
  hallName: string;
  campus?: string | null;
  meals: Record<MealKey, Record<string, NormalizedMenuItem[]>>;
};

export type GroupedByMeal = {
  meal: MealKey;
  halls: {
    hallName: string;
    campus?: string | null;
    dishes: NormalizedMenuItem[];
  }[];
};

const slugifyDish = (name?: string | null) =>
  (name || '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '') || 'dish';

const normalizeMeal = (raw?: string | null): MealKey | null => {
  const name = (raw ?? '').toLowerCase();
  if (name.includes('breakfast')) return 'breakfast';
  if (name.includes('lunch')) return 'lunch';
  if (name.includes('dinner')) return 'dinner';
  if (name.includes('late')) return 'late_night';
  return null;
};

const normalizeLabel = (value?: string | null) =>
  (value || '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, ' ')
    .trim();

const formatLocalDate = (value: string) => {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value.slice(0, 10);
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};

const isStationDescriptor = (name?: string | null, section?: string | null) => {
  const raw = (name || '').trim();
  if (!raw) return true;
  const normalized = normalizeLabel(raw);
  const sectionNorm = normalizeLabel(section || '');
  if (sectionNorm && normalized === sectionNorm) return true;

  const lower = raw.toLowerCase();
  const hasParen = raw.includes('(') && raw.includes(')');
  const parenText = hasParen ? raw.slice(raw.indexOf('(') + 1, raw.lastIndexOf(')')) : '';
  const parenNorm = normalizeLabel(parenText);

  if (normalized.includes('station')) return true;
  if (hasParen && (parenNorm.includes('dishes that contain') || parenNorm.includes('contains no'))) return true;
  if (hasParen && parenText.length >= 24) return true;
  if (/^[A-Z0-9\s&/:-]+$/.test(raw)) return true;

  return false;
};

const normalizeRows = (rows: any[]): NormalizedMenuItem[] =>
  (rows || [])
    .map((row) => {
      const meal = normalizeMeal(row.meal);
      if (!meal) return null;
      const displayName = row.dishes?.name || row.dish_name;
      if (isStationDescriptor(displayName, row.section)) return null;
      const slug = row.dishes?.slug || slugifyDish(displayName);
      const hallName = normalizeHallName(row.halls?.name || 'Unknown Hall');
      return {
        ...row,
        dishId: row.dish_id,
        meal,
        displayName,
        slug,
        hallName,
        campus: row.halls?.campus || null,
      } as NormalizedMenuItem;
    })
    .filter(Boolean) as NormalizedMenuItem[];

const fetchRatingsMap = async (dishIds: number[]) => {
  const ratings = new Map<number, { sum: number; count: number }>();
  const chunkSize = 500;
  for (let i = 0; i < dishIds.length; i += chunkSize) {
    const chunk = dishIds.slice(i, i + chunkSize);
    const { data, error } = await supabase
      .from('dish_ratings')
      .select('dish_id, rating')
      .in('dish_id', chunk);
    if (error) throw error;
    (data || []).forEach((row: any) => {
      const dishId = row.dish_id as number;
      const entry = ratings.get(dishId) || { sum: 0, count: 0 };
      entry.sum += row.rating || 0;
      entry.count += 1;
      ratings.set(dishId, entry);
    });
  }
  return new Map(
    Array.from(ratings.entries()).map(([dishId, { sum, count }]) => [
      dishId,
      { avg: count ? Math.round((sum / count) * 10) / 10 : null, count },
    ])
  );
};

const groupRowsByHall = (rows: NormalizedMenuItem[]): GroupedByHall[] => {
  const byHall = new Map<string, GroupedByHall>();

  rows.forEach((row) => {
    if (!byHall.has(row.hallName)) {
      byHall.set(row.hallName, { hallName: row.hallName, campus: row.campus, meals: {} as any });
    }
    const hallBucket = byHall.get(row.hallName)!;
    if (!hallBucket.meals[row.meal]) hallBucket.meals[row.meal] = {};
    const mealBucket = hallBucket.meals[row.meal];
    const sectionKey = (row.section || 'Unlabeled').trim();
    if (!mealBucket[sectionKey]) mealBucket[sectionKey] = [];
    mealBucket[sectionKey].push(row);
  });

  return Array.from(byHall.values())
    .map((entry) => ({
      ...entry,
      meals: Object.fromEntries(
        mealOrder
          .filter((meal) => entry.meals[meal])
          .map((meal) => [
            meal,
            Object.fromEntries(
              Object.entries(entry.meals[meal]!)
                .sort(([a], [b]) => a.localeCompare(b))
                .map(([section, dishes]) => [
                  section,
                  dishes.slice().sort((a, b) => a.displayName.localeCompare(b.displayName)),
                ]),
            ),
          ]),
      ),
    }))
    .sort((a, b) => a.hallName.localeCompare(b.hallName));
};

const groupRowsByMeal = (rows: NormalizedMenuItem[]): GroupedByMeal[] => {
  const byMeal = new Map<
    MealKey,
    Map<
      string,
      {
        hallName: string;
        campus?: string | null;
        dishes: NormalizedMenuItem[];
      }
    >
  >();

  rows.forEach((row) => {
    if (!byMeal.has(row.meal)) {
      byMeal.set(row.meal, new Map());
    }
    const mealBucket = byMeal.get(row.meal)!;
    if (!mealBucket.has(row.hallName)) {
      mealBucket.set(row.hallName, { hallName: row.hallName, campus: row.campus, dishes: [] });
    }
    mealBucket.get(row.hallName)!.dishes.push(row);
  });

  return mealOrder
    .filter((meal) => byMeal.has(meal))
    .map((meal) => {
      const halls = Array.from(byMeal.get(meal)!.values())
        .map((hall) => ({
          ...hall,
          dishes: hall.dishes.slice().sort((a, b) => a.displayName.localeCompare(b.displayName)),
        }))
        .sort((a, b) => a.hallName.localeCompare(b.hallName));
      return { meal, halls };
    });
};

export function useMenuData(selectedDate: string) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [rows, setRows] = useState<NormalizedMenuItem[]>([]);
  const [latestAvailableDate, setLatestAvailableDate] = useState<string | null>(null);

  const fetchMenus = useCallback(async () => {
    if (!selectedDate) return;
    if (!hasSupabaseConfig || !supabase) {
      setRows([]);
      setError(
        'Supabase is not configured. Set EXPO_PUBLIC_SUPABASE_URL and EXPO_PUBLIC_SUPABASE_ANON_KEY in your environment.'
      );
      return;
    }

    setLoading(true);
    setError(null);
    try {
      const queryDate = formatLocalDate(selectedDate);
      console.log('[useMenuData] Querying for date:', queryDate);
      const pageSize = 1000;
      let page = 0;
      let allRows: any[] = [];

      while (true) {
        const from = page * pageSize;
        const to = from + pageSize - 1;
        const { data, error: err } = await supabase
          .from('menu_items')
          .select(
            'id, dish_id, date_served, meal, dish_name, section, description, tags, dishes(id, name, slug), halls(name, campus)'
          )
          .eq('date_served', queryDate)
          .order('meal', { ascending: true })
          .order('dish_name', { ascending: true })
          .range(from, to);

        if (err) {
          console.error('[useMenuData] Query error:', err);
          throw err;
        }
        console.log('[useMenuData] Page', page, 'returned', data?.length || 0, 'rows');
        if (data?.length) allRows = allRows.concat(data);
        if (!data || data.length < pageSize) break;
        page += 1;
      }

      if (!allRows.length) {
        console.log('[useMenuData] No data found for', queryDate, '- checking for latest available date');
        const { data: latestData, error: latestErr } = await supabase
          .from('menu_items')
          .select('date_served')
          .order('date_served', { ascending: false })
          .limit(1);
        if (latestErr) {
          console.error('[useMenuData] Error fetching latest date:', latestErr);
          throw latestErr;
        }
        const latest = latestData?.[0]?.date_served ?? null;
        console.log('[useMenuData] Latest available date in DB:', latest);
        setLatestAvailableDate(latest ? `${latest}T00:00:00` : null);
      } else {
        console.log('[useMenuData] Found', allRows.length, 'menu items');
        setLatestAvailableDate(null);
      }

      const normalized = normalizeRows(allRows);
      const dishIds = Array.from(new Set(normalized.map((row) => row.dishId).filter(Boolean)));
      const ratingsMap = dishIds.length
        ? await fetchRatingsMap(dishIds)
        : new Map<number, { avg: number | null; count: number }>();
      setRows(
        normalized.map((row) => ({
          ...row,
          rating: ratingsMap.get(row.dishId)?.avg ?? null,
          ratingCount: ratingsMap.get(row.dishId)?.count ?? 0,
        }))
      );
    } catch (e) {
      console.error('Failed to load menus', e);
      setError('Could not load menus right now.');
      setRows([]);
    } finally {
      setLoading(false);
    }
  }, [selectedDate]);

  useEffect(() => {
    fetchMenus();
  }, [fetchMenus]);

  const groupedByHall = useMemo(() => groupRowsByHall(rows), [rows]);
  const groupedByMeal = useMemo(() => groupRowsByMeal(rows), [rows]);

  return {
    loading,
    error,
    groupedByHall,
    groupedByMeal,
    latestAvailableDate,
    rowCount: rows.length,
    refetch: fetchMenus,
  };
}
