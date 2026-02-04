import { useState, useEffect, useCallback } from 'react';
import { supabase, hasSupabaseConfig } from '@/src/supabaseClient';
import { UserAuth } from '@/src/context/AuthContext';

export type FavoriteDish = {
  id: string;
  dishId: number;
  dishName: string;
  createdAt: string;
};

export function useFavorites() {
  const { session } = UserAuth();
  const [favorites, setFavorites] = useState<FavoriteDish[]>([]);
  const [favoriteIds, setFavoriteIds] = useState<Set<number>>(new Set());
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchFavorites = useCallback(async () => {
    if (!session?.user?.id || !hasSupabaseConfig || !supabase) {
      setFavorites([]);
      setFavoriteIds(new Set());
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const { data, error: err } = await supabase
        .from('user_favorites')
        .select('id, dish_id, created_at, dishes(name)')
        .eq('user_id', session.user.id)
        .order('created_at', { ascending: false });

      if (err) throw err;

      const favs: FavoriteDish[] = (data || []).map((row: any) => ({
        id: row.id,
        dishId: row.dish_id,
        dishName: row.dishes?.name || 'Unknown Dish',
        createdAt: row.created_at,
      }));

      setFavorites(favs);
      setFavoriteIds(new Set(favs.map((f) => f.dishId)));
    } catch (err) {
      console.error('Failed to fetch favorites', err);
      setError('Failed to load favorites');
    } finally {
      setLoading(false);
    }
  }, [session?.user?.id]);

  useEffect(() => {
    fetchFavorites();
  }, [fetchFavorites]);

  const toggleFavorite = useCallback(
    async (dishId: number) => {
      if (!session?.user?.id || !hasSupabaseConfig || !supabase) return;

      const isFavorited = favoriteIds.has(dishId);

      // Optimistic update
      if (isFavorited) {
        setFavoriteIds((prev) => {
          const next = new Set(prev);
          next.delete(dishId);
          return next;
        });
      } else {
        setFavoriteIds((prev) => new Set(prev).add(dishId));
      }

      try {
        if (isFavorited) {
          // Remove favorite
          const { error: err } = await supabase
            .from('user_favorites')
            .delete()
            .eq('user_id', session.user.id)
            .eq('dish_id', dishId);

          if (err) throw err;
        } else {
          // Add favorite
          const { error: err } = await supabase
            .from('user_favorites')
            .insert({ user_id: session.user.id, dish_id: dishId });

          if (err) throw err;
        }

        // Refetch to sync
        await fetchFavorites();
      } catch (err) {
        console.error('Failed to toggle favorite', err);
        // Revert optimistic update
        if (isFavorited) {
          setFavoriteIds((prev) => new Set(prev).add(dishId));
        } else {
          setFavoriteIds((prev) => {
            const next = new Set(prev);
            next.delete(dishId);
            return next;
          });
        }
      }
    },
    [session?.user?.id, favoriteIds, fetchFavorites]
  );

  const isFavorite = useCallback((dishId: number) => favoriteIds.has(dishId), [favoriteIds]);

  return {
    favorites,
    loading,
    error,
    toggleFavorite,
    isFavorite,
    refetch: fetchFavorites,
  };
}
