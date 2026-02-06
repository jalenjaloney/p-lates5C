import { useState, useCallback, useEffect } from 'react';
import { supabase, hasSupabaseConfig } from '@/src/supabaseClient';
import { proxyEnabled, proxyGet } from '@/src/supabaseProxy';
import type { NormalizedMenuItem } from './useMenuData';

export type SearchResult = {
  dish: NormalizedMenuItem;
  hallName: string;
  meal: string;
};

export function useSearchDishes(selectedDate: string) {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<SearchResult[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const search = useCallback(
    async (searchQuery: string) => {
      if (!searchQuery.trim()) {
        setResults([]);
        return;
      }

      if (!hasSupabaseConfig || !supabase) {
        setError('Supabase not configured');
        return;
      }

      setLoading(true);
      setError(null);

      try {
        const dateKey = selectedDate.slice(0, 10);
        const searchTerm = `%${searchQuery.toLowerCase()}%`;

        let data: any[] | null = null;
        if (proxyEnabled) {
          const payload = await proxyGet<{ data: any[] }>('/api/search-dishes', {
            date: dateKey,
            q: searchQuery,
            limit: 50,
          });
          data = payload.data || [];
        } else {
          const { data: rows, error: err } = await supabase
            .from('menu_items')
            .select('id, date_served, meal, dish_name, section, description, tags, dishes(name, slug), halls(name, campus)')
            .eq('date_served', dateKey)
            .or(`dish_name.ilike.${searchTerm},description.ilike.${searchTerm}`)
            .order('dish_name', { ascending: true })
            .limit(50);

          if (err) throw err;
          data = rows;
        }

        const searchResults: SearchResult[] = (data || []).map((row: any) => ({
          dish: {
            id: row.id,
            displayName: row.dishes?.name || row.dish_name,
            slug: row.dishes?.slug || '',
            description: row.description,
            tags: row.tags,
            hallName: row.halls?.name || 'Unknown',
            campus: row.halls?.campus,
            meal: row.meal as any,
            section: row.section,
          },
          hallName: row.halls?.name || 'Unknown',
          meal: row.meal,
        }));

        setResults(searchResults);
      } catch (err) {
        console.error('Search failed', err);
        setError('Search failed');
        setResults([]);
      } finally {
        setLoading(false);
      }
    },
    [selectedDate]
  );

  // Debounce search
  useEffect(() => {
    const timer = setTimeout(() => {
      search(query);
    }, 300);

    return () => clearTimeout(timer);
  }, [query, search]);

  return {
    query,
    setQuery,
    results,
    loading,
    error,
  };
}
