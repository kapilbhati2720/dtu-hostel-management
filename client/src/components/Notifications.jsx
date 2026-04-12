import React, { useState, useContext, useEffect, useRef } from 'react'; 
import { AuthContext } from '../context/AuthContext'; 
import { FaBell } from 'react-icons/fa';
import { Link, useNavigate } from 'react-router-dom';
import axios from 'axios';
import { toast } from 'react-toastify'; 
import io from 'socket.io-client';

const socket = io(import.meta.env.VITE_API_URL || 'http://localhost:5000', {
  autoConnect: false
});

const Notifications = () => {
  // NEW: Grab 'user' from Context
  const { user, notifications, fetchNotifications, unreadCount } = useContext(AuthContext);
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef(null);
  const navigate = useNavigate();

  // REAL-TIME SOCKET CONNECTION
  useEffect(() => {
    // Only connect if we have a logged-in user
    if (user && (user.id || user.user_id)) {
      const currentUserId = user.id || user.user_id;
      
      socket.connect();

      // 1. Tell the backend "Hey, User X is online with this Socket ID"
      socket.emit('addUser', currentUserId);

      // 2. Listen for the 'new_notification' event from the backend
      socket.on('new_notification', () => {
        // Play a nice toast alert
        toast.info('🔔 You have a new notification!', {
            position: "bottom-right",
            autoClose: 4000,
        });
        
        // Instantly refresh the notification list & bell counter!
        fetchNotifications();
      });
    }

    // Cleanup: Disconnect when the component unmounts
    return () => {
      socket.off('new_notification');
      socket.disconnect();
    };
  }, [user, fetchNotifications]);
  // ----------------------------------------

  // Effect to handle closing the dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setIsOpen(false);
      }
    };
    if (isOpen) document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [isOpen]);

  const handleNotificationClick = async (event, notification) => {
    event.preventDefault();
    setIsOpen(false);

    if (!notification.is_read) {
      try {
        await axios.put(`/api/notifications/${notification.notification_id}/read`);
        await fetchNotifications(); 
      } catch (err) {
        console.error("Failed to mark notification as read", err);
      }
    }
    
    navigate(notification.link);
  };

  return (
    <div className="relative" ref={dropdownRef}>
      <button onClick={() => setIsOpen(!isOpen)} className="relative mt-2">
        <FaBell className="text-2xl text-gray-500 hover:text-blue-600 transition-colors" />
        {unreadCount > 0 && (
          <span className="absolute -top-1 -right-2 text-[10px] font-bold text-white bg-red-500 rounded-full min-w-[18px] h-[18px] flex items-center justify-center px-1 shadow-sm animate-pulse">
              {unreadCount}
          </span>
        )}
      </button>

      {isOpen && (
        <div className="absolute right-0 mt-3 w-80 bg-white rounded-xl shadow-xl z-50 border border-gray-100 overflow-hidden">
          <div className="p-4 font-bold text-gray-800 bg-gray-50 border-b border-gray-100 flex justify-between items-center">
              <span>Notifications</span>
              {unreadCount > 0 && <span className="text-xs text-blue-600 font-semibold">{unreadCount} New</span>}
          </div>
          <div className="max-h-96 overflow-y-auto">
            {notifications.length > 0 ? (
              notifications.map((notif) => (
                <Link
                  key={notif.notification_id}
                  to={notif.link}
                  onClick={(e) => handleNotificationClick(e, notif)}
                  className={`block px-4 py-3 text-sm border-b border-gray-50 hover:bg-blue-50 transition-colors ${!notif.is_read ? 'bg-blue-50/30' : ''}`}
                >
                  <div className="flex gap-3">
                      <div className={`mt-1.5 w-2 h-2 rounded-full shrink-0 ${!notif.is_read ? 'bg-blue-600' : 'bg-transparent'}`}></div>
                      <div>
                          <p className={`${!notif.is_read ? 'font-semibold text-gray-900' : 'text-gray-600'}`}>
                            {notif.message}
                          </p>
                          <p className="text-xs text-gray-400 mt-1">
                              {new Date(notif.created_at).toLocaleDateString()}
                          </p>
                      </div>
                  </div>
                </Link>
              ))
            ) : (
              <div className="px-4 py-8 text-center text-sm text-gray-500 flex flex-col items-center">
                  <FaBell className="text-gray-300 text-3xl mb-2" />
                  No new notifications
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default Notifications;