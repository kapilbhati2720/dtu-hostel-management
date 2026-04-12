import React, { useContext, useEffect, useState } from 'react';
import { AuthContext } from '../context/AuthContext';
import { Link, useNavigate } from 'react-router-dom';
import axios from 'axios';
import { 
  FileText, 
  Plus, 
  IdCard, 
  GraduationCap, 
  Cpu, 
  Mail,
  Clock,
  CheckCircle,
  AlertCircle,
  Loader2
} from 'lucide-react';

const DashboardPage = () => {
  const { user, logout } = useContext(AuthContext);
  const navigate = useNavigate();

  // State for grievance statistics
  const [stats, setStats] = useState({
    pending: 0,
    resolved: 0,
    total: 0
  });
  const [loadingStats, setLoadingStats] = useState(true);

  // Fetch grievance statistics on component mount
  useEffect(() => {
    const fetchStats = async () => {
      try {
        // Ensure this endpoint exists in your backend!
        const res = await axios.get('/api/grievances/stats');
        setStats(res.data);
      } catch (err) {
        console.error("Failed to load dashboard stats", err);
        // Optional: toast.error("Could not load stats");
      } finally {
        setLoadingStats(false);
      }
    };

    fetchStats();
  }, []);

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  if (!user) {
    return (
      <div className="flex h-[80vh] items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    // Darker background (bg-slate-100) for better contrast
    <div className="min-h-screen bg-slate-100 py-10 px-4 sm:px-6 lg:px-8">
      <div className="max-w-6xl mx-auto space-y-8">
        
        {/* 1. WELCOME HEADER & PROFILE */}
        {/* Added shadow-md for depth */}
        <div className="bg-white rounded-2xl shadow-md border border-gray-200 overflow-hidden">
          {/* Header Strip */}
          <div className="bg-slate-900 px-8 py-8">
            <div className="flex justify-between items-center">
                <div>
                    <h1 className="text-3xl font-bold text-white">Dashboard</h1>
                    <p className="text-blue-200 mt-2 font-medium">Welcome back, {user.full_name}</p>
                </div>
                <div className="hidden sm:flex h-14 w-14 bg-white/10 rounded-full items-center justify-center border border-white/20 text-white text-xl font-bold backdrop-blur-sm">
                    {user.full_name?.charAt(0)}
                </div>
            </div>
          </div>
          
          <div className="px-8 py-6 bg-white">
            <h3 className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-6">Resident Profile</h3>
            
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                
                {/* Roll Number */}
                <div className="flex items-start gap-4 p-3 rounded-lg hover:bg-slate-50 transition-colors border border-transparent hover:border-slate-100">
                    <div className="p-2.5 bg-blue-50 text-blue-600 rounded-lg">
                        <IdCard size={20} />
                    </div>
                    <div>
                        <p className="text-xs text-gray-500 font-medium uppercase">Roll Number</p>
                        <p className="font-bold text-gray-900 mt-0.5">{user.roll_number || 'N/A'}</p>
                    </div>
                </div>

                {/* Branch */}
                <div className="flex items-start gap-4 p-3 rounded-lg hover:bg-slate-50 transition-colors border border-transparent hover:border-slate-100">
                    <div className="p-2.5 bg-purple-50 text-purple-600 rounded-lg">
                        <Cpu size={20} />
                    </div>
                    <div>
                        <p className="text-xs text-gray-500 font-medium uppercase">Branch</p>
                        <p className="font-bold text-gray-900 mt-0.5">{user.branch_code || 'N/A'}</p>
                    </div>
                </div>

                {/* Admission Year */}
                <div className="flex items-start gap-4 p-3 rounded-lg hover:bg-slate-50 transition-colors border border-transparent hover:border-slate-100">
                    <div className="p-2.5 bg-orange-50 text-orange-600 rounded-lg">
                        <GraduationCap size={20} />
                    </div>
                    <div>
                        <p className="text-xs text-gray-500 font-medium uppercase">Batch Year</p>
                        <p className="font-bold text-gray-900 mt-0.5">{user.admission_year || 'N/A'}</p>
                    </div>
                </div>

                {/* Email */}
                <div className="flex items-start gap-4 p-3 rounded-lg hover:bg-slate-50 transition-colors border border-transparent hover:border-slate-100">
                    <div className="p-2.5 bg-green-50 text-green-600 rounded-lg shrink-0">
                        <Mail size={20} />
                    </div>
                    <div className="min-w-0 flex-1">
                        <p className="text-xs text-gray-500 font-medium uppercase">DTU Email</p>
                        <p className="font-bold text-gray-900 mt-0.5 break-all text-sm leading-tight">
                            {user.email}
                        </p>
                    </div>
                </div>

            </div>
          </div>
        </div>

        {/* 2. ACTION CARDS */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            
            {/* Submit Grievance - Added shadow-md */}
            <Link to="/submit-grievance" className="group bg-white p-8 rounded-2xl shadow-md border border-gray-200 hover:shadow-xl hover:border-blue-300 transition-all duration-300 transform hover:-translate-y-1">
                <div className="h-12 w-12 bg-blue-600 text-white rounded-xl flex items-center justify-center mb-6 shadow-lg shadow-blue-100 group-hover:scale-110 transition-transform">
                    <Plus size={24} strokeWidth={3} />
                </div>
                <h2 className="text-xl font-bold text-gray-900 mb-2">New Grievance</h2>
                <p className="text-gray-500 mb-6 text-sm leading-relaxed">
                    Facing an issue with your hostel? File a formal complaint here.
                </p>
                <span className="text-sm font-bold text-blue-600 flex items-center gap-1">
                    File Complaint <span className="transition-transform group-hover:translate-x-1">→</span>
                </span>
            </Link>

            {/* Track Status - Added shadow-md */}
            <Link to="/my-grievances" className="group bg-white p-8 rounded-2xl shadow-md border border-gray-200 hover:shadow-xl hover:border-green-300 transition-all duration-300 transform hover:-translate-y-1">
                <div className="h-12 w-12 bg-green-600 text-white rounded-xl flex items-center justify-center mb-6 shadow-lg shadow-green-100 group-hover:scale-110 transition-transform">
                    <FileText size={24} strokeWidth={2.5} />
                </div>
                <h2 className="text-xl font-bold text-gray-900 mb-2">Track Status</h2>
                <p className="text-gray-500 mb-6 text-sm leading-relaxed">
                    Check the progress of your tickets and view warden responses in real-time.
                </p>
                <span className="text-sm font-bold text-green-600 flex items-center gap-1">
                    View My Tickets <span className="transition-transform group-hover:translate-x-1">→</span>
                </span>
            </Link>

        </div>

        {/* 2b. HOSTEL MODULE CARDS */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <Link to="/my-leaves" className="group bg-white p-8 rounded-2xl shadow-md border border-gray-200 hover:shadow-xl hover:border-orange-300 transition-all duration-300 transform hover:-translate-y-1">
                <div className="h-12 w-12 bg-orange-500 text-white rounded-xl flex items-center justify-center mb-6 shadow-lg shadow-orange-100 group-hover:scale-110 transition-transform">
                    <Clock size={24} strokeWidth={2.5} />
                </div>
                <h2 className="text-xl font-bold text-gray-900 mb-2">My Leaves</h2>
                <p className="text-gray-500 mb-6 text-sm leading-relaxed">
                    Apply for hostel leave and check the status of your applications.
                </p>
                <span className="text-sm font-bold text-orange-600 flex items-center gap-1">
                    View Leaves <span className="transition-transform group-hover:translate-x-1">→</span>
                </span>
            </Link>

            <Link to="/announcements" className="group bg-white p-8 rounded-2xl shadow-md border border-gray-200 hover:shadow-xl hover:border-purple-300 transition-all duration-300 transform hover:-translate-y-1">
                <div className="h-12 w-12 bg-purple-600 text-white rounded-xl flex items-center justify-center mb-6 shadow-lg shadow-purple-100 group-hover:scale-110 transition-transform">
                    <AlertCircle size={24} strokeWidth={2.5} />
                </div>
                <h2 className="text-xl font-bold text-gray-900 mb-2">Announcements</h2>
                <p className="text-gray-500 mb-6 text-sm leading-relaxed">
                    View notices and updates from your hostel warden and staff.
                </p>
                <span className="text-sm font-bold text-purple-600 flex items-center gap-1">
                    View Notices <span className="transition-transform group-hover:translate-x-1">→</span>
                </span>
            </Link>
        </div>

        {/* 3. QUICK OVERVIEW */}
        <div className="bg-white rounded-2xl border border-gray-200 p-6 shadow-md">
            <h3 className="text-sm font-bold text-gray-900 uppercase tracking-wide mb-5">Quick Overview</h3>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                 
                 <div className="flex items-center gap-4 p-4 rounded-xl border border-gray-100 bg-slate-50">
                    <div className="p-3 bg-yellow-100 text-yellow-700 rounded-full"><Clock size={20} /></div>
                    <div>
                        <p className="text-2xl font-bold text-gray-900">
                          {loadingStats ? <Loader2 className="animate-spin h-5 w-5"/> : stats.pending}
                        </p>
                        <p className="text-xs text-gray-500 font-medium">Pending</p>
                    </div>
                 </div>

                 <div className="flex items-center gap-4 p-4 rounded-xl border border-gray-100 bg-slate-50">
                    <div className="p-3 bg-green-100 text-green-700 rounded-full"><CheckCircle size={20} /></div>
                    <div>
                        <p className="text-2xl font-bold text-gray-900">
                          {loadingStats ? <Loader2 className="animate-spin h-5 w-5"/> : stats.resolved}
                        </p>
                        <p className="text-xs text-gray-500 font-medium">Resolved</p>
                    </div>
                 </div>

                 <div className="flex items-center gap-4 p-4 rounded-xl border border-gray-100 bg-slate-50">
                    <div className="p-3 bg-blue-100 text-blue-700 rounded-full"><AlertCircle size={20} /></div>
                    <div>
                        <p className="text-2xl font-bold text-gray-900">
                          {loadingStats ? <Loader2 className="animate-spin h-5 w-5"/> : stats.total}
                        </p>
                        <p className="text-xs text-gray-500 font-medium">Total</p>
                    </div>
                 </div>

            </div>
        </div>

      </div>
    </div>
  );
};

export default DashboardPage;