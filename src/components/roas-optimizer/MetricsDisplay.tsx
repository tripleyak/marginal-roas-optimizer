import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { OptimizationResults, MarginSettings, ROASData } from './ROASOptimizer';

interface MetricsDisplayProps {
  results: OptimizationResults;
  marginSettings: MarginSettings;
  currentSpend: number;
  data: ROASData[];
}

interface MetricCardProps {
  label: string;
  value: string;
  className?: string;
}

const MetricCard = ({ label, value, className = '' }: MetricCardProps) => (
  <div className="metric-card space-y-1">
    <div className="metric-label">{label}</div>
    <div className={`metric-value ${className}`}>{value}</div>
  </div>
);

export const MetricsDisplay = ({ 
  results, 
  marginSettings, 
  currentSpend, 
  data 
}: MetricsDisplayProps) => {
  // Calculate organic share if total_sales available
  const totalSalesSum = data.filter(d => d.total_sales).reduce((sum, d) => sum + (d.total_sales || 0), 0);
  const adSalesSum = data.reduce((sum, d) => sum + d.ad_sales, 0);
  const organicShare = totalSalesSum > 0 
    ? `${(((totalSalesSum - adSalesSum) / totalSalesSum) * 100).toFixed(1)}%`
    : '—';

  const deltaSpend = results.deltaSpend || 0;
  const liftVsCurrent = results.liftVsCurrent || 0;

  return (
    <Card className="card-enhanced">
      <CardHeader className="pb-4">
        <CardTitle className="text-lg flex items-center gap-2">
          📊 Optimization Results
        </CardTitle>
      </CardHeader>

      <CardContent>
        <div className="grid grid-cols-6 gap-4">
          <MetricCard
            label="Contribution Margin"
            value={`${marginSettings.contributionMargin.toFixed(1)}%`}
          />
          
          <MetricCard
            label="Required mROAS"
            value={`${marginSettings.requiredMROAS.toFixed(2)}x`}
          />
          
          <MetricCard
            label="Organic Share (hist.)"
            value={organicShare}
          />
          
          <MetricCard
            label="Optimal Daily Spend"
            value={`$${Math.round(results.optimalSpend).toLocaleString()}`}
            className="status-positive"
          />
          
          <MetricCard
            label="Expected Ad Sales @ Opt"
            value={`$${Math.round(results.expectedRevenue).toLocaleString()}`}
          />
          
          <MetricCard
            label="Total ROAS @ Opt"
            value={`${results.totalRoas.toFixed(2)}x`}
          />

          {currentSpend > 0 && (
            <>
              <MetricCard
                label="mROAS @ Opt"
                value={`${results.mRoas.toFixed(2)}x`}
              />
              
              <MetricCard
                label="Current Spend"
                value={`$${Math.round(currentSpend).toLocaleString()}`}
              />
              
              <MetricCard
                label="Current mROAS"
                value={`${(results.currentMROAS || 0).toFixed(2)}x`}
                className={
                  (results.currentMROAS || 0) >= marginSettings.requiredMROAS 
                    ? 'status-positive' 
                    : 'status-negative'
                }
              />
              
              <MetricCard
                label="Δ Spend → Opt"
                value={`${deltaSpend >= 0 ? '+' : ''}$${Math.round(deltaSpend).toLocaleString()}`}
                className={deltaSpend >= 0 ? 'status-positive' : 'status-negative'}
              />
              
              <MetricCard
                label="Ad-sales Lift vs Current"
                value={`$${Math.round(liftVsCurrent).toLocaleString()}`}
                className="status-positive"
              />

              <MetricCard
                label="Feasible"
                value={results.feasible ? 'Yes' : 'No'}
                className={results.feasible ? 'status-positive' : 'status-negative'}
              />
            </>
          )}
        </div>
      </CardContent>
    </Card>
  );
};