import React, { useState } from 'react';

const ResolutionFeedback = ({ onAccept, onAppeal }) => {
  const [showAppealForm, setShowAppealForm] = useState(false);
  const [appealReason, setAppealReason] = useState('');

  return (
    <div className="bg-white border border-gray-200 rounded-xl shadow-lg overflow-hidden mb-8 transition-all hover:shadow-xl">
      {/* Header Section */}
      <div className="bg-slate-50 p-6 border-b border-gray-100">
        <h3 className="text-xl font-bold text-gray-800 flex items-center gap-2">
          <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 text-blue-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          Resolution Confirmation
        </h3>
        <p className="text-gray-600 mt-2 ml-8">
          The officer has marked this ticket as <span className="font-semibold text-green-600">Resolved</span>. 
          Please verify if the solution works for you.
        </p>
      </div>

      <div className="p-6 bg-white">
        {!showAppealForm ? (
          <div className="flex flex-col gap-3 w-full">
            {/* Satisfied Button */}
            <button
              onClick={onAccept}
              className="w-full group flex items-center justify-center gap-2 px-6 py-3.5 bg-emerald-500 hover:bg-emerald-600 text-white font-bold rounded-lg shadow-sm hover:shadow-md transition-all duration-200 transform hover:-translate-y-0.5 focus:ring-4 focus:ring-emerald-200"
            >
              <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 group-hover:scale-110 transition-transform" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
              </svg>
              Yes, I'm Satisfied
            </button>

            {/* Appeal Button */}
            <button
              onClick={() => setShowAppealForm(true)}
              className="w-full group flex items-center justify-center gap-2 px-6 py-3.5 bg-white border-2 border-rose-100 text-rose-600 hover:bg-rose-50 hover:border-rose-200 font-bold rounded-lg transition-all duration-200 focus:ring-4 focus:ring-rose-100"
            >
              <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 group-hover:rotate-90 transition-transform" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
              </svg>
              No, Issue Persists
            </button>
          </div>
        ) : (
          /* Appeal Form Section */
          <div className="animate-fade-in-up">
            <div className="bg-rose-50 border border-rose-100 rounded-lg p-5 mb-4">
              <label className="block text-rose-800 font-bold mb-2 flex items-center gap-2">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                  <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                </svg>
                Why are you reopening this ticket?
              </label>
              <textarea
                value={appealReason}
                onChange={(e) => setAppealReason(e.target.value)}
                className="w-full p-4 border border-rose-200 rounded-lg focus:ring-2 focus:ring-rose-500 focus:border-rose-500 outline-none transition-shadow bg-white text-gray-700 placeholder-rose-300"
                rows="3"
                placeholder="Please describe why the resolution didn't work..."
              />
            </div>
            
            <div className="flex items-center gap-3">
              <button
                onClick={() => onAppeal(appealReason)}
                disabled={!appealReason.trim()}
                className="px-6 py-2 bg-rose-600 hover:bg-rose-700 text-white font-bold rounded-lg shadow transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
              >
                <span>Submit Appeal</span>
                <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M13 5l7 7-7 7M5 5l7 7-7 7" />
                </svg>
              </button>
              
              <button
                onClick={() => setShowAppealForm(false)}
                className="px-6 py-2 text-gray-500 hover:text-gray-800 font-medium transition-colors"
              >
                Cancel
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default ResolutionFeedback;