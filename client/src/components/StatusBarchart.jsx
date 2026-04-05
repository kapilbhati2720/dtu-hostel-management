import React from 'react';
import { Bar } from 'react-chartjs-2';
import { Chart as ChartJS, CategoryScale, LinearScale, BarElement, Title, Tooltip, Legend } from 'chart.js';

ChartJS.register(CategoryScale, LinearScale, BarElement, Title, Tooltip, Legend);

const StatusBarchart = ({ data }) => {
  const statusColorMap = {
    'Submitted': 'rgba(255, 159, 64, 0.8)', // Orange
    'In Progress': 'rgba(54, 162, 235, 0.8)', // Blue
    'Resolved': 'rgba(75, 192, 192, 0.8)',   // Green
    'Rejected': 'rgba(255, 99, 132, 0.8)',    // Red
  };

  const chartData = {
    labels: data.map(item => item.status),
    datasets: [{
      label: 'Count',
      data: data.map(item => item.count),
      // Use the color map to assign the correct color to each bar
      backgroundColor: data.map(item => statusColorMap[item.status] || 'rgba(201, 203, 207, 0.8)'), // Gray fallback
    }],
  };

  return (
    // 1. Wrap the Bar chart in a div with positioning and a set height.
    <div className="relative h-80 w-full">
      <Bar 
        data={chartData} 
        // 2. Add options to ensure responsiveness.
        options={{
          maintainAspectRatio: false,
          responsive: true,
          plugins: {
            legend: { display: false },
          },
          scales: {
            y: { beginAtZero: true }
          }
        }}
      />
    </div>
  );
};

export default StatusBarchart;