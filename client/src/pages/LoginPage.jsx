import React, { useState, useContext } from 'react';
import { useNavigate, Link, useLocation } from 'react-router-dom';
import { AuthContext } from '../context/AuthContext';
import { toast } from 'react-toastify';

const LoginPage = () => {
  const [formData, setFormData] = useState({ email: '', password: '' });
  const { login } = useContext(AuthContext);
  const navigate = useNavigate();
  const location = useLocation();
  
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  
  const { email, password } = formData;
  const from = location.state?.from; 

  const onChange = (e) => setFormData({ ...formData, [e.target.name]: e.target.value });

  const onSubmit = async (e) => {
    e.preventDefault();
    setIsLoading(true);
    try {
      await login(email, password, navigate, from);
      toast.success("Welcome back.");
    } catch (err) {
      const errorMessage = err.response?.data?.msg || 'Invalid Credentials';
      toast.error(errorMessage);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex font-sans text-gray-800">
      
      {/* 1. LEFT SIDE - IMAGE & OVERLAY (Matches RM Portal) */}
      <div className="hidden lg:flex lg:w-3/5 relative bg-gray-900">
        {/* Background Image - Replace '/campus.jpg' with your actual image file */}
        <img 
            src="/campus.jpg" 
            alt="DTU Campus" 
            className="absolute inset-0 w-full h-full object-cover opacity-60"
            onError={(e) => {e.target.style.display='none'}} // Fallback to dark grey if image missing
        />
        
        {/* Content Overlay */}
        <div className="relative z-10 w-full h-full flex flex-col items-center justify-center text-center px-12 text-white">
            <h1 className="text-3xl font-bold tracking-wider mb-2 uppercase">Delhi Technological University</h1>
            <p className="text-sm font-semibold tracking-widest uppercase mb-12 opacity-90">Hostel Administration</p>
            
            <div className="bg-black/40 backdrop-blur-sm p-8 rounded-xl border border-white/10 max-w-2xl">
                <p className="text-lg italic font-light leading-relaxed">
                    "A safe and well-managed hostel is the foundation of a productive campus life. Report issues, track resolutions, and stay connected with your hostel community."
                </p>
            </div>
        </div>
      </div>

      {/* 2. RIGHT SIDE - FORM (Matches RM Portal inputs) */}
      <div className="w-full lg:w-2/5 flex flex-col items-center justify-center p-8 bg-white">
        
        <div className="w-full max-w-md space-y-6">
            
            {/* Header with Logo */}
            <div className="flex flex-col items-center text-center mb-8">
                {/* Logo from your public folder */}
                <img src="/dtu-logo.jpg" alt="DTU Seal" className="w-24 h-24 mb-6" />
                
                <h2 className="text-2xl font-bold text-gray-900 uppercase tracking-tight">
                    DTU Hostel Management Login
                </h2>
            </div>

            <form onSubmit={onSubmit} className="space-y-5">
                
                {/* Email Input - Filled Style */}
                <div className="space-y-1">
                    <label className="text-sm font-semibold text-gray-600 ml-1">Email</label>
                    <input
                        type="email"
                        name="email"
                        value={email}
                        onChange={onChange}
                        required
                        className="w-full px-4 py-3 rounded-lg bg-gray-100 border-transparent focus:bg-white focus:ring-2 focus:ring-gray-900 focus:border-transparent transition-all outline-none"
                        placeholder="rollno@dtu.ac.in"
                    />
                </div>

                {/* Password Input - Filled Style */}
                <div className="space-y-1">
                    <label className="text-sm font-semibold text-gray-600 ml-1">Password</label>
                    <div className="relative">
                        <input
                            type={showPassword ? "text" : "password"}
                            name="password"
                            value={password}
                            onChange={onChange}
                            required
                            className="w-full px-4 py-3 rounded-lg bg-gray-100 border-transparent focus:bg-white focus:ring-2 focus:ring-gray-900 focus:border-transparent transition-all outline-none"
                            placeholder="••••••••"
                        />
                         <button
                            type="button"
                            onClick={() => setShowPassword(!showPassword)}
                            className="absolute inset-y-0 right-0 pr-3 flex items-center text-xs font-bold text-gray-500 hover:text-gray-800 uppercase"
                        >
                            {showPassword ? "Hide" : "Show"}
                        </button>
                    </div>
                </div>

                {/* Buttons Stack */}
                <div className="space-y-4 pt-2">
                    {/* Primary Action - Dark/Black */}
                    <button
                        type="submit"
                        disabled={isLoading}
                        className={`w-full py-3 px-4 bg-gray-900 hover:bg-black text-white font-bold rounded-lg transition-all transform active:scale-95 shadow-lg ${isLoading ? 'opacity-70 cursor-not-allowed' : ''}`}
                    >
                        {isLoading ? 'Signing In...' : 'Sign In'}
                    </button>

                    {/* Secondary Action - Light Gray */}
                    <Link 
                        to="/register" 
                        state={{ from: from }}
                        className="block w-full text-center py-3 px-4 bg-gray-100 hover:bg-gray-200 text-gray-800 font-bold rounded-lg transition-colors"
                    >
                        Register for Hostel Portal
                    </Link>
                </div>

            </form>

            <div className="text-center pt-4">
                <Link to="/forgot-password" className="text-sm font-medium text-gray-500 hover:text-gray-900">
                    Forgot Password?
                </Link>
            </div>

        </div>

         {/* Footer text usually found in official portals */}
         <div className="mt-12 text-center text-xs text-gray-400">
            &copy; 2025 Delhi Technological University • Computer Center
         </div>
      </div>
    </div>
  );
};

export default LoginPage;