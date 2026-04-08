import React, { useState, useEffect, useContext } from 'react';
import axios from 'axios';
import { toast } from 'react-toastify';
import { AuthContext } from '../context/AuthContext';
import { CheckCircle, XCircle, Clock, CheckCheck, Search, AlertCircle, FileText } from 'lucide-react';

const StaffLeavesPage = () => {
    const { user } = useContext(AuthContext);
    const [hostels, setHostels] = useState([]);
    const [selectedHostelId, setSelectedHostelId] = useState('');
    const [leaves, setLeaves] = useState([]);
    const [loading, setLoading] = useState(true);
    const [filterStatus, setFilterStatus] = useState('All');
    
    // Modal state for manual review notes
    const [reviewModal, setReviewModal] = useState({ isOpen: false, leaveId: null, action: null });
    const [reviewNote, setReviewNote] = useState('');

    const isChiefWarden = user?.roles?.some(r => r.role_name === 'super_admin');

    useEffect(() => {
        fetchHostels();
    }, []);

    useEffect(() => {
        if (selectedHostelId) {
            fetchLeaves(selectedHostelId);
        } else {
            setLeaves([]);
            setLoading(false);
        }
    }, [selectedHostelId]);

    const fetchHostels = async () => {
        try {
            const res = await axios.get('/api/hostels');
            let availableHostels = res.data;
            
            // Filter hostels if not Chief Warden
            if (!isChiefWarden) {
                const assignedHostelIds = user.roles.filter(r => r.hostel_id).map(r => r.hostel_id);
                availableHostels = availableHostels.filter(h => assignedHostelIds.includes(h.hostel_id));
            }
            
            setHostels(availableHostels);
            if (availableHostels.length > 0) {
                setSelectedHostelId(availableHostels[0].hostel_id);
            } else {
                setLoading(false);
            }
        } catch (err) {
            console.error("Failed to fetch hostels:", err);
            setLoading(false);
        }
    };

    const fetchLeaves = async (hostelId) => {
        setLoading(true);
        try {
            const res = await axios.get(`/api/leaves/hostel/${hostelId}`);
            setLeaves(res.data);
        } catch (err) {
            console.error("Failed to fetch leaves:", err);
            toast.error("Failed to load leaves.");
        } finally {
            setLoading(false);
        }
    };

    const handleBulkApprove = async () => {
        const pendingCount = leaves.filter(l => l.status === 'Pending').length;
        if (pendingCount === 0) {
            toast.info("No pending leaves to approve.");
            return;
        }

        if (window.confirm(`Are you sure you want to BULK APPROVE ${pendingCount} pending leave applications for this hostel?`)) {
            try {
                const res = await axios.put(`/api/leaves/hostel/${selectedHostelId}/approve-all`);
                toast.success(res.data.msg);
                fetchLeaves(selectedHostelId);
            } catch (err) {
                toast.error(err.response?.data?.msg || "Bulk approval failed.");
            }
        }
    };

    const handleActionClick = (leaveId, action) => {
        setReviewModal({ isOpen: true, leaveId, action });
        setReviewNote(action === 'Approved' ? 'Approved automatically' : '');
    };

    const confirmAction = async () => {
        try {
            const res = await axios.put(`/api/leaves/${reviewModal.leaveId}/status`, {
                status: reviewModal.action,
                reviewNote
            });
            toast.success(res.data.msg);
            setReviewModal({ isOpen: false, leaveId: null, action: null });
            setReviewNote('');
            fetchLeaves(selectedHostelId);
        } catch (err) {
            toast.error(err.response?.data?.msg || `Failed to ${reviewModal.action.toLowerCase()} leave.`);
        }
    };

    const StatusBadge = ({ status }) => {
        const styles = {
            'Pending': 'bg-yellow-100 text-yellow-800',
            'Approved': 'bg-green-100 text-green-800',
            'Rejected': 'bg-red-100 text-red-800',
        };
        return (
            <span className={`px-3 py-1 rounded-full text-xs font-bold ${styles[status]}`}>
                {status}
            </span>
        );
    };

    // Derived Data
    const filteredLeaves = leaves.filter(l => filterStatus === 'All' || l.status === filterStatus);
    const pendingCount = leaves.filter(l => l.status === 'Pending').length;

    if (loading && hostels.length === 0) return <div className="min-h-screen bg-slate-50 flex justify-center items-center font-bold text-gray-500">Loading Dashboard...</div>;

    return (
        <div className="min-h-screen bg-slate-50 py-10 px-4 sm:px-6 lg:px-8">
            <div className="max-w-7xl mx-auto">
                {/* Header & Controls */}
                <div className="flex justify-between items-end mb-8 border-b pb-6">
                    <div>
                        <h1 className="text-3xl font-extrabold text-gray-900">Leave Applications Dashboard</h1>
                        <p className="text-gray-500 mt-2 tracking-tight">Review and manage gate-pass requests for your designated hostels.</p>
                    </div>
                    {pendingCount > 0 && (
                        <button 
                            onClick={handleBulkApprove}
                            className="bg-green-600 hover:bg-green-700 text-white font-bold py-2.5 px-5 rounded-xl flex items-center gap-2 shadow-md transition-transform hover:-translate-y-1"
                        >
                            <CheckCheck size={18} /> Approve All Pending ({pendingCount})
                        </button>
                    )}
                </div>

                {/* Filters */}
                <div className="flex flex-col md:flex-row gap-4 justify-between items-center bg-white p-4 rounded-xl shadow-sm border border-gray-100 mb-6">
                    <div className="flex items-center gap-3 w-full md:w-auto">
                        <label className="font-bold text-gray-700 text-sm whitespace-nowrap">Select Hostel:</label>
                        <select 
                            value={selectedHostelId} 
                            onChange={(e) => setSelectedHostelId(e.target.value)}
                            className="p-2 border border-gray-200 rounded-lg bg-gray-50 text-sm w-full md:w-64 outline-none focus:ring-2 focus:ring-blue-500"
                            disabled={hostels.length <= 1}
                        >
                            {hostels.map(h => <option key={h.hostel_id} value={h.hostel_id}>{h.name}</option>)}
                        </select>
                    </div>
                    
                    <div className="flex items-center gap-2 w-full md:w-auto">
                        {['All', 'Pending', 'Approved', 'Rejected'].map(status => (
                            <button
                                key={status}
                                onClick={() => setFilterStatus(status)}
                                className={`px-4 py-2 rounded-lg text-sm font-semibold transition-colors ${filterStatus === status ? 'bg-blue-600 text-white shadow-sm' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'}`}
                            >
                                {status}
                            </button>
                        ))}
                    </div>
                </div>

                {/* List View */}
                {loading ? (
                    <div className="text-center py-20 text-gray-500">Refreshing data...</div>
                ) : filteredLeaves.length === 0 ? (
                    <div className="bg-white rounded-2xl p-20 text-center border border-gray-100 shadow-sm">
                        <FileText size={48} className="mx-auto text-gray-300 mb-4" />
                        <h3 className="text-xl font-bold text-gray-700">No Applications Found</h3>
                        <p className="text-gray-400 mt-2">There are no {filterStatus !== 'All' ? filterStatus.toLowerCase() : ''} leave applications for {hostels.find(h=>h.hostel_id == selectedHostelId)?.name || 'this hostel'}.</p>
                    </div>
                ) : (
                    <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
                        <div className="overflow-x-auto">
                            <table className="w-full text-left border-collapse">
                                <thead className="bg-gray-50 text-gray-500 uppercase text-xs font-extrabold tracking-wider">
                                    <tr>
                                        <th className="p-4 pl-6">Student</th>
                                        <th className="p-4">Type</th>
                                        <th className="p-4">Duration</th>
                                        <th className="p-4">Reason</th>
                                        <th className="p-4">Status</th>
                                        <th className="p-4 text-right pr-6">Action</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-gray-100">
                                    {filteredLeaves.map(leave => (
                                        <tr key={leave.leave_id} className="hover:bg-blue-50/30 transition-colors group">
                                            <td className="p-4 pl-6">
                                                <p className="font-bold text-gray-900">{leave.applicant_name}</p>
                                                <p className="text-xs text-gray-500 font-mono mt-0.5">{leave.roll_number}</p>
                                            </td>
                                            <td className="p-4">
                                                <span className="text-sm font-semibold text-gray-700">{leave.leave_type}</span>
                                            </td>
                                            <td className="p-4">
                                                <p className="text-sm text-gray-800">{new Date(leave.start_date).toLocaleDateString()} to {new Date(leave.end_date).toLocaleDateString()}</p>
                                            </td>
                                            <td className="p-4 max-w-xs">
                                                <p className="text-sm text-gray-600 truncate" title={leave.reason}>{leave.reason || '-'}</p>
                                            </td>
                                            <td className="p-4">
                                                <StatusBadge status={leave.status} />
                                            </td>
                                            <td className="p-4 text-right pr-6">
                                                {leave.status === 'Pending' ? (
                                                    <div className="flex justify-end gap-2">
                                                        <button 
                                                            onClick={() => handleActionClick(leave.leave_id, 'Approved')}
                                                            className="text-green-600 hover:bg-green-50 p-2 rounded-lg transition-colors tooltip-trigger"
                                                            title="Approve"
                                                        >
                                                            <CheckCircle size={20} />
                                                        </button>
                                                        <button 
                                                            onClick={() => handleActionClick(leave.leave_id, 'Rejected')}
                                                            className="text-red-500 hover:bg-red-50 p-2 rounded-lg transition-colors"
                                                            title="Reject"
                                                        >
                                                            <XCircle size={20} />
                                                        </button>
                                                    </div>
                                                ) : (
                                                    <span className="text-xs font-semibold text-gray-400">
                                                        Reviewed by {leave.reviewed_by_name?.split(' ')[0] || 'Admin'}
                                                    </span>
                                                )}
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    </div>
                )}
            </div>

            {/* Assessment Modal */}
            {reviewModal.isOpen && (
                <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 z-50 animate-fade-in">
                    <div className="bg-white rounded-2xl w-full max-w-md shadow-2xl overflow-hidden animate-slide-up">
                        <div className={`p-6 text-white ${reviewModal.action === 'Approved' ? 'bg-green-600' : 'bg-red-500'}`}>
                            <h3 className="text-xl font-bold flex items-center gap-2">
                                {reviewModal.action === 'Approved' ? <CheckCircle /> : <XCircle />} 
                                {reviewModal.action === 'Approved' ? 'Approve Leave Application' : 'Reject Leave Application'}
                            </h3>
                        </div>
                        <div className="p-6">
                            <label className="block font-bold text-gray-700 mb-2">
                                Review Note <span className="text-gray-400 font-normal">(Optional)</span>
                            </label>
                            <textarea
                                value={reviewNote}
                                onChange={e => setReviewNote(e.target.value)}
                                className="w-full p-3 border border-gray-200 rounded-xl bg-gray-50 focus:bg-white focus:border-blue-500 outline-none resize-none"
                                rows="3"
                                placeholder={reviewModal.action === 'Approved' ? "e.g., Have a safe journey." : "e.g., Application incomplete."}
                            />
                            
                            <div className="flex gap-3 justify-end mt-8">
                                <button 
                                    onClick={() => setReviewModal({ isOpen: false, leaveId: null, action: null })}
                                    className="px-5 py-2.5 text-gray-600 font-bold hover:bg-gray-100 rounded-xl transition-colors"
                                >
                                    Cancel
                                </button>
                                <button 
                                    onClick={confirmAction}
                                    className={`px-6 py-2.5 text-white font-bold rounded-xl shadow-lg transition-transform hover:-translate-y-0.5 ${reviewModal.action === 'Approved' ? 'bg-green-600 hover:bg-green-700' : 'bg-red-500 hover:bg-red-600'}`}
                                >
                                    Confirm {reviewModal.action}
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default StaffLeavesPage;
