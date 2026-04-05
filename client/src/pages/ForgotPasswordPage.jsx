// client/src/pages/ForgotPasswordPage.jsx
import React, { useState } from 'react';
import axios from 'axios';
import { toast } from 'react-toastify';

const ForgotPasswordPage = () => {
    const [email, setEmail] = useState('');
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [messageSent, setMessageSent] = useState(false);

    const onSubmit = async (e) => {
        e.preventDefault();
        setIsSubmitting(true);
        try {
            const res = await axios.post('/api/auth/forgot-password', { email });
            toast.success(res.data.msg); // Show the success message from the API
            setMessageSent(true);
        } catch (err) {
            toast.error(err.response?.data?.msg || 'An error occurred.');
        } finally {
            setIsSubmitting(false);
        }
    };

    if (messageSent) {
        return (
            <div className="max-w-md mx-auto mt-10 p-8 text-center bg-white rounded-lg shadow-xl">
                <h1 className="text-2xl font-bold text-green-600 mb-4">Email Sent!</h1>
                <p className="text-gray-700">If an account with the email <span className="font-semibold">{email}</span> exists, a password reset link has been sent to it.</p>
            </div>
        );
    }

    return (
        <div className="max-w-md mx-auto mt-10 p-8 bg-white rounded-lg shadow-xl">
            <h1 className="text-3xl font-bold text-center mb-6">Forgot Password</h1>
            <p className="text-center text-gray-600 mb-6">Enter your email address, and we will send you a link to reset your password.</p>
            <form onSubmit={onSubmit}>
                <input
                    type="email"
                    placeholder="DTU Email Address"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    required
                    className="w-full p-2 border rounded mb-6"
                />
                <button type="submit" disabled={isSubmitting} className="w-full bg-blue-600 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded disabled:bg-blue-300">
                    {isSubmitting ? 'Sending...' : 'Send Reset Link'}
                </button>
            </form>
        </div>
    );
};

export default ForgotPasswordPage;