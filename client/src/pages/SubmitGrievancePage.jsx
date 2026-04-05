import React, { useState, useEffect, useRef, useContext } from 'react';
import axios from 'axios';
import { useNavigate } from 'react-router-dom';
import { toast } from 'react-toastify';
import { AuthContext } from '../context/AuthContext';
import { 
  UploadCloud, FileText, X, AlertTriangle, Send, Search,
  CheckCircle, ArrowRight, AlertCircle, EyeOff, ShieldCheck, User,
  Scale, Gavel, Users,
  Code2, Terminal, Cpu, Zap, Wifi, Globe, Monitor, Wrench, Factory,
  HardHat, Compass, FlaskConical, Dna, Leaf, Atom, Calculator,
  Feather, Palette, Briefcase, LineChart, Landmark, Building2,
  Library, BedDouble, Utensils, BookOpen
} from 'lucide-react';

const SubmitGrievancePage = () => {
  const { user } = useContext(AuthContext);
  const navigate = useNavigate();
  
  // --- Master Mode Toggle ---
  // This state now dictates the entire behavior and look of the page.
  const [isSecureMode, setIsSecureMode] = useState(false);

  // Notice we removed 'isAnonymous' from here. It's now tied to isSecureMode.
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    category: '', 
  });
  const [departments, setDepartments] = useState([]); 
  const [files, setFiles] = useState([]); 
  const [isLoading, setIsLoading] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');

  const [similarTickets, setSimilarTickets] = useState([]);
  const [showDuplicateModal, setShowDuplicateModal] = useState(false);
  const [isChecking, setIsChecking] = useState(false);
  const checkTimeoutRef = useRef(null);

  useEffect(() => {
      const fetchDepartments = async () => {
          try {
              const res = await axios.get('/api/departments');
              setDepartments(res.data);
          } catch (err) {
              toast.error("Failed to load categories.");
          }
      };
      fetchDepartments();
  }, []);

  const { title, description, category } = formData;

  // --- Contextual Department Filtering ---
  const sensitiveDepts = ['Equal Opportunity Cell (EOC)', 'Internal Complaints Committee (ICC)', 'Board of Student Discipline'];
  
  const displayedDepartments = departments.filter(dept => {
      const isSensitive = sensitiveDepts.includes(dept.name);
      const matchesSearch = dept.name.toLowerCase().includes(searchTerm.toLowerCase());
      
      // If Secure Mode is ON, only show sensitive departments. Otherwise, show the rest.
      if (isSecureMode) return isSensitive && matchesSearch;
      return !isSensitive && matchesSearch;
  });

  // --- Auto-Reset ---
  // If the user switches modes, we MUST clear their selected category so they don't 
  // accidentally submit a sexual harassment claim to the IT department.
  useEffect(() => {
      setFormData(prev => ({ ...prev, category: '' }));
      setSearchTerm('');
  }, [isSecureMode]);

  const onChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });

    // --- AI Air-Gap ---
    // AI duplicate check ONLY runs if we are NOT in secure mode.
    if (!isSecureMode && (e.target.name === 'title' || e.target.name === 'description')) {
        const currentTitle = e.target.name === 'title' ? e.target.value : title;
        const currentDesc = e.target.name === 'description' ? e.target.value : description;

        if (currentTitle.length > 5 && currentDesc.length > 5) {
            if (checkTimeoutRef.current) clearTimeout(checkTimeoutRef.current);
            checkTimeoutRef.current = setTimeout(() => {
                checkDuplicates(currentTitle, currentDesc);
            }, 1500);
        }
    }
  };

  const onFileChange = (e) => {
      const selectedFiles = Array.from(e.target.files);
      if (selectedFiles.length > 2) return toast.error("Maximum 2 files allowed.");
      setFiles(selectedFiles);
  };

  const removeFile = (index) => setFiles(files.filter((_, i) => i !== index));

  const checkDuplicates = async (titleVal, descVal) => {
      try {
          setIsChecking(true);
          const res = await axios.post('/api/grievances/check-duplicate', { title: titleVal, description: descVal });
          if (res.data.matches && res.data.matches.length > 0) {
              setSimilarTickets(res.data.matches);
              setShowDuplicateModal(true);
          }
      } catch (err) {} finally { setIsChecking(false); }
  };

  const handleUpvote = async (ticketId) => {
      try {
          await axios.put(`/api/grievances/${ticketId}/upvote`);
          toast.success("You are now following this ticket. You'll receive updates on its progress.");
          navigate(`/my-grievances`); 
      } catch (err) {
          toast.error("Failed to follow ticket.");
      }
  };

  const onSubmit = async e => {
      e.preventDefault();
      setIsLoading(true);

      const data = new FormData();
      data.append('title', formData.title);
      data.append('description', formData.description);
      data.append('category', formData.category);
      // --- Bind the backend isAnonymous flag directly to the Master Toggle state ---
      data.append('isAnonymous', isSecureMode); 

      if (files) files.forEach(file => data.append('attachments', file));

      try {
          await axios.post('/api/grievances', data, { headers: { 'Content-Type': 'multipart/form-data' }});
          toast.success(isSecureMode ? 'Secure report submitted successfully.' : 'Grievance submitted successfully!');
          navigate('/my-grievances');
      } catch (err) {
          toast.error(err.response?.data?.msg || 'Failed to submit.');
      } finally {
          setIsLoading(false);
      }
  };

  // Specific icons for sensitive depts
  const getDeptIcon = (name) => {
      const lower = name.toLowerCase();
      // Secure Icons
      if (lower.includes('equal opportunity')) return <Users size={28} />;
      if (lower.includes('internal complaints')) return <Scale size={28} />;
      if (lower.includes('discipline')) return <Gavel size={28} />;
      
      // Standard Icons
      if (lower.includes('mechanical') || lower.includes(' me ')) return <Wrench size={28} />;
      if (lower.includes('production') || lower.includes('industrial') || lower.includes('pie')) return <Factory size={28} />;
      if (lower.includes('software') || lower.includes('se')) return <Terminal size={28} />;
      if (lower.includes('civil') || lower.includes(' ce ')) return <HardHat size={28} />;
      if (lower.includes('chemical') || lower.includes(' ch ')) return <FlaskConical size={28} />;
      if (lower.includes('environmental') || lower.includes('ene')) return <Leaf size={28} />;
      if (lower.includes('physics') || lower.includes(' ep ')) return <Atom size={28} />;
      if (lower.includes('math') || lower.includes('mc')) return <Calculator size={28} />;
      if (lower.includes('bio') || lower.includes('bt')) return <Dna size={28} />;
      if (lower.includes('computer science') || lower.includes('cse')) return <Code2 size={28} />;
      if (lower.includes('information technology') || lower.includes('it')) return <Globe size={28} />;
      if (lower.includes('computer centre')) return <Monitor size={28} />;
      if (lower.includes('electronics') || lower.includes('ece')) return <Cpu size={28} />;
      if (lower.includes('electrical') || lower.includes('ee')) return <Zap size={28} />;
      if (lower.includes('humanities')) return <Feather size={28} />;
      if (lower.includes('management') || lower.includes('usme') || lower.includes('dsm')) return <LineChart size={28} />;
      if (lower.includes('design')) return <Palette size={28} />;
      if (lower.includes('training') || lower.includes('placement') || lower.includes('tnp')) return <Briefcase size={28} />;
      if (lower.includes('hostel')) return <BedDouble size={28} />;
      if (lower.includes('library')) return <Library size={28} />;
      if (lower.includes('account')) return <Landmark size={28} />;
      if (lower.includes('admin')) return <Building2 size={28} />;
      if (lower.includes('mess') || lower.includes('food')) return <Utensils size={28} />;
      return <BookOpen size={28} />;
  };

  // --- DYNAMIC THEME OBJECT ---
  // This easily switches all Tailwind classes based on the active mode.
  const theme = isSecureMode 
    ? { 
        bg: 'bg-slate-900', 
        card: 'bg-slate-800 border-slate-700', 
        text: 'text-slate-100', 
        textMuted: 'text-slate-400', 
        primary: 'bg-purple-600 hover:bg-purple-700', 
        border: 'border-slate-700', 
        inputBg: 'bg-slate-900 focus:bg-slate-800 text-white focus:border-purple-500 focus:ring-purple-900' 
      }
    : { 
        bg: 'bg-slate-50', 
        card: 'bg-white border-gray-100', 
        text: 'text-gray-900', 
        textMuted: 'text-gray-600', 
        primary: 'bg-blue-600 hover:bg-blue-700', 
        border: 'border-gray-200', 
        inputBg: 'bg-gray-50 focus:bg-white text-gray-900 focus:border-blue-500 focus:ring-blue-50' 
      };

  return (
    <div className={`min-h-screen py-10 px-4 sm:px-6 lg:px-8 transition-colors duration-500 ${theme.bg} relative`}>
      <div className="max-w-5xl mx-auto">
        
        {/* --- THE MODE SWITCHER --- */}
        <div className="flex justify-center mb-10">
            <div className="bg-gray-200 p-1.5 rounded-full flex gap-1 relative shadow-inner w-full max-w-md">
                <button 
                    type="button"
                    onClick={() => setIsSecureMode(false)}
                    className={`flex-1 py-2.5 rounded-full text-sm font-bold flex items-center justify-center gap-2 transition-all duration-300 z-10 ${!isSecureMode ? 'bg-white text-blue-700 shadow-md' : 'text-gray-500 hover:text-gray-700'}`}
                >
                    <User size={18} /> Standard Grievance
                </button>
                <button 
                    type="button"
                    onClick={() => setIsSecureMode(true)}
                    className={`flex-1 py-2.5 rounded-full text-sm font-bold flex items-center justify-center gap-2 transition-all duration-300 z-10 ${isSecureMode ? 'bg-slate-800 text-purple-400 shadow-md' : 'text-gray-500 hover:text-gray-700'}`}
                >
                    <EyeOff size={18} /> Secure / Anonymous
                </button>
            </div>
        </div>

        <div className="mb-8">
            <h1 className={`text-3xl font-bold transition-colors ${theme.text}`}>
                {isSecureMode ? 'Secure Incident Report' : 'New Grievance'}
            </h1>
            <p className={`mt-2 transition-colors ${theme.textMuted}`}>
                {isSecureMode ? 'Your identity is masked. Data is air-gapped from AI and public feeds.' : 'Submit a formal request to the administration.'}
            </p>
        </div>
        
        {isChecking && !isSecureMode && (
            <div className="fixed bottom-8 right-8 z-[100] flex items-center gap-3 text-sm font-bold text-blue-700 bg-white px-5 py-3 rounded-2xl border-2 border-blue-100 shadow-2xl animate-bounce">
                <Search size={18} className="animate-pulse" /> AI Checking for duplicates...
            </div>
        )}

        <form onSubmit={onSubmit} className="space-y-6">
            <div className={`shadow-xl rounded-2xl p-8 border transition-colors duration-500 ${theme.card}`}>
                
                <div className="mb-8">
                    <label className={`block text-sm font-bold mb-3 ${theme.text}`}>
                        Route To <span className="text-red-500">*</span>
                    </label>
                    <div className="relative mb-4">
                        <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                            <Search className={`h-5 w-5 ${isSecureMode ? 'text-slate-500' : 'text-gray-400'}`} />
                        </div>
                        <input
                            type="text"
                            placeholder="Search available departments..."
                            className={`block w-full pl-10 pr-3 py-3 border rounded-xl transition-all outline-none ${theme.border} ${theme.inputBg}`}
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                        />
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4 max-h-80 overflow-y-auto pr-2 custom-scrollbar">
                        {displayedDepartments.length > 0 ? displayedDepartments.map(dept => (
                            <div 
                                key={dept.department_id} 
                                onClick={() => setFormData({...formData, category: dept.name})}
                                className={`cursor-pointer p-4 rounded-xl border flex flex-col items-center justify-center gap-3 text-center transition-all duration-200 ${
                                    category === dept.name 
                                        ? isSecureMode ? 'bg-purple-900 border-purple-500 text-white shadow-md transform scale-105' : 'bg-blue-600 border-blue-500 text-white shadow-md transform scale-105'
                                        : isSecureMode ? 'bg-slate-900 border-slate-700 text-slate-400 hover:border-purple-500' : 'bg-white border-gray-100 text-gray-600 hover:border-blue-300'
                                }`}
                            >
                                <div className={category === dept.name ? (isSecureMode ? "text-purple-200" : "text-blue-100") : (isSecureMode ? "text-purple-500" : "text-blue-500")}>
                                    {getDeptIcon(dept.name)}
                                </div>
                                <span className="text-xs font-bold uppercase tracking-wide leading-tight">{dept.name}</span>
                            </div>
                        )) : (
                            <div className={`col-span-full text-center py-8 ${theme.textMuted}`}>
                                No matching departments found.
                            </div>
                        )}
                    </div>
                </div>

                <div className="space-y-6">
                    <div>
                        <label className={`block text-sm font-bold mb-2 ${theme.text}`}>Subject <span className="text-red-500">*</span></label>
                        <input
                            type="text" name="title" value={title} onChange={onChange} required
                            placeholder={isSecureMode ? "e.g., Harassment incident in hostel" : "Briefly summarize the issue..."}
                            className={`block w-full px-4 py-3.5 rounded-xl border transition-all outline-none ${theme.border} ${theme.inputBg}`}
                        />
                    </div>
                    <div>
                        <label className={`block text-sm font-bold mb-2 ${theme.text}`}>Detailed Description <span className="text-red-500">*</span></label>
                        <textarea
                            name="description" rows="5" value={description} onChange={onChange} required
                            placeholder="Provide specific details..."
                            className={`block w-full px-4 py-3.5 rounded-xl border transition-all outline-none resize-none ${theme.border} ${theme.inputBg}`}
                        />
                    </div>
                </div>
                
                <div className="mt-8">
                     <label className={`block text-sm font-bold mb-2 ${theme.text}`}>Evidence (Optional)</label>
                    <div className={`border-2 border-dashed rounded-xl p-6 flex flex-col items-center justify-center transition-colors relative group ${isSecureMode ? 'border-slate-700 hover:bg-slate-800' : 'border-gray-300 hover:bg-blue-50'}`}>
                        <input type="file" multiple onChange={onFileChange} className="absolute inset-0 w-full h-full opacity-0 cursor-pointer" />
                        <UploadCloud size={32} className={`mb-2 transition-transform group-hover:scale-110 ${isSecureMode ? 'text-purple-500' : 'text-blue-500'}`} />
                        <p className={`text-sm font-medium ${isSecureMode ? 'text-slate-300' : 'text-gray-600'}`}>Click or Drag to upload photos/docs</p>
                        <p className={`text-xs mt-1 ${theme.textMuted}`}>Max 2 files (5MB each)</p>
                    </div>
                    {files.length > 0 && (
                        <div className="mt-4 grid grid-cols-1 sm:grid-cols-2 gap-3">
                            {files.map((file, idx) => (
                                <div key={idx} className={`flex items-center justify-between p-3 rounded-lg border ${isSecureMode ? 'bg-slate-800 border-slate-700 text-slate-300' : 'bg-blue-50 border-blue-100 text-blue-900'}`}>
                                    <div className="flex items-center gap-2 truncate">
                                        <FileText size={16} />
                                        <span className="text-sm truncate">{file.name}</span>
                                    </div>
                                    <button type="button" onClick={() => removeFile(idx)} className="hover:text-red-500"><X size={16} /></button>
                                </div>
                            ))}
                        </div>
                    )}
                </div>

            </div>

            {/* CONTEXTUAL WARNING BOX */}
            {isSecureMode ? (
                <div className="bg-purple-900/30 border-l-4 border-purple-500 p-4 rounded-r-lg flex items-start gap-3">
                    <ShieldCheck className="text-purple-400 shrink-0 mt-0.5" size={20} />
                    <div>
                        <h4 className="font-bold text-sm text-purple-300">Strict Confidentiality Enforced</h4>
                        <p className="text-sm mt-1 leading-relaxed text-purple-200/80">
                            This report will bypass AI processing and public campus feeds. It will be securely routed directly to the selected disciplinary committee. 
                        </p>
                    </div>
                </div>
            ) : (
                <div className="bg-red-50 border-l-4 border-red-500 p-4 rounded-r-lg flex items-start gap-3">
                    <AlertTriangle className="text-red-600 shrink-0 mt-0.5" size={20} />
                    <div>
                        <h4 className="font-bold text-sm text-red-800">Disciplinary Warning</h4>
                        <p className="text-sm mt-1 leading-relaxed text-red-700">False reporting will lead to strict disciplinary action.</p>
                    </div>
                </div>
            )}

            <button
                type="submit" disabled={isLoading || !category}
                className={`w-full py-4 rounded-xl font-bold text-lg shadow-xl transition-all transform flex items-center justify-center gap-2 
                ${isLoading || !category ? `bg-gray-400 cursor-not-allowed opacity-70 ${isSecureMode ? 'bg-slate-700 text-slate-500' : ''}` : `${theme.primary} hover:-translate-y-1 text-white shadow-[0_4px_14px_0_rgba(0,0,0,0.2)]`}`}
            >
                {isLoading ? 'Submitting...' : !category ? 'Select a Destination' : (<>{isSecureMode ? 'Submit Securely' : 'Submit Grievance'} <Send size={20} /></>)}
            </button>
        </form>

        {/* --- DUPLICATE MODAL --- */}
        {showDuplicateModal && (
            <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50 backdrop-blur-sm p-4">
                <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg overflow-hidden animate-fade-in-up transform scale-100 transition-all">
                    <div className="bg-blue-50 p-6 border-b border-blue-100">
                        <div className="flex items-center gap-3">
                            <div className="bg-blue-100 p-2 rounded-full"><AlertCircle className="text-blue-600" size={24} /></div>
                            <div>
                                <h3 className="text-xl font-bold text-gray-800">Similar Issues Found!</h3>
                                <p className="text-sm text-gray-600">Someone might have already reported this.</p>
                            </div>
                        </div>
                    </div>
                    <div className="p-6 space-y-4 max-h-[300px] overflow-y-auto">
                        {similarTickets.map((ticket) => (
                            <div key={ticket.ticket_id} className="border border-gray-200 rounded-xl p-4 hover:border-blue-300 hover:bg-blue-50 transition-all group">
                                <div className="flex justify-between items-start">
                                    <div>
                                        <h4 className="font-bold text-gray-800 group-hover:text-blue-700">{ticket.title}</h4>
                                        <p className="text-xs text-gray-500 mt-1">Ticket #{ticket.ticket_id} • Status: <span className="font-semibold text-blue-600">{ticket.status}</span></p>
                                        <div className="mt-2 text-xs bg-green-100 text-green-800 px-2 py-0.5 rounded-full inline-block font-bold">{Math.round(ticket.similarity * 100)}% Match</div>
                                    </div>
                                    <button type="button" onClick={() => handleUpvote(ticket.ticket_id)} className="bg-white border border-blue-200 text-blue-600 hover:bg-blue-600 hover:text-white px-3 py-1.5 rounded-lg text-sm font-semibold transition-all flex items-center gap-2 shadow-sm">
                                        <CheckCircle size={14} /> I'm affected too
                                    </button>
                                </div>
                            </div>
                        ))}
                    </div>
                    <div className="bg-gray-50 p-4 flex flex-col sm:flex-row justify-between items-center gap-3 border-t border-gray-200">
                        <p className="text-xs text-gray-500 text-center sm:text-left">Following an existing ticket helps us resolve it faster.</p>
                        <button type="button" onClick={() => setShowDuplicateModal(false)} className="text-gray-600 hover:text-gray-900 font-medium text-sm flex items-center gap-1 px-4 py-2 hover:bg-gray-200 rounded-lg transition-colors">
                            No, submit as new <ArrowRight size={14} />
                        </button>
                    </div>
                </div>
            </div>
        )}
      </div>
    </div>
  );
};

export default SubmitGrievancePage;