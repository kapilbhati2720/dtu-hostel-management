import React, { useContext } from 'react';
import { Navigate, useLocation } from 'react-router-dom'; // 1. Import useLocation
import { AuthContext } from '../context/AuthContext';

const OfficerRoute = ({ children }) => {
  const { isAuthenticated, user, loading } = useContext(AuthContext);
  const location = useLocation(); // 2. Get the current location

  if (loading) {
    return <div className="text-center mt-20">Loading...</div>;
  }
  
  // 3. THE FIX: Check the user.roles array instead of user.role
  if (isAuthenticated && user && user.roles.some(r => r.role_name === 'nodal_officer')) {
    return children;
  } 
  
  // 4. Redirect them to login, but also remember where they were trying to go
  return <Navigate to="/login" state={{ from: location }} replace />;
};

export default OfficerRoute;