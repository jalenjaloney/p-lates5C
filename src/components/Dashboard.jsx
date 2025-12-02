import React, { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { supabase } from '../supabaseClient';

const mealOrder = ['breakfast', 'lunch', 'dinner', 'late_night'];
const mealLabels = {
  breakfast: 'Breakfast',
  lunch: 'Lunch',
  dinner: 'Dinner',
  late_night: 'Late Night',
};

function slugifyDish(name) {
  return (name || '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '') || 'dish';
}

function normalizeMeal(raw) {
  const name = (raw ?? '').toLowerCase();
  if (name.includes('breakfast')) return 'breakfast';
  if (name.includes('lunch')) return 'lunch';
  if (name.includes('dinner')) return 'dinner';
  if (name.includes('late')) return 'late_night';
  return null;
}

function groupRows(rows) {
  const byHall = new Map();

  rows.forEach((row) => {
    const meal = normalizeMeal(row.meal);
    if (!meal) return;

    const hallName = row.halls?.name || 'Unknown Hall';
    const campus = row.halls?.campus || '';
    if (!byHall.has(hallName)) byHall.set(hallName, { hallName, campus, meals: {} });
    const bucket = byHall.get(hallName);
    if (!bucket.meals[meal]) bucket.meals[meal] = {};
    const mealBucket = bucket.meals[meal];
    const sectionKey = row.section?.trim() || 'Unlabeled';
    if (!mealBucket[sectionKey]) mealBucket[sectionKey] = [];
    mealBucket[sectionKey].push(row);
  });

  return Array.from(byHall.values())
    .map((entry) => ({
      ...entry,
      meals: Object.fromEntries(
        mealOrder
          .filter((m) => entry.meals[m])
          .map((meal) => [
            meal,
            Object.fromEntries(
              Object.entries(entry.meals[meal])
                .sort(([a], [b]) => a.localeCompare(b))
                .map(([section, dishes]) => [
                  section,
                  dishes.sort((a, b) =>
                    (a.displayName || a.dish_name).localeCompare(b.displayName || b.dish_name)
                  ),
                ]),
            ),
          ]),
      ),
    }))
    .sort((a, b) => a.hallName.localeCompare(b.hallName));
}

const Dashboard = () => {
  const todayIso = new Date().toISOString().slice(0, 10);
  const [selectedDate, setSelectedDate] = useState(todayIso);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [rows, setRows] = useState([]);

  useEffect(() => {
    async function fetchMenus() {
      setLoading(true);
      setError('');
      try {
        const pageSize = 1000; // Supabase REST default max rows per request.
        let page = 0;
        let allRows = [];

        // Pull pages until fewer than pageSize rows are returned.
        // Sorting is reapplied per page; grouping later re-sorts dishes/sections.
        while (true) {
          const from = page * pageSize;
          const to = from + pageSize - 1;
          const { data, error: err } = await supabase
            .from('menu_items')
            .select('id, date_served, meal, dish_name, section, description, tags, dishes(name, slug), halls(name, campus)')
            .eq('date_served', selectedDate)
            .order('meal', { ascending: true })
            .order('dish_name', { ascending: true })
            .range(from, to);
          if (err) throw err;
          if (data?.length) allRows = allRows.concat(data);
          if (!data || data.length < pageSize) break;
          page += 1;
        }

        const normalized = (allRows || []).map((r) => {
          const displayName = r.dishes?.name || r.dish_name;
          const slug = r.dishes?.slug || slugifyDish(displayName);
          return { ...r, displayName, slug };
        });

        setRows(normalized);
      } catch (e) {
        console.error('Failed to load menus', e);
        setError('Could not load menus right now.');
      } finally {
        setLoading(false);
      }
    }

    fetchMenus();
  }, [selectedDate]);

  const grouped = useMemo(() => groupRows(rows), [rows]);

  return (
    <div className="dashboard">
      <header className="dashboard__header">
        <h1>Menus</h1>
        <div className="dashboard__controls">
          <label>
            <span className="sr-only">Menu date</span>
            <input
              type="date"
              value={selectedDate}
              onChange={(e) => setSelectedDate(e.target.value)}
            />
          </label>
          <Link className="btn btn--ghost" to="/people">
            Find people
          </Link>
          <Link className="btn btn--ghost" to="/profile">
            Profile
          </Link>
        </div>
      </header>

      {loading && <p>Loading menus…</p>}
      {error && <p className="error">{error}</p>}
      {!loading && !error && grouped.length === 0 && <p>No menus for this date.</p>}

      <div
        className="dashboard__grid"
        style={{ gridTemplateColumns: `repeat(${grouped.length || 1}, minmax(0, 1fr))` }}
      >
        {grouped.map((hall) => (
          <section key={hall.hallName} className="hall">
            <h2>
              {hall.hallName}
              {hall.campus ? <span className="hall__campus"> · {hall.campus}</span> : null}
            </h2>
            {mealOrder
              .filter((meal) => hall.meals[meal])
              .map((meal) => (
                <details key={meal}>
                  <summary>{mealLabels[meal] || meal}</summary>
                  {Object.entries(hall.meals[meal]).map(([section, dishes]) => (
                    <details key={`${hall.hallName}-${meal}-${section}`} className="hall__section">
                      <summary>{section}</summary>
                      <ul>
                        {dishes.map((dish) => (
                          <li key={`${hall.hallName}-${meal}-${section}-${dish.dish_name}`}>
                            <div className="dish__name">
                              <Link to={`/dish/${hall.hallName}/${dish.slug}`}>{dish.displayName}</Link>
                            </div>
                            {dish.description ? (
                              <p className="dish__description">{dish.description}</p>
                            ) : null}
                            {Array.isArray(dish.tags) && dish.tags.length ? (
                              <div className="dish__tags">
                                {dish.tags.map((tag) => (
                                  <span className="dish__tag" key={`${dish.dish_name}-${tag}`}>
                                    {tag}
                                  </span>
                                ))}
                              </div>
                            ) : null}
                          </li>
                        ))}
                      </ul>
                    </details>
                  ))}
                </details>
              ))}
          </section>
        ))}
      </div>
    </div>
  );
};

export default Dashboard;
