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
    const date = String(req.query.date || '').slice(0, 10);
    if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) {
      res.status(400).json({ error: 'Invalid date' });
      return;
    }
    const offset = Math.max(0, Number(req.query.offset || 0));
    const limit = Math.min(1000, Math.max(1, Number(req.query.limit || 1000)));
    const to = offset + limit - 1;

    const { data, error } = await supabase
      .from('menu_items')
      .select(
        'id, dish_id, date_served, meal, dish_name, section, description, tags, dishes(id, name, slug), halls(name, campus)'
      )
      .eq('date_served', date)
      .order('meal', { ascending: true })
      .order('dish_name', { ascending: true })
      .range(offset, to);

    if (error) {
      res.status(500).json({ error: error.message });
      return;
    }

    res.status(200).json({ data: data || [] });
  } catch (err: any) {
    res.status(err.statusCode || 500).json({ error: err.message || 'Unknown error' });
  }
}
