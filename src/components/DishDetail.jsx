import React, { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { supabase } from '../supabaseClient';

const POMONA_NUTRIENTS = [
  'Calories (kcal)',
  'Total Lipid/Fat (g)',
  'Saturated fatty acid (g)',
  'Trans Fat (g)',
  'Cholesterol (mg)',
  'Sodium (mg)',
  'Carbohydrate (g)',
  'Total Dietary Fiber (g)',
  'Total Sugars (g)',
  'Added Sugar (g)',
  'Protein (g)',
  'Vitamin C (mg)',
  'Calcium (mg)',
  'Iron (mg)',
  'Vitamin A (mcg RAE)',
  'Phosphorus (mg)',
  'Potassium (mg)',
  'Vitamin D(iu)',
];

const DishDetail = () => {
  const { hallSlug, dishSlug } = useParams();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [dish, setDish] = useState(null);
  const [occurrences, setOccurrences] = useState([]);

  useEffect(() => {
    async function fetchDish() {
      if (!dishSlug || !hallSlug) return;
      setLoading(true);
      setError('');
      try {
        const { data, error: err } = await supabase
          .from('dishes')
          .select(
            'id, name, slug, description, ingredients, allergens, dietary_choices, nutrients, tags, halls!inner(name, campus)'
          )
          .eq('slug', dishSlug)
          .eq('halls.name', hallSlug)
          .maybeSingle();
        if (err) throw err;
        setDish(data);

        if (data?.id) {
          const { data: occ, error: occErr } = await supabase
            .from('menu_items')
            .select('id, date_served, meal, section')
            .eq('dish_id', data.id)
            .order('date_served', { ascending: false });
          if (occErr) throw occErr;
          setOccurrences(occ || []);
        } else {
          setOccurrences([]);
        }
      } catch (e) {
        console.error('Failed to load dish', e);
        setError('Could not load this dish right now.');
      } finally {
        setLoading(false);
      }
    }
    fetchDish();
  }, [dishSlug, hallSlug]);

  if (loading) return <div className="dashboard"><p>Loading…</p></div>;
  if (error) return <div className="dashboard"><p className="error">{error}</p></div>;
  if (!dish) return <div className="dashboard"><p>Dish not found.</p></div>;

  const renderList = (items) =>
    Array.isArray(items) && items.length ? (
      <ul>
        {items.map((item) => (
          <li key={item}>{item}</li>
        ))}
      </ul>
    ) : (
      <p className="muted">None listed.</p>
    );

  const renderNutrients = (raw) => {
    if (!raw) return <p className="muted">Not provided.</p>;
    const entries = raw.split('|').map((v) => v.trim()).filter(Boolean);

    // Prefer "Label: value" pairs when present (e.g., Sodexo macros).
    const parsedPairs = entries
      .map((entry) => {
        const [label, ...rest] = entry.split(':');
        const value = rest.join(':').trim();
        return label && value ? { label: label.trim(), value } : null;
      })
      .filter((p) => p && p.value && p.value.toUpperCase() !== 'NA');

    const pairs =
      parsedPairs.length > 0
        ? parsedPairs
        : POMONA_NUTRIENTS.map((label, idx) => ({
            label,
            value: entries[idx] || '',
          })).filter((p) => p.value && p.value.toUpperCase() !== 'NA');

    if (!pairs.length) return <p className="muted">Not provided.</p>;
    return (
      <ul className="nutrients-list">
        {pairs.map((p) => (
          <li key={p.label}>
            <strong>{p.label}:</strong> {p.value}
          </li>
        ))}
      </ul>
    );
  };

  return (
    <div className="dashboard">
      <div className="dish-detail">
        <header className="dish-detail__header">
          <div>
            <p className="dish-detail__crumb">
              <Link to="/dashboard">← Back to menus</Link>
            </p>
            <h1>{dish.name}</h1>
            <p className="dish-detail__meta">
              {dish.halls?.name || 'Unknown hall'}
            </p>
          </div>
          {dish.tags?.length ? (
            <div className="dish__tags">
              {dish.tags.map((tag) => (
                <span className="dish__tag" key={tag}>
                  {tag}
                </span>
              ))}
            </div>
          ) : null}
        </header>

        {dish.description ? <p className="dish__description">{dish.description}</p> : null}

        <div className="dish-detail__grid">
          <section>
            <h3>Ingredients</h3>
            {dish.ingredients ? <p className="muted">{dish.ingredients}</p> : <p className="muted">Not provided.</p>}
          </section>

          <section>
            <h3>Allergens</h3>
            {renderList(dish.allergens)}
          </section>

          <section>
            <h3>Dietary Choices</h3>
            {renderList(dish.dietary_choices)}
          </section>

          <section>
            <h3>Nutrients</h3>
            {renderNutrients(dish.nutrients)}
          </section>

          <section>
            <h3>Served On</h3>
            {occurrences.length ? (
              <ul>
                {occurrences.map((occ) => (
                  <li key={occ.id}>{occ.date_served}</li>
                ))}
              </ul>
            ) : (
              <p className="muted">No occurrences found.</p>
            )}
          </section>
        </div>
      </div>
    </div>
  );
};

export default DishDetail;
