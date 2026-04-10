import React, { useContext, useEffect } from 'react';
import { Routes, Route, Link, useNavigate, useLocation } from 'react-router-dom';
import { AuthContext } from './context/AuthContext';
import { ToastContainer } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';
import { SpeedInsights } from '@vercel/speed-insights/react';

// Import all pages and components
import HomePage from './pages/HomePage';
import LoginPage from './pages/LoginPage';
import RegisterPage from './pages/RegisterPage';
import DashboardPage from './pages/DashboardPage';
import ChiefWardenDashboard from './pages/ChiefWardenDashboard';
import MyGrievancesPage from './pages/MyGrievancesPage';
import GrievanceDetailPage from './pages/GrievanceDetailPage';
import SubmitGrievancePage from './pages/SubmitGrievancePage';
import OfficerDashboardPage from './pages/OfficerDashboardPage';
import PrivateRoute from './components/PrivateRoute';
import OfficerRoute from './components/OfficerRoute';
import AdminRoute from './components/AdminRoute';
import Notifications from './components/Notifications';
import SetPasswordPage from './pages/SetPasswordPage';
import FilteredGrievancesPage from './pages/FilteredGrievancesPage';
import ForgotPasswordPage from './pages/ForgotPasswordPage'; 
import ResetPasswordPage from './pages/ResetPasswordPage';
import VerifyEmailPage from './pages/VerifyEmailPage';

import LeavesPage from './pages/LeavesPage';
import StaffLeavesPage from './pages/StaffLeavesPage';
import AnnouncementsPage from './pages/AnnouncementsPage';

function App() {
  const { isAuthenticated, user, loading, logout } = useContext(AuthContext);
  const navigate = useNavigate();
  const location = useLocation(); 

  const hideNavbarRoutes = ['/login', '/register'];
  const showNavbar = !hideNavbarRoutes.includes(location.pathname);

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  const getDashboardPath = () => {
    if (!user || !user.roles || user.roles.length === 0) return '/dashboard';
    if (user.roles.some(r => r.role_name === 'super_admin')) return '/warden/dashboard';
    if (user.roles.some(r => r.role_name === 'nodal_officer')) return '/staff/dashboard';
    return '/dashboard';
  };
  
  useEffect(() => {
    if (!loading && isAuthenticated && user) {
      if (location.pathname === '/login') {
        const dashboardPath = getDashboardPath(); 
        navigate(dashboardPath, { replace: true });
      }
    }
  }, [isAuthenticated, user, loading, navigate, location]);

  if (loading) {
    return <div className="flex justify-center items-center h-screen">Loading...</div>;
  }

  return (
    <div className="bg-gray-50 min-h-screen">
      
      {showNavbar && (
        <nav className="sticky top-0 z-50 bg-white shadow p-4 flex justify-between items-center px-8">
          <Link to="/" className="text-gray-800 hover:text-blue-600 font-bold text-lg">DTU Hostel Management</Link>
          <div className="flex items-center gap-6">
          {isAuthenticated ? (
            <>

              {/* Announcements */}
              <Link 
                  to="/announcements" 
                  className={`font-semibold transition-colors ${location.pathname === '/announcements' ? 'text-blue-600' : 'text-gray-700 hover:text-blue-600'}`}
              >
                  Notices
              </Link>
              {/* Leaves Navigation */}
              {user?.roles?.some(r => r.role_name === 'super_admin' || r.role_name === 'nodal_officer') ? (
                  <Link 
                      to={user.roles.some(r => r.role_name === 'super_admin') ? "/warden/leaves" : "/staff/leaves"} 
                      className={`font-semibold transition-colors ${(location.pathname === '/warden/leaves' || location.pathname === '/staff/leaves') ? 'text-blue-600' : 'text-gray-700 hover:text-blue-600'}`}
                  >
                      Manage Leaves
                  </Link>
              ) : (
                  <Link 
                      to="/my-leaves" 
                      className={`font-semibold transition-colors ${location.pathname === '/my-leaves' ? 'text-blue-600' : 'text-gray-700 hover:text-blue-600'}`}
                  >
                      My Leaves
                  </Link>
              )}
              {location.pathname !== getDashboardPath() && (
                <Link 
                    to={getDashboardPath()} 
                    className="text-gray-700 hover:text-blue-600 font-semibold transition-colors"
                >
                    Dashboard
                </Link>
              )}
              
              <Notifications />
              
              <button 
                  onClick={handleLogout} 
                  className="text-gray-700 hover:text-red-600 font-semibold transition-colors"
              >
                  Logout
              </button>
            </>
            ) : (
              <>
                <Link to="/login" className="text-gray-700 hover:text-blue-600 font-semibold">Login</Link>
                <Link to="/register" className="text-gray-700 hover:text-blue-600 font-semibold">Register</Link>
              </>
            )}
          </div>
        </nav>
      )}

      <main>
        <Routes>
          {/* Public Routes */}
          <Route path="/" element={<HomePage />} />
          <Route path="/login" element={<LoginPage />} />
          <Route path="/register" element={<RegisterPage />} />
          <Route path="/set-password/:token" element={<SetPasswordPage />} />
          <Route path="/forgot-password" element={<ForgotPasswordPage />} /> 
          <Route path="/reset-password/:token" element={<ResetPasswordPage />} /> 
          <Route path="/verify-email/:token" element={<VerifyEmailPage />} />


          {/* Resident Protected Routes */}
          <Route path="/dashboard" element={<PrivateRoute><DashboardPage /></PrivateRoute>} />
          <Route path="/my-grievances" element={<PrivateRoute><MyGrievancesPage /></PrivateRoute>} />
          <Route path="/grievance/:ticketId" element={<PrivateRoute><GrievanceDetailPage /></PrivateRoute>} />
          <Route path="/submit-grievance" element={<PrivateRoute><SubmitGrievancePage /></PrivateRoute>} />

          {/* New Module Routes */}
          <Route path="/my-leaves" element={<PrivateRoute><LeavesPage /></PrivateRoute>} />
          <Route path="/announcements" element={<PrivateRoute><AnnouncementsPage /></PrivateRoute>} />

          {/* Officer (Hostel Staff) Protected Routes */}
          <Route path="/staff/dashboard" element={<OfficerRoute><OfficerDashboardPage /></OfficerRoute>} />
          <Route path="/staff/leaves" element={<OfficerRoute><StaffLeavesPage /></OfficerRoute>} />
          <Route path="/staff/grievance/:ticketId" element={<OfficerRoute><GrievanceDetailPage /></OfficerRoute>} />

          {/* Admin (Chief Warden) Protected Routes */}
          <Route path="/warden/dashboard" element={<AdminRoute><ChiefWardenDashboard /></AdminRoute>} />
          <Route path="/warden/leaves" element={<AdminRoute><StaffLeavesPage /></AdminRoute>} />
          <Route path="/warden/hostel/:hostelId" element={<AdminRoute><ChiefWardenDashboard /></AdminRoute>} />
          <Route path="/warden/grievances/:filterType/:filterValue" element={<AdminRoute><FilteredGrievancesPage /></AdminRoute>} />
          <Route path="/warden/grievance/:ticketId" element={<AdminRoute><GrievanceDetailPage /></AdminRoute>} />
        </Routes>
      </main>
      
      <ToastContainer
        position="bottom-right"
        autoClose={3000}
        hideProgressBar={false}
        newestOnTop={false}
        closeOnClick
        rtl={false}
        pauseOnFocusLoss
        draggable
        pauseOnHover
        theme="light"
      />
      <SpeedInsights />
    </div>
  );
}

export default App;