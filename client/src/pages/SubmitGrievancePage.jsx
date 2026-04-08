import React, { useState, useEffect, useRef, useContext } from 'react';
import axios from 'axios';
import { useNavigate } from 'react-router-dom';
import { toast } from 'react-toastify';
import { AuthContext } from '../context/AuthContext';
import { 
  UploadCloud, FileText, X, AlertTriangle, Send, Search,
  CheckCircle, ArrowRight, AlertCircle,
  Zap, HardHat, Leaf, Monitor, Sparkles,
  Utensils, MoreHorizontal, Wrench
} from 'lucide-react';

const SubmitGrievancePage = () => {
  const { user } = useContext(AuthContext);
  const navigate = useNavigate();
  
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    category: '', 
  });
  const [files, setFiles] = useState([]); 
  const [isLoading, setIsLoading] = useState(false);

  const [similarTickets, setSimilarTickets] = useState([]);
  const [showDuplicateModal, setShowDuplicateModal] = useState(false);
  const [isChecking, setIsChecking] = useState(false);
  const checkTimeoutRef = useRef(null);

  // Hostel grievance categories (replacing old department list)
  const categories = [
    { name: 'Electrical', icon: <Zap size={28} />, color: 'text-yellow-500' },
    { name: 'Civil', icon: <HardHat size={28} />, color: 'text-orange-500' },
    { name: 'Horticulture', icon: <Leaf size={28} />, color: 'text-green-500' },
    { name: 'Computer Center', icon: <Monitor size={28} />, color: 'text-blue-500' },
    { name: 'Cleanliness', icon: <Sparkles size={28} />, color: 'text-cyan-500' },
    { name: 'Mess', icon: <Utensils size={28} />, color: 'text-red-500' },
    { name: 'Other', icon: <MoreHorizontal size={28} />, color: 'text-gray-500' },
  ];

  const { title, description, category } = formData;

  const onChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });

    // AI duplicate check
    if (e.target.name === 'title' || e.target.name === 'description') {
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

      if (files) files.forEach(file => data.append('attachments', file));

      try {
          await axios.post('/api/grievances', data, { headers: { 'Content-Type': 'multipart/form-data' }});
          toast.success('Grievance submitted successfully!');
          navigate('/my-grievances');
      } catch (err) {
          toast.error(err.response?.data?.msg || 'Failed to submit.');
      } finally {
          setIsLoading(false);
      }
  };

  const theme = { 
      bg: 'bg-slate-50', 
      card: 'bg-white border-gray-100', 
      text: 'text-gray-900', 
      textMuted: 'text-gray-600', 
      primary: 'bg-blue-600 hover:bg-blue-700', 
      border: 'border-gray-200', 
      inputBg: 'bg-gray-50 focus:bg-white text-gray-900 focus:border-blue-500 focus:ring-blue-50' 
  };

  return (
    <div className={`min-h-screen py-10 px-4 sm:px-6 lg:px-8 ${theme.bg}`}>
      <div className="max-w-5xl mx-auto">
        
        <div className="mb-8">
            <h1 className={`text-3xl font-bold ${theme.text}`}>New Hostel Grievance</h1>
            <p className={`mt-2 ${theme.textMuted}`}>Submit a formal complaint to the hostel administration.</p>
        </div>
        
        {isChecking && (
            <div className="fixed bottom-8 right-8 z-[100] flex items-center gap-3 text-sm font-bold text-blue-700 bg-white px-5 py-3 rounded-2xl border-2 border-blue-100 shadow-2xl animate-bounce">
                <Search size={18} className="animate-pulse" /> AI Checking for duplicates...
            </div>
        )}

        <form onSubmit={onSubmit} className="space-y-6">
            <div className={`shadow-xl rounded-2xl p-8 border ${theme.card}`}>
                
                {/* CATEGORY SELECTOR */}
                <div className="mb-8">
                    <label className={`block text-sm font-bold mb-3 ${theme.text}`}>
                        Category <span className="text-red-500">*</span>
                    </label>
                    <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
                        {categories.map(cat => (
                            <div 
                                key={cat.name} 
                                onClick={() => setFormData({...formData, category: cat.name})}
                                className={`cursor-pointer p-4 rounded-xl border flex flex-col items-center justify-center gap-3 text-center transition-all duration-200 ${
                                    category === cat.name 
                                        ? 'bg-blue-600 border-blue-500 text-white shadow-md transform scale-105'
                                        : 'bg-white border-gray-100 text-gray-600 hover:border-blue-300 hover:shadow-sm'
                                }`}
                            >
                                <div className={category === cat.name ? 'text-blue-100' : cat.color}>
                                    {cat.icon}
                                </div>
                                <span className="text-xs font-bold uppercase tracking-wide leading-tight">{cat.name}</span>
                            </div>
                        ))}
                    </div>
                </div>

                {/* FORM FIELDS */}
                <div className="space-y-6">
                    <div>
                        <label className={`block text-sm font-bold mb-2 ${theme.text}`}>Subject <span className="text-red-500">*</span></label>
                        <input
                            type="text" name="title" value={title} onChange={onChange} required
                            placeholder="Briefly summarize the issue..."
                            className={`block w-full px-4 py-3.5 rounded-xl border transition-all outline-none ${theme.border} ${theme.inputBg}`}
                        />
                    </div>
                    <div>
                        <label className={`block text-sm font-bold mb-2 ${theme.text}`}>Detailed Description <span className="text-red-500">*</span></label>
                        <textarea
                            name="description" rows="5" value={description} onChange={onChange} required
                            placeholder="Provide specific details — location, time, what happened..."
                            className={`block w-full px-4 py-3.5 rounded-xl border transition-all outline-none resize-none ${theme.border} ${theme.inputBg}`}
                        />
                    </div>
                </div>
                
                {/* FILE UPLOAD */}
                <div className="mt-8">
                     <label className={`block text-sm font-bold mb-2 ${theme.text}`}>Evidence (Optional)</label>
                    <div className={`border-2 border-dashed rounded-xl p-6 flex flex-col items-center justify-center transition-colors relative group border-gray-300 hover:bg-blue-50`}>
                        <input type="file" multiple onChange={onFileChange} className="absolute inset-0 w-full h-full opacity-0 cursor-pointer" />
                        <UploadCloud size={32} className="mb-2 transition-transform group-hover:scale-110 text-blue-500" />
                        <p className="text-sm font-medium text-gray-600">Click or Drag to upload photos/docs</p>
                        <p className={`text-xs mt-1 ${theme.textMuted}`}>Max 2 files (5MB each)</p>
                    </div>
                    {files.length > 0 && (
                        <div className="mt-4 grid grid-cols-1 sm:grid-cols-2 gap-3">
                            {files.map((file, idx) => (
                                <div key={idx} className="flex items-center justify-between p-3 rounded-lg border bg-blue-50 border-blue-100 text-blue-900">
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

            {/* WARNING BOX */}
            <div className="bg-red-50 border-l-4 border-red-500 p-4 rounded-r-lg flex items-start gap-3">
                <AlertTriangle className="text-red-600 shrink-0 mt-0.5" size={20} />
                <div>
                    <h4 className="font-bold text-sm text-red-800">Disciplinary Warning</h4>
                    <p className="text-sm mt-1 leading-relaxed text-red-700">False reporting will lead to strict disciplinary action as per DTU hostel rules.</p>
                </div>
            </div>

            <button
                type="submit" disabled={isLoading || !category}
                className={`w-full py-4 rounded-xl font-bold text-lg shadow-xl transition-all transform flex items-center justify-center gap-2 
                ${isLoading || !category ? 'bg-gray-400 cursor-not-allowed opacity-70' : `${theme.primary} hover:-translate-y-1 text-white shadow-[0_4px_14px_0_rgba(0,0,0,0.2)]`}`}
            >
                {isLoading ? 'Submitting...' : !category ? 'Select a Category' : (<>Submit Grievance <Send size={20} /></>)}
            </button>
        </form>

        {/* DUPLICATE MODAL */}
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