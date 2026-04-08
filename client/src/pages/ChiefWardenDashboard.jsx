import React, { useState, useEffect } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import axios from 'axios';
import { toast } from 'react-toastify';
import { 
  PieChart, Pie, Cell, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip as RechartsTooltip, Legend, ResponsiveContainer 
} from 'recharts';
import { Search, Flame, Users, ArrowRight, ArrowLeft, Building, ClipboardList, AlertCircle, CheckCircle } from 'lucide-react';
import UserList from '../components/admin/UserList';

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
      if (start >= end) {
        setCount(end); 
        clearInterval(timer);
      } else {
        setCount(start);
      }
    }, 16); 

    return () => clearInterval(timer);
  }, [value]);

  return <span>{count}</span>;
};

const DashboardSkeleton = () => (
  <div className="animate-pulse p-6 md:p-10 max-w-7xl mx-auto bg-gray-100 min-h-full">
    <div className="flex justify-between items-end mb-10">
        <div className="h-10 bg-gray-300 rounded w-1/3"></div>
        <div className="h-10 bg-gray-300 rounded w-48"></div>
    </div>
    <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-10">
      {[1, 2, 3, 4].map((i) => (
        <div key={i} className="h-32 bg-gray-200 rounded-xl shadow-sm"></div>
      ))}
    </div>
    <div className="h-40 bg-gray-200 rounded-xl shadow-sm mb-10"></div>
  </div>
);

