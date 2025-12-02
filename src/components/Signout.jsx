import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { UserAuth } from '../context/AuthContext';

const Signout = () => {
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const { signOutUser } = UserAuth();
  const navigate = useNavigate();

  const handleSignOut = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      await signOutUser();
      navigate('/signin');
    } catch (err) {
      console.error('Sign out failed', err);
      setError('Failed to sign out');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="auth-card">
      <form onSubmit={handleSignOut} className="max-w-md m-auto pt-12">
        <h2 className="font-bold pb-2 text-xl">Sign out</h2>
        <p>
          Want to log back in?{' '}
          <Link to="/signin" className="link">
            Sign in
          </Link>
        </p>
        <div className="flex flex-col py-4">
          <button type="submit" disabled={loading} className="mt-4 w-full btn">
            {loading ? 'Signing out…' : 'Sign out'}
          </button>
          {error ? <p className="text-red-600 text-center pt-4">{error}</p> : null}
        </div>
      </form>
    </div>
  );
};

export default Signout;
