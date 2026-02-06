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
    const dishId = Number(req.query.dishId || req.query.id);
    if (!Number.isFinite(dishId)) {
      res.status(400).json({ error: 'Invalid dishId' });
      return;
    }

    const { data, error } = await supabase
      .from('dish_ratings')
      .select('id, rating, comment, created_at, rater_handle, user_id, review_likes(count)')
      .eq('dish_id', dishId)
      .order('created_at', { ascending: false });

    if (error) {
      res.status(500).json({ error: error.message });
      return;
    }

    res.status(200).json({ reviews: data || [] });
  } catch (err: any) {
    res.status(err.statusCode || 500).json({ error: err.message || 'Unknown error' });
  }
}
