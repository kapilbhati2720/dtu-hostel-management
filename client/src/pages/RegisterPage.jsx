import React, { useState, useContext } from 'react';
import { useNavigate, Link, useLocation } from 'react-router-dom';
import { AuthContext } from '../context/AuthContext';
import { toast } from 'react-toastify';

const RegisterPage = () => {
  const [formData, setFormData] = useState({
    full_name: '',
    email: '',
    password: '',
    confirm_password: ''
  });
  
  const { register } = useContext(AuthContext);
  const navigate = useNavigate();
  const location = useLocation();
  const [isLoading, setIsLoading] = useState(false);
  
  const { full_name, email, password, confirm_password } = formData;
  const from = location.state?.from || '/dashboard';

  const onChange = (e) => setFormData({ ...formData, [e.target.name]: e.target.value });

  const onSubmit = async (e) => {
    e.preventDefault();
    if (password !== confirm_password) {
      toast.error('Passwords do not match');
      return;
    }
    
    setIsLoading(true);
    try {
      await register({ full_name, email, password }, navigate); 
      toast.success("Account created successfully!");
      navigate(from); 
    } catch (err) {
        console.error("Full Error Object:", err);
        const errorMessage = err.response?.data?.msg || 'Registration failed';
        toast.error(errorMessage);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex font-sans text-gray-800">
      
      {/* 1. LEFT SIDE - IMAGE & OVERLAY */}
      <div className="hidden lg:flex lg:w-3/5 relative bg-gray-900">
         {/* Using same campus image for consistency */}
        <img 
            src="/campus.jpg" 
            alt="DTU Campus" 
            className="absolute inset-0 w-full h-full object-cover opacity-60"
            onError={(e) => {e.target.style.display='none'}} 
        />
        
        <div className="relative z-10 w-full h-full flex flex-col items-center justify-center text-center px-12 text-white">
            <h1 className="text-3xl font-bold tracking-wider mb-2 uppercase">Delhi Technological University</h1>
            <p className="text-sm font-semibold tracking-widest uppercase mb-12 opacity-90">Hostel Administration</p>
            
            <div className="bg-black/40 backdrop-blur-sm p-8 rounded-xl border border-white/10 max-w-2xl">
                 <h3 className="text-xl font-bold mb-4">Why Register?</h3>
                 <ul className="text-left space-y-3 text-sm font-light">
                    <li className="flex items-start gap-2">
                        <span>✓</span> Track grievance status in real-time
                    </li>
                    <li className="flex items-start gap-2">
                        <span>✓</span> Receive Email notifications
                    </li>
                    <li className="flex items-start gap-2">
                        <span>✓</span> Access anonymous reporting features
                    </li>
                 </ul>
            </div>
        </div>
      </div>

      {/* 2. RIGHT SIDE - FORM */}
      <div className="w-full lg:w-2/5 flex flex-col items-center justify-center p-8 bg-white">
        <div className="w-full max-w-md space-y-6">
            
            <div className="flex flex-col items-center text-center mb-6">
                <img src="/dtu-logo.jpg" alt="DTU Seal" className="w-20 h-20 mb-4" />
                <h2 className="text-2xl font-bold text-gray-900 uppercase tracking-tight">
                    New Account Registration
                </h2>
            </div>

            <form onSubmit={onSubmit} className="space-y-4">
                
                <div className="space-y-1">
                    <label className="text-sm font-semibold text-gray-600 ml-1">Full Name</label>
                    <input
                        type="text"
                        name="full_name"
                        value={full_name}
                        onChange={onChange}
                        required
                        className="w-full px-4 py-3 rounded-lg bg-gray-100 border-transparent focus:bg-white focus:ring-2 focus:ring-gray-900 focus:border-transparent transition-all outline-none"
                        placeholder="Kapil Bhati"
                    />
                </div>

                <div className="space-y-1">
                    <label className="text-sm font-semibold text-gray-600 ml-1">DTU Email</label>
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

                <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-1">
                        <label className="text-sm font-semibold text-gray-600 ml-1">Password</label>
                        <input
                            type="password"
                            name="password"
                            value={password}
                            onChange={onChange}
                            required
                            className="w-full px-4 py-3 rounded-lg bg-gray-100 border-transparent focus:bg-white focus:ring-2 focus:ring-gray-900 focus:border-transparent transition-all outline-none"
                            placeholder="••••••"
                        />
                    </div>
                    <div className="space-y-1">
                        <label className="text-sm font-semibold text-gray-600 ml-1">Confirm</label>
                        <input
                            type="password"
                            name="confirm_password"
                            value={confirm_password}
                            onChange={onChange}
                            required
                            className="w-full px-4 py-3 rounded-lg bg-gray-100 border-transparent focus:bg-white focus:ring-2 focus:ring-gray-900 focus:border-transparent transition-all outline-none"
                            placeholder="••••••"
                        />
                    </div>
                </div>

                <div className="pt-4">
                    <button
                        type="submit"
                        disabled={isLoading}
                        className={`w-full py-3 px-4 bg-gray-900 hover:bg-black text-white font-bold rounded-lg transition-all transform active:scale-95 shadow-lg ${isLoading ? 'opacity-70 cursor-not-allowed' : ''}`}
                    >
                        {isLoading ? 'Creating Account...' : 'Register'}
                    </button>
                </div>
                
                 <div className="text-center">
                    <span className="text-sm text-gray-500">Already registered? </span>
                    <Link to="/login" className="text-sm font-bold text-gray-900 hover:underline">
                        Sign In here
                    </Link>
                </div>

            </form>
        </div>
      </div>
    </div>
  );
};

export default RegisterPage;