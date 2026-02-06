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
    const { data, error } = await supabase
      .from('menu_items')
      .select('date_served')
      .order('date_served', { ascending: false })
      .limit(1);

    if (error) {
      res.status(500).json({ error: error.message });
      return;
    }

    res.status(200).json({ date: data?.[0]?.date_served ?? null });
  } catch (err: any) {
    res.status(err.statusCode || 500).json({ error: err.message || 'Unknown error' });
  }
}
