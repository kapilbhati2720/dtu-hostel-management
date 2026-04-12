import React, { useState, useEffect, useCallback } from 'react';
import axios from 'axios';
import io from 'socket.io-client';
import { jwtDecode } from 'jwt-decode';
import { AuthContext } from './AuthContext';
import { toast } from 'react-toastify';

const socket = io(import.meta.env.VITE_API_URL || 'http://localhost:5000', { autoConnect: false });

export const AuthProvider = ({ children }) => {
  const [token, setToken] = useState(localStorage.getItem('token'));
  const [user, setUser] = useState(null);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [loading, setLoading] = useState(true);
  const [notifications, setNotifications] = useState([]);
  const [unreadCount, setUnreadCount] = useState(0);

  const setAuthToken = (token) => {
    if (token) {
      axios.defaults.headers.common['x-auth-token'] = token;
      localStorage.setItem('token', token);
    } else {
      delete axios.defaults.headers.common['x-auth-token'];
      localStorage.removeItem('token');
    }
  };

  const fetchNotifications = useCallback(async () => {
    try {
      if (!localStorage.getItem('token')) return;
      const res = await axios.get('/api/notifications');
      setNotifications(res.data);
      setUnreadCount(res.data.filter(n => !n.is_read).length);
    } catch (err) {
      console.error("Could not fetch notifications", err);
    }
  }, []);

  const loadUser = useCallback(async () => {
    const storedToken = localStorage.getItem('token');
    if (storedToken) {
      setAuthToken(storedToken);
      try {
        const res = await axios.get('/api/auth');
        setUser(res.data);
        setIsAuthenticated(true);
        socket.connect();
        await fetchNotifications();
      } catch (err) {
        setAuthToken(null);
      }
    }
    setLoading(false);
  }, [fetchNotifications]);

  useEffect(() => { loadUser(); }, [loadUser]);

  useEffect(() => {
    const handleConnect = () => {
      if (user) {
        // Find user's hostel_id for socket room joining
        const hostelRole = user.roles?.find(r => r.hostel_id);
        const hostelId = hostelRole ? hostelRole.hostel_id : null;
        socket.emit('addUser', user.user_id, hostelId);
      }
    };
    socket.on('connect', handleConnect);
    socket.on('new_notification', fetchNotifications);
    return () => {
      socket.off('connect', handleConnect);
      socket.off('new_notification', fetchNotifications);
    };
  }, [user, fetchNotifications]);

  const register = async (formData, navigate) => {
    const config = { headers: { 'Content-Type': 'application/json' } };
    try {
      // 1. Post to backend
      const res = await axios.post('/api/auth/register', formData, config);
      
      // 2. Set Token immediately (Auto-login)
      setAuthToken(res.data.token);
      
      // 3. Load User Data
      await loadUser();

      // 4. Navigate (RegisterPage will handle navigation, but good to have fallback)
      // We rely on RegisterPage to call navigate(), but if you want auto-redirect here:
      // navigate('/dashboard'); 
      
    } catch (err) {
      // CRITICAL: Re-throw error so RegisterPage can display the toast
      throw err;
    }
  };

  // --- UPDATED LOGIN FUNCTION ---
  // Added 'redirectPath' as the 4th argument with a default of null
  const login = async (email, password, navigate, redirectPath = null) => { 
    const config = { headers: { 'Content-Type': 'application/json' } };
    const body = JSON.stringify({ email, password });
    try {
      const res = await axios.post('/api/auth/login', body, config);
      setAuthToken(res.data.token);
      
      const decodedUser = jwtDecode(res.data.token).user;

      // --- NEW NAVIGATION LOGIC ---
      if (redirectPath) {
        // 1. Priority: If a specific path was requested (e.g., from 'File Complaint'), go there
        navigate(redirectPath);
      } else {
        // 2. Default: Use role-based routing
        const userRoles = decodedUser.roles.map(role => role.role_name);

        if (userRoles.includes('super_admin')) {
          navigate('/warden/dashboard');
        } else if (userRoles.includes('nodal_officer')) {
          navigate('/staff/dashboard');
        } else {
          navigate('/dashboard');
        }
      }
      // --- End of new logic ---

      // Load user details in background
      await loadUser();

    } catch (err) {
      throw err;
    }
  };

  const logout = () => {
    setAuthToken(null);
    setToken(null);
    setUser(null);
    setIsAuthenticated(false);
    setNotifications([]);
    setUnreadCount(0);
    socket.disconnect();
  };

  useEffect(() => {
      const errorInterceptor = axios.interceptors.response.use(
          response => response, 
          (error) => {
              if (error.response && error.response.status === 401) {
                  const msg = error.response.data?.msg || "Your session has expired. Please log in again.";
                  toast.error(msg);
                  logout(); 
              }
              return Promise.reject(error);
          }
      );
      return () => {
          axios.interceptors.response.eject(errorInterceptor);
      };
  }, []);

  return (
    <AuthContext.Provider value={{ 
      token, 
      user, 
      isAuthenticated, 
      loading, 
      register, 
      login, 
      logout, 
      notifications, 
      unreadCount, 
      fetchNotifications 
      }}>
      {children}
    </AuthContext.Provider>
  );
};

export default AuthProvider;