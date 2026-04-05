import React, { useState, useEffect, useContext, useMemo} from 'react';
import axios from 'axios';
import { Link } from 'react-router-dom';
import { AuthContext } from '../context/AuthContext';
import { 
  Search, 
  Filter, 
  ArrowRight, 
  Clock, 
  CheckCircle, 
  AlertCircle,
  ChevronUp,   // NEW: Sort Icon
  ChevronDown, // NEW: Sort Icon
  // Department Icons
  Code2, Terminal, Cpu, Zap, Globe, Monitor, Wrench, Factory, 
  HardHat, FlaskConical, Dna, Leaf, Atom, Calculator, Feather, 
  Palette, Briefcase, LineChart, Landmark, Building2, Library, 
  BedDouble, Utensils, BookOpen 
} from 'lucide-react';

const MyGrievancesPage = () => {
  const [grievances, setGrievances] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [searchTerm, setSearchTerm] = useState('');
  const [activeTab, setActiveTab] = useState('all');
  const { user } = React.useContext(AuthContext);
  
  // NEW: Sorting State (Default: Newest tickets first)
  const [sortConfig, setSortConfig] = useState({ key: 'created_at', direction: 'desc' });

  useEffect(() => {
    const fetchGrievances = async () => {
      try {
        const res = await axios.get('/api/grievances/my-grievances');
        setGrievances(res.data);
      } catch (err) {
        setError('Could not fetch grievances.');
      } finally {
        setLoading(false);
      }
    };
    fetchGrievances();
  }, []);

  // --- HELPER: SORTING LOGIC ---
  const handleSort = (key) => {
    let direction = 'asc';
    // If clicking the same column, toggle direction
    if (sortConfig.key === key && sortConfig.direction === 'asc') {
        direction = 'desc';
    }
    setSortConfig({ key, direction });
  };

  const sortedGrievances = React.useMemo(() => {
    // 1. Safely grab the correct user ID (catches both common naming conventions)
    const currentUserId = user?.id || user?.user_id;

    // 2. Apply Tab Filtering FIRST
    let items = grievances.filter(g => {
        if (activeTab === 'authored') {
            return g.submitted_by_id === currentUserId;
        }
        if (activeTab === 'following') {
            return g.submitted_by_id !== currentUserId;
        }
        return true; // For the 'all' tab
    });

    // 3. Then apply the Search Filter to the tab results
    let sortableItems = items.filter(g => 
        g.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
        g.ticket_id.toString().includes(searchTerm) ||
        g.category.toLowerCase().includes(searchTerm.toLowerCase()) ||
        g.status.toLowerCase().includes(searchTerm.toLowerCase())
    );

    // 4. Apply Sorting
    if (sortConfig.key) {
      sortableItems.sort((a, b) => {
        let aValue = a[sortConfig.key];
        let bValue = b[sortConfig.key];

        // Handle specific data types
        if (sortConfig.key === 'created_at') {
            aValue = new Date(aValue);
            bValue = new Date(bValue);
        } else if (typeof aValue === 'string') {
            aValue = aValue.toLowerCase();
            bValue = bValue.toLowerCase();
        }

        if (aValue < bValue) {
          return sortConfig.direction === 'asc' ? -1 : 1;
        }
        if (aValue > bValue) {
          return sortConfig.direction === 'asc' ? 1 : -1;
        }
        return 0;
      });
    }
    return sortableItems;
  }, [grievances, sortConfig, searchTerm, activeTab, user]);

  // --- HELPER: RENDER SORT ICON ---
  const SortIcon = ({ columnKey }) => {
      if (sortConfig.key !== columnKey) return <span className="w-4 h-4 ml-1 inline-block opacity-0 group-hover:opacity-30">↕</span>;
      return sortConfig.direction === 'asc' 
        ? <ChevronUp size={14} className="ml-1 inline-block text-blue-600" /> 
        : <ChevronDown size={14} className="ml-1 inline-block text-blue-600" />;
  };

  // --- HELPER: STATUS BADGES (Same as before) ---
  const getStatusBadge = (status) => {
    switch (status) {
      case 'Resolved':
        return <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-green-100 text-green-700 border border-green-200"><CheckCircle size={12}/> Resolved</span>;
      case 'Closed':
        return <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-gray-100 text-gray-600 border border-gray-200">Closed</span>;
      case 'Rejected':
        return <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-red-100 text-red-700 border border-red-200"><AlertCircle size={12}/> Rejected</span>;
      case 'Escalated':
        return <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-red-50 text-red-600 border border-red-200 animate-pulse"><AlertCircle size={12}/> Escalated</span>;
      case 'In Progress':
        return <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-blue-50 text-blue-600 border border-blue-200"><Clock size={12}/> In Progress</span>;
      default: 
        return <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-yellow-50 text-yellow-700 border border-yellow-200"><Clock size={12}/> Pending</span>;
    }
  };

  // --- HELPER: DEPARTMENT ICONS (Same as before) ---
  const getDeptIcon = (deptName) => {
    const lower = deptName.toLowerCase();
    if (lower.includes('mechanical')) return <Wrench size={18} />;
    if (lower.includes('production')) return <Factory size={18} />;
    if (lower.includes('software')) return <Terminal size={18} />;
    if (lower.includes('civil')) return <HardHat size={18} />;
    if (lower.includes('chemical')) return <FlaskConical size={18} />;
    if (lower.includes('bio')) return <Dna size={18} />;
    if (lower.includes('computer')) return <Code2 size={18} />;
    if (lower.includes('it') || lower.includes('info')) return <Globe size={18} />;
    if (lower.includes('electronics')) return <Cpu size={18} />;
    if (lower.includes('electrical')) return <Zap size={18} />;
    if (lower.includes('hostel')) return <BedDouble size={18} />;
    if (lower.includes('library')) return <Library size={18} />;
    if (lower.includes('mess') || lower.includes('food')) return <Utensils size={18} />;
    if (lower.includes('admin')) return <Building2 size={18} />;
    if (lower.includes('account')) return <Landmark size={18} />;
    return <BookOpen size={18} />;
  };

  if (loading) return (
    <div className="flex h-[50vh] items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
    </div>
  );

  return (
    <div className="max-w-7xl mx-auto py-10 px-4 sm:px-6 lg:px-8">
      
      {/* 1. HEADER SECTION */}
      <div className="flex flex-col md:flex-row justify-between items-end mb-8 gap-4">
        <div>
            <h1 className="text-3xl font-bold text-gray-900">My Grievances</h1>
            <p className="text-gray-500 mt-2">
                Track and manage your submitted complaints history.
            </p>
        </div>
        <Link 
            to="/submit-grievance"
            className="bg-blue-600 hover:bg-blue-700 text-white font-bold py-2.5 px-6 rounded-xl shadow-lg shadow-blue-200 transition-all transform hover:-translate-y-1 flex items-center gap-2"
        >
            <span>+</span> New Grievance
        </Link>
      </div>

      {/* 2. TABS */}
      <div className="flex border-b border-gray-200 mb-6 space-x-8">
        {[
          { id: 'all', label: 'All Issues' },
          { id: 'authored', label: 'My Submissions' },
          { id: 'following', label: 'Followed Issues' }
        ].map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`pb-4 px-1 text-sm font-bold transition-all border-b-2 ${
              activeTab === tab.id
                ? 'border-blue-600 text-blue-600'
                : 'border-transparent text-gray-500 hover:text-gray-700'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* 2. SEARCH BAR CARD */}
      <div className="bg-white p-4 rounded-xl shadow-sm border border-gray-200 mb-6 flex flex-col sm:flex-row gap-4 items-center justify-between">
         <div className="relative w-full sm:max-w-md">
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                <Search className="h-5 w-5 text-gray-400" />
            </div>
            <input
                type="text"
                placeholder="Search by ID, Subject, or Status..."
                className="block w-full pl-10 pr-3 py-2.5 border border-gray-200 rounded-lg leading-5 bg-gray-50 placeholder-gray-400 focus:outline-none focus:bg-white focus:ring-2 focus:ring-blue-500 transition-all"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
            />
         </div>
         <div className="flex items-center gap-2 text-sm text-gray-500">
            <Filter size={16} />
            <span>Showing {sortedGrievances.length} tickets</span>
         </div>
      </div>

      {/* 3. DATA TABLE */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
        {sortedGrievances.length > 0 ? (
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  {/* SORTABLE HEADERS */}
                  <th 
                    className="px-6 py-4 text-left text-xs font-bold text-gray-500 uppercase tracking-wider cursor-pointer group hover:bg-gray-100 transition-colors"
                    onClick={() => handleSort('ticket_id')}
                  >
                    Ticket ID <SortIcon columnKey="ticket_id" />
                  </th>
                  
                  <th 
                    className="px-6 py-4 text-left text-xs font-bold text-gray-500 uppercase tracking-wider cursor-pointer group hover:bg-gray-100 transition-colors"
                    onClick={() => handleSort('category')}
                  >
                    Category <SortIcon columnKey="category" />
                  </th>
                  
                  <th 
                    className="px-6 py-4 text-left text-xs font-bold text-gray-500 uppercase tracking-wider cursor-pointer group hover:bg-gray-100 transition-colors"
                    onClick={() => handleSort('title')}
                  >
                    Subject <SortIcon columnKey="title" />
                  </th>
                  
                  <th 
                    className="px-6 py-4 text-left text-xs font-bold text-gray-500 uppercase tracking-wider cursor-pointer group hover:bg-gray-100 transition-colors"
                    onClick={() => handleSort('status')}
                  >
                    Status <SortIcon columnKey="status" />
                  </th>
                  
                  <th 
                    className="px-6 py-4 text-left text-xs font-bold text-gray-500 uppercase tracking-wider cursor-pointer group hover:bg-gray-100 transition-colors"
                    onClick={() => handleSort('created_at')}
                  >
                    Date <SortIcon columnKey="created_at" />
                  </th>
                  
                  <th className="px-6 py-4 text-right text-xs font-bold text-gray-500 uppercase tracking-wider">
                    Action
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {sortedGrievances.map((g) => (
                  <tr key={g.ticket_id} className="hover:bg-gray-50 transition-colors group">
                    
                    {/* Ticket ID Column with "Following" badge */}
                    <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex flex-col">
                            <span className="font-mono text-sm font-bold text-gray-900 bg-gray-100 px-2 py-1 rounded w-fit">
                                #{g.ticket_id}
                            </span>
                            {/* Shows the badge only if the logged-in user is NOT the author */}
                            {g.submitted_by_id !== (user?.id || user?.user_id) && (
                                <span className="text-[10px] mt-1 font-bold text-indigo-500 uppercase tracking-tight">
                                    Following
                                </span>
                            )}
                        </div>
                    </td>
                    
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center gap-3">
                         <div className="p-2 bg-blue-50 text-blue-600 rounded-lg">
                            {getDeptIcon(g.category)}
                         </div>
                         <span className="text-sm font-medium text-gray-700">{g.category}</span>
                      </div>
                    </td>
                    
                    <td className="px-6 py-4">
                      <div className="text-sm font-semibold text-gray-900">{g.title}</div>
                      <div className="text-xs text-gray-500 truncate max-w-[200px]">{g.description.substring(0, 50)}...</div>
                    </td>
                    
                    <td className="px-6 py-4 whitespace-nowrap">
                      {getStatusBadge(g.status)}
                    </td>
                    
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {new Date(g.created_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                    </td>
                    
                    <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                      <Link 
                        to={`/grievance/${g.ticket_id}`}
                        className="text-blue-600 hover:text-blue-900 flex items-center justify-end gap-1 group-hover:gap-2 transition-all"
                      >
                        Details <ArrowRight size={16} />
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          // EMPTY STATE
          <div className="text-center py-20">
            <div className="bg-gray-50 rounded-full w-20 h-20 flex items-center justify-center mx-auto mb-4">
               <Search className="w-8 h-8 text-gray-300" />
            </div>
            <h3 className="text-lg font-bold text-gray-900">No tickets found</h3>
            <p className="mt-1 text-gray-500 max-w-sm mx-auto">
               We couldn't find any grievances matching "{searchTerm}". Try searching for a Ticket ID or Category.
            </p>
            {searchTerm && (
                <button 
                    onClick={() => setSearchTerm('')}
                    className="mt-4 text-blue-600 font-bold hover:underline"
                >
                    Clear Search
                </button>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

export default MyGrievancesPage;