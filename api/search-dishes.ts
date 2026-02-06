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
    const query = String(req.query.q || '').trim();
    if (!query) {
      res.status(200).json({ data: [] });
      return;
    }
    if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) {
      res.status(400).json({ error: 'Invalid date' });
      return;
    }

    const limit = Math.min(50, Math.max(1, Number(req.query.limit || 50)));
    const searchTerm = `%${query.toLowerCase()}%`;

    const { data, error } = await supabase
      .from('menu_items')
      .select('id, date_served, meal, dish_name, section, description, tags, dishes(name, slug), halls(name, campus)')
      .eq('date_served', date)
      .or(`dish_name.ilike.${searchTerm},description.ilike.${searchTerm}`)
      .order('dish_name', { ascending: true })
      .limit(limit);

    if (error) {
      res.status(500).json({ error: error.message });
      return;
    }

    res.status(200).json({ data: data || [] });
  } catch (err: any) {
    res.status(err.statusCode || 500).json({ error: err.message || 'Unknown error' });
  }
}
