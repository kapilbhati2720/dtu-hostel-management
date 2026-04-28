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
                setMessage(err.response?.data?.msg || 'Verification failed. The link may be invalid or expired.');
            }
        };

        if (token && !hasCalledAPI.current) {
            hasCalledAPI.current = true;
            verifyEmail();
        }
    }, [token]);

    return (
        <div className="min-h-screen bg-gradient-to-br from-slate-900 via-blue-950 to-slate-900 flex items-center justify-center px-4">
            <div className="w-full max-w-md bg-white rounded-2xl shadow-2xl p-10 text-center">

                {/* Logo / Header */}
                <div className="mb-6">
                    <div className="h-14 w-14 bg-blue-600 rounded-2xl flex items-center justify-center mx-auto mb-4 shadow-lg shadow-blue-200">
                        <svg className="w-7 h-7 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                        </svg>
                    </div>
                    <p className="text-xs font-bold text-gray-400 uppercase tracking-widest">DTU Hostel Management</p>
                </div>

                {/* Verifying State */}
                {status === 'verifying' && (
                    <div>
                        <div className="flex justify-center mb-4">
                            <div className="animate-spin rounded-full h-12 w-12 border-4 border-blue-100 border-t-blue-600"></div>
                        </div>
                        <h1 className="text-2xl font-bold text-gray-900 mb-2">Verifying your email...</h1>
                        <p className="text-gray-500 text-sm">Please wait while we activate your account.</p>
                    </div>
                )}

                {/* Success State */}
                {status === 'success' && (
                    <div>
                        <div className="flex justify-center mb-4">
                            <div className="h-16 w-16 bg-green-100 rounded-full flex items-center justify-center">
                                <svg className="w-9 h-9 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" />
                                </svg>
                            </div>
                        </div>
                        <h1 className="text-2xl font-bold text-gray-900 mb-2">Email Verified!</h1>
                        <p className="text-gray-500 text-sm mb-8">{message}</p>
                        <Link
                            to="/login"
                            className="w-full inline-block bg-blue-600 hover:bg-blue-700 text-white font-bold py-3 px-6 rounded-xl transition-colors shadow-lg shadow-blue-100"
                        >
                            Proceed to Login →
                        </Link>
                    </div>
                )}

                {/* Error State */}
                {status === 'error' && (
                    <div>
                        <div className="flex justify-center mb-4">
                            <div className="h-16 w-16 bg-red-100 rounded-full flex items-center justify-center">
                                <svg className="w-9 h-9 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M6 18L18 6M6 6l12 12" />
                                </svg>
                            </div>
                        </div>
                        <h1 className="text-2xl font-bold text-gray-900 mb-2">Verification Failed</h1>
                        <p className="text-gray-500 text-sm mb-2">{message}</p>
                        <p className="text-xs text-gray-400 mb-8">
                            Verification links expire after 24 hours. Try registering again if your link has expired.
                        </p>
                        <div className="flex flex-col gap-3">
                            <Link
                                to="/register"
                                className="w-full inline-block bg-blue-600 hover:bg-blue-700 text-white font-bold py-3 px-6 rounded-xl transition-colors"
                            >
                                Register Again
                            </Link>
                            <Link
                                to="/login"
                                className="w-full inline-block bg-gray-100 hover:bg-gray-200 text-gray-700 font-bold py-3 px-6 rounded-xl transition-colors"
                            >
                                Back to Login
                            </Link>
                        </div>
                    </div>
                )}

            </div>
        </div>
    );
};

export default VerifyEmailPage;