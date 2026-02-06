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
      .from('dishes')
      .select('id, name, description, ingredients, allergens, dietary_choices, nutrients, tags, halls(name)')
      .eq('id', dishId)
      .single();

    if (error) {
      res.status(500).json({ error: error.message });
      return;
    }

    res.status(200).json({ dish: data });
  } catch (err: any) {
    res.status(err.statusCode || 500).json({ error: err.message || 'Unknown error' });
  }
}
