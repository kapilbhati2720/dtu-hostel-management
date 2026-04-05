import React, { useContext } from 'react';
import { Navigate } from 'react-router-dom';
import { AuthContext } from '../context/AuthContext';

const PrivateRoute = ({ children }) => {
  const { isAuthenticated, loading } = useContext(AuthContext);

  // While the token is being verified, show a loading message
  if (loading) {
    return <div className="text-center mt-20">Loading...</div>;
  }

  // After loading, if the user is authenticated, show the page.
  // Otherwise, redirect to login.
  return isAuthenticated ? children : <Navigate to="/login" />;
};

export default PrivateRoute;