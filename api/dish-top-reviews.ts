import { requireSupabase } from './_supabase';
import { applyCors } from './_cors';

export default async function handler(req: any, res: any) {
  if (applyCors(req, res)) return;
  if (req.method !== 'GET') {
    res.status(405).json({ error: 'Method not allowed' });
    return;
  }

  try {
    const supabase = requireSupabase();
    const raw = String(req.query.dishIds || '');
    const dishIds = raw
      .split(',')
      .map((v) => Number(v))
      .filter((v) => Number.isFinite(v));

    if (!dishIds.length) {
      res.status(200).json({ reviews: {} });
      return;
    }

    const { data, error } = await supabase
      .from('dish_ratings')
      .select('dish_id, comment, created_at, review_likes(count)')
      .in('dish_id', dishIds)
      .not('comment', 'is', null)
      .order('created_at', { ascending: false });

    if (error) {
      res.status(500).json({ error: error.message });
      return;
    }

    const bestByDish: Record<number, { comment: string; likes: number; created_at: string }> = {};
    (data || []).forEach((row: any) => {
      if (!row.dish_id || !row.comment) return;
      const likes = row.review_likes?.[0]?.count || 0;
      const created = row.created_at || '';
      const current = bestByDish[row.dish_id];
      if (!current) {
        bestByDish[row.dish_id] = { comment: row.comment, likes, created_at: created };
        return;
      }
      if (likes > current.likes) {
        bestByDish[row.dish_id] = { comment: row.comment, likes, created_at: created };
        return;
      }
      if (likes === current.likes && created > current.created_at) {
        bestByDish[row.dish_id] = { comment: row.comment, likes, created_at: created };
      }
    });

    const reviews: Record<string, string> = {};
    Object.entries(bestByDish).forEach(([dishId, entry]) => {
      reviews[dishId] = entry.comment;
    });

    res.status(200).json({ reviews });
  } catch (err: any) {
    res.status(err.statusCode || 500).json({ error: err.message || 'Unknown error' });
  }
}
