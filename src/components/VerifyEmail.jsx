import React, { useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { UserAuth } from '../context/AuthContext';

const VerifyEmail = () => {
  const { session, resendVerification, signOutUser } = UserAuth();
  const location = useLocation();
  const fallbackEmail = location.state?.email || session?.user?.email || '';
  const [email] = useState(fallbackEmail);
  const [status, setStatus] = useState('');
  const [error, setError] = useState('');
  const [sending, setSending] = useState(false);

  const handleResend = async () => {
    setStatus('');
    setError('');
    setSending(true);
    const { success, error: err } = await resendVerification(email);
    if (!success) setError(err || 'Could not resend verification email');
    else setStatus('Verification email sent. Check your inbox.');
    setSending(false);
  };

  const handleSignOut = async () => {
    await signOutUser();
  };

  return (
    <div className="verify-card">
      <h2>Please verify your 5C email</h2>
      <p>We sent a verification link to:</p>
      <p className="verify-card__email">{email || 'your 5C email'}</p>
      <p className="verify-card__hint">
        Click the link in that email to finish creating your account.
      </p>
      {status && <p className="verify-card__status">{status}</p>}
      {error && <p className="error">{error}</p>}
      <button className="btn" type="button" disabled={!email || sending} onClick={handleResend}>
        {sending ? 'Sending…' : 'Resend verification email'}
      </button>
      <p className="verify-card__footer">
        Want to use a different email?{' '}
        <Link to="/signup" className="link" onClick={handleSignOut}>
          Sign up again
        </Link>
        .
      </p>
    </div>
  );
};

export default VerifyEmail;
