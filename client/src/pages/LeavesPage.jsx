import React, { useState, useEffect, useContext } from 'react';
import axios from 'axios';
import { toast } from 'react-toastify';
import { AuthContext } from '../context/AuthContext';
import { Calendar, Clock, CheckCircle, XCircle, AlertCircle, Plus, ChevronDown } from 'lucide-react';

const LeavesPage = () => {
    const { user } = useContext(AuthContext);
    const [leaves, setLeaves] = useState([]);
    const [hostels, setHostels] = useState([]);
    const [loading, setLoading] = useState(true);
    const [showForm, setShowForm] = useState(false);
    const [formData, setFormData] = useState({
        hostelId: '', leaveType: '', startDate: '', endDate: '', reason: ''
    });

    const leaveTypes = ['Home Visit', 'Medical', 'Emergency', 'Other'];

    const isStaff = user?.roles?.some(r => r.role_name === 'nodal_officer' || r.role_name === 'super_admin');

    useEffect(() => {
        fetchLeaves();
        fetchHostels();
    }, []);

    const fetchLeaves = async () => {
        try {
            const res = await axios.get('/api/leaves/my');
            setLeaves(res.data);
        } catch (err) {
            console.error("Failed to fetch leaves:", err);
        } finally {
            setLoading(false);
        }
    };

    const fetchHostels = async () => {
        try {
            const res = await axios.get('/api/hostels');
            setHostels(res.data);
            // Auto-select hostel if user only has one
            const userHostel = user?.roles?.find(r => r.hostel_id);
            if (userHostel) {
                setFormData(prev => ({ ...prev, hostelId: userHostel.hostel_id }));
            }
        } catch (err) {}
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        try {
            const res = await axios.post('/api/leaves', formData);
            toast.success(res.data.msg);
            setShowForm(false);
            setFormData({ hostelId: '', leaveType: '', startDate: '', endDate: '', reason: '' });
            fetchLeaves();
        } catch (err) {
            toast.error(err.response?.data?.msg || 'Failed to submit leave.');
        }
    };

    const getStatusBadge = (status) => {
        const styles = {
            'Pending': 'bg-yellow-100 text-yellow-800 border-yellow-200',
            'Approved': 'bg-green-100 text-green-800 border-green-200',
            'Rejected': 'bg-red-100 text-red-800 border-red-200',
        };
        const icons = {
            'Pending': <Clock size={14} />,
            'Approved': <CheckCircle size={14} />,
            'Rejected': <XCircle size={14} />,
        };
        return (
            <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold border ${styles[status] || 'bg-gray-100'}`}>
                {icons[status]} {status}
            </span>
        );
    };

    return (
        <div className="min-h-screen bg-slate-50 py-10 px-4 sm:px-6 lg:px-8">
            <div className="max-w-4xl mx-auto">
                {/* Header */}
                <div className="flex justify-between items-center mb-8">
                    <div>
                        <h1 className="text-3xl font-bold text-gray-900">My Leaves</h1>
                        <p className="text-gray-500 mt-1">Apply for leave and track your requests.</p>
                    </div>
                    {!isStaff && (
                        <button 
                            onClick={() => setShowForm(!showForm)}
                            className="bg-blue-600 hover:bg-blue-700 text-white px-5 py-2.5 rounded-xl font-bold flex items-center gap-2 shadow-lg transition-all hover:-translate-y-0.5"
                        >
                            <Plus size={18} /> Apply for Leave
                        </button>
                    )}
                </div>

                {/* Application Form */}
                {showForm && (
                    <div className="bg-white rounded-2xl shadow-xl border border-gray-100 p-8 mb-8 animate-fade-in-up">
                        <h2 className="text-xl font-bold mb-6 text-gray-800">New Leave Application</h2>
                        <form onSubmit={handleSubmit} className="space-y-5">
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                                <div>
                                    <label className="block text-sm font-bold text-gray-700 mb-2">Hostel</label>
                                    <select 
                                        value={formData.hostelId}
                                        onChange={e => setFormData({...formData, hostelId: e.target.value})}
                                        required
                                        className="w-full p-3 border border-gray-200 rounded-xl bg-gray-50 focus:bg-white focus:border-blue-500 outline-none"
                                    >
                                        <option value="">Select Hostel</option>
                                        {hostels.map(h => (
                                            <option key={h.hostel_id} value={h.hostel_id}>{h.name}</option>
                                        ))}
                                    </select>
                                </div>
                                <div>
                                    <label className="block text-sm font-bold text-gray-700 mb-2">Leave Type</label>
                                    <select 
                                        value={formData.leaveType}
                                        onChange={e => setFormData({...formData, leaveType: e.target.value})}
                                        required
                                        className="w-full p-3 border border-gray-200 rounded-xl bg-gray-50 focus:bg-white focus:border-blue-500 outline-none"
                                    >
                                        <option value="">Select Type</option>
                                        {leaveTypes.map(t => <option key={t} value={t}>{t}</option>)}
                                    </select>
                                </div>
                                <div>
                                    <label className="block text-sm font-bold text-gray-700 mb-2">Start Date</label>
                                    <input
                                        type="date"
                                        value={formData.startDate}
                                        onChange={e => setFormData({...formData, startDate: e.target.value})}
                                        required
                                        className="w-full p-3 border border-gray-200 rounded-xl bg-gray-50 focus:bg-white focus:border-blue-500 outline-none"
                                    />
                                </div>
                                <div>
                                    <label className="block text-sm font-bold text-gray-700 mb-2">End Date</label>
                                    <input
                                        type="date"
                                        value={formData.endDate}
                                        onChange={e => setFormData({...formData, endDate: e.target.value})}
                                        required
                                        className="w-full p-3 border border-gray-200 rounded-xl bg-gray-50 focus:bg-white focus:border-blue-500 outline-none"
                                    />
                                </div>
                            </div>
                            <div>
                                <label className="block text-sm font-bold text-gray-700 mb-2">Reason</label>
                                <textarea
                                    rows="3"
                                    value={formData.reason}
                                    onChange={e => setFormData({...formData, reason: e.target.value})}
                                    placeholder="Brief reason for your leave..."
                                    className="w-full p-3 border border-gray-200 rounded-xl bg-gray-50 focus:bg-white focus:border-blue-500 outline-none resize-none"
                                />
                            </div>
                            <div className="flex justify-end gap-3">
                                <button type="button" onClick={() => setShowForm(false)} className="px-5 py-2.5 text-gray-600 font-bold hover:bg-gray-100 rounded-xl">Cancel</button>
                                <button type="submit" className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-2.5 rounded-xl font-bold shadow-lg">Submit Application</button>
                            </div>
                        </form>
                    </div>
                )}

                {/* Leave History */}
                <div className="space-y-4">
                    {loading ? (
                        <div className="text-center py-16 text-gray-400">Loading...</div>
                    ) : leaves.length === 0 ? (
                        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-16 text-center">
                            <Calendar size={48} className="mx-auto text-gray-300 mb-4" />
                            <h3 className="text-lg font-bold text-gray-600">No leave requests yet</h3>
                            <p className="text-gray-400 mt-1">Your leave history will appear here.</p>
                        </div>
                    ) : (
                        leaves.map(leave => (
                            <div key={leave.leave_id} className="bg-white rounded-xl shadow-sm border border-gray-100 p-6 hover:shadow-md transition-shadow">
                                <div className="flex justify-between items-start">
                                    <div>
                                        <div className="flex items-center gap-3 mb-2">
                                            <h3 className="font-bold text-gray-800">{leave.leave_type}</h3>
                                            {getStatusBadge(leave.status)}
                                        </div>
                                        <p className="text-sm text-gray-500">
                                            {new Date(leave.start_date).toLocaleDateString('en-IN')} — {new Date(leave.end_date).toLocaleDateString('en-IN')}
                                        </p>
                                        {leave.reason && <p className="text-sm text-gray-600 mt-2">{leave.reason}</p>}
                                        {leave.review_note && (
                                            <p className="text-sm mt-2 italic text-gray-500">
                                                Note: {leave.review_note} {leave.reviewed_by_name && `— ${leave.reviewed_by_name}`}
                                            </p>
                                        )}
                                    </div>
                                    <span className="text-xs text-gray-400">
                                        {new Date(leave.created_at).toLocaleDateString('en-IN')}
                                    </span>
                                </div>
                            </div>
                        ))
                    )}
                </div>
            </div>
        </div>
    );
};

export default LeavesPage;
