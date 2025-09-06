import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Download } from 'lucide-react';

interface PortfolioResult {
  asin: string;
  contributionMargin: string;
  requiredMROAS: string;
  optimalSpend: number;
  expectedAdSales: number;
  totalROAS: string;
  mROAS: string;
  currentSpend: number;
  deltaSpend: number;
  liftVsCurrent: number;
  organicShare: string;
  action: string;
  feasible: boolean;
}

interface PortfolioResultsProps {
  results: PortfolioResult[];
}

export const PortfolioResults = ({ results }: PortfolioResultsProps) => {
  const increaseCount = results.filter(r => r.action.includes('Increase')).length;
  const decreaseCount = results.filter(r => r.action.includes('Decrease')).length;
  const pauseCount = results.filter(r => r.action.includes('Pause')).length;

  const exportCSV = () => {
    const headers = [
      'asin', 'contribution_margin', 'required_mroas', 'optimal_spend', 
      'expected_ad_sales', 'total_roas', 'mroas', 'current_spend', 
      'delta_spend', 'lift_vs_current', 'organic_share', 'action'
    ];
    
    const csvData = [
      headers.join(','),
      ...results.map(r => [
        r.asin,
        r.contributionMargin,
        r.requiredMROAS,
        r.optimalSpend,
        r.expectedAdSales,
        r.totalROAS,
        r.mROAS,
        r.currentSpend,
        r.deltaSpend,
        r.liftVsCurrent,
        r.organicShare,
        `"${r.action}"`
      ].join(','))
    ].join('\n');

    const blob = new Blob([csvData], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'portfolio_recommendations.csv';
    a.click();
    URL.revokeObjectURL(url);
  };

  const formatNumber = (num: number) => {
    return num.toLocaleString();
  };

  const getActionBadgeVariant = (action: string) => {
    if (action.includes('Increase')) return 'default';
    if (action.includes('Decrease')) return 'secondary';
    if (action.includes('Pause')) return 'destructive';
    return 'outline';
  };

  return (
    <Card className="card-enhanced">
      <CardHeader className="pb-4">
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="text-lg flex items-center gap-2">
              📦 Portfolio Recommendations
            </CardTitle>
            <p className="text-sm text-muted-foreground mt-1">
              ASINs: {results.length} • Increase: {increaseCount} • Decrease: {decreaseCount} • Pause: {pauseCount}
            </p>
          </div>
          <Button onClick={exportCSV} variant="outline" size="sm">
            <Download className="w-4 h-4 mr-2" />
            Export CSV
          </Button>
        </div>
      </CardHeader>

      <CardContent>
        <div className="overflow-auto max-h-96">
          <table className="data-table">
            <thead>
              <tr>
                <th>ASIN</th>
                <th>CM</th>
                <th>Req mROAS</th>
                <th>Opt Spend</th>
                <th>Exp Ad Sales</th>
                <th>Total ROAS</th>
                <th>mROAS @ Opt</th>
                <th>Current Spend</th>
                <th>Δ Spend</th>
                <th>Lift vs Current</th>
                <th>Organic Share</th>
                <th>Action</th>
              </tr>
            </thead>
            <tbody>
              {results.map((result) => (
                <tr key={result.asin} className="hover:bg-muted/5">
                  <td className="font-mono text-sm">{result.asin}</td>
                  <td>{result.contributionMargin}</td>
                  <td>{result.requiredMROAS}</td>
                  <td>${formatNumber(result.optimalSpend)}</td>
                  <td>${formatNumber(result.expectedAdSales)}</td>
                  <td>{result.totalROAS}</td>
                  <td>{result.mROAS}</td>
                  <td>${formatNumber(result.currentSpend)}</td>
                  <td className={result.deltaSpend >= 0 ? 'status-positive' : 'status-negative'}>
                    {result.deltaSpend >= 0 ? '+' : ''}${formatNumber(result.deltaSpend)}
                  </td>
                  <td className="status-positive">${formatNumber(result.liftVsCurrent)}</td>
                  <td>{result.organicShare}</td>
                  <td>
                    <Badge 
                      variant={getActionBadgeVariant(result.action)} 
                      className="text-xs"
                    >
                      {result.action}
                    </Badge>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </CardContent>
    </Card>
  );
};