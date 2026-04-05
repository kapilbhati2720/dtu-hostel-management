import React, { useState, useEffect, useCallback } from 'react';
import axios from 'axios';
import { toast } from 'react-toastify';
import CreateUserModal from './CreateUserModal';
import AssignRoleModal from './AssignRoleModal';
import ConfirmationModal from '../common/ConfirmationModal';

// Accept searchTerm prop
const UserList = ({ searchTerm = "" }) => {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [isCreateModalOpen, setCreateModalOpen] = useState(false);
  const [managingUser, setManagingUser] = useState(null);
  const [confirmation, setConfirmation] = useState(null);

  const fetchUsers = useCallback(async () => {
    try {
      setLoading(true);
      const res = await axios.get('/api/admin/users');
      setUsers(res.data);
    } catch (err) {
      console.error(err);
      toast.error('Failed to fetch users.');
    } finally {
      setLoading(false);
    }
  }, []);

  // --- NEW: Filter Logic ---
  const filteredUsers = users.filter(user => {
      if (!searchTerm) return true; 
      const lowerTerm = searchTerm.toLowerCase();
      return (
          user.full_name.toLowerCase().includes(lowerTerm) ||
          user.email.toLowerCase().includes(lowerTerm) ||
          (user.roll_number && user.roll_number.toLowerCase().includes(lowerTerm))
      );
  });

  const handleConfirmAction = async () => {
      const { action, user } = confirmation;
      try {
          switch (action) {
              case 'deactivate':
                  await axios.put(`/api/admin/users/${user.user_id}/deactivate`);
                  toast.success(`${user.full_name} has been deactivated.`);
                  break;
              case 'reactivate':
                  await axios.put(`/api/admin/users/${user.user_id}/reactivate`);
                  toast.success(`${user.full_name} has been re-activated.`);
                  break;
              case 'resendInvite':
                  await axios.post('/api/admin/resend-invite', { userId: user.user_id, email: user.email, fullName: user.full_name });
                  toast.success(`Invite resent to ${user.full_name}.`);
                  break;
              default: return;
          }
          fetchUsers(); 
      } catch (err) {
          toast.error(`Failed to ${action}.`);
      } finally {
          setConfirmation(null); 
      }
  };

  useEffect(() => {
    fetchUsers();
  }, [fetchUsers]);

  if (loading) return <div className="p-8 text-center text-gray-500 animate-pulse">Loading users...</div>;

  return (
    <div className="bg-white"> {/* Parent handles rounded corners */}
        
        {/* HEADER */}
        <div className="p-6 border-b border-gray-100 bg-gray-50 flex flex-col md:flex-row justify-between items-center gap-4">
            <div>
                <h2 className="text-lg font-bold text-gray-800">User Management</h2>
                <p className="text-sm text-gray-500">
                    {filteredUsers.length} users found
                </p>
            </div>
            <button
                onClick={() => setCreateModalOpen(true)}
                className="bg-blue-600 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded-lg shadow-sm transition-all hover:scale-105 active:scale-95 text-sm flex items-center gap-2"
            >
                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                    <path fillRule="evenodd" d="M10 3a1 1 0 011 1v5h5a1 1 0 110 2h-5v5a1 1 0 11-2 0v-5H4a1 1 0 110-2h5V4a1 1 0 011-1z" clipRule="evenodd" />
                </svg>
                Create New User
            </button>
        </div>

        {/* TABLE */}
        <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-white">
                    <tr>
                        <th className="px-6 py-3 text-left text-xs font-bold text-gray-500 uppercase tracking-wider">User</th>
                        <th className="px-6 py-3 text-left text-xs font-bold text-gray-500 uppercase tracking-wider">Role & Department</th>
                        <th className="px-6 py-3 text-left text-xs font-bold text-gray-500 uppercase tracking-wider">Status</th>
                        <th className="px-6 py-3 text-right text-xs font-bold text-gray-500 uppercase tracking-wider">Actions</th>
                    </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                    {filteredUsers.length > 0 ? (
                        filteredUsers.map(user => {
                            const primaryRole = user.roles && user.roles.length > 0 ? user.roles[0] : null;
                            const roleName = primaryRole ? primaryRole.role_name : 'student';
                            const deptName = primaryRole?.department_name;

                            return (
                                <tr key={user.user_id} className="hover:bg-gray-50 transition-colors group">
                                    {/* Name & Email */}
                                    <td className="px-6 py-4 whitespace-nowrap">
                                        <div className="flex items-center">
                                            <div className="flex-shrink-0 h-10 w-10 rounded-full bg-gradient-to-br from-gray-100 to-gray-300 flex items-center justify-center text-gray-600 font-bold text-lg shadow-inner">
                                                {user.full_name.charAt(0).toUpperCase()}
                                            </div>
                                            <div className="ml-4">
                                                <div className="text-sm font-medium text-gray-900">{user.full_name}</div>
                                                <div className="text-sm text-gray-500">{user.email}</div>
                                            </div>
                                        </div>
                                    </td>

                                    {/* Role */}
                                    <td className="px-6 py-4">
                                        <div className="flex flex-col items-start">
                                            <div className="flex items-center gap-1.5">
                                                <span className={`px-2 py-0.5 inline-flex text-xs leading-5 font-semibold rounded-full uppercase tracking-wide border 
                                                    ${roleName === 'student' ? 'bg-blue-50 text-blue-700 border-blue-100' : 
                                                    roleName === 'super_admin' ? 'bg-purple-50 text-purple-700 border-purple-100' : 
                                                    'bg-orange-50 text-orange-700 border-orange-100'}`}>
                                                    {roleName.replace('_', ' ')}
                                                </span>
                                                {user.roles && user.roles.length > 1 && (
                                                    <span className="text-[10px] font-bold bg-gray-200 text-gray-700 px-1.5 py-0.5 rounded-full" title="Multiple Roles Assigned">
                                                        +{user.roles.length - 1}
                                                    </span>
                                                )}
                                            </div>
                                            {deptName && (
                                                <span className="text-xs text-gray-500 mt-1 ml-1 truncate max-w-xs" title={deptName}>
                                                    {deptName}
                                                </span>
                                            )}
                                        </div>
                                    </td>

                                    {/* Status */}
                                    <td className="px-6 py-4 whitespace-nowrap">
                                        {!user.is_active ? (
                                            <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-medium bg-red-100 text-red-800">
                                                <span className="w-1.5 h-1.5 rounded-full bg-red-600"></span> Inactive
                                            </span>
                                        ) : !user.is_verified ? (
                                            <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-medium bg-yellow-100 text-yellow-800 animate-pulse">
                                                <span className="w-1.5 h-1.5 rounded-full bg-yellow-500"></span> Invited
                                            </span>
                                        ) : (
                                            <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
                                                <span className="w-1.5 h-1.5 rounded-full bg-green-600"></span> Active
                                            </span>
                                        )}
                                    </td>

                                    {/* Actions - RESTORED VISIBILITY */}
                                    <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                                        <div className="flex justify-end items-center gap-2 h-8">
                                            
                                            {/* 1. Resend Invite */}
                                            <div className="w-8 flex justify-center"> 
                                                {!user.is_verified && (
                                                    <button
                                                        onClick={() => setConfirmation({
                                                            action: 'resendInvite', user,
                                                            title: 'Resend Invite',
                                                            message: `Send a new "Set Password" email to ${user.full_name}?`,
                                                            confirmText: 'Resend',
                                                            confirmClass: 'bg-purple-500 hover:bg-purple-600'
                                                        })}
                                                        className="text-purple-600 hover:text-purple-900 bg-purple-50 hover:bg-purple-100 p-1.5 rounded transition-colors"
                                                        title="Resend Invite Email"
                                                    >
                                                        <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                                                        </svg>
                                                    </button>
                                                )}
                                            </div>

                                            {/* 2. Manage Role */}
                                            <button
                                                onClick={() => setManagingUser(user)}
                                                className="text-indigo-600 hover:text-indigo-900 bg-indigo-50 hover:bg-indigo-100 px-3 py-1.5 rounded text-xs font-bold transition-colors w-20 text-center"
                                            >
                                                Edit Role
                                            </button>

                                            {/* 3. Deactivate/Reactivate */}
                                            <div className="w-24 flex justify-end">
                                                {user.is_active ? (
                                                    <button
                                                        onClick={() => setConfirmation({
                                                            action: 'deactivate', user,
                                                            title: 'Deactivate User',
                                                            message: `Are you sure you want to deactivate ${user.full_name}?`,
                                                            confirmText: 'Deactivate',
                                                            confirmClass: 'bg-red-500 hover:bg-red-600'
                                                        })}
                                                        className="text-red-600 hover:text-red-900 bg-red-50 hover:bg-red-100 px-3 py-1.5 rounded text-xs font-bold transition-colors w-full"
                                                    >
                                                        Deactivate
                                                    </button>
                                                ) : (
                                                    <button
                                                        onClick={() => setConfirmation({
                                                            action: 'reactivate', user,
                                                            title: 'Re-activate User',
                                                            message: `Are you sure you want to re-activate ${user.full_name}?`,
                                                            confirmText: 'Re-activate',
                                                            confirmClass: 'bg-green-500 hover:bg-green-600'
                                                        })}
                                                        className="text-green-600 hover:text-green-900 bg-green-50 hover:bg-green-100 px-3 py-1.5 rounded text-xs font-bold transition-colors w-full"
                                                    >
                                                        Activate
                                                    </button>
                                                )}
                                            </div>
                                        </div>
                                    </td>
                                </tr>
                            );
                        })
                    ) : (
                        <tr>
                            <td colSpan="4" className="px-6 py-12 text-center text-gray-500">
                                {searchTerm ? `No users found matching "${searchTerm}"` : "No users found."}
                            </td>
                        </tr>
                    )}
                </tbody>
            </table>
        </div>

        {/* MODALS */}
        {isCreateModalOpen && <CreateUserModal onClose={() => setCreateModalOpen(false)} onUserCreated={fetchUsers} />}
        {managingUser && <AssignRoleModal user={managingUser} onClose={() => setManagingUser(null)} onRoleAssigned={fetchUsers} />}
        {confirmation && <ConfirmationModal {...confirmation} onCancel={() => setConfirmation(null)} onConfirm={handleConfirmAction} />}
    </div>
  );
};

export default UserList;