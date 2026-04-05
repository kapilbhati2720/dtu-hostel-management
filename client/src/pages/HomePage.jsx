import React, { useContext } from 'react';
import { Link } from 'react-router-dom';
import { AuthContext } from '../context/AuthContext';

const HomePage = () => {
  const { isAuthenticated, user } = useContext(AuthContext);

  return (
    <div className="flex items-center justify-center" style={{ height: 'calc(100vh - 72px)' }}>
      <div className="text-center bg-white p-12 rounded-xl shadow-lg">
        <h1 className="text-5xl font-bold text-gray-800 mb-4">
          DTU Grievance Redressal Portal
        </h1>
        
        {/* --- This logic is now corrected --- */}
        {isAuthenticated && user ? (
          // View for LOGGED-IN users
          <p className="text-lg text-gray-600">
            Welcome back, <span className="font-semibold">{user.full_name}</span>. Use the navigation above to get started.
          </p>
        ) : (
          // View for GUESTS (logged-out users)
          <>
            <p className="text-lg text-gray-600 mb-8">
              A centralized platform for students and faculty to raise and resolve issues efficiently.
            </p>
            <div className="space-x-4">
              <Link 
                to="/login" 
                className="bg-blue-600 hover:bg-blue-700 text-white font-bold py-3 px-6 rounded-lg text-lg"
              >
                Login
              </Link>
              <Link 
                to="/register" 
                className="bg-green-600 hover:bg-green-700 text-white font-bold py-3 px-6 rounded-lg text-lg"
              >
                Register
              </Link>
            </div>
          </>
        )}
      </div>
    </div>
  );
};

export default HomePage;