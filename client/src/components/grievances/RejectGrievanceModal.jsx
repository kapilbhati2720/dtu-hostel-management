// client/src/components/grievances/RejectGrievanceModal.jsx

import React, { useState } from 'react';
import { toast } from 'react-toastify';

const RejectGrievanceModal = ({ onClose, onSubmit }) => {
    const [reason, setReason] = useState('');
    const [otherReason, setOtherReason] = useState('');

    const commonReasons = [
    "Submission is a Query/Suggestion, Not a Grievance",
    "Pre-requisite Action Not Completed",
    "Request is Against University Policy",
    "Duplicate Grievance",
    "Other"
    ];

    const handleSubmit = (e) => {
        e.preventDefault();
        const finalReason = reason === 'Other' ? otherReason : reason;
        if (!finalReason || !finalReason.trim()) {
            return toast.error("Please provide a reason for rejection.");
        }
        onSubmit(finalReason); // Pass the final reason back to the parent component
    };

    return (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex justify-center items-center z-50">
            <div className="bg-white p-8 rounded-lg shadow-xl w-full max-w-md">
                <h2 className="text-2xl font-bold mb-6">Reason for Rejection</h2>
                <form onSubmit={handleSubmit}>
                    <select value={reason} onChange={e => setReason(e.target.value)} required className="w-full p-2 border rounded bg-white mb-4">
                        <option value="">Select a reason...</option>
                        {commonReasons.map(r => <option key={r} value={r}>{r}</option>)}
                    </select>

                    {reason === 'Other' && (
                        <textarea
                            value={otherReason}
                            onChange={e => setOtherReason(e.target.value)}
                            placeholder="Please specify the reason for rejection here..."
                            rows="3"
                            className="w-full p-2 border rounded mb-4"
                            required // The 'required' attribute will enforce this
                        />
                    )}

                    <div className="flex justify-end gap-4 mt-4">
                        <button type="button" onClick={onClose} className="bg-gray-300 hover:bg-gray-400 text-black font-bold py-2 px-4 rounded">Cancel</button>
                        <button type="submit" className="bg-red-600 hover:bg-red-700 text-white font-bold py-2 px-4 rounded">Confirm Rejection</button>
                    </div>
                </form>
            </div>
        </div>
    );
};

export default RejectGrievanceModal;