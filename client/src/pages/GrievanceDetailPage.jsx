import React, { useState, useEffect, useContext, useCallback, useRef } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import axios from 'axios';
import { toast } from 'react-toastify';
import { AuthContext } from '../context/AuthContext';
import { 
    Clock, 
    Paperclip, 
    User, 
    Users,
    CheckCircle, 
    XCircle, 
    AlertTriangle, 
    Send, 
    ChevronLeft, 
    FileText, 
    Shield, 
    AlertCircle 
} from 'lucide-react';

import RejectGrievanceModal from '../components/grievances/RejectGrievanceModal';
import RequestInfoModal from '../components/grievances/RequestInfoModal';
import ConfirmationModal from '../components/common/ConfirmationModal';
import ResolveGrievanceModal from '../components/grievances/ResolveGrievanceModal';
import ResolutionFeedback from '../components/grievances/ResolutionFeedback';

const GrievanceDetailPage = () => {
    const { ticketId } = useParams();
    const { user } = useContext(AuthContext);
    const navigate = useNavigate();

    // Data State
    const [grievance, setGrievance] = useState(null);
    const [isFollowing, setIsFollowing] = useState(false);
    const [followers, setFollowers] = useState([]); 
    const [updates, setUpdates] = useState([]);
    const [attachments, setAttachments] = useState([]);
    const [loading, setLoading] = useState(true);

    // Form State
    const [comment, setComment] = useState('');
    const [commentFiles, setCommentFiles] = useState(null);
    const [isSubmittingComment, setIsSubmittingComment] = useState(false);
    const [isUpdating, setIsUpdating] = useState(false);
    const fileInputRef = useRef(null);

    // Modal States
    const [isRejectModalOpen, setRejectModalOpen] = useState(false);
    const [isRequestInfoModalOpen, setRequestInfoModalOpen] = useState(false);
    const [isResolveModalOpen, setResolveModalOpen] = useState(false);
    const [confirmation, setConfirmation] = useState(null);

    // --- HELPER: Fix Broken Attachment Links ---
    const getFileUrl = (path) => {
        if (!path) return '#';
        // If it's already a full URL (Cloudinary), return it
        if (path.startsWith('http') || path.startsWith('https')) {
            return path;
        }
        // If it's a local path, prepend the backend server URL
        // Adjust 'http://localhost:5000/' if your backend runs on a different port
        return `http://localhost:5000/${path.replace(/^\//, '')}`;
    };

    // 1. Fetch Data
    const fetchGrievanceDetails = useCallback(async () => {
        try {
            setLoading(true);
            const res = await axios.get(`/api/grievances/${ticketId}`);
            setGrievance(res.data.grievance); // Main grievance details
            setIsFollowing(res.data.isFollowing); // Whether the current user is following this ticket
            setUpdates(res.data.updates); // Status updates and comments
            setAttachments(res.data.attachments); // Attachments
            setFollowers(res.data.followers || []); // List of followers
        } catch (err) {
            console.error("API Error:", err);
            toast.error(err.response?.data?.msg || 'Failed to fetch details.');
        } finally {
            setLoading(false);
        }
    }, [ticketId]);

    useEffect(() => {
        if (user) fetchGrievanceDetails();
    }, [user, fetchGrievanceDetails]);

    // 2. Handle Permissions
    const isSuperAdmin = user?.roles.some(r => r.role_name === 'super_admin');
    const isAssignedOfficer = isSuperAdmin || (user?.roles.some(r =>
        r.role_name === 'nodal_officer' && r.hostel_id === grievance?.hostel_id
    ));
    const isClosed = ['Resolved', 'Rejected', 'Closed'].includes(grievance?.status);

    // 3. Status Update Handler
    const handleStatusUpdate = async (status, reason = '') => {
        if (isUpdating) return;
        setIsUpdating(true);

        try {
            const token = localStorage.getItem('token');
            await axios.put(
                `/api/grievances/${ticketId}/status`,
                { status, reason },
                { headers: { 'x-auth-token': token } }
            );

            toast.success(`Status updated to ${status}`);
            setResolveModalOpen(false);
            setRejectModalOpen(false);
            setRequestInfoModalOpen(false);
            setConfirmation(null);

            fetchGrievanceDetails();
        } catch (err) {
            toast.error(err.response?.data?.msg || 'Error updating status');
        } finally {
            setIsUpdating(false);
        }
    };

    // 4. Comment Submission
    const handleCommentSubmit = async (e) => {
        e.preventDefault();
        if (isSubmittingComment) return;
        if (!comment.trim()) { toast.error("Please add a comment."); return; }
        if (commentFiles && commentFiles.length > 2) { toast.error("Max 2 files allowed."); return; }

        setIsSubmittingComment(true);
        const data = new FormData();
        data.append('comment', comment);
        if (commentFiles) {
            for (let i = 0; i < commentFiles.length; i++) {
                data.append('attachments', commentFiles[i]);
            }
        }

        try {
            await axios.post(`/api/grievances/${ticketId}/comments`, data, {
                headers: { 'Content-Type': 'multipart/form-data' }
            });
            toast.success('Reply posted!');
            setComment('');
            setCommentFiles(null);
            if (fileInputRef.current) fileInputRef.current.value = "";
            fetchGrievanceDetails();
        } catch (err) {
            toast.error('Failed to post reply.');
        } finally {
            setIsSubmittingComment(false);
        }
    };

    // 5. Extract Notes
    const getStatusNote = (type) => {
        if (!grievance || !updates) return null;
        const update = updates.find(u => u.comment.includes(`Status changed to ${type}`));
        if (update) {
            return update.comment.replace(`Status changed to ${type}. Reason: `, '').replace(`Status changed to ${type}. Note: `, '');
        }
        return null;
    };

    const resolutionNote = grievance?.status === 'Resolved' ? getStatusNote('Resolved') : null;
    const rejectionNote = grievance?.status === 'Rejected' ? getStatusNote('Rejected') : null;

    // 6. Navigation Logic
    const handleBackNavigation = () => {
        if (isSuperAdmin) navigate('/warden/dashboard');
        else if (isAssignedOfficer) navigate('/staff/dashboard');
        else navigate('/my-grievances');
    };

    // 7. Follow Logic for Community Issues
    const handleFollow = async () => {
        try {
            await axios.put(`/api/grievances/${ticketId}/upvote`);
            toast.success("You are now following this ticket!");
            setIsFollowing(true);
            fetchGrievanceDetails(); // Refresh to update "Students Affected" count
        } catch (err) {
            toast.error(err.response?.data?.msg || "Failed to follow.");
        }
    };

    if (loading) return (
        <div className="flex h-screen items-center justify-center bg-gray-50">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
        </div>
    );

    if (!grievance) return <div className="p-10 text-center">Grievance not found.</div>;

    return (
        <div className="min-h-screen bg-gray-50 pb-10">
            {/* Header */}
            <div className="bg-white shadow-sm border-b border-gray-200 sticky top-0 z-20">
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 flex justify-between items-center">
                    <button onClick={handleBackNavigation} className="flex items-center text-gray-500 hover:text-blue-600 font-medium transition-colors">
                        <ChevronLeft size={20} /> Back
                    </button>
                    <div className="text-sm text-gray-400 font-mono">#{grievance.ticket_id}</div>
                </div>
            </div>

            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 mt-8 grid grid-cols-1 lg:grid-cols-3 gap-8">
                
                {/* --- LEFT COLUMN --- */}
                <div className="lg:col-span-2 space-y-6">
                    <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
                        <div className="p-6 md:p-8">
                            <div className="flex justify-between items-start gap-4">
                                <h1 className="text-2xl font-bold text-gray-900 leading-tight">{grievance.title}</h1>
                                
                                <div className="flex flex-col items-end gap-2 shrink-0">
                                    <span className={`px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wide border ${
                                        grievance.status === 'Resolved' ? 'bg-green-100 text-green-700 border-green-200' :
                                        grievance.status === 'Rejected' ? 'bg-red-100 text-red-700 border-red-200' :
                                        'bg-blue-100 text-blue-700 border-blue-200'
                                    }`}>
                                        {grievance.status}
                                    </span>
                                    
                                    {/* NEW UPVOTE BADGE (Professional UI & Fixed Math) */}
                                    {grievance.upvotes > 0 && (
                                        <span className="flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-bold bg-indigo-50 text-indigo-700 border border-indigo-200 shadow-sm animate-fade-in">
                                            <Users size={14} className="text-indigo-600" /> 
                                            {followers.length + 1} Students affected
                                        </span>
                                    )}
                                </div>
                            </div>

                            {/* Status Alerts */}
                            {resolutionNote && (
                                <div className="mt-6 bg-green-50 border-l-4 border-green-500 p-4 rounded-r-md flex items-start gap-3">
                                    <CheckCircle className="text-green-600 shrink-0" size={20} />
                                    <div>
                                        <h4 className="text-sm font-bold text-green-800">Resolution Note</h4>
                                        <p className="text-sm text-green-700 mt-1">{resolutionNote}</p>
                                    </div>
                                </div>
                            )}
                            {rejectionNote && (
                                <div className="mt-6 bg-red-50 border-l-4 border-red-500 p-4 rounded-r-md flex items-start gap-3">
                                    <XCircle className="text-red-600 shrink-0" size={20} />
                                    <div>
                                        <h4 className="text-sm font-bold text-red-800">Rejection Reason</h4>
                                        <p className="text-sm text-red-700 mt-1">{rejectionNote}</p>
                                    </div>
                                </div>
                            )}
                            {grievance.status === 'Awaiting Clarification' && (
                                <div className="mt-6 bg-yellow-50 border-l-4 border-yellow-400 p-4 rounded-r-md flex items-start gap-3">
                                    <AlertTriangle className="text-yellow-600 shrink-0" size={20} />
                                    <div>
                                        <h4 className="text-sm font-bold text-yellow-800">Action Required</h4>
                                        <p className="text-sm text-yellow-700 mt-1">Please provide the requested information below.</p>
                                    </div>
                                </div>
                            )}

                            <div className="mt-6">
                                <h3 className="text-sm font-semibold text-gray-500 uppercase tracking-wider mb-2">Description</h3>
                                <div className="bg-gray-50 p-4 rounded-lg border border-gray-100 text-gray-700 leading-relaxed whitespace-pre-wrap">
                                    {grievance.description}
                                </div>
                            </div>

                            {/* Attachment List (FIXED) */}
                            {attachments.length > 0 && (
                                <div className="mt-6">
                                    <h3 className="text-sm font-semibold text-gray-500 uppercase tracking-wider mb-3 flex items-center gap-2">
                                        <Paperclip size={14} /> Attachments
                                    </h3>
                                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                                        {attachments.map(att => (
                                            <a 
                                                key={att.attachment_id}
                                                href={getFileUrl(att.file_url)} // ✅ USES HELPER FUNCTION
                                                target="_blank" 
                                                rel="noopener noreferrer"
                                                className="flex items-center gap-3 p-3 border border-gray-200 rounded-lg hover:bg-blue-50 hover:border-blue-200 transition-all group"
                                            >
                                                <div className="p-2 bg-gray-100 rounded text-gray-500 group-hover:bg-blue-100 group-hover:text-blue-600">
                                                    <FileText size={20} />
                                                </div>
                                                <div className="truncate">
                                                    <p className="text-sm font-medium text-gray-700 group-hover:text-blue-700 truncate">{att.file_name}</p>
                                                    <p className="text-xs text-gray-400">Click to view</p>
                                                </div>
                                            </a>
                                        ))}
                                    </div>
                                </div>
                            )}
                        </div>
                    </div>

                    {/* Comment Section */}
                    {!isClosed ? (
                        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
                            <h3 className="text-lg font-bold text-gray-800 mb-4">Add a Comment</h3>
                            <form onSubmit={handleCommentSubmit}>
                                <textarea
                                    value={comment}
                                    onChange={(e) => setComment(e.target.value)}
                                    rows="3"
                                    className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
                                    placeholder="Type your message here..."
                                ></textarea>
                                <div className="flex flex-col sm:flex-row items-center justify-between mt-3 gap-3">
                                    <input
                                        type="file"
                                        ref={fileInputRef}
                                        onChange={(e) => setCommentFiles(e.target.files)}
                                        multiple
                                        className="block w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100"
                                    />
                                    <button
                                        type="submit"
                                        disabled={isSubmittingComment}
                                        className={`w-full sm:w-auto flex items-center justify-center gap-2 px-6 py-2 rounded-lg font-bold text-white transition-all ${isSubmittingComment ? 'bg-gray-400 cursor-not-allowed' : 'bg-blue-600 hover:bg-blue-700 shadow-md'}`}
                                    >
                                        {isSubmittingComment ? 'Sending...' : <>Reply <Send size={16}/></>}
                                    </button>
                                </div>
                            </form>
                        </div>
                    ) : (
                        <div className="bg-gray-50 rounded-xl border border-gray-200 p-6 text-center text-gray-500 flex flex-col items-center">
                            <Shield size={32} className="text-gray-300 mb-2" />
                            <p>This ticket is closed. No further comments are allowed.</p>
                        </div>
                    )}

                    {/* Timeline */}
                    <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 md:p-8">
                        <h3 className="text-lg font-bold text-gray-800 mb-6 flex items-center gap-2">
                            <Clock size={20} /> Activity History
                        </h3>
                        <div className="relative border-l-2 border-gray-200 ml-3 space-y-8">
                            {updates.map((update, index) => {
                                const isSystem = update.role === 'system';
                                return (
                                    <div key={index} className="relative pl-8">
                                        <div className={`absolute -left-[9px] top-0 w-4 h-4 rounded-full border-2 border-white ${isSystem ? 'bg-gray-300' : 'bg-blue-500'}`}></div>
                                        <div className="flex flex-col sm:flex-row sm:justify-between sm:items-start">
                                            <div>
                                                <span className={`text-sm font-bold ${isSystem ? 'text-gray-600' : 'text-gray-900'}`}>
                                                    {update.author_name}
                                                </span>
                                                <span className="text-xs text-gray-500 ml-2 bg-gray-100 px-2 py-0.5 rounded-full capitalize">
                                                    {update.role.replace('_', ' ')}
                                                </span>
                                            </div>
                                            <span className="text-xs text-gray-400 mt-1 sm:mt-0">
                                                {new Date(update.created_at).toLocaleString()}
                                            </span>
                                        </div>
                                        <div className={`mt-2 text-sm p-3 rounded-lg ${isSystem ? 'bg-gray-50 text-gray-600 italic' : 'bg-blue-50 text-gray-800'}`}>
                                            {update.comment}
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    </div>
                </div>

                {/* --- RIGHT COLUMN --- */}
                <div className="space-y-6">
                    {/* NEW: Follow Button for Community Issues */}
                    {!isFollowing && !isSuperAdmin && !isAssignedOfficer && String(grievance.submitted_by_id) !== String(user?.id || user?.user_id) && !isClosed && (
                        <div className="bg-indigo-600 rounded-xl shadow-lg p-6 text-white mb-6 animate-fade-in">
                            <h3 className="font-bold mb-2 flex items-center gap-2">
                                <Users size={20} /> Are you affected too?
                            </h3>
                            <p className="text-sm text-indigo-100 mb-4">
                                Follow this issue to get notified of updates and help us prioritize it.
                            </p>
                            <button 
                                onClick={handleFollow}
                                className="w-full bg-white text-indigo-600 font-bold py-2.5 rounded-lg hover:bg-indigo-50 transition-colors shadow-md"
                            >
                                Follow this Issue
                            </button>
                        </div>
                    )}
                    <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
                        <h3 className="text-sm font-bold text-gray-400 uppercase tracking-wider mb-4">Ticket Details</h3>
                        <div className="space-y-4">
                            <div><label className="text-xs text-gray-500">Category</label><p className="font-medium text-gray-800">{grievance.category}</p></div>
                            <div><label className="text-xs text-gray-500">Submitted By</label><div className="flex items-center gap-2 mt-1"><div className="bg-indigo-100 p-1 rounded-full"><User size={14} className="text-indigo-600"/></div><span className="text-sm font-medium">{grievance.submitted_by_name || 'Student'}</span></div></div>
                            <div><label className="text-xs text-gray-500">Submitted On</label><p className="text-sm font-medium">{new Date(grievance.created_at).toLocaleDateString()}</p></div>
                        </div>
                    </div>

                    {/* Affected Students List (Admins & Officers Only) */}
                    {(isAssignedOfficer || isSuperAdmin) && grievance.upvotes > 0 && (
                        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
                            <h3 className="text-sm font-bold text-gray-400 uppercase tracking-wider mb-4 flex items-center gap-2">
                                <Users size={16} /> Affected Students ({followers.length + 1})
                            </h3>
                            <div className="space-y-2 max-h-64 overflow-y-auto pr-2">
                                {/* The Original Author */}
                                <div className="text-sm p-2.5 bg-indigo-50 border border-indigo-100 rounded-lg flex justify-between items-center">
                                    <span className="font-bold text-indigo-700">{grievance.submitted_by_name || 'Student'} <span className="text-[10px] bg-indigo-200 text-indigo-800 px-1.5 py-0.5 rounded ml-1 uppercase">Author</span></span>
                                    <span className="text-indigo-400 text-xs">{new Date(grievance.created_at).toLocaleDateString()}</span>
                                </div>
                                
                                {/* The Followers */}
                                {followers.map((f, i) => (
                                    <div key={i} className="text-sm p-2.5 bg-gray-50 border border-gray-100 rounded-lg flex justify-between items-center">
                                        <span className="font-medium text-gray-700">{f.full_name}</span>
                                        <span className="text-gray-400 text-xs">{new Date(f.followed_at).toLocaleDateString()}</span>
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}

                    {/* Officer Actions Panel */}
                    {isAssignedOfficer && (
                        <div className="bg-white rounded-xl shadow-md border border-indigo-100 p-6 sticky top-24">
                            <h3 className="text-lg font-bold text-gray-800 mb-4">Officer Actions</h3>
                            {!isClosed ? (
                                <div className="flex flex-col gap-3">
                                    <button onClick={() => setResolveModalOpen(true)} disabled={isUpdating} className="w-full flex items-center justify-center gap-2 bg-green-600 hover:bg-green-700 text-white font-bold py-2.5 px-4 rounded-lg transition-all"><CheckCircle size={18}/> Mark Resolved</button>
                                    <div className="grid grid-cols-2 gap-3">
                                        <button onClick={() => setRequestInfoModalOpen(true)} disabled={isUpdating} className="bg-white border-2 border-blue-100 text-blue-600 hover:bg-blue-50 font-bold py-2 px-2 rounded-lg text-sm transition-all">Request Info</button>
                                        <button onClick={() => setRejectModalOpen(true)} disabled={isUpdating} className="bg-white border-2 border-red-100 text-red-600 hover:bg-red-50 font-bold py-2 px-2 rounded-lg text-sm transition-all">Reject</button>
                                    </div>
                                    <button onClick={() => setConfirmation({ status: 'Escalated', title: 'Escalate Grievance', message: 'This will notify the super admin. Are you sure you want to escalate?', confirmText: 'Yes, Escalate', confirmClass: 'bg-orange-500 hover:bg-orange-600' })} disabled={isUpdating} className="w-full mt-2 text-orange-600 hover:text-orange-700 text-sm font-bold underline decoration-orange-300">Escalate to Admin</button>
                                </div>
                            ) : (
                                <div>
                                    <div className="bg-gray-100 p-3 rounded-lg text-center mb-4 text-sm text-gray-600">Ticket is closed.</div>
                                    <button onClick={() => setConfirmation({ status: 'Submitted', title: 'Re-open Grievance', message: 'This will move the grievance back to the active queue. Are you sure?', confirmText: 'Re-open', confirmClass: 'bg-indigo-600 hover:bg-indigo-700' })} disabled={isUpdating} className="w-full bg-indigo-600 hover:bg-indigo-700 text-white font-bold py-2.5 px-4 rounded-lg">Re-open Ticket</button>
                                </div>
                            )}
                        </div>
                    )}

                    {grievance.status === 'Resolved' && !isAssignedOfficer && (
                        <div className="bg-white rounded-xl shadow-lg border border-green-200 p-6 sticky top-24">
                            <ResolutionFeedback 
                                onAccept={() => setConfirmation({ status: 'Closed', title: 'Confirm Resolution', message: 'Are you sure you are satisfied? This will permanently close the ticket.', confirmText: 'Yes, Close Ticket', confirmClass: 'bg-emerald-600 hover:bg-emerald-700' })} 
                                onAppeal={(reason) => {
                                    const submitAppeal = async () => {
                                        try {
                                            await axios.post(`/api/grievances/${ticketId}/appeal`, { reason }, { headers: { 'x-auth-token': localStorage.getItem('token') } });
                                            toast.success("Appeal submitted!");
                                            fetchGrievanceDetails();
                                        } catch (err) { toast.error("Failed to appeal"); }
                                    };
                                    submitAppeal();
                                }} 
                            />
                        </div>
                    )}
                </div>
            </div>

            {/* Modals */}
            {confirmation && <ConfirmationModal {...confirmation} onCancel={() => setConfirmation(null)} onConfirm={() => handleStatusUpdate(confirmation.status)} />}
            {isRejectModalOpen && <RejectGrievanceModal onClose={() => setRejectModalOpen(false)} onSubmit={(reason) => handleStatusUpdate('Rejected', reason)} />}
            {isRequestInfoModalOpen && <RequestInfoModal onClose={() => setRequestInfoModalOpen(false)} onSubmit={(comment) => handleStatusUpdate('Awaiting Clarification', comment)} />}
            {isResolveModalOpen && <ResolveGrievanceModal onClose={() => setResolveModalOpen(false)} onSubmit={(note) => handleStatusUpdate('Resolved', note)} />}
        </div>
    );
};

export default GrievanceDetailPage;