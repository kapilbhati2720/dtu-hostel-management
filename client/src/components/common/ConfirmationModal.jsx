// client/src/components/common/ConfirmationModal.jsx

import React from 'react';

const ConfirmationModal = ({ title, message, onConfirm, onCancel, confirmText = "Confirm", confirmClass = "bg-blue-600 hover:bg-blue-700" }) => {
    return (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex justify-center items-center z-50">
            <div className="bg-white p-8 rounded-lg shadow-xl w-full max-w-sm">
                <h2 className="text-xl font-bold mb-4">{title}</h2>
                <p className="text-gray-600 mb-6">{message}</p>
                <div className="flex justify-end gap-4">
                    <button onClick={onCancel} className="bg-gray-300 hover:bg-gray-400 text-black font-bold py-2 px-4 rounded">
                        Cancel
                    </button>
                    <button onClick={onConfirm} className={`${confirmClass} text-white font-bold py-2 px-4 rounded`}>
                        {confirmText}
                    </button>
                </div>
            </div>
        </div>
    );
};

export default ConfirmationModal;