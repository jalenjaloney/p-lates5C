import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { UserAuth } from '../context/AuthContext';

const Signup = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const { signUpNewUser } = UserAuth();
  const navigate = useNavigate();

  const handleSignUp = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const result = await signUpNewUser(email, password);
      if (result?.success) navigate('/dashboard');
      else if (result?.error) setError(result.error);
    } catch (err) {
      console.error('Sign up failed', err);
      setError('Failed to create an account');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="auth-card">
      <form onSubmit={handleSignUp} className="max-w-md m-auto pt-12">
        <h2 className="font-bold pb-2 text-xl">Sign up</h2>
        <p>
          Already have an account?{' '}
          <Link to="/signin" className="link">
            Sign in
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
            minLength={6}
          />
          <button type="submit" disabled={loading} className="mt-4 w-full btn">
            {loading ? 'Creating account…' : 'Sign up'}
          </button>
          {error ? <p className="text-red-600 text-center pt-4">{error}</p> : null}
        </div>
      </form>
    </div>
  );
};

export default Signup;
