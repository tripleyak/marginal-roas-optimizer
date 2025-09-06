import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { ROASData, OptimizationResults, MarginSettings, OptimizationSettings } from './ROASOptimizer';
import { SaturationChart } from './charts/SaturationChart';
import { MROASChart } from './charts/MROASChart';
import { TimeSeriesChart } from './charts/TimeSeriesChart';

interface ChartSectionProps {
  data: ROASData[];
  results: OptimizationResults;
  marginSettings: MarginSettings;
  settings: OptimizationSettings;
}

export const ChartSection = ({ data, results, marginSettings, settings }: ChartSectionProps) => {
  return (
    <div className="grid grid-cols-12 gap-6">
      <div className="col-span-6">
        <Card className="card-enhanced h-full">
          <CardHeader className="pb-4">
            <CardTitle className="text-lg">Response Saturation (Ad Sales)</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="chart-container h-80">
              <SaturationChart 
                data={data} 
                results={results}
                currentSpend={settings.currentSpend}
                maxSpend={settings.maxSpend}
              />
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="col-span-6">
        <Card className="card-enhanced h-full">
          <CardHeader className="pb-4">
            <CardTitle className="text-lg">Marginal ROAS</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="chart-container h-80">
              <MROASChart 
                results={results}
                marginSettings={marginSettings}
                currentSpend={settings.currentSpend}
                maxSpend={settings.maxSpend}
              />
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="col-span-12">
        <Card className="card-enhanced">
          <CardHeader className="pb-4">
            <CardTitle className="text-lg">Sales & Spend Over Time</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="chart-container h-80">
              <TimeSeriesChart data={data} />
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};