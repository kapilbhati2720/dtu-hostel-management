import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import axios from 'axios';
import { 
    BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip as RechartsTooltip, Cell, ResponsiveContainer 
} from 'recharts';
import { Search, X, ArrowLeft, Filter } from 'lucide-react';

// Reuse the Animation logic
const AnimatedNumber = ({ value }) => {
  const [count, setCount] = useState(0);
  useEffect(() => {
    const end = parseInt(value, 10) || 0;
    let start = 0;
    const duration = 800;
    if (end === 0) { setCount(0); return; }
    const totalFrames = duration / 16;
    const step = Math.ceil(end / totalFrames);
    const timer = setInterval(() => {
      start += step;
      if (start >= end) { setCount(end); clearInterval(timer); } 
      else { setCount(start); }
    }, 16);
    return () => clearInterval(timer);
  }, [value]);
  return <span>{count}</span>;
};

const DepartmentDashboard = () => {
  const { department } = useParams(); 
  const navigate = useNavigate();
  
  const [grievances, setGrievances] = useState([]);
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState({ total: 0, pending: 0, resolved: 0, efficiency: 0, statusData: [] });
  
  // Search & Filter State
  const [searchTerm, setSearchTerm] = useState('');
  const [activeFilter, setActiveFilter] = useState('All'); // 'All', 'Pending', 'Resolved'

  const COLORS = ['#6366f1', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6'];

  useEffect(() => {
    const fetchData = async () => {
      try {
        const res = await axios.get('/api/admin/grievances/filter', {
            params: { 
                type: 'category', 
                value: decodeURIComponent(department) 
            }
        });
        
        const data = res.data;
        setGrievances(data);

        // Calculate Analytics
        const total = data.length;
        const resolved = data.filter(g => ['Resolved', 'Closed'].includes(g.status)).length;
        const pending = data.filter(g => ['Submitted', 'In Progress', 'Escalated', 'Open'].includes(g.status)).length;
        const efficiency = total > 0 ? Math.round((resolved / total) * 100) : 0;

        // Group by Status for Chart
        const statusMap = data.reduce((acc, curr) => {
            acc[curr.status] = (acc[curr.status] || 0) + 1;
            return acc;
        }, {});
        const statusData = Object.entries(statusMap).map(([name, value]) => ({ name, value }));

        setStats({ total, pending, resolved, efficiency, statusData });
      } catch (err) {
        console.error("Failed to fetch department data", err);
      } finally {
        setTimeout(() => setLoading(false), 400); 
      }
    };

    fetchData();
  }, [department]);

  // --- FILTER LOGIC (Combines Search + KPI Card Filter) ---
  const filteredGrievances = grievances.filter(g => {
      // 1. Search Logic
      const lowerTerm = searchTerm.toLowerCase();
      const matchesSearch = 
          g.title.toLowerCase().includes(lowerTerm) ||
          (g.ticket_id && g.ticket_id.toString().toLowerCase().includes(lowerTerm)) ||
          g.status.toLowerCase().includes(lowerTerm);

      // 2. KPI Filter Logic
      let matchesStatus = true;
      if (activeFilter === 'Pending') {
          matchesStatus = ['Submitted', 'In Progress', 'Escalated', 'Open'].includes(g.status);
      } else if (activeFilter === 'Resolved') {
          matchesStatus = ['Resolved', 'Closed', 'Rejected'].includes(g.status);
      }

      return matchesSearch && matchesStatus;
  });

  // Helper for Card Styling (Active/Inactive)
  const getCardStyle = (type) => {
      const baseStyle = "p-6 rounded-xl shadow-md border cursor-pointer transition-all duration-200 transform hover:-translate-y-1 relative overflow-hidden";
      let activeStyle = "";
      
      if (activeFilter === type) {
          activeStyle = "ring-2 ring-offset-2 ring-indigo-500 scale-[1.02]";
      } else if (activeFilter !== 'All' && type !== activeFilter) {
          activeStyle = "opacity-60"; // Dim others
      }

      switch (type) {
          case 'All': return `${baseStyle} bg-white border-blue-100 border-l-4 border-l-blue-500 ${activeStyle}`;
          case 'Pending': return `${baseStyle} bg-white border-amber-100 border-l-4 border-l-amber-500 ${activeStyle}`;
          case 'Resolved': return `${baseStyle} bg-white border-green-100 border-l-4 border-l-green-500 ${activeStyle}`;
          default: return baseStyle;
      }
  };

  // Loading Skeleton
  if (loading) return (
      <div className="p-10 max-w-7xl mx-auto bg-gray-100 min-h-full animate-pulse">
          <div className="h-8 bg-gray-300 w-1/4 mb-10 rounded"></div>
          <div className="grid grid-cols-3 gap-6 mb-10">
              <div className="h-32 bg-gray-200 rounded-xl"></div>
              <div className="h-32 bg-gray-200 rounded-xl"></div>
              <div className="h-32 bg-gray-200 rounded-xl"></div>
          </div>
          <div className="h-96 bg-gray-200 rounded-xl"></div>
      </div>
  );

  return (
    <div className="p-6 md:p-10 max-w-7xl mx-auto bg-gray-100 min-h-full">
      {/* HEADER */}
      <button onClick={() => navigate('/admin/dashboard')} className="group flex items-center gap-2 mb-6 text-indigo-600 font-semibold transition-all hover:-translate-x-1">
        <ArrowLeft size={20} /> Back to Command Center
      </button>
      
      <div className="flex flex-col md:flex-row justify-between items-end mb-10 border-b border-gray-200 pb-6">
        <div>
            <h1 className="text-3xl font-extrabold text-gray-800 tracking-tight">{decodeURIComponent(department)}</h1>
            <p className="text-gray-500 mt-1">Department Performance Dashboard</p>
        </div>
        <div className="text-right mt-4 md:mt-0">
            <span className={`px-4 py-2 rounded-lg text-sm font-bold border ${
                stats.efficiency >= 80 ? 'bg-green-50 text-green-700 border-green-200' :
                stats.efficiency >= 50 ? 'bg-yellow-50 text-yellow-700 border-yellow-200' :
                'bg-red-50 text-red-700 border-red-200'
            }`}>
                Efficiency Score: <AnimatedNumber value={stats.efficiency} />%
            </span>
        </div>
      </div>

      {/* KPI CARDS (Now Clickable Filters) */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-10">
        
        {/* CARD 1: ALL */}
        <div onClick={() => setActiveFilter('All')} className={getCardStyle('All')}>
            <div className="flex justify-between items-start">
                <div>
                    <p className="text-xs font-bold text-gray-400 uppercase tracking-wider">Total Tickets</p>
                    <h3 className="text-4xl font-extrabold text-gray-800 mt-2"><AnimatedNumber value={stats.total} /></h3>
                </div>
                {activeFilter === 'All' && <Filter size={20} className="text-blue-500" />}
            </div>
        </div>

        {/* CARD 2: PENDING (Clicking this hides archived/closed) */}
        <div onClick={() => setActiveFilter('Pending')} className={getCardStyle('Pending')}>
            <div className="flex justify-between items-start">
                <div>
                    <p className="text-xs font-bold text-gray-400 uppercase tracking-wider">Pending Resolution</p>
                    <h3 className="text-4xl font-extrabold text-gray-800 mt-2"><AnimatedNumber value={stats.pending} /></h3>
                </div>
                {activeFilter === 'Pending' && <Filter size={20} className="text-amber-500" />}
            </div>
        </div>

        {/* CARD 3: RESOLVED/ARCHIVE */}
        <div onClick={() => setActiveFilter('Resolved')} className={getCardStyle('Resolved')}>
            <div className="flex justify-between items-start">
                <div>
                    <p className="text-xs font-bold text-gray-400 uppercase tracking-wider">Successfully Resolved</p>
                    <h3 className="text-4xl font-extrabold text-gray-800 mt-2"><AnimatedNumber value={stats.resolved} /></h3>
                </div>
                {activeFilter === 'Resolved' && <Filter size={20} className="text-green-500" />}
            </div>
        </div>
      </div>

      {/* CHARTS & LIST */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mb-10">
        
        {/* CHART */}
        <div className="bg-white p-6 rounded-xl shadow-md border border-gray-200 flex flex-col">
            <h3 className="text-lg font-bold text-gray-800 mb-6">Status Breakdown</h3>
            <div className="flex-1 min-h-[300px]">
                {stats.statusData.length > 0 ? (
                    <ResponsiveContainer width="100%" height="100%">
                        <BarChart data={stats.statusData}>
                            <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f3f4f6" />
                            <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{fill:'#6b7280', fontSize:12}} />
                            <YAxis axisLine={false} tickLine={false} tick={{fill:'#6b7280'}} allowDecimals={false} />
                            <RechartsTooltip cursor={{fill: '#f9fafb'}} contentStyle={{borderRadius:'8px', border:'none', boxShadow:'0 10px 15px -3px rgba(0,0,0,0.1)'}} />
                            <Bar dataKey="value" radius={[4, 4, 0, 0]} barSize={50}>
                               {stats.statusData.map((entry, index) => (
                                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                               ))}
                            </Bar>
                        </BarChart>
                    </ResponsiveContainer>
                ) : (
                    <div className="flex items-center justify-center h-full text-gray-400">No data available</div>
                )}
            </div>
        </div>

        {/* LIST WITH SEARCH (Fixed Scrollbars) */}
        <div className="bg-white p-6 rounded-xl shadow-md border border-gray-200 flex flex-col">
            
            {/* SEARCH HEADER */}
            <div className="flex flex-col sm:flex-row justify-between items-center mb-4 gap-4">
                <h3 className="text-lg font-bold text-gray-800 flex items-center gap-2">
                    {activeFilter === 'All' ? 'Recent Tickets' : `${activeFilter} Tickets`}
                    <span className="text-xs font-normal text-gray-500 bg-gray-100 px-2 py-1 rounded-full">
                        {filteredGrievances.length}
                    </span>
                </h3>
                
                <div className="relative w-full sm:w-64">
                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                        <Search className="h-4 w-4 text-gray-400" />
                    </div>
                    <input
                        type="text"
                        placeholder="Search tickets..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        className="block w-full pl-10 pr-8 py-2 border border-gray-300 rounded-lg text-sm bg-gray-50 focus:bg-white focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
                    />
                    {searchTerm && (
                        <button 
                            onClick={() => setSearchTerm('')}
                            className="absolute inset-y-0 right-0 pr-3 flex items-center text-gray-400 hover:text-red-500"
                        >
                            <X size={14} />
                        </button>
                    )}
                </div>
            </div>

            {/* TABLE - Removed max-h to prevent nested scrollbars */}
            <div className="overflow-x-auto"> 
                <table className="min-w-full text-sm text-left">
                    <thead className="bg-gray-50 text-gray-500 font-medium">
                        <tr>
                            <th className="px-4 py-3 rounded-l-lg">ID</th>
                            <th className="px-4 py-3">Title</th>
                            <th className="px-4 py-3">Status</th>
                            <th className="px-4 py-3 rounded-r-lg">Date</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100">
                        {filteredGrievances.length > 0 ? (
                            filteredGrievances.map(g => (
                                <tr key={g.grievance_id} className="hover:bg-gray-50 transition-colors cursor-pointer group" onClick={() => navigate(`/admin/grievance/${g.ticket_id || g.grievance_id}`)}>
                                    <td className="px-4 py-3 font-mono text-blue-600 font-bold group-hover:underline whitespace-nowrap">
                                        #{g.ticket_id}
                                    </td>
                                    <td className="px-4 py-3 font-medium text-gray-800 truncate max-w-xs" title={g.title}>
                                        {g.title}
                                    </td>
                                    <td className="px-4 py-3 whitespace-nowrap">
                                        <span className={`px-2 py-1 rounded-full text-xs font-bold border ${
                                            g.status === 'Resolved' ? 'bg-green-50 text-green-700 border-green-100' : 
                                            g.status === 'Rejected' ? 'bg-red-50 text-red-700 border-red-100' : 
                                            g.status === 'Closed' ? 'bg-gray-50 text-gray-600 border-gray-100' :
                                            'bg-amber-50 text-amber-700 border-amber-100'}`}>
                                            {g.status}
                                        </span>
                                    </td>
                                    <td className="px-4 py-3 text-gray-500 whitespace-nowrap">
                                        {new Date(g.created_at).toLocaleDateString()}
                                    </td>
                                </tr>
                            ))
                        ) : (
                            <tr>
                                <td colSpan="4" className="text-center py-10 text-gray-400">
                                    {searchTerm ? `No matches for "${searchTerm}"` : `No ${activeFilter !== 'All' ? activeFilter : ''} tickets found`}
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

export default DepartmentDashboard;