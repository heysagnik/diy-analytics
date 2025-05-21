import React from 'react';
import { Line } from 'react-chartjs-2';
import { CaretUp, CaretDown } from '@phosphor-icons/react';
import { Chart as ChartJS, CategoryScale, LineElement, PointElement, LinearScale, Title, Tooltip, Legend, Filler } from 'chart.js';

// Register Chart.js components
ChartJS.register(
  CategoryScale,
  LineElement,
  PointElement,
  LinearScale,
  Title,
  Tooltip,
  Legend,
  Filler
);

interface StatCardProps {
  title: string;
  value: number;
  changePercentage: number;
  chartData: number[];
  chartLabels: string[];
  chartColor: string;
}

const StatCard: React.FC<StatCardProps> = ({ 
  title, 
  value, 
  changePercentage, 
  chartData, 
  chartLabels, 
  chartColor 
}) => {
  // Format large numbers with k/m suffix
  const formatNumber = (num: number): string => {
    if (num >= 1000000) {
      return (num / 1000000).toFixed(1) + 'm';
    } else if (num >= 1000) {
      return (num / 1000).toFixed(1) + 'k';
    }
    return num.toString();
  };

  // Chart configuration
  const chartConfig = {
    labels: chartLabels,
    datasets: [
      {
        data: chartData,
        fill: true,
        backgroundColor: `${chartColor}15`, // 15% opacity
        borderColor: chartColor,
        borderWidth: 2,
        pointRadius: 0,
        pointHitRadius: 10,
        tension: 0.4
      }
    ]
  };

  const chartOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        display: false
      },
      tooltip: {
        backgroundColor: 'rgba(0, 0, 0, 0.7)',
        titleFont: {
          size: 12
        },
        bodyFont: {
          size: 12
        },
        padding: 8,
        cornerRadius: 4
      }
    },
    scales: {
      x: {
        display: false
      },
      y: {
        display: false,
        beginAtZero: true
      }
    }
  };

  return (
    <div className="bg-white rounded-xl shadow-sm p-5 border border-gray-100">
      <div className="flex flex-col mb-4">
        <h2 className="text-base text-gray-500 mb-1">{title}</h2>
        <div className="flex items-end gap-2">
          <p className="text-2xl font-bold text-gray-800">{formatNumber(value)}</p>
          
          {changePercentage !== 0 && (
            <div className={`flex items-center text-sm ${changePercentage > 0 ? 'text-green-600' : 'text-red-600'}`}>
              {changePercentage > 0 ? (
                <CaretUp size={14} weight="bold" className="mr-0.5" />
              ) : (
                <CaretDown size={14} weight="bold" className="mr-0.5" />
              )}
              <span>{Math.abs(changePercentage).toFixed(1)}%</span>
            </div>
          )}
        </div>
      </div>
      
      <div className="h-24">
        <Line data={chartConfig} options={chartOptions} />
      </div>
    </div>
  );
};

export default StatCard; 