import React, { useState, useEffect, useMemo } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import axios from 'axios';
import { 
    ArrowLeft, Search, Filter, AlertCircle, CheckCircle2, Clock, 
    ArrowRight, ChevronUp, ChevronDown, X,
    // Dept Icons
    Wrench, Factory, Terminal, HardHat, FlaskConical, Dna, Code2, 
    Globe, Cpu, Zap, BedDouble, Library, Utensils, Building2, Landmark, BookOpen
} from 'lucide-react';

const FilteredGrievancesPage = () => {
    const { filterType, filterValue } = useParams(); 
    const navigate = useNavigate();
    
    const [grievances, setGrievances] = useState([]);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');
    const [sortConfig, setSortConfig] = useState({ key: 'created_at', direction: 'desc' });

    useEffect(() => {
        const fetchData = async () => {
            try {
                setLoading(true);
                const res = await axios.get(`/api/admin/grievances/filter?type=${filterType}&value=${encodeURIComponent(filterValue)}`);
                
                // --- DEBUGGING STEP ---
                // Open your browser console (F12) to see exactly what fields the backend is sending
                console.log("Filtered Data Received:", res.data); 
                
                setGrievances(res.data);
            } catch (err) {
                console.error("Error fetching filtered grievances:", err);
            } finally {
                setLoading(false);
            }
        };
        fetchData();
    }, [filterType, filterValue]);

    // --- SORT & SEARCH LOGIC ---
    const processedGrievances = useMemo(() => {
        let data = [...grievances];

        // 1. Search Filter
        if (searchTerm.trim()) {
            const lowerTerm = searchTerm.toLowerCase();
            data = data.filter(g => {
                // Safely access fields to prevent crashes
                const title = g.title?.toLowerCase() || '';
                const id = g.ticket_id?.toString() || '';
                // Check multiple possible name fields
                const name = (g.submitted_by_name || g.submittedBy?.full_name || g.user?.full_name || '').toLowerCase();
                
                return title.includes(lowerTerm) || id.includes(lowerTerm) || name.includes(lowerTerm);
            });
        }

        // 2. Sorting
        if (sortConfig.key) {
            data.sort((a, b) => {
                // Helper to extract value safely based on key
                const getValue = (item, key) => {
                    if (key === 'submitted_by_name') {
                        return item.submitted_by_name || item.submittedBy?.full_name || item.user?.full_name || '';
                    }
                    return item[key];
                };

                let aVal = getValue(a, sortConfig.key);
                let bVal = getValue(b, sortConfig.key);

                if (sortConfig.key === 'created_at') {
                    aVal = new Date(aVal || 0); // Handle invalid dates safely
                    bVal = new Date(bVal || 0);
                } else if (typeof aVal === 'string') {
                    aVal = aVal.toLowerCase();
                    bVal = bVal ? bVal.toLowerCase() : '';
                }

                if (aVal < bVal) return sortConfig.direction === 'asc' ? -1 : 1;
                if (aVal > bVal) return sortConfig.direction === 'asc' ? 1 : -1;
                return 0;
            });
        }
        return data;
    }, [grievances, searchTerm, sortConfig]);

    const handleSort = (key) => {
        let direction = 'asc';
        if (sortConfig.key === key && sortConfig.direction === 'asc') {
            direction = 'desc';
        }
        setSortConfig({ key, direction });
    };

    // --- HELPERS ---
    const getSortIcon = (columnKey) => {
        if (sortConfig.key !== columnKey) return <span className="w-4 h-4 ml-1 inline-block opacity-0 group-hover:opacity-30">↕</span>;
        return sortConfig.direction === 'asc' 
            ? <ChevronUp size={14} className="ml-1 inline-block text-blue-600" /> 
            : <ChevronDown size={14} className="ml-1 inline-block text-blue-600" />;
    };

    const getStatusBadge = (status) => {
        const s = status || 'Pending'; // Default fallback
        switch (s) {
            case 'Resolved': return <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800"><CheckCircle2 size={12}/> Resolved</span>;
            case 'Closed': return <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-600">Closed</span>;
            case 'Rejected': return <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-medium bg-red-100 text-red-800"><AlertCircle size={12}/> Rejected</span>;
            case 'Escalated': return <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-medium bg-red-50 text-red-600 border border-red-200 animate-pulse"><AlertCircle size={12}/> Escalated</span>;
            case 'In Progress': return <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-50 text-blue-600"><Clock size={12}/> In Progress</span>;
            default: return <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-medium bg-yellow-50 text-yellow-700"><Clock size={12}/> Pending</span>;
        }
    };

    const getDeptIcon = (deptName) => {
        const lower = deptName ? deptName.toLowerCase() : "";
        if (lower.includes('mechanical')) return <Wrench size={16} />;
        if (lower.includes('hostel')) return <BedDouble size={16} />;
        if (lower.includes('mess')) return <Utensils size={16} />;
        if (lower.includes('library')) return <Library size={16} />;
        if (lower.includes('account')) return <Landmark size={16} />;
        if (lower.includes('admin')) return <Building2 size={16} />;
        if (lower.includes('computer')) return <Code2 size={16} />;
        return <BookOpen size={16} />;
    };

    if (loading) return (
        <div className="flex h-screen items-center justify-center bg-gray-50">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
        </div>
    );

    return (
        <div className="min-h-screen bg-gray-50 py-10 px-6">
            <div className="max-w-7xl mx-auto">
                
                {/* 1. HEADER & NAVIGATION */}
                <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-8 gap-4">
                    <div>
                        <button onClick={() => navigate('/admin/dashboard')} className="flex items-center gap-2 text-gray-500 hover:text-blue-600 transition-colors mb-2 text-sm font-medium">
                            <ArrowLeft size={16} /> Back to Dashboard
                        </button>
                        <h1 className="text-3xl font-bold text-gray-900 flex items-center gap-2">
                            <Filter className="text-blue-600" />
                            {filterType === 'status' ? 'Status View:' : filterType === 'all' ? 'System Overview' : 'Department View:'} 
                            <span className="text-blue-600 capitalize">
                                {filterType === 'all' ? 'All Tickets' : decodeURIComponent(filterValue)}
                            </span>
                        </h1>
                    </div>
                    <div className="text-right text-gray-500 text-sm">
                        Total Records: <span className="font-bold text-gray-900">{grievances.length}</span>
                    </div>
                </div>

                {/* 2. SEARCH & TOOLBAR */}
                <div className="bg-white p-4 rounded-xl shadow-sm border border-gray-200 mb-6 flex flex-col md:flex-row items-center justify-between gap-4">
                    <div className="relative w-full md:w-96">
                        <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                            <Search className="h-5 w-5 text-gray-400" />
                        </div>
                        <input
                            type="text"
                            placeholder="Search by ID, Student Name..."
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            className="block w-full pl-10 pr-10 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
                        />
                        {searchTerm && (
                            <button onClick={() => setSearchTerm('')} className="absolute inset-y-0 right-0 pr-3 flex items-center text-gray-400 hover:text-red-500">
                                <X size={16} />
                            </button>
                        )}
                    </div>
                    <div className="flex items-center gap-2 text-xs font-medium text-gray-500 bg-gray-50 px-3 py-1.5 rounded-lg border border-gray-200">
                        <span>Sorted by:</span>
                        <span className="text-gray-900 capitalize">{sortConfig.key.replace('_', ' ').replace('submitted_by_name', 'Student')}</span>
                        {sortConfig.direction === 'asc' ? <ChevronUp size={12} /> : <ChevronDown size={12} />}
                    </div>
                </div>

                {/* 3. DATA TABLE */}
                <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
                    <div className="overflow-x-auto">
                        <table className="min-w-full divide-y divide-gray-200">
                            <thead className="bg-gray-50">
                                <tr>
                                    <th onClick={() => handleSort('ticket_id')} className="px-6 py-4 text-left text-xs font-bold text-gray-500 uppercase cursor-pointer hover:text-blue-600 group">ID {getSortIcon('ticket_id')}</th>
                                    <th onClick={() => handleSort('title')} className="px-6 py-4 text-left text-xs font-bold text-gray-500 uppercase cursor-pointer hover:text-blue-600 group">Subject {getSortIcon('title')}</th>
                                    
                                    {filterType !== 'category' && (
                                        <th onClick={() => handleSort('category')} className="px-6 py-4 text-left text-xs font-bold text-gray-500 uppercase cursor-pointer hover:text-blue-600 group">Category {getSortIcon('category')}</th>
                                    )}
                                    
                                    {filterType !== 'status' && (
                                        <th onClick={() => handleSort('status')} className="px-6 py-4 text-left text-xs font-bold text-gray-500 uppercase cursor-pointer hover:text-blue-600 group">Status {getSortIcon('status')}</th>
                                    )}
                                    
                                    <th onClick={() => handleSort('submitted_by_name')} className="px-6 py-4 text-left text-xs font-bold text-gray-500 uppercase cursor-pointer hover:text-blue-600 group">Student {getSortIcon('submitted_by_name')}</th>
                                    <th onClick={() => handleSort('created_at')} className="px-6 py-4 text-left text-xs font-bold text-gray-500 uppercase cursor-pointer hover:text-blue-600 group">Date {getSortIcon('created_at')}</th>
                                    <th className="px-6 py-4 text-right text-xs font-bold text-gray-500 uppercase">Action</th>
                                </tr>
                            </thead>
                            <tbody className="bg-white divide-y divide-gray-200">
                                {processedGrievances.length > 0 ? (
                                    processedGrievances.map((g) => {
                                        // --- FIX: ROBUST DATA ACCESS ---
                                        const displayCategory = g.category || g.department || "General";
                                        // Try finding the name in common nested locations
                                        const displayStudent = g.submitted_by_name || g.submittedBy?.full_name || g.user?.full_name || "Unknown User";

                                        return (
                                            <tr key={g.ticket_id} className="hover:bg-blue-50/30 transition-colors group">
                                                <td className="px-6 py-4 whitespace-nowrap">
                                                    <span className="font-mono text-sm font-bold text-blue-600">#{g.ticket_id}</span>
                                                </td>
                                                <td className="px-6 py-4">
                                                    <div className="text-sm font-medium text-gray-900 truncate max-w-xs" title={g.title}>{g.title}</div>
                                                </td>
                                                
                                                {filterType !== 'category' && (
                                                    <td className="px-6 py-4 whitespace-nowrap">
                                                        <div className="flex items-center gap-2 text-sm text-gray-600">
                                                            <span className="text-blue-500">{getDeptIcon(displayCategory)}</span>
                                                            {displayCategory}
                                                        </div>
                                                    </td>
                                                )}

                                                {filterType !== 'status' && (
                                                    <td className="px-6 py-4 whitespace-nowrap">
                                                        {getStatusBadge(g.status)}
                                                    </td>
                                                )}

                                                {/* FIXED STUDENT COLUMN */}
                                                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600 font-medium">
                                                    {displayStudent}
                                                </td>

                                                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                                                    {new Date(g.created_at).toLocaleDateString()}
                                                </td>
                                                <td className="px-6 py-4 whitespace-nowrap text-right">
                                                    <Link 
                                                        to={`/admin/grievance/${g.ticket_id}`} 
                                                        className="text-blue-600 hover:text-blue-900 font-medium text-sm flex items-center justify-end gap-1 opacity-80 group-hover:opacity-100 transition-all"
                                                    >
                                                        View <ArrowRight size={14} />
                                                    </Link>
                                                </td>
                                            </tr>
                                        );
                                    })
                                ) : (
                                    <tr>
                                        <td colSpan="7" className="px-6 py-12 text-center text-gray-500">
                                            <div className="flex flex-col items-center justify-center">
                                                <Search size={32} className="text-gray-300 mb-2" />
                                                <p className="text-lg font-medium text-gray-900">No records found</p>
                                                <p className="text-sm">Try adjusting your search terms.</p>
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

export default FilteredGrievancesPage;