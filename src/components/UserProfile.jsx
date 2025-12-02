import React, { useEffect, useMemo, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { UserAuth } from '../context/AuthContext';
import { supabase } from '../supabaseClient';

const UserProfile = () => {
  const { handle: handleParam } = useParams();
  const { session } = UserAuth();
  const [profile, setProfile] = useState(null);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);
  const [counts, setCounts] = useState({ followers: 0, following: 0 });
  const [isFollowing, setIsFollowing] = useState(false);
  const [reviews, setReviews] = useState([]);
  const [likedIds, setLikedIds] = useState(new Set());
  const [reviewsError, setReviewsError] = useState('');
  const [reviewsLoading, setReviewsLoading] = useState(false);

  const sanitizedHandle = useMemo(() => {
    const base = (handleParam || '').trim().replace(/^@/, '');
    return `@${base}`;
  }, [handleParam]);

  useEffect(() => {
    async function fetchProfile() {
      setLoading(true);
      setError('');
      try {
        const { data, error: err } = await supabase
          .from('user_profiles')
          .select('user_id, handle, full_name, school, bio')
          .eq('handle', sanitizedHandle)
          .maybeSingle();
        if (err) throw err;
        if (!data) {
          setError('User not found');
          setProfile(null);
          setLoading(false);
          return;
        }
        setProfile(data);

        const [{ count: followerCount }, { count: followingCount }, { data: followRow }] = await Promise.all([
          supabase.from('user_follows').select('id', { count: 'exact', head: true }).eq('followed_id', data.user_id),
          supabase.from('user_follows').select('id', { count: 'exact', head: true }).eq('follower_id', data.user_id),
          session?.user?.id
            ? supabase
                .from('user_follows')
                .select('id')
                .eq('follower_id', session.user.id)
                .eq('followed_id', data.user_id)
                .maybeSingle()
            : Promise.resolve({ data: null }),
        ]);
        setCounts({
          followers: followerCount || 0,
          following: followingCount || 0,
        });
        setIsFollowing(Boolean(followRow?.id));
      } catch (err) {
        console.error('Failed to load profile', err);
        setError('Could not load this profile right now.');
      } finally {
        setLoading(false);
      }
    }
    fetchProfile();
  }, [sanitizedHandle, session?.user?.id]);

  useEffect(() => {
    async function fetchReviews() {
      if (!profile?.user_id) return;
      setReviewsLoading(true);
      setReviewsError('');
      try {
        const { data, error: revErr } = await supabase
          .from('dish_ratings')
          .select('id, rating, comment, created_at, dishes(name), review_likes(count), user_id, rater_handle')
          .eq('user_id', profile.user_id);
        if (revErr) throw revErr;
        setReviews(data || []);
        if (session?.user?.id && data?.length) {
          const ids = data.map((r) => r.id);
          const { data: liked } = await supabase
            .from('review_likes')
            .select('rating_id')
            .eq('user_id', session.user.id)
            .in('rating_id', ids);
          setLikedIds(new Set((liked || []).map((r) => r.rating_id)));
        }
      } catch (err) {
        console.error('Failed to load reviews', err);
        setReviewsError('Could not load reviews right now.');
      } finally {
        setReviewsLoading(false);
      }
    }
    fetchReviews();
  }, [profile?.user_id, session?.user?.id]);

  const toggleFollow = async () => {
    if (!session?.user?.id || !profile?.user_id || session.user.id === profile.user_id) return;
    if (isFollowing) {
      const { error: delErr } = await supabase
        .from('user_follows')
        .delete()
        .eq('follower_id', session.user.id)
        .eq('followed_id', profile.user_id);
      if (!delErr) {
        setIsFollowing(false);
        setCounts((prev) => ({ ...prev, followers: Math.max(0, prev.followers - 1) }));
      }
    } else {
      const { error: insErr } = await supabase
        .from('user_follows')
        .upsert({ follower_id: session.user.id, followed_id: profile.user_id });
      if (!insErr) {
        setIsFollowing(true);
        setCounts((prev) => ({ ...prev, followers: prev.followers + 1 }));
      }
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
      if (!delErr) {
        setLikedIds((prev) => {
          const next = new Set(prev);
          next.delete(ratingId);
          return next;
        });
      }
    } else {
      const { error: insErr } = await supabase
        .from('review_likes')
        .upsert({ rating_id: ratingId, user_id: session.user.id });
      if (!insErr) {
        setLikedIds((prev) => new Set(prev).add(ratingId));
      }
    }
  };

  if (loading) return <p>Loading profile…</p>;
  if (error) return <p className="error">{error}</p>;
  if (!profile) return <p className="muted">Profile not found.</p>;

  const avatarLetter = (profile.full_name || 'U').slice(0, 1).toUpperCase();
  const isOwn = session?.user?.id === profile.user_id;

  return (
    <div className="profile">
      <div className="profile__topbar">
        <Link to="/dashboard" className="link">
          ← Back
        </Link>
      </div>

      <section className="profile__card profile__card--centered">
        <div className="profile__handle profile__handle--centered">{profile.handle}</div>
        <div className="profile__avatar profile__avatar--image" aria-hidden="true">
          {avatarLetter}
        </div>
        <div className="profile__name">{profile.full_name || 'Unnamed'}</div>
        <div className="profile__school">{profile.school || '5C'}</div>
        {profile.bio ? <div className="profile__bio">{profile.bio}</div> : null}

        <div className="profile__counts profile__counts--centered">
          <div>
            <strong>{counts.followers}</strong>
            <span>Followers</span>
          </div>
          <div>
            <strong>{counts.following}</strong>
            <span>Following</span>
          </div>
        </div>

        {!isOwn && (
          <button type="button" className="profile__primary-btn" onClick={toggleFollow}>
            {isFollowing ? 'Following' : 'Follow'}
          </button>
        )}

        <div className="profile__reviews">
          <h3>Reviews</h3>
          {reviewsError ? (
            <p className="error">{reviewsError}</p>
          ) : reviewsLoading ? (
            <p className="muted">Loading reviews…</p>
          ) : reviews.length ? (
            <div className="profile__review-grid">
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
                    <div key={rev.id} className="profile__review-card">
                      <div className="profile__review-title">{rev.dishes?.name || 'Dish'}</div>
                      <div className="profile__review-rating">
                        {'★'.repeat(rev.rating)}
                        {'☆'.repeat(Math.max(0, 5 - rev.rating))}
                      </div>
                      {rev.comment ? <p className="profile__review-comment">{rev.comment}</p> : null}
                      <div className="profile__review-footer">
                        <span className="profile__review-date">
                          {new Date(rev.created_at).toLocaleDateString()}
                        </span>
                        <button
                          type="button"
                          className={`like-btn ${isLiked ? 'like-btn--active' : ''}`}
                          onClick={() => toggleLike(rev.id, isLiked)}
                        >
                          ♥ {likes}
                        </button>
                      </div>
                    </div>
                  );
                })}
            </div>
          ) : (
            <p className="muted">No reviews yet.</p>
          )}
        </div>
      </section>
    </div>
  );
};

export default UserProfile;