const ChiefWardenDashboard = () => {
  const { hostelId } = useParams();
  const navigate = useNavigate();

  const [analytics, setAnalytics] = useState(null);
  const [hostelSummary, setHostelSummary] = useState([]);
  const [loading, setLoading] = useState(true);
  const [lastUpdated, setLastUpdated] = useState(new Date());
  const [isRefreshing, setIsRefreshing] = useState(false);
  
  const [searchTerm, setSearchTerm] = useState('');

  const COLORS = ['#6366f1', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#ec4899'];

  const fetchAnalytics = async () => {
    try {
      setIsRefreshing(true);
      if (hostelId) {
        const title = decodeURIComponent(hostelId);
        // We'll map hostel name to ID for the API call. To be safer, the API could take ID, but the router passes name currently.
        // Let's assume hostelId in useParams is actually the name, like what pie chart passes.
        // Wait, pie chart passes `name` to `/warden/hostel/:hostelId` which means it's a name.
        // We need to fetch the ID or modify the backend to accept name or change pie chart query.
        // Let's adjust backend using ID instead of name or just fetch all summaries and find ID.
      } else {
        const [globalRes, summaryRes] = await Promise.all([
          axios.get('/api/admin/analytics/global'),
          axios.get('/api/admin/hostels/summary')
        ]);
        setAnalytics(globalRes.data);
        setHostelSummary(summaryRes.data);
      }
      setLastUpdated(new Date());
    } catch (err) {
      console.error("Failed to fetch analytics", err);
    } finally {
      setTimeout(() => {
        setLoading(false);
        setIsRefreshing(false);
      }, 300);
    }
  };

  // We need a helper to find hostel_id because pie chart navigates with name.
  // Actually, let's fix pie chart rotation to navigate using ID. Let's do that below.

  useEffect(() => {
    const fetchSpecificHostel = async () => {
      try {
        setIsRefreshing(true);
        const res = await axios.get(`/api/admin/analytics/hostel/${hostelId}`);
        setAnalytics(res.data);
        setLastUpdated(new Date());
      } catch (err) {
        console.error(err);
      } finally {
        setTimeout(() => {
          setLoading(false);
          setIsRefreshing(false);
        }, 300);
      }
    };

    if (hostelId) {
      fetchSpecificHostel();
    } else {
      fetchAnalytics();
    }
  }, [hostelId]);

  const handleExportCSV = () => {
    if (!analytics) return;
    const { kpis, byCategory, byStatus, byHostel } = analytics;
    
    const extractRows = (data) => {
        if(!data) return [];
        return data.map(item => [item.name || item.hostel_name || item.category || item.status, item.value || item.count || 0]);
    };

    const rows = [
      ['DTU Hostel Management System - Executive Report'],
      ['Generated On', new Date().toLocaleString()],
      [],
      ['--- KPI SUMMARY ---'],
      ['Metric', 'Value'],
      ['Total Volume', kpis?.total || 0],
      ['Pending Action', kpis?.pending || 0],
      ['Total Resolved', kpis?.resolved || 0],
      ['Efficiency Rate', `${Math.round((kpis?.resolved / kpis?.total) * 100) || 0}%`],
      ['Pending Leaves', kpis?.pending_leaves || 0],
      [],
      ['--- CATEGORY DISTRIBUTION ---'],
      ['Category', 'Count'],
      ...extractRows(byCategory),
      [],
      ['--- STATUS OVERVIEW ---'],
      ['Status', 'Count'],
      ...extractRows(byStatus),
    ];

    if (byHostel) {
        rows.push([], ['--- HOSTEL DISTRIBUTION ---'], ['Hostel', 'Count'], ...extractRows(byHostel));
    }

    const csvContent = "data:text/csv;charset=utf-8," + rows.map(e => e.join(",")).join("\n");
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `hostel_report_${new Date().toISOString().slice(0,10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const normalizeChartData = (data, nameKey = 'name') => {
    if (!data) return [];
    return data.map(item => ({
        name: item[nameKey] || item.category || item.status || item.hostel_name || 'Unknown',
        value: Number(item.count || item.total || item.pending || 0),
        raw: item
    })).filter(item => item.value > 0);
  };

  if (loading) return <DashboardSkeleton />;

  // --- HOSTEL SPECIFIC VIEW ---
  if (hostelId && analytics && analytics.hostel) {
    const { hostel, kpis, byStatus, recentLeaves, staffDirectory, recentTickets } = analytics;
    const resolutionRate = kpis.total > 0 ? Math.round((kpis.resolved / kpis.total) * 100) : 0;
    const barData = normalizeChartData(byStatus);

    return (
      <div className="p-6 md:p-10 max-w-7xl mx-auto bg-gray-100 min-h-full">
        {/* HEADER */}
        <div className="flex flex-col md:flex-row justify-between items-end mb-10">
          <div>
            <Link to="/warden/dashboard" className="text-blue-600 flex items-center gap-1 mb-2 font-semibold hover:underline">
               <ArrowLeft size={16}/> Back to Global Overview
            </Link>
            <h1 className="text-3xl font-extrabold text-gray-800 tracking-tight">{hostel.name}</h1>
            <p className="text-gray-500 mt-1">Hostel Detail Dashboard</p>
          </div>
          <div className="text-right mt-4 md:mt-0 flex items-center gap-3">
             <span className="text-sm text-gray-500 mr-2">
                Data from: <span className="font-mono font-semibold text-gray-700">{lastUpdated.toLocaleTimeString()}</span>
             </span>
             <button 
                onClick={() => { setLoading(true); setAnalytics(null); fetchAnalytics(); }}
                className={`p-2 bg-white border border-gray-300 rounded-lg shadow-sm hover:bg-gray-50 transition-all ${isRefreshing ? 'animate-spin' : ''}`}
             >
                <ClipboardList className="h-5 w-5 text-gray-600"/>
             </button>
          </div>
        </div>

        {/* KPI CARDS */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-10">
          <div className="bg-white p-6 rounded-xl shadow-sm border border-l-4 border-l-blue-500 relative overflow-hidden">
             <p className="text-xs font-bold text-gray-400 uppercase">Total Tickets</p>
             <h3 className="text-4xl font-extrabold text-gray-800 mt-2">{kpis.total || 0}</h3>
          </div>
          <div className="bg-white p-6 rounded-xl shadow-sm border border-l-4 border-l-amber-500 relative overflow-hidden">
             <p className="text-xs font-bold text-gray-400 uppercase">Pending Action</p>
             <h3 className="text-4xl font-extrabold text-gray-800 mt-2">{kpis.pending || 0}</h3>
          </div>
          <div className="bg-white p-6 rounded-xl shadow-sm border border-l-4 border-l-emerald-500 relative overflow-hidden">
             <p className="text-xs font-bold text-gray-400 uppercase">Efficiency</p>
             <h3 className="text-4xl font-extrabold text-gray-800 mt-2">{resolutionRate}%</h3>
          </div>
          <div className="bg-white p-6 rounded-xl shadow-sm border border-l-4 border-l-purple-500 relative overflow-hidden">
             <p className="text-xs font-bold text-gray-400 uppercase">Pending Leaves</p>
             <h3 className="text-4xl font-extrabold text-gray-800 mt-2">{kpis.pending_leaves || 0}</h3>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mb-10">
           {/* Chart */}
           <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-200 chat-container flex flex-col">
             <h3 className="text-lg font-bold text-gray-800 mb-6 flex-shrink-0">Status Breakdown</h3>
             <div className="h-[300px] w-full">
             {barData.length > 0 ? (
                <ResponsiveContainer width="100%" height="100%">
                <BarChart data={barData} margin={{ top: 20, right: 30, left: 20, bottom: 5 }} >
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f3f4f6" />
                    <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{fill: '#6b7280', fontSize: 12}} dy={10} />
                    <YAxis axisLine={false} tickLine={false} tick={{fill: '#6b7280'}} allowDecimals={false} />
                    <RechartsTooltip cursor={{fill: '#f9fafb'}} />
                    <Bar dataKey="value" radius={[4, 4, 0, 0]} barSize={50}>
                        {barData.map((entry, index) => (
                            <Cell key={`cell-${index}`} fill={entry.name === 'Resolved' ? '#10b981' : entry.name === 'Rejected' ? '#ef4444' : entry.name === 'Escalated' ? '#f59e0b' : '#3b82f6'} />
                        ))}
                    </Bar>
                </BarChart>
                </ResponsiveContainer>
             ) : <div className="flex items-center justify-center h-full text-gray-400">No data available</div>}
             </div>
           </div>
           
           {/* Current Staff */}
           <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-200 overflow-y-auto max-h-[400px]">
             <h3 className="text-lg font-bold text-gray-800 mb-4">Hostel Directory</h3>
             <ul className="divide-y divide-gray-100">
               {staffDirectory.map(staff => (
                 <li key={staff.user_id} className="py-3 flex flex-col justify-start">
                    <p className="text-sm font-semibold text-gray-900">{staff.full_name}</p>
                    <p className="text-xs text-gray-500">{staff.email}</p>
                    <span className="mt-1 w-fit bg-indigo-50 text-indigo-700 px-2 py-0.5 rounded text-xs font-bold border border-indigo-100">
                      {staff.designation || 'Staff'}
                    </span>
                 </li>
               ))}
               {staffDirectory.length === 0 && <p className="text-sm text-gray-500">No staff found.</p>}
             </ul>
           </div>
        </div>
      </div>
    );
  }

  // --- GLOBAL VIEW ---
  const pieData = normalizeChartData(analytics?.byHostel, 'hostel_name');
  const barData = normalizeChartData(analytics?.byStatus, 'status');
  const { kpis } = analytics || { kpis: { total: 0, pending: 0, resolved: 0, pending_leaves: 0, total_announcements: 0 } };
  const resolutionRate = kpis.total > 0 ? Math.round((kpis.resolved / kpis.total) * 100) : 0;

  const handlePieClick = (data) => {
    if (data && data.raw && data.raw.raw) { // Check structure from Recharts
       const label = data.raw.raw.name; // hostel name
       const matchingHostel = hostelSummary.find(h => h.name === label);
       if (matchingHostel) {
           navigate(`/warden/hostel/${matchingHostel.hostel_id}`);
       }
    }
  };

  const renderPieLabel = ({ cx, cy, midAngle, innerRadius, outerRadius, percent, value }) => {
    if (percent < 0.02) return null; // hide messy labels for tiny slices
    const RADIAN = Math.PI / 180;
    const radius = innerRadius + (outerRadius - innerRadius) * 0.5;
    const x = cx + radius * Math.cos(-midAngle * RADIAN);
    const y = cy + radius * Math.sin(-midAngle * RADIAN);

    return (
      <text x={x} y={y} fill="white" textAnchor="middle" dominantBaseline="central" className="text-xs font-bold">
        {value} ({(percent * 100).toFixed(0)}%)
      </text>
    );
  };

  const CustomTooltip = ({ active, payload }) => {
    if (active && payload && payload.length) {
      return (
        <div className="bg-white p-3 border border-gray-200 shadow-xl rounded-lg z-50">
          <p className="font-bold text-gray-800">{payload[0].name}</p>
          <p className="text-blue-600 font-semibold">{payload[0].value} Ticket{payload[0].value !== 1 ? 's' : ''}</p>
        </div>
      );
    }
    return null;
  };

  return (
    <div className="p-6 md:p-10 max-w-7xl mx-auto bg-gray-100 min-h-full">
      {/* HEADER */}
      <div className="flex flex-col md:flex-row justify-between items-end mb-10">
        <div>
          <h1 className="text-3xl font-extrabold text-gray-800 tracking-tight">Chief Warden Dashboard</h1>
          <p className="text-gray-500 mt-1">Global overview across all hostels</p>
        </div>
        <div className="text-right mt-4 md:mt-0 flex items-center gap-3">
             <button 
                onClick={handleExportCSV}
                className="px-4 py-2 rounded-lg shadow-sm text-sm font-medium border bg-green-600 text-white border-green-700 hover:bg-green-700 flex items-center gap-2 transition-colors"
            >
                Export CSV
            </button>
        </div>
      </div>

      {/* KPI CARDS */}
      {/* KPI CARDS */}
      <div className="grid grid-cols-1 md:grid-cols-5 gap-6 mb-10">
        <Link to="/warden/grievances/all/all" className="bg-white p-6 rounded-xl shadow-md border-l-4 border-l-indigo-500 hover:shadow-lg hover:-translate-y-1 transition-all cursor-pointer block">
            <p className="text-xs font-bold text-gray-400 uppercase tracking-wider">Total Tickets</p>
            <h3 className="text-3xl font-extrabold text-gray-800 mt-2"><AnimatedNumber value={kpis.total} /></h3>
        </Link>
        <Link to="/warden/grievances/status/Submitted" className="bg-white p-6 rounded-xl shadow-md border-l-4 border-l-amber-500 hover:shadow-lg hover:-translate-y-1 transition-all cursor-pointer block">
            <p className="text-xs font-bold text-gray-400 uppercase tracking-wider">Pending Tickets</p>
            <h3 className="text-3xl font-extrabold text-gray-800 mt-2"><AnimatedNumber value={kpis.pending} /></h3>
        </Link>
        <div className="bg-white p-6 rounded-xl shadow-md border-l-4 border-l-blue-500">
            <p className="text-xs font-bold text-gray-400 uppercase tracking-wider">Global Efficiency</p>
            <h3 className="text-3xl font-extrabold text-gray-800 mt-2"><AnimatedNumber value={resolutionRate} />%</h3>
        </div>
        <Link to="/warden/leaves" className="bg-white p-6 rounded-xl shadow-md border-l-4 border-l-purple-500 hover:shadow-lg hover:-translate-y-1 transition-all cursor-pointer block">
            <p className="text-xs font-bold text-gray-400 uppercase tracking-wider">Pending Leaves</p>
            <h3 className="text-3xl font-extrabold text-gray-800 mt-2"><AnimatedNumber value={kpis.pending_leaves} /></h3>
        </Link>
        <Link to="/warden/dashboard" className="bg-white p-6 rounded-xl shadow-md border-l-4 border-l-pink-500 hover:shadow-lg hover:-translate-y-1 transition-all cursor-pointer block" onClick={(e) => { e.preventDefault(); toast.info('Announcements view coming soon!'); }}>
            <p className="text-xs font-bold text-gray-400 uppercase tracking-wider">Announcements</p>
            <h3 className="text-3xl font-extrabold text-gray-800 mt-2"><AnimatedNumber value={kpis.total_announcements} /></h3>
        </Link>
      </div>

      {/* HOSTEL GRID */}
      <div className="mb-10">
        <h2 className="text-xl font-bold text-gray-800 mb-4 flex items-center gap-2"><Building size={20}/> Drill Down by Hostel</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {hostelSummary.map(hostel => {
             const efficiency = hostel.total_grievances > 0 ? Math.round((hostel.resolved_grievances / hostel.total_grievances) * 100) : 0;
             return (
               <Link 
                  key={hostel.hostel_id} 
                  to={`/warden/hostel/${hostel.hostel_id}`}
                  className="bg-white rounded-xl shadow-sm hover:shadow-md transition-shadow border border-gray-200 p-5 group flex flex-col justify-between"
               >
                 <div>
                    <h3 className="font-bold text-gray-900 group-hover:text-blue-600 transition-colors uppercase">{hostel.name}</h3>
                    <p className="text-xs text-gray-500 mt-1">Warden: {hostel.warden_name}</p>
                 </div>
                 <div className="mt-4 flex items-center justify-between">
                    <div className="bg-amber-50 text-amber-700 px-3 py-1 rounded-full text-xs font-bold border border-amber-200">
                      {hostel.pending_grievances} Pending
                    </div>
                    <div className="text-sm font-bold text-gray-700">
                      {efficiency}% EFF
                    </div>
                 </div>
               </Link>
             )
          })}
        </div>
      </div>

      {/* CHARTS */}
      <div id="charts-grid" className="grid grid-cols-1 lg:grid-cols-2 gap-8 mb-10">
        <div className="bg-white p-6 rounded-xl shadow-md border border-gray-200 flex flex-col h-[400px]">
          <h3 className="text-lg font-bold text-gray-800 mb-6">Distribution by Hostel</h3>
          <div className="flex-1 min-h-[300px]">
            {pieData.length > 0 ? (
                <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                    <Pie data={pieData} cx="50%" cy="50%" innerRadius={40} outerRadius={100} fill="#8884d8" paddingAngle={2} dataKey="value" label={renderPieLabel} onClick={handlePieClick} className="cursor-pointer outline-none">
                    {pieData.map((entry, index) => <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />)}
                    </Pie>
                    <RechartsTooltip content={<CustomTooltip />} />
                    <Legend wrapperStyle={{ paddingTop: '20px', fontSize: '14px' }} />
                </PieChart>
                </ResponsiveContainer>
            ) : <div className="text-gray-400">No data available</div>}
          </div>
        </div>

        <div className="bg-white p-6 rounded-xl shadow-md border border-gray-200 flex flex-col h-[400px]">
          <h3 className="text-lg font-bold text-gray-800 mb-6">Status Overview</h3>
          <div className="flex-1 min-h-[300px]">
             {barData.length > 0 ? (
                <ResponsiveContainer width="100%" height="100%">
                <BarChart data={barData} margin={{ top: 20, right: 30, left: 0, bottom: 5 }}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} />
                    <XAxis dataKey="name" axisLine={false} tickLine={false} />
                    <YAxis axisLine={false} tickLine={false} />
                    <RechartsTooltip />
                    <Bar dataKey="value" radius={[4, 4, 0, 0]} maxBarSize={50}>
                        {barData.map((entry, index) => (
                            <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                        ))}
                    </Bar>
                </BarChart>
                </ResponsiveContainer>
             ) : <div className="text-gray-400">No data available</div>}
          </div>
        </div>
      </div>

      {/* USER LIST WITH SEARCH BAR */}
      <div className="bg-white rounded-xl shadow-md border border-gray-200 overflow-hidden">
        <div className="px-6 pt-6 pb-2">
            <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                    <Search className="h-5 w-5 text-gray-400" />
                </div>
                <input
                    type="text"
                    placeholder="Search users by name, email, or roll number..."
                    className="block w-full pl-10 pr-3 py-2 border border-gray-300 rounded-lg leading-5 bg-gray-50 placeholder-gray-400 focus:outline-none focus:bg-white focus:ring-1 focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                />
            </div>
        </div>
        <UserList searchTerm={searchTerm} />
      </div>

    </div>
  );
};

export default ChiefWardenDashboard;
