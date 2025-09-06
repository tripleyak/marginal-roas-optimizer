import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend,
} from 'chart.js';
import { Line } from 'react-chartjs-2';
import { ROASData } from '../ROASOptimizer';

ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend
);

interface TimeSeriesChartProps {
  data: ROASData[];
}

export const TimeSeriesChart = ({ data }: TimeSeriesChartProps) => {
  const sortedData = [...data].sort((a, b) => a.date.localeCompare(b.date));
  const labels = sortedData.map(d => d.date);

  const chartData = {
    labels,
    datasets: [
      {
        label: 'Daily Spend',
        data: sortedData.map(d => d.spend),
        borderColor: 'hsl(var(--chart-4))',
        backgroundColor: 'hsl(var(--chart-4) / 0.1)',
        yAxisID: 'y',
        tension: 0.3,
        borderWidth: 2,
        pointRadius: 3,
        pointHoverRadius: 5,
      },
      {
        label: 'Ad Sales',
        data: sortedData.map(d => d.ad_sales),
        borderColor: 'hsl(var(--chart-1))',
        backgroundColor: 'hsl(var(--chart-1) / 0.1)',
        yAxisID: 'y1',
        tension: 0.3,
        borderWidth: 2,
        pointRadius: 3,
        pointHoverRadius: 5,
      },
      ...(sortedData.some(d => d.total_sales) ? [{
        label: 'Total Sales',
        data: sortedData.map(d => d.total_sales || null),
        borderColor: 'hsl(var(--chart-3))',
        backgroundColor: 'hsl(var(--chart-3) / 0.1)',
        yAxisID: 'y1',
        tension: 0.3,
        borderWidth: 2,
        pointRadius: 3,
        pointHoverRadius: 5,
        borderDash: [5, 5],
      }] : [])
    ]
  };

  const options = {
    responsive: true,
    maintainAspectRatio: false,
    interaction: {
      mode: 'index' as const,
      intersect: false,
    },
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
            const value = context.parsed.y;
            if (value === null) return null;
            return `${context.dataset.label}: $${value.toLocaleString()}`;
          }
        }
      }
    },
    scales: {
      x: {
        title: {
          display: true,
          text: 'Date',
          color: 'hsl(var(--foreground))'
        },
        ticks: {
          color: 'hsl(var(--muted-foreground))',
          maxTicksLimit: 10
        },
        grid: {
          color: 'hsl(var(--chart-grid) / 0.3)'
        }
      },
      y: {
        type: 'linear' as const,
        display: true,
        position: 'left' as const,
        title: {
          display: true,
          text: 'Spend ($)',
          color: 'hsl(var(--chart-4))'
        },
        ticks: {
          color: 'hsl(var(--chart-4))',
          callback: function(value: any) {
            return `$${value.toLocaleString()}`;
          }
        },
        grid: {
          color: 'hsl(var(--chart-grid) / 0.3)'
        }
      },
      y1: {
        type: 'linear' as const,
        display: true,
        position: 'right' as const,
        title: {
          display: true,
          text: 'Sales ($)',
          color: 'hsl(var(--chart-1))'
        },
        ticks: {
          color: 'hsl(var(--chart-1))',
          callback: function(value: any) {
            return `$${value.toLocaleString()}`;
          }
        },
        grid: {
          drawOnChartArea: false,
        },
      }
    }
  };

  return <Line data={chartData} options={options} />;
};