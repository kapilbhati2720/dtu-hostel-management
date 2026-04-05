import React, { useState } from 'react';
import { toast } from 'react-toastify';

const ResolveGrievanceModal = ({ onClose, onSubmit }) => {
    const [resolutionNote, setResolutionNote] = useState('');

    const handleSubmit = (e) => {
        e.preventDefault();
        if (!resolutionNote.trim()) {
            return toast.error("Please explain how this grievance was resolved.");
        }
        onSubmit(resolutionNote);
    };

    return (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex justify-center items-center z-50">
            <div className="bg-white p-8 rounded-lg shadow-xl w-full max-w-md">
                <h2 className="text-2xl font-bold mb-4 text-green-600">Mark as Resolved</h2>
                <p className="text-gray-600 mb-4">
                    Please provide a brief note on how this issue was resolved. This will be visible to the student.
                </p>
                <form onSubmit={handleSubmit}>
                    <textarea
                        value={resolutionNote}
                        onChange={(e) => setResolutionNote(e.target.value)}
                        placeholder="e.g., The water cooler has been repaired and tested."
                        rows="4"
                        className="w-full p-2 border rounded mb-4 focus:ring-2 focus:ring-green-500 outline-none"
                        required
                    />
                    <div className="flex justify-end gap-4">
                        <button type="button" onClick={onClose} className="bg-gray-300 hover:bg-gray-400 text-black font-bold py-2 px-4 rounded">
                            Cancel
                        </button>
                        <button type="submit" className="bg-green-600 hover:bg-green-700 text-white font-bold py-2 px-4 rounded">
                            Confirm Resolution
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
};

export default ResolveGrievanceModal;