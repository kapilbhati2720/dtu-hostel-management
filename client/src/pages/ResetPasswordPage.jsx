// client/src/pages/ResetPasswordPage.jsx
import React, { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import axios from 'axios';
import { toast } from 'react-toastify';

const ResetPasswordPage = () => {
    const { token } = useParams();
    const navigate = useNavigate();
    const [password, setPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [showPassword, setShowPassword] = useState(false);

    const onSubmit = async (e) => {
        e.preventDefault();
        if (password !== confirmPassword) {
            return toast.error("Passwords do not match.");
        }
        try {
            // Call the new reset-password route
            const res = await axios.post('/api/auth/reset-password', { token, password });
            toast.success(res.data.msg);
            navigate('/login'); // Redirect to login on success
        } catch (err) {
            toast.error(err.response?.data?.msg || "Failed to reset password.");
        }
    };

    return (
        <div className="max-w-md mx-auto mt-10 p-8 bg-white rounded-lg shadow-xl">
            <h1 className="text-3xl font-bold text-center mb-6">Reset Your Password</h1>
            <form onSubmit={onSubmit}>
                <div className="mb-4 relative">
                    <label className="block text-gray-700 text-sm font-bold mb-2">New Password</label>
                    <input
                        type={showPassword ? "text" : "password"}
                        placeholder="New Password"
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        required
                        className="w-full p-2 border rounded"
                    />
                </div>
                <div className="mb-6 relative">
                    <label className="block text-gray-700 text-sm font-bold mb-2">Confirm New Password</label>
                    <input
                        type={showPassword ? "text" : "password"}
                        placeholder="Confirm New Password"
                        value={confirmPassword}
                        onChange={(e) => setConfirmPassword(e.target.value)}
                        required
                        className="w-full p-2 border rounded"
                    />
                    {/* The Toggle Button */}
                    <button 
                        type="button" 
                        onClick={() => setShowPassword(!showPassword)}
                        className="absolute top-9 right-0 px-3 flex items-center text-sm text-gray-600"
                    >
                        {showPassword ? "Hide" : "Show"}
                    </button>
                </div>
                <button type="submit" className="w-full bg-blue-600 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded">
                    Save New Password
                </button>
            </form>
        </div>
    );
};

export default ResetPasswordPage;