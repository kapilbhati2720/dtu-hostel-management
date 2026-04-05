// client/src/pages/VerifyEmailPage.jsx
import React, { useEffect, useState, useRef } from 'react';
import { useParams, Link } from 'react-router-dom';
import axios from 'axios';

const VerifyEmailPage = () => {
    const { token } = useParams();
    const [status, setStatus] = useState('verifying'); // 'verifying', 'success', 'error'
    const [message, setMessage] = useState('');
    const hasCalledAPI = useRef(false);

    useEffect(() => {
        const verifyEmail = async () => {
            try {
                const res = await axios.post('/api/auth/verify-email', { token });
                setStatus('success');
                setMessage(res.data.msg);
            } catch (err) {
                setStatus('error');
                setMessage(err.response?.data?.msg || 'Verification failed.');
            }
        };

        if (token && !hasCalledAPI.current) {
                hasCalledAPI.current = true; // Mark as called
                verifyEmail();
            }
        }, [token]);

    return (
        <div className="max-w-md mx-auto mt-10 p-8 bg-white rounded-lg shadow-xl text-center">
            {status === 'verifying' && (
                <h2 className="text-2xl font-bold text-blue-600">Verifying your email...</h2>
            )}

            {status === 'success' && (
                <>
                    <h2 className="text-2xl font-bold text-green-600 mb-4">Verified!</h2>
                    <p className="text-gray-700 mb-6">{message}</p>
                    <Link to="/login" className="bg-blue-600 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded">
                        Proceed to Login
                    </Link>
                </>
            )}

            {status === 'error' && (
                <>
                    <h2 className="text-2xl font-bold text-red-600 mb-4">Verification Failed</h2>
                    <p className="text-gray-700 mb-6">{message}</p>
                    <Link to="/login" className="text-blue-600 hover:underline">
                        Back to Login
                    </Link>
                </>
            )}
        </div>
    );
};

export default VerifyEmailPage;