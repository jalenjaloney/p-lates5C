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
    const limit = Math.min(20, Math.max(1, Number(req.query.limit || 6)));

    const { data, error } = await supabase
      .from('dish_ratings')
      .select('id, rating, comment, image_url, dishes(name, halls(name))')
      .or('comment.is.not.null,image_url.is.not.null')
      .order('created_at', { ascending: false })
      .limit(limit);

    if (error) {
      res.status(500).json({ error: error.message });
      return;
    }

    res.status(200).json({
      reviews: (data || []).map((row: any) => ({
        id: row.id,
        rating: row.rating,
        comment: row.comment,
        image_url: row.image_url,
        dishName: row.dishes?.name ?? null,
        hallName: row.dishes?.halls?.name ?? null,
      })),
    });
  } catch (err: any) {
    res.status(err.statusCode || 500).json({ error: err.message || 'Unknown error' });
  }
}
