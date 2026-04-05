import React, { useState, useEffect, useMemo, useContext } from 'react';
import { Link } from 'react-router-dom';
import axios from 'axios';
import { toast } from 'react-toastify';
import { AuthContext } from '../context/AuthContext';
import { useSortableTable } from '../hooks/useSortableTable';
import { 
    Clock, 
    AlertTriangle, 
    AlertCircle, 
    TrendingUp, 
    Archive, 
    Loader2, 
    CheckCircle2, 
    Filter,
    Search,
    X,
    LayoutGrid,
    List,
    Flame, 
    Users, 
    ArrowRight
} from 'lucide-react';

const OfficerDashboardPage = () => {
    const { user } = useContext(AuthContext);
    const [grievances, setGrievances] = useState([]);
    const [stats, setStats] = useState(null); 
    const [loading, setLoading] = useState(true);
    const [trendingIssues, setTrendingIssues] = useState([]);

    // Filter & Search State
    const [activeFilter, setActiveFilter] = useState('Pending');
    const [searchTerm, setSearchTerm] = useState('');

    const initialSortConfig = { key: 'created_at', direction: 'descending' };

    useEffect(() => {
        const fetchData = async () => {
            try {
                setLoading(true);
                const res = await axios.get('/api/officer/dashboard-data');
                setStats(res.data.stats);
                setGrievances(res.data.grievances || []);
                setTrendingIssues(res.data.trending || []);
            } catch (err) {
                console.error("Dashboard data fetch error:", err);
                toast.error('Failed to load dashboard data.');
            } finally {
                setLoading(false);
            }
        };
        if (user) fetchData();
    }, [user]);

    // --- High Priority Zone Logic ---
    const urgentTickets = useMemo(() => {
        if (!grievances) return [];
        const now = new Date();
        const sevenDaysAgo = new Date(now.setDate(now.getDate() - 7));

        return grievances.filter(g => {
            const isSystemEscalated = g.status === 'Escalated'; 
            const isSlaBreach = new Date(g.created_at) < sevenDaysAgo && 
                                !['Resolved', 'Closed', 'Rejected', 'Escalated'].includes(g.status);
            return isSystemEscalated || isSlaBreach;
        });
    }, [grievances]);

    // --- Filtering Logic ---
    const filteredTickets = useMemo(() => {
        if (!grievances) return [];
        
        // 1. GLOBAL SEARCH
        if (searchTerm.trim()) {
            const lowerTerm = searchTerm.toLowerCase();
            return grievances.filter(g => 
                g.title.toLowerCase().includes(lowerTerm) ||
                g.ticket_id.toString().includes(lowerTerm) ||
                (g.submitted_by_name && g.submitted_by_name.toLowerCase().includes(lowerTerm))
            );
        }

        // 2. STATUS FILTERS
        const todayStr = new Date().toDateString();
        const sevenDaysAgo = new Date();
        sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

        return grievances.filter(g => {
            const s = g.status; 
            switch (activeFilter) {
                case 'Pending':   return ['Submitted', 'Open', 'In Progress', 'Awaiting Clarification', 'Escalated'].includes(s);
                case 'SLA':       return new Date(g.created_at) < sevenDaysAgo && !['Resolved', 'Closed', 'Rejected'].includes(s);
                case 'Escalated': return (s === 'Escalated' || g.is_escalated === true) && !['Resolved', 'Closed', 'Rejected'].includes(s);
                case 'Today':     return new Date(g.created_at).toDateString() === todayStr;
                case 'Archived':  return ['Resolved', 'Closed', 'Rejected'].includes(s);
                default:          return true;
            }
        });
    }, [grievances, activeFilter, searchTerm]);

    const { items: sortedGrievances, requestSort, sortConfig } = useSortableTable(filteredTickets, initialSortConfig);

    // --- Helpers ---
    const getSortIcon = (name) => {
        if (sortConfig.key !== name) return <span className="opacity-0 group-hover:opacity-50 ml-1">↕</span>;
        return sortConfig.direction === 'ascending' ? ' 🔼' : ' 🔽';
    };

    // Helper for Card Colors
    const getCardStyles = (type, isActive) => {
        const base = "relative p-6 rounded-2xl border transition-all duration-300 cursor-pointer overflow-hidden group";
        const inactive = "bg-white border-gray-100 hover:border-gray-300 hover:shadow-md";
        
        // If search is active, dim the cards
        if (searchTerm) return `${base} bg-gray-50 border-gray-200 opacity-50 grayscale`;

        if (isActive) {
            switch(type) {
                case 'primary': return `${base} bg-blue-600 border-blue-600 text-white shadow-lg shadow-blue-200 scale-[1.02]`;
                case 'danger':  return `${base} bg-red-600 border-red-600 text-white shadow-lg shadow-red-200 scale-[1.02]`;
                case 'warning': return `${base} bg-orange-500 border-orange-500 text-white shadow-lg shadow-orange-200 scale-[1.02]`;
                case 'info':    return `${base} bg-indigo-600 border-indigo-600 text-white shadow-lg shadow-indigo-200 scale-[1.02]`;
                default: return `${base} ${inactive}`;
            }
        }
        return `${base} ${inactive}`;
    };

    if (loading) return (
        <div className="flex h-screen items-center justify-center bg-gray-50">
            <Loader2 className="animate-spin h-10 w-10 text-blue-600" />
        </div>
    );

    return (
        <div className="min-h-screen bg-gray-50/50 pb-20">
            
            {/* 1. TOP NAVBAR / HEADER */}
            <div className="bg-white border-b border-gray-200 sticky top-0 z-30 shadow-sm">
                <div className="max-w-7xl mx-auto px-6 py-4 flex flex-col md:flex-row justify-between items-center gap-4">
                    <div>
                        <h1 className="text-2xl font-bold text-gray-900">Officer Dashboard</h1>
                        <p className="text-sm text-gray-500 flex items-center gap-2">
                             {user?.roles?.[0]?.department_name || "Department Overview"} 
                             <span className="w-1 h-1 rounded-full bg-gray-300"></span>
                             {new Date().toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' })}
                        </p>
                    </div>
                    {/* Compact Profile/Date Badge could go here if needed */}
                </div>
            </div>

            <div className="max-w-7xl mx-auto px-6 mt-8">
                
                {/* 2. ANALYTICS CARDS */}
                {stats && stats.cards && (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-5 mb-10">
                        <div onClick={() => !searchTerm && setActiveFilter('Pending')} className={getCardStyles('primary', activeFilter === 'Pending')}>
                            <div className="flex justify-between items-start">
                                <div>
                                    <p className={`text-sm font-medium mb-1 ${activeFilter === 'Pending' ? 'text-blue-100' : 'text-gray-500'}`}>Actionable Queue</p>
                                    <h3 className="text-3xl font-bold">{stats.cards[0].value}</h3>
                                </div>
                                <div className={`p-3 rounded-xl ${activeFilter === 'Pending' ? 'bg-white/20' : 'bg-blue-50 text-blue-600'}`}>
                                    <List size={20} />
                                </div>
                            </div>
                        </div>

                        <div onClick={() => !searchTerm && setActiveFilter('SLA')} className={getCardStyles('danger', activeFilter === 'SLA')}>
                            <div className="flex justify-between items-start">
                                <div>
                                    <p className={`text-sm font-medium mb-1 ${activeFilter === 'SLA' ? 'text-red-100' : 'text-gray-500'}`}>SLA Breaches</p>
                                    <h3 className="text-3xl font-bold">{stats.cards[1].value}</h3>
                                </div>
                                <div className={`p-3 rounded-xl ${activeFilter === 'SLA' ? 'bg-white/20' : 'bg-red-50 text-red-600'}`}>
                                    <Clock size={20} />
                                </div>
                            </div>
                        </div>

                        <div onClick={() => !searchTerm && setActiveFilter('Escalated')} className={getCardStyles('warning', activeFilter === 'Escalated')}>
                            <div className="flex justify-between items-start">
                                <div>
                                    <p className={`text-sm font-medium mb-1 ${activeFilter === 'Escalated' ? 'text-orange-100' : 'text-gray-500'}`}>Escalations</p>
                                    <h3 className="text-3xl font-bold">{stats.cards[2].value}</h3>
                                </div>
                                <div className={`p-3 rounded-xl ${activeFilter === 'Escalated' ? 'bg-white/20' : 'bg-orange-50 text-orange-600'}`}>
                                    <AlertTriangle size={20} />
                                </div>
                            </div>
                        </div>

                        <div onClick={() => !searchTerm && setActiveFilter('Today')} className={getCardStyles('info', activeFilter === 'Today')}>
                            <div className="flex justify-between items-start">
                                <div>
                                    <p className={`text-sm font-medium mb-1 ${activeFilter === 'Today' ? 'text-indigo-100' : 'text-gray-500'}`}>Received Today</p>
                                    <h3 className="text-3xl font-bold">{stats.cards[3].value}</h3>
                                </div>
                                <div className={`p-3 rounded-xl ${activeFilter === 'Today' ? 'bg-white/20' : 'bg-indigo-50 text-indigo-600'}`}>
                                    <TrendingUp size={20} />
                                </div>
                            </div>
                        </div>
                    </div>
                )}

                {/* PRIORITY HEATMAP FOR DEPARTMENT */}
                {trendingIssues.length > 0 && !searchTerm && activeFilter === 'Pending' && (
                    <div className="mb-8 animate-fade-in">
                        <div className="flex items-center gap-2 mb-4">
                            <Flame className="text-orange-500" size={24} />
                            <h2 className="text-xl font-bold text-gray-800">High Priority Issues</h2>
                        </div>
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
                            {trendingIssues.map(issue => (
                                <Link 
                                    key={issue.ticket_id} 
                                    to={`/officer/grievance/${issue.ticket_id}`} 
                                    className="bg-white rounded-xl shadow-sm border border-orange-200 p-5 hover:shadow-md transition-all border-t-4 border-t-orange-500 flex flex-col justify-between group"
                                >
                                    <div>
                                        <div className="flex justify-between items-start mb-3">
                                            <span className="text-xs font-bold bg-orange-100 text-orange-800 px-2 py-1 rounded">
                                                {issue.category.toUpperCase()}
                                            </span>
                                            <span className="flex items-center gap-1 text-xs font-bold text-red-600 bg-red-50 border border-red-100 px-2 py-1 rounded shadow-sm">
                                                <Users size={12}/> {issue.upvotes + 1} Affected
                                            </span>
                                        </div>
                                        <h3 className="font-bold text-gray-900 mb-1 group-hover:text-orange-600 transition-colors line-clamp-2">
                                            {issue.title}
                                        </h3>
                                        <p className="text-xs text-gray-500">#{issue.ticket_id} • {new Date(issue.created_at).toLocaleDateString()}</p>
                                    </div>
                                    <div className="mt-5 flex items-center justify-between text-sm">
                                        <span className="text-orange-600 font-bold">Manage Issue</span>
                                        <ArrowRight size={16} className="text-orange-600 transform group-hover:translate-x-1 transition-transform" />
                                    </div>
                                </Link>
                            ))}
                        </div>
                    </div>
                )}

                {/* 3. THE COMMAND BAR (Search & Tools) */}
                <div className="bg-white p-2 rounded-2xl shadow-sm border border-gray-200 mb-6 flex flex-col md:flex-row gap-4 items-center justify-between sticky top-24 z-20">
                    
                    {/* Search Field - Large & Clean */}
                    <div className="relative w-full md:w-1/2 lg:w-1/3">
                        <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                            <Search className="h-5 w-5 text-gray-400" />
                        </div>
                        <input
                            type="text"
                            placeholder="Search ticket ID, student name..."
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            className="block w-full pl-11 pr-4 py-3 bg-gray-50 border-transparent rounded-xl text-gray-900 placeholder-gray-400 focus:outline-none focus:bg-white focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
                        />
                        {searchTerm && (
                            <button 
                                onClick={() => setSearchTerm('')}
                                className="absolute inset-y-0 right-0 pr-3 flex items-center text-gray-400 hover:text-red-500"
                            >
                                <X size={16} />
                            </button>
                        )}
                    </div>

                    {/* Right Tools: View Mode & Archive Toggle */}
                    <div className="flex items-center gap-2 pr-2 w-full md:w-auto justify-between md:justify-end">
                        
                        {/* Archive Toggle Switch */}
                        <div 
                            onClick={() => setActiveFilter(activeFilter === 'Archived' ? 'Pending' : 'Archived')}
                            className={`cursor-pointer px-4 py-2 rounded-xl text-sm font-bold flex items-center gap-2 transition-all select-none
                            ${activeFilter === 'Archived' 
                                ? 'bg-slate-800 text-white shadow-md' 
                                : 'bg-white text-gray-500 hover:bg-gray-100'}`}
                        >
                            <Archive size={16} />
                            {activeFilter === 'Archived' ? 'Viewing Archive' : 'Archive'}
                        </div>

                        <div className="h-8 w-[1px] bg-gray-200 mx-2 hidden md:block"></div>

                        {/* Record Count */}
                        <span className="text-xs font-bold text-gray-400 uppercase tracking-wide">
                            {sortedGrievances.length} Tickets
                        </span>
                    </div>
                </div>

                {/* 4. DATA TABLE */}
                <div className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden">
                    <div className="overflow-x-auto">
                        <table className="min-w-full divide-y divide-gray-100">
                            <thead className="bg-gray-50/50">
                                <tr>
                                    <th onClick={() => requestSort('ticket_id')} className="px-6 py-4 text-left text-xs font-bold text-gray-500 uppercase tracking-wider cursor-pointer hover:text-blue-600 group">Ticket ID {getSortIcon('ticket_id')}</th>
                                    <th onClick={() => requestSort('title')} className="px-6 py-4 text-left text-xs font-bold text-gray-500 uppercase tracking-wider cursor-pointer hover:text-blue-600 group">Subject {getSortIcon('title')}</th>
                                    <th onClick={() => requestSort('submitted_by_name')} className="px-6 py-4 text-left text-xs font-bold text-gray-500 uppercase tracking-wider cursor-pointer hover:text-blue-600 group">Student {getSortIcon('submitted_by_name')}</th>
                                    <th onClick={() => requestSort('status')} className="px-6 py-4 text-left text-xs font-bold text-gray-500 uppercase tracking-wider cursor-pointer hover:text-blue-600 group">Status {getSortIcon('status')}</th>
                                    <th onClick={() => requestSort('created_at')} className="px-6 py-4 text-left text-xs font-bold text-gray-500 uppercase tracking-wider cursor-pointer hover:text-blue-600 group">Date {getSortIcon('created_at')}</th>
                                    <th className="px-6 py-4 text-right text-xs font-bold text-gray-500 uppercase">Action</th>
                                </tr>
                            </thead>
                            <tbody className="bg-white divide-y divide-gray-100">
                                {sortedGrievances.length > 0 ? (
                                    sortedGrievances.map((g) => (
                                        <tr key={g.grievance_id} className="hover:bg-blue-50/50 transition-colors group">
                                            <td className="px-6 py-4 whitespace-nowrap">
                                                <span className="text-sm font-bold text-gray-900">#{g.ticket_id}</span>
                                                {/* Alerts */}
                                                {(g.status === 'Escalated') && (
                                                    <span className="ml-2 inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-medium bg-red-100 text-red-800">
                                                        ESCALATED
                                                    </span>
                                                )}
                                            </td>
                                            <td className="px-6 py-4">
                                                <div className="text-sm font-medium text-gray-900 truncate max-w-[250px]">{g.title}</div>
                                                {/* Helper text for urgent items */}
                                                {activeFilter === 'SLA' && <div className="text-xs text-red-500 mt-1">Overdue by 7+ days</div>}
                                            </td>
                                            <td className="px-6 py-4 whitespace-nowrap">
                                                <div className="text-sm text-gray-600">{g.submitted_by_name}</div>
                                                <div className="text-xs text-gray-400">{g.submitted_by_email}</div>
                                            </td>
                                            <td className="px-6 py-4 whitespace-nowrap">
                                                <span className={`px-2.5 py-1 inline-flex text-xs leading-5 font-bold rounded-full border 
                                                    ${g.status === 'Resolved' ? 'bg-green-50 text-green-700 border-green-100' : 
                                                      g.status === 'Closed' ? 'bg-gray-50 text-gray-600 border-gray-100' :
                                                      g.status === 'Rejected' ? 'bg-red-50 text-red-700 border-red-100' :
                                                      g.status === 'Escalated' ? 'bg-red-50 text-red-600 border-red-100 animate-pulse' :
                                                      'bg-blue-50 text-blue-700 border-blue-100'}`}>
                                                    {g.status}
                                                </span>
                                            </td>
                                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                                                {new Date(g.created_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                                            </td>
                                            <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                                                <Link 
                                                    to={`/officer/grievance/${g.ticket_id}`}
                                                    className="text-blue-600 hover:text-blue-900 bg-blue-50 hover:bg-blue-100 px-3 py-1.5 rounded-lg transition-colors"
                                                >
                                                    Manage
                                                </Link>
                                            </td>
                                        </tr>
                                    ))
                                ) : (
                                    <tr>
                                        <td colSpan="6" className="px-6 py-16 text-center text-gray-500">
                                            <div className="flex flex-col items-center justify-center">
                                                {searchTerm ? (
                                                    <>
                                                        <Search size={48} className="text-gray-200 mb-4" />
                                                        <p className="font-medium text-gray-900">No matches found for "{searchTerm}"</p>
                                                        <p className="text-sm text-gray-400">Try checking the ID or name again.</p>
                                                    </>
                                                ) : (
                                                    <>
                                                        <CheckCircle2 size={48} className="text-gray-200 mb-4" />
                                                        <p className="font-medium text-gray-900">All caught up!</p>
                                                        <p className="text-sm text-gray-400">No tickets found in {activeFilter} view.</p>
                                                    </>
                                                )}
                                            </div>
                                        </td>
                                    </tr>
                                )}
                            </tbody>
                        </table>
                    </div>
                </div>

            </div>
        </div>
    );
};

export default OfficerDashboardPage;