// client/src/components/grievances/RequestInfoModal.jsx

import React, { useState } from 'react';
import { toast } from 'react-toastify';

const RequestInfoModal = ({ onClose, onSubmit }) => {
    const [comment, setComment] = useState('');

    const handleSubmit = (e) => {
        e.preventDefault();
        if (!comment.trim()) {
            return toast.error("Please specify what information is needed.");
        }
        onSubmit(comment); // Pass the comment back to the parent component
    };

    return (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex justify-center items-center z-50">
            <div className="bg-white p-8 rounded-lg shadow-xl w-full max-w-md">
                <h2 className="text-2xl font-bold mb-6">Request More Information</h2>
                <form onSubmit={handleSubmit}>
                    <p className="text-gray-600 mb-4">
                        Specify the details you require from the student. This will be added as a comment and the grievance status will be set to "Awaiting Clarification".
                    </p>
                    <textarea
                        value={comment}
                        onChange={e => setComment(e.target.value)}
                        placeholder="e.g., Please provide the course code and the date of the incident."
                        rows="4"
                        className="w-full p-2 border rounded mb-4"
                        required
                    />
                    <div className="flex justify-end gap-4 mt-4">
                        <button type="button" onClick={onClose} className="bg-gray-300 hover:bg-gray-400 text-black font-bold py-2 px-4 rounded">Cancel</button>
                        <button type="submit" className="bg-blue-600 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded">Send Request</button>
                    </div>
                </form>
            </div>
        </div>
    );
};

export default RequestInfoModal;