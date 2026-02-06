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
      res.status(200).json({ images: {} });
      return;
    }

    const { data, error } = await supabase
      .from('dish_ratings')
      .select('dish_id, image_url, created_at')
      .in('dish_id', dishIds)
      .not('image_url', 'is', null)
      .order('created_at', { ascending: false });

    if (error) {
      res.status(500).json({ error: error.message });
      return;
    }

    const images: Record<string, string> = {};
    (data || []).forEach((row: any) => {
      if (!row.image_url) return;
      if (images[row.dish_id] == null) images[row.dish_id] = row.image_url;
    });

    res.status(200).json({ images });
  } catch (err: any) {
    res.status(err.statusCode || 500).json({ error: err.message || 'Unknown error' });
  }
}
