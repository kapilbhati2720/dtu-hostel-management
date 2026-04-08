import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import axios from 'axios';
import { 
  PieChart, Pie, Cell, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip as RechartsTooltip, Legend, ResponsiveContainer 
} from 'recharts';
import { Search, Flame, Users, ArrowRight } from 'lucide-react';
import UserList from '../components/admin/UserList';

// --- 1. OPTIMIZED ANIMATION (Kept your original logic) ---
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

// --- 2. SKELETON LOADER (Kept your original) ---
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
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mb-10">
      <div className="h-80 bg-gray-200 rounded-xl shadow-sm"></div>
      <div className="h-80 bg-gray-200 rounded-xl shadow-sm"></div>
    </div>
    <div className="h-96 bg-gray-200 rounded-xl shadow-sm"></div>
  </div>
);

const SuperAdminDashboard = () => {
  const [analytics, setAnalytics] = useState(null);
  const [loading, setLoading] = useState(true);
  const [trendingIssues, setTrendingIssues] = useState([]);
  const [lastUpdated, setLastUpdated] = useState(new Date());
  const [isRefreshing, setIsRefreshing] = useState(false);
  
  // NEW: Search State
  const [searchTerm, setSearchTerm] = useState('');
  
  const navigate = useNavigate(); 

  const COLORS = ['#6366f1', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#ec4899'];

  const fetchAnalytics = async () => {
    try {
      setIsRefreshing(true);
      // Fetch both APIs simultaneously
      const [analyticsRes, trendingRes] = await Promise.all([
          axios.get('/api/admin/analytics'),
          axios.get('/api/grievances/public/trending')
      ]);
      
      setAnalytics(analyticsRes.data);
      setTrendingIssues(trendingRes.data.slice(0, 3)); // Grab only the top 3
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

  useEffect(() => {
    fetchAnalytics();
  }, []);

  const handleExportCSV = () => {
    if (!analytics) return;
    const { kpis, byCategory, byStatus } = analytics;
    
    const extractRows = (data) => {
        if(!data) return [];
        if (Array.isArray(data)) {
             return data.map(item => [item.name || item._id, item.value || item.count]);
        }
        return Object.entries(data);
    };

    const catRows = normalizeChartData(byCategory).map(i => [i.name, i.value]);
    const statRows = normalizeChartData(byStatus).map(i => [i.name, i.value]);

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
      [],
      ['--- CATEGORY DISTRIBUTION ---'],
      ['Hostel', 'Count'],
      ...catRows,
      [],
      ['--- STATUS OVERVIEW ---'],
      ['Status', 'Count'],
      ...statRows,
    ];

    const csvContent = "data:text/csv;charset=utf-8," + rows.map(e => e.join(",")).join("\n");
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `hostel_report_${new Date().toISOString().slice(0,10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const normalizeChartData = (data) => {
    if (!data) return [];
    let processedData = [];
    if (Array.isArray(data)) {
        processedData = data.map(item => ({
            name: item._id || item.category || item.status || 'Unknown',
            value: Number(item.count || item.total || 0)
        }));
    } else {
        processedData = Object.entries(data).map(([name, value]) => ({ 
            name, 
            value: Number(value)
        }));
    }
    return processedData.filter(item => item.value > 0);
  };

  if (loading) return <DashboardSkeleton />;

  const pieData = normalizeChartData(analytics?.byCategory);
  const barData = normalizeChartData(analytics?.byStatus);
  const { kpis } = analytics || { kpis: { total: 0, pending: 0, resolved: 0 } };
  const resolutionRate = kpis.total > 0 ? Math.round((kpis.resolved / kpis.total) * 100) : 0;

  const handlePieClick = (data) => {
    if (data && data.name) {
        navigate(`/admin/grievances/hostel/${encodeURIComponent(data.name)}`);
    }
  };

  const handleBarClick = (data) => {
    if (data && data.name) {
        navigate(`/admin/grievances/status/${encodeURIComponent(data.name)}`);
    }
  };

  const renderPieLabel = ({ cx, cy, midAngle, innerRadius, outerRadius, percent }) => {
    const RADIAN = Math.PI / 180;
    const radius = innerRadius + (outerRadius - innerRadius) * 0.5;
    const x = cx + radius * Math.cos(-midAngle * RADIAN);
    const y = cy + radius * Math.sin(-midAngle * RADIAN);
    return (
      <text x={x} y={y} fill="white" textAnchor={x > cx ? 'start' : 'end'} dominantBaseline="central" className="text-xs font-bold">
        {`${(percent * 100).toFixed(0)}%`}
      </text>
    );
  };

  const CustomTooltip = ({ active, payload, label }) => {
    if (active && payload && payload.length) {
      return (
        <div className="bg-white p-3 border border-gray-200 shadow-xl rounded-lg z-50">
          <p className="font-bold text-gray-800">{label}</p>
          <p className="text-blue-600 font-semibold">{payload[0].value} Tickets</p>
          <p className="text-xs text-gray-400 mt-1">Click to filter list</p>
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
          <h1 className="text-3xl font-extrabold text-gray-800 tracking-tight">Super Admin Dashboard</h1>
          <p className="text-gray-500 mt-1">Real-time overview of grievance portal performance</p>
        </div>
        <div className="text-right mt-4 md:mt-0 flex items-center gap-3">
             <span className="text-sm text-gray-500 mr-2">
                Data from: <span className="font-mono font-semibold text-gray-700">{lastUpdated.toLocaleTimeString()}</span>
             </span>
             <button 
                onClick={fetchAnalytics}
                className={`p-2 bg-white border border-gray-300 rounded-lg shadow-sm hover:bg-gray-50 text-gray-600 transition-all ${isRefreshing ? 'animate-spin' : ''}`}
                title="Refresh Data"
             >
                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" /></svg>
             </button>
             
             <button 
                onClick={handleExportCSV}
                className="px-4 py-2 rounded-lg shadow-sm text-sm font-medium border bg-green-600 text-white border-green-700 hover:bg-green-700 flex items-center gap-2 transition-colors"
            >
                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" /></svg>
                Export CSV
            </button>
        </div>
      </div>

      {/* KPI CARDS (Restored Original Look) */}
      <div id="kpi-grid" className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-10 auto-rows-fr">
        <Link to="/admin/grievances/all/all" className="group h-full block card-container no-print-link">
            <div className="bg-white p-6 rounded-xl shadow-md border border-gray-200 border-l-4 border-l-indigo-500 relative overflow-hidden h-full flex flex-col justify-between transition-all duration-300 hover:shadow-lg hover:-translate-y-1">
                <div>
                    <p className="text-xs font-bold text-gray-400 uppercase tracking-wider">Total Volume</p>
                    <h3 className="text-4xl font-extrabold text-gray-800 mt-2"><AnimatedNumber value={kpis.total} /></h3>
                </div>
                <div className="mt-4 text-xs font-medium text-indigo-500 opacity-0 group-hover:opacity-100 transition-opacity no-print">View All Logs &rarr;</div>
            </div>
        </Link>

        <Link to="/admin/grievances/status/Submitted" className="group h-full block card-container no-print-link">
            <div className="bg-white p-6 rounded-xl shadow-md border border-gray-200 border-l-4 border-l-amber-500 relative overflow-hidden h-full flex flex-col justify-between transition-all duration-300 hover:shadow-lg hover:-translate-y-1">
                <div>
                    <p className="text-xs font-bold text-gray-400 uppercase tracking-wider">Pending Action</p>
                    <h3 className="text-4xl font-extrabold text-gray-800 mt-2"><AnimatedNumber value={kpis.pending} /></h3>
                </div>
                <div className="mt-4 text-xs font-medium text-amber-500 opacity-0 group-hover:opacity-100 transition-opacity no-print">View Queue &rarr;</div>
            </div>
        </Link>

        <Link to="/admin/grievances/status/Resolved" className="group h-full block card-container no-print-link">
            <div className="bg-white p-6 rounded-xl shadow-md border border-gray-200 border-l-4 border-l-emerald-500 relative overflow-hidden h-full flex flex-col justify-between transition-all duration-300 hover:shadow-lg hover:-translate-y-1">
                <div>
                    <p className="text-xs font-bold text-gray-400 uppercase tracking-wider">Total Resolved</p>
                    <h3 className="text-4xl font-extrabold text-gray-800 mt-2"><AnimatedNumber value={kpis.resolved} /></h3>
                </div>
                 <div className="mt-4 text-xs font-medium text-emerald-500 opacity-0 group-hover:opacity-100 transition-opacity no-print">View History &rarr;</div>
            </div>
        </Link>

        <div className="bg-white p-6 rounded-xl shadow-md border border-gray-200 border-l-4 border-l-blue-500 relative overflow-hidden h-full flex flex-col justify-between transition-all duration-300 hover:shadow-lg card-container">
            <div>
                <p className="text-xs font-bold text-gray-400 uppercase tracking-wider">Efficiency</p>
                <h3 className="text-4xl font-extrabold text-gray-800 mt-2"><AnimatedNumber value={resolutionRate} />%</h3>
            </div>
            <div className="mt-4 w-full bg-gray-100 rounded-full h-1.5 overflow-hidden">
                <div className="bg-blue-500 h-1.5 rounded-full transition-all duration-1000" style={{ width: `${resolutionRate}%` }}></div>
            </div>
        </div>
      </div>

      {/* PRIORITY HEATMAP / TRENDING ISSUES */}
      {trendingIssues.length > 0 && (
          <div className="mb-10 animate-fade-in">
              <div className="flex items-center gap-2 mb-4">
                  <Flame className="text-orange-500" size={24} />
                  <h2 className="text-xl font-bold text-gray-800">High Priority Campus Issues</h2>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                  {trendingIssues.map(issue => (
                      <Link 
                          key={issue.ticket_id} 
                          to={`/admin/grievance/${issue.ticket_id}`} 
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
                              <p className="text-xs text-gray-500">#{issue.ticket_id} • Submitted {new Date(issue.created_at).toLocaleDateString()}</p>
                          </div>
                          <div className="mt-5 flex items-center justify-between text-sm">
                              <span className="text-orange-600 font-bold">Review Issue</span>
                              <ArrowRight size={16} className="text-orange-600 transform group-hover:translate-x-1 transition-transform" />
                          </div>
                      </Link>
                  ))}
              </div>
          </div>
        )
      }
      
      {/* CHARTS (Restored Original Look) */}
      <div id="charts-grid" className="grid grid-cols-1 lg:grid-cols-2 gap-8 mb-10">
        <div className="bg-white p-6 rounded-xl shadow-md border border-gray-200 flex flex-col hover:shadow-lg transition-shadow chart-container relative">
          <div className="flex justify-between items-center mb-6">
             <h3 className="text-lg font-bold text-gray-800">Distribution by Hostel</h3>
          </div>
          <div className="flex-1 min-h-[300px]">
            {pieData.length > 0 ? (
                <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                    <Pie data={pieData} cx="50%" cy="50%" innerRadius={0} outerRadius={80} fill="#8884d8" paddingAngle={2} dataKey="value" label={renderPieLabel} labelLine={false} onClick={handlePieClick} className="cursor-pointer outline-none">
                    {pieData.map((entry, index) => <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} className="hover:opacity-80 transition-opacity" />)}
                    </Pie>
                    <RechartsTooltip content={<CustomTooltip />} cursor={{ fill: 'transparent' }} />
                    <Legend verticalAlign="bottom" height={36} iconType="circle"/>
                </PieChart>
                </ResponsiveContainer>
            ) : <div className="flex items-center justify-center h-full text-gray-400">No data available</div>}
          </div>
        </div>

        <div className="bg-white p-6 rounded-xl shadow-md border border-gray-200 flex flex-col hover:shadow-lg transition-shadow chart-container">
          <div className="flex justify-between items-center mb-6">
             <h3 className="text-lg font-bold text-gray-800">Grievance Status Overview</h3>
          </div>
          <div className="flex-1 min-h-[300px]">
             {barData.length > 0 ? (
                <ResponsiveContainer width="100%" height="100%">
                <BarChart data={barData} margin={{ top: 20, right: 30, left: 20, bottom: 5 }} onClick={(data) => data && data.activePayload && handleBarClick(data.activePayload[0].payload)} className="cursor-pointer">
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f3f4f6" />
                    <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{fill: '#6b7280', fontSize: 12}} dy={10} />
                    <YAxis axisLine={false} tickLine={false} tick={{fill: '#6b7280'}} allowDecimals={false} />
                    <RechartsTooltip cursor={{fill: '#f9fafb'}} content={<CustomTooltip />} />
                    <Bar dataKey="value" radius={[4, 4, 0, 0]} barSize={50}>
                        {barData.map((entry, index) => (
                            <Cell key={`cell-${index}`} fill={entry.name === 'Resolved' ? '#10b981' : entry.name === 'Rejected' ? '#ef4444' : entry.name === 'Escalated' ? '#f59e0b' : '#3b82f6'} className="hover:opacity-80 transition-opacity"/>
                        ))}
                    </Bar>
                </BarChart>
                </ResponsiveContainer>
             ) : <div className="flex items-center justify-center h-full text-gray-400">No data available</div>}
          </div>
        </div>
      </div>

      {/* --- USER LIST WITH SEARCH BAR --- */}
      <div className="bg-white rounded-xl shadow-md border border-gray-200 overflow-hidden card-container">
        
        {/* Simple Search Header */}
        <div className="px-6 pt-6 pb-2">
            <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                    <Search className="h-5 w-5 text-gray-400" />
                </div>
                <input
                    type="text"
                    placeholder="Search users by name, email, or roll number..."
                    className="block w-full pl-10 pr-3 py-2 border border-gray-300 rounded-lg leading-5 bg-gray-50 placeholder-gray-400 focus:outline-none focus:bg-white focus:ring-1 focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm transition-all"
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                />
            </div>
        </div>

        {/* Passing search term down */}
        <UserList searchTerm={searchTerm} />
      </div>

    </div>
  );
};

export default SuperAdminDashboard;