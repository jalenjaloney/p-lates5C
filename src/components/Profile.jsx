import React, { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { UserAuth } from '../context/AuthContext';
import { supabase } from '../supabaseClient';

const HANDLE_COOLDOWN_DAYS = 30;

const Profile = () => {
  const { session, updateProfile } = UserAuth();
  const [editing, setEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [status, setStatus] = useState('');
  const [form, setForm] = useState({ handle: '', name: '', school: '', bio: '' });
  const [reviews, setReviews] = useState([]);
  const [reviewsLoading, setReviewsLoading] = useState(false);
  const [reviewsError, setReviewsError] = useState('');
  const [counts, setCounts] = useState({ followers: 0, following: 0 });

  if (session === undefined) {
    return <div className="profile">Loading profile…</div>;
  }

  const emailHandle = session?.user?.email?.split('@')[0] || 'platesuser';
  const profile = useMemo(
    () => ({
      handle: session?.user?.user_metadata?.handle || `@${emailHandle}`,
      name: session?.user?.user_metadata?.full_name || 'John Doe',
      school: session?.user?.user_metadata?.school || 'Pomona',
      bio: session?.user?.user_metadata?.bio || '',
      lastHandleChange: session?.user?.user_metadata?.last_handle_change || null,
    }),
    [emailHandle, session?.user?.user_metadata],
  );

  useEffect(() => {
    setForm({
      handle: profile.handle.replace(/^@/, ''),
      name: profile.name,
      school: profile.school,
      bio: profile.bio,
    });
  }, [profile.handle, profile.name, profile.school, profile.bio]);

  const avatarLetter = profile.name.slice(0, 1).toUpperCase();

  useEffect(() => {
    async function fetchReviews() {
      if (!session?.user?.id) return;
      setReviewsLoading(true);
      setReviewsError('');
      try {
        const { data, error } = await supabase
          .from('dish_ratings')
          .select('id, rating, comment, created_at, dishes(name)')
          .eq('user_id', session.user.id)
          .order('created_at', { ascending: false });
        if (error) throw error;
        setReviews(data || []);
      } catch (err) {
        console.error('Failed to load reviews', err);
        setReviewsError('Could not load your reviews right now.');
      } finally {
        setReviewsLoading(false);
      }
    }
    fetchReviews();
    async function ensureProfileRow() {
      if (!session?.user?.id) return;
      await supabase.from('user_profiles').upsert({
        user_id: session.user.id,
        handle: profile.handle,
        full_name: profile.name,
        school: profile.school,
        bio: profile.bio,
      });
    }
    ensureProfileRow();
  }, [session?.user?.id, profile.handle, profile.name, profile.school, profile.bio]);

  useEffect(() => {
    async function fetchCounts() {
      if (!session?.user?.id) return;
      const { data: followers } = await supabase
        .from('user_follows')
        .select('id, follower_id')
        .eq('followed_id', session.user.id);
      const { data: following } = await supabase
        .from('user_follows')
        .select('id, followed_id')
        .eq('follower_id', session.user.id);
      setCounts({
        followers: followers?.length || 0,
        following: following?.length || 0,
      });
    }
    fetchCounts();
  }, [session?.user?.id]);

  const handleSave = async (e) => {
    e.preventDefault();
    setError('');
    setStatus('');
    setSaving(true);
    try {
      const sanitizedHandle = form.handle.trim().replace(/^@+/, '');
      const currentHandle = profile.handle.replace(/^@/, '');
      const handleChanged = sanitizedHandle !== currentHandle;

      if (!sanitizedHandle) {
        setError('Handle is required');
        setSaving(false);
        return;
      }

      // Enforce cooldown on handle changes
      if (handleChanged && profile.lastHandleChange) {
        const lastChange = new Date(profile.lastHandleChange);
        const now = new Date();
        const diffHours = (now - lastChange) / (1000 * 60 * 60);
        const cooldownHours = HANDLE_COOLDOWN_DAYS * 24;
        if (diffHours < cooldownHours) {
          const remainingDays = Math.ceil((cooldownHours - diffHours) / 24);
          setError(`You can update your handle again in ${remainingDays} day(s).`);
          setSaving(false);
          return;
        }
      }

      const payload = {
        handle: sanitizedHandle ? `@${sanitizedHandle}` : undefined,
        full_name: form.name,
        school: form.school,
        bio: form.bio,
      };
      if (handleChanged) {
        payload.last_handle_change = new Date().toISOString();
      }
      const { success, error: err } = await updateProfile(payload);
      if (!success) {
        setError(err || 'Could not save profile');
      } else {
        setStatus('Profile updated');
        setEditing(false);
        await supabase.from('user_profiles').upsert({
          user_id: session.user.id,
          handle: sanitizedHandle ? `@${sanitizedHandle}` : profile.handle,
          full_name: form.name,
          school: form.school,
          bio: form.bio,
        });
      }
    } finally {
      setSaving(false);
    }
  };

  const handleCancel = () => {
    setEditing(false);
    setError('');
    setStatus('');
    setForm({
      handle: profile.handle.replace(/^@/, ''),
      name: profile.name,
      school: profile.school,
      bio: profile.bio,
    });
  };

  const handleChange = (field) => (e) => {
    setForm((prev) => ({ ...prev, [field]: e.target.value }));
  };

  return (
    <div className="profile">
      <div className="profile__topbar">
        <Link to="/dashboard" className="link">
          ← Back
        </Link>
      </div>

      <section className="profile__card profile__card--centered">
        <form className="profile__form" onSubmit={handleSave}>
          <div className="profile__handle profile__handle--centered">
            {editing ? (
              <div className="profile__field-group">
                <label className="sr-only" htmlFor="handle">
                  Handle
                </label>
                <div className="profile__handle-input">
                  <span>@</span>
                  <input
                    id="handle"
                    className="profile__input profile__input--inline"
                    value={form.handle}
                    onChange={handleChange('handle')}
                    required
                    maxLength={20}
                    pattern="[A-Za-z0-9_\\.]+"
                    title="Letters, numbers, underscores, and dots only"
                  />
                </div>
              </div>
            ) : (
              profile.handle
            )}
          </div>

          <div className="profile__avatar profile__avatar--image" aria-hidden="true">
            {avatarLetter}
          </div>

          {editing ? (
            <input
              className="profile__input"
              value={form.name}
              onChange={handleChange('name')}
              required
              placeholder="Name"
            />
          ) : (
            <div className="profile__name">{profile.name}</div>
          )}

          {editing ? (
            <input
              className="profile__input"
              value={form.school}
              onChange={handleChange('school')}
              required
              placeholder="School"
            />
          ) : (
            <div className="profile__school">{profile.school}</div>
          )}

          {editing ? (
            <textarea
              className="profile__textarea"
              value={form.bio}
              onChange={handleChange('bio')}
              placeholder="Bio"
              rows={3}
            />
          ) : (
            <div className="profile__bio">{profile.bio}</div>
          )}

          {!editing && (
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
          )}

          {status && <p className="profile__status">{status}</p>}
          {error && <p className="error">{error}</p>}

          {editing ? (
            <div className="profile__actions">
              <button type="submit" className="profile__primary-btn" disabled={saving}>
                {saving ? 'Saving…' : 'Save changes'}
              </button>
              <button type="button" className="profile__secondary-btn" onClick={handleCancel}>
                Cancel
              </button>
            </div>
          ) : (
            <button type="button" className="profile__primary-btn" onClick={() => setEditing(true)}>
              Edit profile
            </button>
          )}

          {!editing && (
            <div className="profile__reviews">
              <h3>Reviews</h3>
              {reviewsError ? (
                <p className="error">{reviewsError}</p>
              ) : reviewsLoading ? (
                <p className="muted">Loading your reviews…</p>
              ) : reviews.length ? (
                <div className="profile__review-grid">
                  {reviews.map((rev) => (
                    <div key={rev.id} className="profile__review-card">
                      <div className="profile__review-title">{rev.dishes?.name || 'Dish'}</div>
                      <div className="profile__review-rating">
                        {'★'.repeat(rev.rating)}
                        {'☆'.repeat(Math.max(0, 5 - rev.rating))}
                      </div>
                      {rev.comment ? (
                        <p className="profile__review-comment">{rev.comment}</p>
                      ) : null}
                      <div className="profile__review-date">
                        {new Date(rev.created_at).toLocaleDateString()}
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="muted">No reviews yet.</p>
              )}
            </div>
          )}
        </form>
      </section>
    </div>
  );
};

export default Profile;
