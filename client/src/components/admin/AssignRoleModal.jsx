// client/src/components/admin/AssignRoleModal.jsx

import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { toast } from 'react-toastify';
import { X, Plus, Shield } from 'lucide-react';

const AssignRoleModal = ({ user, onClose, onRoleAssigned }) => {
    const [assignments, setAssignments] = useState([]);
    const [selectedRoleId, setSelectedRoleId] = useState('');
    const [selectedHostelId, setSelectedHostelId] = useState('');
    
    const [allRoles, setAllRoles] = useState([]);
    const [allHostels, setAllHostels] = useState([]);
    const [isSaving, setIsSaving] = useState(false);

    const roleDisplayName = (roleName) => {
        const map = { 'student': 'Resident', 'nodal_officer': 'Hostel Staff', 'super_admin': 'Chief Warden' };
        return map[roleName] || roleName;
    };

    useEffect(() => {
        const fetchDataAndHydrate = async () => {
            try {
                const [rolesRes, hostelsRes] = await Promise.all([
                    axios.get('/api/admin/roles'),
                    axios.get('/api/admin/hostels')
                ]);
                
                const fetchedRoles = rolesRes.data;
                const fetchedHostels = hostelsRes.data;
                
                setAllRoles(fetchedRoles);
                setAllHostels(fetchedHostels);

                // HYDRATION: Map existing user roles to IDs
                if (user.roles && user.roles.length > 0) {
                    const initialAssignments = user.roles.map(userRole => {
                        const matchingRole = fetchedRoles.find(r => r.role_name === userRole.role_name);
                        const matchingHostel = fetchedHostels.find(h => h.name === userRole.hostel_name);
                        
                        if (matchingRole) {
                            return {
                                uniqueKey: Math.random().toString(36).substr(2, 9),
                                roleId: matchingRole.role_id,
                                roleName: matchingRole.role_name,
                                hostelId: matchingHostel ? matchingHostel.hostel_id : null,
                                hostelName: matchingHostel ? matchingHostel.name : 'System Wide'
                            };
                        }
                        return null;
                    }).filter(Boolean);
                    
                    setAssignments(initialAssignments);
                } else {
                    const studentRole = fetchedRoles.find(r => r.role_name === 'student');
                    if (studentRole) {
                        setAssignments([{
                            uniqueKey: Math.random().toString(36).substr(2, 9),
                            roleId: studentRole.role_id,
                            roleName: 'student',
                            hostelId: null,
                            hostelName: 'System Wide'
                        }]);
                    }
                }
            } catch (error) {
                toast.error('Failed to load roles or hostels.');
            }
        };
        fetchDataAndHydrate();
    }, [user]);

    const handleAddAssignment = () => {
        if (!selectedRoleId) return toast.error("Please select a role.");
        
        const roleObj = allRoles.find(r => r.role_id === parseInt(selectedRoleId));
        const hostelObj = allHostels.find(h => h.hostel_id === parseInt(selectedHostelId));

        const isDuplicate = assignments.some(a => a.roleId === parseInt(selectedRoleId) && a.hostelId === (hostelObj ? hostelObj.hostel_id : null));
        if (isDuplicate) return toast.warning("This role is already in the list!");

        setAssignments(prev => [...prev, {
            uniqueKey: Math.random().toString(36).substr(2, 9),
            roleId: parseInt(selectedRoleId),
            roleName: roleObj.role_name,
            hostelId: hostelObj ? hostelObj.hostel_id : null,
            hostelName: hostelObj ? hostelObj.name : 'System Wide'
        }]);

        setSelectedRoleId('');
        setSelectedHostelId('');
    };

    const handleRemoveAssignment = (keyToRemove) => {
        setAssignments(prev => prev.filter(a => a.uniqueKey !== keyToRemove));
    };

    const handleSave = async () => {
        if (assignments.length === 0) {
            return toast.error("A user must have at least one role.");
        }

        setIsSaving(true);
        try {
            const payload = assignments.map(a => ({
                roleId: a.roleId,
                hostelId: a.hostelId
            }));

            await axios.put(`/api/admin/users/${user.user_id}/roles`, { assignments: payload });
            
            toast.success("User roles synced successfully!");
            onRoleAssigned();
            onClose(); 
        } catch (err) {
            toast.error(err.response?.data?.msg || 'Failed to sync roles.');
        } finally {
            setIsSaving(false);
        }
    };

    return (
        <div className="fixed inset-0 bg-gray-900 bg-opacity-60 backdrop-blur-sm flex justify-center items-center z-50 p-4">
            <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg overflow-hidden animate-fade-in-up">
                
                {/* Header */}
                <div className="bg-indigo-600 p-6 text-white flex justify-between items-center">
                    <div>
                        <h2 className="text-xl font-bold flex items-center gap-2">
                            <Shield size={20} /> Manage Access
                        </h2>
                        <p className="text-indigo-100 text-sm mt-1">{user.full_name} ({user.email})</p>
                    </div>
                    <button onClick={onClose} className="text-indigo-200 hover:text-white transition-colors">
                        <X size={24} />
                    </button>
                </div>

                <div className="p-6">
                    {/* Active Roles List */}
                    <div className="mb-6">
                        <h3 className="text-sm font-bold text-gray-700 uppercase tracking-wider mb-3">Current Assignments</h3>
                        {assignments.length === 0 ? (
                            <div className="bg-red-50 text-red-600 p-3 rounded-lg text-sm font-medium border border-red-100">
                                Warning: This user has no roles and cannot use the system.
                            </div>
                        ) : (
                            <div className="space-y-2 max-h-40 overflow-y-auto pr-2">
                                {assignments.map(assignment => (
                                    <div key={assignment.uniqueKey} className="flex justify-between items-center bg-gray-50 border border-gray-200 p-3 rounded-lg group">
                                        <div>
                                            <div className="text-sm font-bold text-gray-800">
                                                {roleDisplayName(assignment.roleName)}
                                            </div>
                                            {assignment.roleName !== 'student' && assignment.roleName !== 'super_admin' && (
                                                <div className="text-xs text-gray-500">{assignment.hostelName}</div>
                                            )}
                                        </div>
                                        <button 
                                            onClick={() => handleRemoveAssignment(assignment.uniqueKey)}
                                            className="text-gray-400 hover:text-red-500 hover:bg-red-50 p-1.5 rounded transition-colors"
                                            title="Remove Role"
                                        >
                                            <X size={16} />
                                        </button>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>

                    <hr className="my-6 border-gray-100" />

                    {/* Form to Add Roles */}
                    <h3 className="text-sm font-bold text-gray-700 uppercase tracking-wider mb-3">Add New Role</h3>
                    <div className="flex flex-col gap-3 sm:flex-row items-start">
                        <div className="flex-1 w-full">
                            <select value={selectedRoleId} onChange={e => setSelectedRoleId(e.target.value)} className="w-full p-2.5 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none">
                                <option value="">-- Select Role --</option>
                                {allRoles.map(role => <option key={role.role_id} value={role.role_id}>{roleDisplayName(role.role_name)}</option>)}
                            </select>
                        </div>
                        
                        {/* Show hostel dropdown for officer roles */}
                        {allRoles.find(r => r.role_id === parseInt(selectedRoleId))?.role_name === 'nodal_officer' && (
                            <div className="flex-1 w-full">
                                <select value={selectedHostelId} onChange={e => setSelectedHostelId(e.target.value)} className="w-full p-2.5 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none">
                                    <option value="">-- Select Hostel --</option>
                                    {allHostels.map(h => <option key={h.hostel_id} value={h.hostel_id}>{h.name}</option>)}
                                </select>
                            </div>
                        )}
                        
                        <button 
                            type="button" 
                            onClick={handleAddAssignment}
                            disabled={!selectedRoleId}
                            className="bg-gray-100 hover:bg-gray-200 text-gray-800 font-bold p-2.5 rounded-lg transition-colors disabled:opacity-50 flex items-center gap-1 w-full sm:w-auto justify-center"
                        >
                            <Plus size={20}/> <span className="sm:hidden">Add</span>
                        </button>
                    </div>

                    {/* Actions */}
                    <div className="flex justify-end gap-3 mt-8">
                        <button type="button" onClick={onClose} className="px-5 py-2.5 text-sm font-bold text-gray-600 hover:bg-gray-100 rounded-lg transition-colors">
                            Cancel
                        </button>
                        <button 
                            onClick={handleSave} 
                            disabled={isSaving}
                            className={`px-5 py-2.5 text-sm font-bold text-white rounded-lg shadow-md transition-all ${isSaving ? 'bg-indigo-400' : 'bg-indigo-600 hover:bg-indigo-700 hover:shadow-lg'}`}
                        >
                            {isSaving ? 'Saving Sync...' : 'Save & Sync Roles'}
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default AssignRoleModal;