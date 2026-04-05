import React, { useState } from 'react';
import axios from 'axios';

const DataGenerator = () => {
  const [scenario, setScenario] = useState('');
  const [generatedText, setGeneratedText] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setIsLoading(true);
    setGeneratedText('');
    try {
      const res = await axios.post('/api/admin/generate-grievance', { scenario });
      setGeneratedText(res.data.generatedText);
    } catch (err) {
      console.error(err);
      setGeneratedText('An error occurred while generating the grievance.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="bg-white p-6 rounded-lg shadow-xl">
      <h2 className="text-2xl font-bold mb-4">Synthetic Grievance Generator</h2>
      <form onSubmit={handleSubmit}>
        <div className="mb-4">
          <label htmlFor="scenario" className="block text-gray-700 font-bold mb-2">
            Enter a Scenario:
          </label>
          <textarea
            id="scenario"
            value={scenario}
            onChange={(e) => setScenario(e.target.value)}
            rows="3"
            className="w-full p-2 border rounded-md"
            placeholder="e.g., The library is too noisy during exam week."
          ></textarea>
        </div>
        <button type="submit" disabled={isLoading} className="bg-blue-600 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded w-full disabled:bg-blue-300">
          {isLoading ? 'Generating...' : 'Generate Grievance'}
        </button>
      </form>
      {generatedText && (
        <div className="mt-6 bg-gray-50 p-4 rounded-md border">
          <h3 className="font-bold mb-2">Generated Grievance:</h3>
          <p className="text-gray-700 whitespace-pre-wrap">{generatedText}</p>
        </div>
      )}
    </div>
  );
};

export default DataGenerator;