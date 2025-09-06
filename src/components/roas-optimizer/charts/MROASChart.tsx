import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend,
  ScatterController
} from 'chart.js';
import { Chart } from 'react-chartjs-2';
import { OptimizationResults, MarginSettings } from '../ROASOptimizer';

ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend,
  ScatterController
);

interface MROASChartProps {
  results: OptimizationResults;
  marginSettings: MarginSettings;
  currentSpend: number;
  maxSpend: number;
}

export const MROASChart = ({ results, marginSettings, currentSpend, maxSpend }: MROASChartProps) => {
  // Generate mROAS curve data points
  const curvePoints = [];
  const maxX = Math.max(maxSpend, results.optimalSpend * 1.2);
  
  for (let spend = 1; spend <= maxX; spend += maxX / 120) {
    // Simplified declining mROAS curve for visualization
    // Peak at 20% of optimal spend, then decline
    const peakSpend = results.optimalSpend * 0.2;
    let mroas;
    if (spend <= peakSpend) {
      mroas = marginSettings.requiredMROAS * 1.5 * (spend / peakSpend);
    } else {
      const decay = Math.exp(-(spend - peakSpend) / (results.optimalSpend * 0.5));
      mroas = marginSettings.requiredMROAS * (1 + 0.5 * decay);
    }
    curvePoints.push({ x: spend, y: mroas });
  }

  // Required threshold line
  const thresholdLine = [
    { x: 0, y: marginSettings.requiredMROAS },
    { x: maxX, y: marginSettings.requiredMROAS }
  ];

  const chartData = {
    datasets: [
      {
        label: 'mROAS Curve',
        data: curvePoints,
        type: 'line' as const,
        borderColor: 'hsl(var(--chart-1))',
        backgroundColor: 'hsl(var(--chart-1) / 0.1)',
        fill: true,
        tension: 0.4,
        pointRadius: 0,
        borderWidth: 2,
      },
      {
        label: 'Required Threshold',
        data: thresholdLine,
        type: 'line' as const,
        borderColor: 'hsl(var(--chart-5))',
        backgroundColor: 'transparent',
        borderDash: [6, 6],
        borderWidth: 2,
        pointRadius: 0,
      },
      {
        label: 'Optimal Point',
        data: [{ x: results.optimalSpend, y: results.mRoas }],
        type: 'scatter' as const,
        backgroundColor: 'hsl(var(--chart-3))',
        borderColor: 'hsl(var(--chart-3))',
        pointRadius: 8,
        pointStyle: 'star',
        pointHoverRadius: 10,
      },
      ...(currentSpend > 0 && results.currentMROAS ? [{
        label: 'Current Point',
        data: [{ x: currentSpend, y: results.currentMROAS }],
        type: 'scatter' as const,
        backgroundColor: 'hsl(var(--chart-4))',
        borderColor: 'hsl(var(--chart-4))',
        pointRadius: 6,
        pointStyle: 'triangle',
        pointHoverRadius: 8,
      }] : [])
    ]
  };

  const options = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        position: 'top' as const,
        labels: {
          color: 'hsl(var(--foreground))',
          usePointStyle: true,
        }
      },
      tooltip: {
        backgroundColor: 'hsl(var(--popover))',
        titleColor: 'hsl(var(--popover-foreground))',
        bodyColor: 'hsl(var(--popover-foreground))',
        borderColor: 'hsl(var(--border))',
        borderWidth: 1,
        callbacks: {
          label: function(context: any) {
            return `${context.dataset.label}: ${context.parsed.y.toFixed(2)}x`;
          }
        }
      }
    },
    scales: {
      x: {
        type: 'linear' as const,
        title: {
          display: true,
          text: 'Daily Spend ($)',
          color: 'hsl(var(--foreground))'
        },
        ticks: {
          color: 'hsl(var(--muted-foreground))',
          callback: function(value: any) {
            return `$${value}`;
          }
        },
        grid: {
          color: 'hsl(var(--chart-grid) / 0.3)'
        }
      },
      y: {
        title: {
          display: true,
          text: 'mROAS (x)',
          color: 'hsl(var(--foreground))'
        },
        ticks: {
          color: 'hsl(var(--muted-foreground))',
          callback: function(value: any) {
            return `${value.toFixed(1)}x`;
          }
        },
        grid: {
          color: 'hsl(var(--chart-grid) / 0.3)'
        }
      }
    }
  };

  return <Chart type="line" data={chartData} options={options} />;
};