import React, { useState, useEffect, useContext } from 'react';
import axios from 'axios';
import { toast } from 'react-toastify';
import { AuthContext } from '../context/AuthContext';
import { Megaphone, Pin, Trash2, Plus, Globe, Building } from 'lucide-react';

const AnnouncementsPage = () => {
    const { user } = useContext(AuthContext);
    const [announcements, setAnnouncements] = useState([]);
    const [hostels, setHostels] = useState([]);
    const [loading, setLoading] = useState(true);
    const [showForm, setShowForm] = useState(false);
    const [formData, setFormData] = useState({
        hostelId: '', title: '', body: '', priority: 'Normal', isPinned: false
    });

    const isStaff = user?.roles?.some(r => r.role_name === 'nodal_officer' || r.role_name === 'super_admin');
    const isSuperAdmin = user?.roles?.some(r => r.role_name === 'super_admin');

    // ONLY allow wardens to post in their assigned hostels
    const allowedHostelIds = isSuperAdmin 
        ? null 
        : user?.roles?.filter(r => r.role_name === 'nodal_officer').map(r => r.hostel_id) || [];

    const selectableHostels = isSuperAdmin 
        ? hostels 
        : hostels.filter(h => allowedHostelIds.includes(h.hostel_id));

    useEffect(() => {
        fetchAnnouncements();
        if (isStaff) fetchHostels();
    }, []);

    const fetchAnnouncements = async () => {
        try {
            const res = await axios.get('/api/announcements/my');
            setAnnouncements(res.data);
        } catch (err) {
            console.error("Failed to fetch announcements:", err);
        } finally {
            setLoading(false);
        }
    };

    const fetchHostels = async () => {
        try {
            const res = await axios.get('/api/hostels');
            setHostels(res.data);
            
            // Auto-select the first allowed hostel for non-super-admins
            if (!isSuperAdmin && res.data) {
                const wardenHostels = res.data.filter(h => allowedHostelIds.includes(h.hostel_id));
                if (wardenHostels.length > 0) {
                    setFormData(prev => ({ ...prev, hostelId: wardenHostels[0].hostel_id }));
                }
            }
        } catch (err) {}
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        try {
            const res = await axios.post('/api/announcements', formData);
            toast.success(res.data.msg);
            setShowForm(false);
            
            // Reset to default
            const defaultHostelId = (!isSuperAdmin && selectableHostels.length > 0) ? selectableHostels[0].hostel_id : '';
            setFormData({ hostelId: defaultHostelId, title: '', body: '', priority: 'Normal', isPinned: false });
            fetchAnnouncements();
        } catch (err) {
            toast.error(err.response?.data?.msg || 'Failed to post announcement.');
        }
    };

    const handleDelete = async (id) => {
        if (!window.confirm('Delete this announcement?')) return;
        try {
            await axios.delete(`/api/announcements/${id}`);
            toast.success('Announcement deleted.');
            setAnnouncements(prev => prev.filter(a => a.announcement_id !== id));
        } catch (err) {
            toast.error('Failed to delete.');
        }
    };

    return (
        <div className="min-h-screen bg-slate-50 py-10 px-4 sm:px-6 lg:px-8">
            <div className="max-w-4xl mx-auto">
                {/* Header */}
                <div className="flex justify-between items-center mb-8">
                    <div>
                        <h1 className="text-3xl font-bold text-gray-900">Announcements</h1>
                        <p className="text-gray-500 mt-1">Stay updated with hostel news and notices.</p>
                    </div>
                    {isStaff && (
                        <button
                            onClick={() => setShowForm(!showForm)}
                            className="bg-blue-600 hover:bg-blue-700 text-white px-5 py-2.5 rounded-xl font-bold flex items-center gap-2 shadow-lg transition-all hover:-translate-y-0.5"
                        >
                            <Plus size={18} /> Post Announcement
                        </button>
                    )}
                </div>

                {/* Post Form (Staff Only) */}
                {showForm && (
                    <div className="bg-white rounded-2xl shadow-xl border border-gray-100 p-8 mb-8 animate-fade-in-up">
                        <h2 className="text-xl font-bold mb-6 text-gray-800">New Announcement</h2>
                        <form onSubmit={handleSubmit} className="space-y-5">
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                                <div>
                                    <label className="block text-sm font-bold text-gray-700 mb-2">Target Hostel</label>
                                    <select
                                        value={formData.hostelId}
                                        onChange={e => setFormData({...formData, hostelId: e.target.value})}
                                        required={!isSuperAdmin}
                                        className="w-full p-3 border border-gray-200 rounded-xl bg-gray-50 focus:bg-white focus:border-blue-500 outline-none"
                                    >
                                        {isSuperAdmin && <option value="">All Hostels (Global)</option>}
                                        {!isSuperAdmin && <option value="" disabled>-- Select Your Hostel --</option>}
                                        {selectableHostels.map(h => (
                                            <option key={h.hostel_id} value={h.hostel_id}>{h.name}</option>
                                        ))}
                                    </select>
                                </div>
                                <div>
                                    <label className="block text-sm font-bold text-gray-700 mb-2">Priority</label>
                                    <select
                                        value={formData.priority}
                                        onChange={e => setFormData({...formData, priority: e.target.value})}
                                        className="w-full p-3 border border-gray-200 rounded-xl bg-gray-50 focus:bg-white focus:border-blue-500 outline-none"
                                    >
                                        <option value="Normal">Normal</option>
                                        <option value="Urgent">Urgent</option>
                                    </select>
                                </div>
                            </div>
                            <div>
                                <label className="block text-sm font-bold text-gray-700 mb-2">Title</label>
                                <input
                                    type="text"
                                    value={formData.title}
                                    onChange={e => setFormData({...formData, title: e.target.value})}
                                    required
                                    placeholder="Announcement title..."
                                    className="w-full p-3 border border-gray-200 rounded-xl bg-gray-50 focus:bg-white focus:border-blue-500 outline-none"
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-bold text-gray-700 mb-2">Content</label>
                                <textarea
                                    rows="4"
                                    value={formData.body}
                                    onChange={e => setFormData({...formData, body: e.target.value})}
                                    required
                                    placeholder="Write the announcement details..."
                                    className="w-full p-3 border border-gray-200 rounded-xl bg-gray-50 focus:bg-white focus:border-blue-500 outline-none resize-none"
                                />
                            </div>
                            <label className="flex items-center gap-2 cursor-pointer">
                                <input
                                    type="checkbox"
                                    checked={formData.isPinned}
                                    onChange={e => setFormData({...formData, isPinned: e.target.checked})}
                                    className="rounded"
                                />
                                <span className="text-sm font-medium text-gray-700">Pin this announcement</span>
                            </label>
                            <div className="flex justify-end gap-3">
                                <button type="button" onClick={() => setShowForm(false)} className="px-5 py-2.5 text-gray-600 font-bold hover:bg-gray-100 rounded-xl">Cancel</button>
                                <button type="submit" className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-2.5 rounded-xl font-bold shadow-lg">Publish</button>
                            </div>
                        </form>
                    </div>
                )}

                {/* Announcements Feed */}
                <div className="space-y-4">
                    {loading ? (
                        <div className="text-center py-16 text-gray-400">Loading...</div>
                    ) : announcements.length === 0 ? (
                        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-16 text-center">
                            <Megaphone size={48} className="mx-auto text-gray-300 mb-4" />
                            <h3 className="text-lg font-bold text-gray-600">No announcements yet</h3>
                            <p className="text-gray-400 mt-1">Check back later for updates from hostel staff.</p>
                        </div>
                    ) : (
                        announcements.map(a => (
                            <div 
                                key={a.announcement_id} 
                                className={`bg-white rounded-xl shadow-sm border p-6 hover:shadow-md transition-shadow ${
                                    a.priority === 'Urgent' ? 'border-red-200 bg-red-50/30' : 'border-gray-100'
                                } ${a.is_pinned ? 'ring-2 ring-blue-200' : ''}`}
                            >
                                <div className="flex justify-between items-start mb-3">
                                    <div className="flex items-center gap-2 flex-wrap">
                                        {a.is_pinned && (
                                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-bold bg-blue-100 text-blue-700 border border-blue-200">
                                                <Pin size={10} /> Pinned
                                            </span>
                                        )}
                                        {a.priority === 'Urgent' && (
                                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-bold bg-red-100 text-red-700 border border-red-200">
                                                Urgent
                                            </span>
                                        )}
                                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-600">
                                            {a.hostel_name ? <><Building size={10} /> {a.hostel_name}</> : <><Globe size={10} /> Global</>}
                                        </span>
                                    </div>
                                    {(a.posted_by === user?.user_id || isSuperAdmin) && (
                                        <button onClick={() => handleDelete(a.announcement_id)} className="text-gray-400 hover:text-red-500 p-1 rounded transition-colors">
                                            <Trash2 size={16} />
                                        </button>
                                    )}
                                </div>
                                <h3 className="text-lg font-bold text-gray-800 mb-2">{a.title}</h3>
                                <p className="text-gray-600 text-sm leading-relaxed whitespace-pre-wrap">{a.body}</p>
                                <div className="mt-4 flex items-center justify-between text-xs text-gray-400">
                                    <span>
                                        By {a.posted_by_name} {a.posted_by_designation && `(${a.posted_by_designation})`}
                                    </span>
                                    <span>{new Date(a.created_at).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' })}</span>
                                </div>
                            </div>
                        ))
                    )}
                </div>
            </div>
        </div>
    );
};

export default AnnouncementsPage;
