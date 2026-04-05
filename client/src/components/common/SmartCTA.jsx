import React from 'react';
import { useNavigate } from 'react-router-dom';

const SmartCTA = () => {
  const navigate = useNavigate();

  const handleComplaintClick = () => {
    // 1. Check if user is logged in (Assuming token is stored in 'token')
    const token = localStorage.getItem('token'); 
    
    if (token) {
      // SCENARIO 1: User is logged in -> Go straight to ticket creation
      navigate('/dashboard/new-ticket');
    } else {
      // SCENARIO 2: User is NOT logged in -> Go to login
      // CRITICAL: We pass the 'state' object so LoginPage knows where to send us back
      navigate('/login', { state: { from: '/dashboard/new-ticket' } });
    }
  };

  return (
    <div className="flex gap-4">
      <button
        onClick={handleComplaintClick}
        className="px-6 py-3 text-white bg-blue-600 rounded-lg hover:bg-blue-700 transition-all font-semibold shadow-lg hover:shadow-xl"
      >
        File Complaint
      </button>

      {!localStorage.getItem('token') && (
        <button
          onClick={() => navigate('/login')}
          className="px-6 py-3 text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200 transition-all font-medium"
        >
          Login / Track Status
        </button>
      )}
    </div>
  );
};

export default SmartCTA;