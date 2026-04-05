import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { Link } from 'react-router-dom';
import { Users, ArrowRight, MessageSquare, Flame } from 'lucide-react';

const CommunityIssues = () => {
    const [issues, setIssues] = useState([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const fetchTrending = async () => {
            try {
                const res = await axios.get('/api/grievances/public/trending');
                setIssues(res.data);
            } catch (err) {
                console.error("Error fetching trending issues");
            } finally {
                setLoading(false);
            }
        };
        fetchTrending();
    }, []);

    if (loading) return <div className="p-10 text-center">Loading campus feed...</div>;

    return (
        <div className="max-w-5xl mx-auto mt-10 px-4">
            <div className="flex items-center gap-3 mb-8">
                <div className="bg-orange-100 p-3 rounded-2xl">
                    <Flame className="text-orange-600" size={28} />
                </div>
                <div>
                    <h1 className="text-3xl font-bold text-gray-900">Campus Community Issues</h1>
                    <p className="text-gray-500">Trending grievances affecting multiple students at DTU.</p>
                </div>
            </div>

            <div className="grid gap-6">
                {issues.length > 0 ? issues.map(issue => (
                    <div key={issue.ticket_id} className="bg-white border border-gray-200 rounded-2xl p-6 shadow-sm hover:shadow-md transition-all group">
                        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                            <div className="space-y-2">
                                <div className="flex items-center gap-2">
                                    <span className="text-xs font-bold text-indigo-600 bg-indigo-50 px-2 py-1 rounded uppercase tracking-wider">
                                        {issue.category}
                                    </span>
                                    <span className="text-xs text-gray-400">#{issue.ticket_id}</span>
                                </div>
                                <h3 className="text-xl font-bold text-gray-800 group-hover:text-indigo-600 transition-colors">
                                    {issue.title}
                                </h3>
                                <div className="flex items-center gap-4 text-sm text-gray-500">
                                    <span className="flex items-center gap-1">
                                        <Users size={16} className="text-gray-400" /> 
                                        {issue.upvotes + 1} Affected
                                    </span>
                                    <span>Submitted {new Date(issue.created_at).toLocaleDateString()}</span>
                                </div>
                            </div>

                            <div className="flex items-center gap-3">
                                <Link 
                                    to={`/grievance/${issue.ticket_id}`} 
                                    className="flex items-center gap-2 bg-indigo-600 text-white px-5 py-2.5 rounded-xl font-bold hover:bg-indigo-700 transition-all shadow-lg shadow-indigo-100"
                                >
                                    View & Follow <ArrowRight size={18} />
                                </Link>
                            </div>
                        </div>
                    </div>
                )) : (
                    <div className="text-center py-20 bg-gray-50 rounded-3xl border-2 border-dashed border-gray-200">
                        <MessageSquare size={48} className="mx-auto text-gray-300 mb-4" />
                        <p className="text-gray-500 font-medium">No major community issues reported yet.</p>
                    </div>
                )}
            </div>
        </div>
    );
};

export default CommunityIssues;