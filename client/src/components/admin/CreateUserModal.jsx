// client/src/components/admin/CreateUserModal.jsx

import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { toast } from 'react-toastify';

const CreateUserModal = ({ onClose, onUserCreated }) => {
    const [formData, setFormData] = useState({ fullName: '', email: '', roleId: '', departmentId: '' });
    const [roles, setRoles] = useState([]);
    const [departments, setDepartments] = useState([]);
    const [loading, setLoading] = useState(true);

    // Fetch roles and departments when the modal first opens
    useEffect(() => {
        const fetchData = async () => {
            try {
                const [rolesRes, deptsRes] = await Promise.all([
                    axios.get('/api/admin/roles'),
                    axios.get('/api/admin/departments')
                ]);
                setRoles(rolesRes.data);
                setDepartments(deptsRes.data);
            } catch (error) {
                toast.error('Failed to load roles or departments.');
            } finally {
                setLoading(false);
            }
        };
        fetchData();
    }, []);

    const { fullName, email, roleId, departmentId } = formData;
    const onChange = e => setFormData({ ...formData, [e.target.name]: e.target.value });

    const onSubmit = async e => {
        e.preventDefault();
        try {
            const res = await axios.post('/api/admin/create-user', formData);
            toast.success(res.data.msg);
            onUserCreated(); // Refreshes the user list in the parent component
            onClose();       // Closes the modal
        } catch (err) {
            toast.error(err.response?.data?.msg || 'Failed to create user.');
        }
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
                                {roles.map(role => <option key={role.role_id} value={role.role_id}>{role.role_name}</option>)}
                            </select>
                        </div>
                        <div className="mb-4">
                            <label className="block text-gray-700 text-sm font-bold mb-2">Assign Department</label>
                            <select name="departmentId" value={departmentId} onChange={onChange} required className="w-full p-2 border rounded bg-white">
                                <option value="">Select Department</option>
                                {departments.map(dept => <option key={dept.department_id} value={dept.department_id}>{dept.name}</option>)}
                            </select>
                        </div>
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