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
      res.status(200).json({ ratings: {} });
      return;
    }

    const { data, error } = await supabase
      .from('dish_ratings')
      .select('dish_id, rating')
      .in('dish_id', dishIds);

    if (error) {
      res.status(500).json({ error: error.message });
      return;
    }

    const stats: Record<number, { sum: number; count: number }> = {};
    (data || []).forEach((row: any) => {
      const id = row.dish_id;
      if (!stats[id]) stats[id] = { sum: 0, count: 0 };
      stats[id].sum += row.rating || 0;
      stats[id].count += 1;
    });

    const ratings: Record<string, { avg: number | null; count: number }> = {};
    Object.entries(stats).forEach(([id, entry]) => {
      const count = entry.count;
      ratings[id] = { avg: count ? Math.round((entry.sum / count) * 10) / 10 : null, count };
    });

    res.status(200).json({ ratings });
  } catch (err: any) {
    res.status(err.statusCode || 500).json({ error: err.message || 'Unknown error' });
  }
}
