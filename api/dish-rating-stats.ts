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
      .select('rating')
      .eq('dish_id', dishId);

    if (error) {
      res.status(500).json({ error: error.message });
      return;
    }

    const count = data?.length ?? 0;
    const avg =
      count > 0
        ? Math.round((data.reduce((sum: number, row: any) => sum + (row.rating || 0), 0) / count) * 10) / 10
        : null;

    res.status(200).json({ avg, count });
  } catch (err: any) {
    res.status(err.statusCode || 500).json({ error: err.message || 'Unknown error' });
  }
}
