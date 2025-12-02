import React, { useEffect, useMemo, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { supabase } from '../supabaseClient';
import { UserAuth } from '../context/AuthContext';

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
  const { session } = UserAuth();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [dish, setDish] = useState(null);
  const [occurrences, setOccurrences] = useState([]);
  const [reviews, setReviews] = useState([]);
  const [reviewsError, setReviewsError] = useState('');
  const [likedIds, setLikedIds] = useState(new Set());
  const [reviewsLoading, setReviewsLoading] = useState(false);
  const [rating, setRating] = useState(0);
  const [comment, setComment] = useState('');
  const [submitting, setSubmitting] = useState(false);

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

        if (data?.id) {
          setReviewsLoading(true);
          setReviewsError('');
          const { data: revs, error: revErr } = await supabase
            .from('dish_ratings')
            .select('id, rating, comment, created_at, rater_handle, user_id, review_likes(count)')
            .eq('dish_id', data.id)
            .order('created_at', { ascending: false });
          if (revErr) {
            console.error('Failed to load reviews', revErr);
            setReviewsError('Could not load reviews right now.');
          } else {
            setReviews(revs || []);
          }
          if (session?.user?.id && data?.id && revs?.length) {
            const ids = revs.map((r) => r.id);
            const { data: liked } = await supabase
              .from('review_likes')
              .select('rating_id')
              .eq('user_id', session.user.id)
              .in('rating_id', ids);
            setLikedIds(new Set((liked || []).map((r) => r.rating_id)));
          }
          setReviewsLoading(false);
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

  const userReview = useMemo(
    () => reviews.find((r) => r.user_id === session?.user?.id),
    [reviews, session?.user?.id],
  );

  useEffect(() => {
    if (userReview) {
      setRating(userReview.rating);
      setComment(userReview.comment || '');
    }
  }, [userReview]);

  if (loading) return <div className="dashboard"><p>Loading…</p></div>;
  if (error) return <div className="dashboard"><p className="error">{error}</p></div>;
  if (!dish) return <div className="dashboard"><p>Dish not found.</p></div>;

  const refreshReviews = async () => {
    if (!dish?.id) return;
    setReviewsLoading(true);
    setReviewsError('');
    const { data: revs, error: revErr } = await supabase
      .from('dish_ratings')
      .select('id, rating, comment, created_at, rater_handle, user_id, review_likes(count)')
      .eq('dish_id', dish.id)
      .order('created_at', { ascending: false });
    if (revErr) {
      console.error('Failed to load reviews', revErr);
      setReviewsError('Could not load reviews right now.');
    } else {
      setReviews(revs || []);
      if (session?.user?.id && revs?.length) {
        const ids = revs.map((r) => r.id);
        const { data: liked } = await supabase
          .from('review_likes')
          .select('rating_id')
          .eq('user_id', session.user.id)
          .in('rating_id', ids);
        setLikedIds(new Set((liked || []).map((r) => r.rating_id)));
      }
    }
    setReviewsLoading(false);
  };

  const handleSubmitReview = async (e) => {
    e.preventDefault();
    setReviewsError('');
    if (!session?.user?.id) {
      setReviewsError('Please sign in to leave a review.');
      return;
    }
    if (rating < 1 || rating > 5) {
      setReviewsError('Select a rating between 1 and 5.');
      return;
    }
    setSubmitting(true);
    try {
      const handle = session.user.user_metadata?.handle || session.user.email?.split('@')[0];
      const payload = {
        dish_id: dish.id,
        rating,
        comment: comment.trim() || null,
        rater_handle: handle ? `@${handle.replace(/^@/, '')}` : null,
        user_id: session.user.id,
      };
      const { error: upsertErr } = await supabase
        .from('dish_ratings')
        .upsert(payload, { onConflict: 'dish_id,user_id', ignoreDuplicates: false });
      if (upsertErr) {
        console.error('Failed to save review', upsertErr);
        setReviewsError('Could not save your review. Please try again.');
      } else {
        await refreshReviews();
      }
    } finally {
      setSubmitting(false);
    }
  };

  const toggleLike = async (ratingId, liked) => {
    if (!session?.user?.id) {
      setReviewsError('Sign in to like reviews.');
      return;
    }
    if (liked) {
      const { error: delErr } = await supabase
        .from('review_likes')
        .delete()
        .eq('rating_id', ratingId)
        .eq('user_id', session.user.id);
      if (delErr) {
        console.error('Unlike failed', delErr);
      } else {
        setLikedIds((prev) => {
          const next = new Set(prev);
          next.delete(ratingId);
          return next;
        });
        await refreshReviews();
      }
    } else {
      const { error: insErr } = await supabase
        .from('review_likes')
        .upsert({ rating_id: ratingId, user_id: session.user.id });
      if (insErr) {
        console.error('Like failed', insErr);
      } else {
        setLikedIds((prev) => new Set(prev).add(ratingId));
        await refreshReviews();
      }
    }
  };

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
          <section className="dish-detail__reviews">
            <div className="dish-detail__reviews-header">
              <h3>Reviews</h3>
              <span className="dish-detail__reviews-count">{reviews.length}</span>
            </div>

            <form className="review-form" onSubmit={handleSubmitReview}>
              <div className="review-form__row">
                {[1, 2, 3, 4, 5].map((value) => (
                  <button
                    type="button"
                    key={value}
                    className={`star ${rating >= value ? 'star--active' : ''}`}
                    onClick={() => setRating(value)}
                  >
                    ★
                  </button>
                ))}
                <span className="review-form__label">{rating ? `${rating}/5` : 'Rate'}</span>
              </div>
              <textarea
                className="profile__textarea"
                placeholder="Leave a comment (optional)"
                value={comment}
                onChange={(e) => setComment(e.target.value)}
                rows={3}
              />
              <button type="submit" className="btn" disabled={submitting}>
                {submitting ? 'Saving…' : userReview ? 'Update review' : 'Post review'}
              </button>
              {reviewsError ? <p className="error">{reviewsError}</p> : null}
            </form>

            {reviewsLoading ? (
              <p className="muted">Loading reviews…</p>
            ) : reviews.length ? (
              <ul className="dish-reviews__list">
                {reviews
                  .slice()
                  .sort((a, b) => {
                    const aLikes = a.review_likes?.[0]?.count || 0;
                    const bLikes = b.review_likes?.[0]?.count || 0;
                    if (bLikes === aLikes) {
                      return new Date(b.created_at) - new Date(a.created_at);
                    }
                    return bLikes - aLikes;
                  })
                  .map((rev) => {
                    const likes = rev.review_likes?.[0]?.count || 0;
                    const isLiked = likedIds.has(rev.id);
                    return (
                      <li key={rev.id} className="dish-reviews__item">
                        <div className="dish-reviews__meta">
                          <span className="dish-reviews__handle">
                            {rev.user_id === session?.user?.id ? 'You' : rev.rater_handle || 'Anonymous'}
                          </span>
                          <span className="dish-reviews__date">
                            {new Date(rev.created_at).toLocaleDateString()}
                          </span>
                        </div>
                        <div className="dish-reviews__rating">
                          {'★'.repeat(rev.rating)}
                          {'☆'.repeat(Math.max(0, 5 - rev.rating))}
                        </div>
                        {rev.comment ? <p className="dish-reviews__comment">{rev.comment}</p> : null}
                        <button
                          type="button"
                          className={`like-btn ${isLiked ? 'like-btn--active' : ''}`}
                          onClick={() => toggleLike(rev.id, isLiked)}
                        >
                          ♥ {likes}
                        </button>
                      </li>
                    );
                  })}
              </ul>
            ) : (
              <p className="muted">No reviews yet.</p>
            )}
          </section>
        </div>
      </div>
    </div>
  );
};

export default DishDetail;
