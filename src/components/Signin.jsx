import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { UserAuth } from '../context/AuthContext';

const Signin = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const { signInUser } = UserAuth();
  const navigate = useNavigate();

  const handleSignIn = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const result = await signInUser(email, password);
      if (result?.success) navigate('/dashboard');
      else if (result?.error) setError(result.error);
    } catch (err) {
      console.error('Sign in failed', err);
      setError('Failed to sign in');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="auth-card">
      <form onSubmit={handleSignIn} className="max-w-md m-auto pt-12">
        <h2 className="font-bold pb-2 text-xl">Sign in</h2>
        <p>
          Don&apos;t have an account?{' '}
          <Link to="/signup" className="link">
            Sign up
          </Link>
        </p>
        <div className="flex flex-col py-4">
          <input
            onChange={(e) => setEmail(e.target.value)}
            placeholder="Email"
            className="p-3 mt-4 input"
            type="email"
            value={email}
            required
          />
          <input
            onChange={(e) => setPassword(e.target.value)}
            placeholder="Password"
            className="p-3 mt-4 input"
            type="password"
            value={password}
            required
          />
          <button type="submit" disabled={loading} className="mt-4 w-full btn">
            {loading ? 'Signing in…' : 'Sign in'}
          </button>
          {error ? <p className="text-red-600 text-center pt-4">{error}</p> : null}
        </div>
      </form>
    </div>
  );
};

export default Signin;
