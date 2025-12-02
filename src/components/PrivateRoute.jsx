import React from 'react';
import { Navigate } from 'react-router-dom';
import { UserAuth } from '../context/AuthContext';

const PrivateRoute = ({ children }) => {
  const { session } = UserAuth();

  if (session === undefined) {
    return <div>Loading...</div>;
  }

  if (!session) {
    return <Navigate to="/signup" />;
  }

  const confirmed = session.user?.email_confirmed_at;
  if (!confirmed) {
    return <Navigate to="/verify" replace />;
  }

  return <>{children}</>;
};

export default PrivateRoute;
