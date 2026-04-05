import React from 'react';
import { Pie } from 'react-chartjs-2';
import { useNavigate } from 'react-router-dom';
import { Chart as ChartJS, ArcElement, Tooltip, Legend } from 'chart.js';

ChartJS.register(ArcElement, Tooltip, Legend);

const CategoryPieChart = ({ data }) => {

  // 1. Get the navigate function from the hook
  const navigate = useNavigate();

  const chartData = {
    labels: data.map(item => item.category),
    datasets: [{
      label: '# of Grievances',
      data: data.map(item => item.count),
      backgroundColor: [
      '#4A90E2', // Blue
      '#50E3C2', // Teal
      '#F5A623', // Orange
      '#7ED321', // Green
      '#BD10E0', // Purple
    ],
    borderColor: ['rgba(255, 255, 255, 1)'],
    borderWidth: 2,
    }],
  };

  // 2. Define the onClick handler function
  const onClick = (event, elements) => {
      // Ensure an element was actually clicked
      if (elements.length > 0) {
          const clickedElementIndex = elements[0].index;
          const category = chartData.labels[clickedElementIndex];
          
          // Navigate to the new filtered page, encoding the category name for the URL
          navigate(`/admin/grievances/category/${encodeURIComponent(category)}`);
      }
  };
  const onHover = (event, elements) => {
    // Change the cursor to a pointer if hovering over a slice, otherwise default
    if (event.native) {
      event.native.target.style.cursor = elements.length > 0 ? 'pointer' : 'default';
    }
  };


  return (
    // Wrap the Pie chart in a div with positioning and a set height.
    <div className="relative h-80 w-full"> 
      <Pie 
        data={chartData} 
        // Add options to ensure responsiveness within the new container.
        options={{
          maintainAspectRatio: false,
          responsive: true,
          onClick: onClick, // Pass the handler to the chart's options
          onHover: onHover

        }}
      />
    </div>
  );
};

export default CategoryPieChart;