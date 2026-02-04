import React, { useEffect, useMemo, useState } from 'react';
import { UserAuth } from '../context/AuthContext';
import { supabase } from '../supabaseClient';
import { Link } from 'react-router-dom';

const PeopleSearch = () => {
  const { session } = UserAuth();
  const [query, setQuery] = useState('');
  const [results, setResults] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [followingIds, setFollowingIds] = useState(new Set());
  const [suggestions, setSuggestions] = useState([]);
  const [hasSearched, setHasSearched] = useState(false);

  const currentUserId = session?.user?.id;

  const fetchFollowing = async () => {
    if (!currentUserId) return;
    const { data, error: followErr } = await supabase
      .from('user_follows')
      .select('followed_id')
      .eq('follower_id', currentUserId);
    if (followErr) {
      console.error('Failed to load following', followErr);
      return;
    }
    setFollowingIds(new Set((data || []).map((r) => r.followed_id)));
  };

  useEffect(() => {
    fetchFollowing();
  }, [currentUserId]);

  const handleSearch = async (e) => {
    e?.preventDefault();
    setError('');
    setLoading(true);
    setHasSearched(true);
    try {
      const term = query.trim();
      if (!term) {
        setResults([]);
        setLoading(false);
        return;
      }
      const { data, error: searchErr } = await supabase
        .from('user_profiles')
        .select('user_id, handle, full_name, school')
        .or(`handle.ilike.%${term}%,full_name.ilike.%${term}%`)
        .limit(20);
      if (searchErr) throw searchErr;
      const filtered = (data || []).filter((row) => row.user_id !== currentUserId);
      const unique = [];
      const seen = new Set();
      filtered.forEach((row) => {
        if (!seen.has(row.user_id)) {
          seen.add(row.user_id);
          unique.push(row);
        }
      });
      setResults(unique);
      setSuggestions([]);
    } catch (err) {
      console.error('Search failed', err);
      setError('Could not search users right now.');
    } finally {
      setLoading(false);
    }
  };

  // Autocomplete suggestions as you type
  useEffect(() => {
    const term = query.trim();
    if (!term) {
      setSuggestions([]);
      return;
    }
    const timer = setTimeout(async () => {
      const { data, error: suggestErr } = await supabase
        .from('user_profiles')
        .select('user_id, handle, full_name, school')
        .ilike('handle', `%${term}%`)
        .order('handle', { ascending: true })
        .limit(5);
      if (!suggestErr) {
        setSuggestions((data || []).filter((row) => row.user_id !== currentUserId));
      }
    }, 200);
    return () => clearTimeout(timer);
  }, [query, currentUserId]);

  const toggleFollow = async (userId, isFollowing) => {
    if (!currentUserId) return;
    if (isFollowing) {
      const { error: delErr } = await supabase
        .from('user_follows')
        .delete()
        .eq('follower_id', currentUserId)
        .eq('followed_id', userId);
      if (delErr) {
        console.error('Unfollow failed', delErr);
      } else {
        setFollowingIds((prev) => {
          const next = new Set(prev);
          next.delete(userId);
          return next;
        });
      }
    } else {
      const { error: insErr } = await supabase
        .from('user_follows')
        .upsert({ follower_id: currentUserId, followed_id: userId });
      if (insErr) {
        console.error('Follow failed', insErr);
      } else {
        setFollowingIds((prev) => new Set(prev).add(userId));
      }
    }
  };

  const rendered = useMemo(
    () =>
      results.map((user) => {
        const isFollowing = followingIds.has(user.user_id);
        return (
          <li key={user.user_id} className="people__item">
            <div>
              <div className="people__handle">{user.handle}</div>
              <div className="people__meta">
                {user.full_name || 'Unnamed'} · {user.school || '5C'}
              </div>
            </div>
            <div className="people__actions">
              <Link className="link" to={`/user/${encodeURIComponent(user.handle.replace(/^@/, ''))}`}>
                View
              </Link>
              <button
                type="button"
                className={isFollowing ? 'profile__secondary-btn' : 'profile__primary-btn'}
                onClick={() => toggleFollow(user.user_id, isFollowing)}
              >
                {isFollowing ? 'Following' : 'Follow'}
              </button>
            </div>
          </li>
        );
      }),
    [results, followingIds],
  );

  if (!session) {
    return <p className="muted">Sign in to search people.</p>;
  }

  return (
    <div className="people">
      <form className="people__form" onSubmit={handleSearch}>
        <input
          type="search"
          placeholder="Search handles or names"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          className="people__input"
        />
        <button type="submit" className="btn" disabled={loading}>
          {loading ? 'Searching…' : 'Search'}
        </button>
      </form>
      {suggestions.length > 0 && (
        <ul className="people__suggestions">
          {suggestions.map((s) => (
            <li key={s.user_id}>
              <Link className="people__suggestion-btn" to={`/user/${encodeURIComponent(s.handle.replace(/^@/, ''))}`}>
                {s.handle}
              </Link>
            </li>
          ))}
        </ul>
      )}
      {error && <p className="error">{error}</p>}
      <ul className="people__list">{rendered}</ul>
      {hasSearched && !loading && results.length === 0 && !error && query.trim() && suggestions.length === 0 && (
        <p className="muted">No users found.</p>
      )}
    </div>
  );
};

export default PeopleSearch;
