import React, { useState } from 'react';
import axios from 'axios';

const TriageTool = () => {
  const [grievanceText, setGrievanceText] = useState('');
  const [analysis, setAnalysis] = useState(null);
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setIsLoading(true);
    setAnalysis(null);
    try {
      const res = await axios.post('/api/admin/triage-grievance', { grievanceText });
      setAnalysis(res.data);
    } catch (err) {
      console.error(err);
      setAnalysis({ error: 'An error occurred while analyzing the grievance.' });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="bg-white p-6 rounded-lg shadow-xl">
      <h2 className="text-2xl font-bold mb-4">AI Grievance Triage</h2>
      <form onSubmit={handleSubmit}>
        <div className="mb-4">
          <label htmlFor="grievanceText" className="block text-gray-700 font-bold mb-2">
            Paste Grievance Text:
          </label>
          <textarea
            id="grievanceText"
            value={grievanceText}
            onChange={(e) => setGrievanceText(e.target.value)}
            rows="5"
            className="w-full p-2 border rounded-md"
            placeholder="Paste the full text of a grievance here..."
          ></textarea>
        </div>
        <button type="submit" disabled={isLoading} className="bg-green-600 hover:bg-green-700 text-white font-bold py-2 px-4 rounded w-full disabled:bg-green-300">
          {isLoading ? 'Analyzing...' : 'Triage Grievance'}
        </button>
      </form>
      {analysis && (
        <div className="mt-6 bg-gray-50 p-4 rounded-md border">
          <h3 className="font-bold mb-2">Analysis Result:</h3>
          {analysis.error ? (
            <p className="text-red-500">{analysis.error}</p>
          ) : (
            <div className="space-y-2">
              <p><span className="font-semibold">Category:</span> {analysis.category}</p>
              <p><span className="font-semibold">Severity:</span> {analysis.severity}</p>
              <p><span className="font-semibold">Reasoning:</span> {analysis.reasoning}</p>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default TriageTool;