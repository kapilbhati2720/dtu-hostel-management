// client/src/components/admin/CreateUserModal.jsx

import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { toast } from 'react-toastify';

const CreateUserModal = ({ onClose, onUserCreated }) => {
    const [formData, setFormData] = useState({ fullName: '', email: '', roleId: '', hostelId: '', designation: '' });
    const [roles, setRoles] = useState([]);
    const [hostels, setHostels] = useState([]);
    const [loading, setLoading] = useState(true);

    const designationOptions = ['Warden', 'Attendant', 'Council Member', 'Officer In-charge, Hostel Office'];

    useEffect(() => {
        const fetchData = async () => {
            try {
                const [rolesRes, hostelsRes] = await Promise.all([
                    axios.get('/api/admin/roles'),
                    axios.get('/api/admin/hostels')
                ]);
                setRoles(rolesRes.data);
                setHostels(hostelsRes.data);
            } catch (error) {
                toast.error('Failed to load roles or hostels.');
            } finally {
                setLoading(false);
            }
        };
        fetchData();
    }, []);

    const { fullName, email, roleId, hostelId, designation } = formData;
    const onChange = e => setFormData({ ...formData, [e.target.name]: e.target.value });

    const selectedRoleName = roles.find(r => r.role_id === parseInt(roleId))?.role_name;
    const needsHostel = selectedRoleName === 'nodal_officer';
    const needsDesignation = selectedRoleName === 'nodal_officer' || selectedRoleName === 'super_admin';

    const onSubmit = async e => {
        e.preventDefault();
        try {
            const res = await axios.post('/api/admin/create-user', formData);
            toast.success(res.data.msg);
            onUserCreated();
            onClose();
        } catch (err) {
            toast.error(err.response?.data?.msg || 'Failed to create user.');
        }
    };

    const roleDisplayName = (roleName) => {
        const map = { 'student': 'Resident', 'nodal_officer': 'Hostel Staff', 'super_admin': 'Chief Warden' };
        return map[roleName] || roleName;
    };

    return (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex justify-center items-center z-50">
            <div className="bg-white p-8 rounded-lg shadow-xl w-full max-w-md">
                <h2 className="text-2xl font-bold mb-6">Create New User</h2>
                {loading ? <p>Loading data...</p> : (
                    <form onSubmit={onSubmit}>
                        <div className="mb-4">
                            <label className="block text-gray-700 text-sm font-bold mb-2">Full Name</label>
                            <input name="fullName" value={fullName} onChange={onChange} required className="w-full p-2 border rounded" />
                        </div>
                        <div className="mb-4">
                            <label className="block text-gray-700 text-sm font-bold mb-2">Email Address</label>
                            <input type="email" name="email" value={email} onChange={onChange} required className="w-full p-2 border rounded" />
                        </div>
                        <div className="mb-4">
                            <label className="block text-gray-700 text-sm font-bold mb-2">Assign Role</label>
                            <select name="roleId" value={roleId} onChange={onChange} required className="w-full p-2 border rounded bg-white">
                                <option value="">Select Role</option>
                                {roles.map(role => (
                                    <option key={role.role_id} value={role.role_id}>
                                        {roleDisplayName(role.role_name)}
                                    </option>
                                ))}
                            </select>
                        </div>

                        {needsHostel && (
                            <div className="mb-4">
                                <label className="block text-gray-700 text-sm font-bold mb-2">Assign Hostel</label>
                                <select name="hostelId" value={hostelId} onChange={onChange} required className="w-full p-2 border rounded bg-white">
                                    <option value="">Select Hostel</option>
                                    {hostels.map(h => (
                                        <option key={h.hostel_id} value={h.hostel_id}>{h.name}</option>
                                    ))}
                                </select>
                            </div>
                        )}

                        {needsDesignation && (
                            <div className="mb-4">
                                <label className="block text-gray-700 text-sm font-bold mb-2">Designation</label>
                                <select name="designation" value={designation} onChange={onChange} className="w-full p-2 border rounded bg-white">
                                    <option value="">Select Designation</option>
                                    {designationOptions.map(d => (
                                        <option key={d} value={d}>{d}</option>
                                    ))}
                                </select>
                            </div>
                        )}

                        <div className="flex justify-end gap-4 mt-6">
                            <button type="button" onClick={onClose} className="bg-gray-300 hover:bg-gray-400 text-black font-bold py-2 px-4 rounded">
                                Cancel
                            </button>
                            <button type="submit" className="bg-blue-600 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded">
                                Create & Send Invite
                            </button>
                        </div>
                    </form>
                )}
            </div>
        </div>
    );
};

export default CreateUserModal;