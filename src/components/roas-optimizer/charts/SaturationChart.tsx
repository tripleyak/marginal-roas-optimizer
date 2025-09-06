import { useEffect, useRef } from 'react';
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
import { ROASData, OptimizationResults } from '../ROASOptimizer';

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

interface SaturationChartProps {
  data: ROASData[];
  results: OptimizationResults;
  currentSpend: number;
  maxSpend: number;
}

export const SaturationChart = ({ data, results, currentSpend, maxSpend }: SaturationChartProps) => {
  // Generate saturation curve data points
  const curvePoints = [];
  const maxX = Math.max(maxSpend, results.optimalSpend * 1.2);
  
  for (let spend = 0; spend <= maxX; spend += maxX / 120) {
    // Simplified Hill model approximation for visualization
    const saturation = results.expectedRevenue * (spend / (spend + results.optimalSpend * 0.5));
    curvePoints.push({ x: spend, y: saturation });
  }

  const chartData = {
    datasets: [
      {
        label: 'Saturation Curve',
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
        label: 'Historical Data',
        data: data.map(d => ({ x: d.spend, y: d.ad_sales })),
        type: 'scatter' as const,
        backgroundColor: 'hsl(var(--chart-2))',
        borderColor: 'hsl(var(--chart-2))',
        pointRadius: 4,
        pointHoverRadius: 6,
      },
      {
        label: 'Optimal Point',
        data: [{ x: results.optimalSpend, y: results.expectedRevenue }],
        type: 'scatter' as const,
        backgroundColor: 'hsl(var(--chart-3))',
        borderColor: 'hsl(var(--chart-3))',
        pointRadius: 8,
        pointStyle: 'star',
        pointHoverRadius: 10,
      },
      ...(currentSpend > 0 ? [{
        label: 'Current Spend',
        data: [{ x: currentSpend, y: results.expectedRevenue * 0.8 }], // Approximated
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
            return `${context.dataset.label}: $${context.parsed.y.toFixed(0)}`;
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
          text: 'Daily Ad Sales ($)',
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
      }
    }
  };

  return <Chart type="line" data={chartData} options={options} />;
};