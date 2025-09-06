import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Slider } from '@/components/ui/slider';
import { Rocket, Package, Trash2 } from 'lucide-react';
import { ROASData, MarginSettings, OptimizationSettings, OptimizationResults } from './ROASOptimizer';
import { optimizeSingleASIN, optimizePortfolio } from '@/lib/optimization';

interface SettingsPanelProps {
  mode: 'single' | 'portfolio';
  settings: OptimizationSettings;
  onSettingsChange: (settings: OptimizationSettings) => void;
  data: ROASData[];
  marginSettings: MarginSettings;
  onResults: (results: OptimizationResults) => void;
  onPortfolioResults: (results: any[]) => void;
  onLog: (message: string) => void;
  onError: (error: string) => void;
  clearError: () => void;
  onClearAll: () => void;
}

export const SettingsPanel = ({
  mode,
  settings,
  onSettingsChange,
  data,
  marginSettings,
  onResults,
  onPortfolioResults,
  onLog,
  onError,
  clearError,
  onClearAll
}: SettingsPanelProps) => {
  const [isCalculating, setIsCalculating] = useState(false);

  const handleSettingChange = (field: keyof OptimizationSettings, value: any) => {
    onSettingsChange({
      ...settings,
      [field]: value
    });
  };

  const runOptimization = async () => {
    try {
      clearError();
      setIsCalculating(true);
      onLog(`Running optimization (${mode})...`);

      if (data.length === 0) {
        onError('Please provide data first');
        return;
      }

      if (marginSettings.contributionMargin <= 0) {
        onError('Contribution margin must be positive');
        return;
      }

      if (mode === 'single') {
        if (data.length < 3) {
          onError('At least 3 data points required for single ASIN optimization');
          return;
        }

        const results = await optimizeSingleASIN(data, marginSettings, settings);
        onResults(results);
        onLog('Single ASIN optimization completed');
      } else {
        const results = await optimizePortfolio(data, marginSettings, settings);
        onPortfolioResults(results);
        onLog(`Portfolio optimization completed for ${results.length} ASINs`);
      }
    } catch (error) {
      onError(`Optimization error: ${error instanceof Error ? error.message : String(error)}`);
    } finally {
      setIsCalculating(false);
    }
  };

  return (
    <Card className="card-enhanced h-fit">
      <CardHeader className="pb-4">
        <CardTitle className="text-lg flex items-center gap-2">
          ⚙️ Settings
        </CardTitle>
      </CardHeader>

      <CardContent className="space-y-4">
        <div className="space-y-2">
          <Label htmlFor="currentSpend">Current Daily Spend ($)</Label>
          <Input
            id="currentSpend"
            type="number"
            value={settings.currentSpend || ''}
            onChange={(e) => handleSettingChange('currentSpend', parseFloat(e.target.value) || 0)}
            placeholder="e.g., 500"
            min="0"
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="maxSpend">Search Upper Bound ($)</Label>
          <Input
            id="maxSpend"
            type="number"
            value={settings.maxSpend}
            onChange={(e) => handleSettingChange('maxSpend', parseFloat(e.target.value) || 3000)}
            min="100"
          />
        </div>

        <div className="space-y-2">
          <Label>Seasonality</Label>
          <Select 
            value={settings.seasonality} 
            onValueChange={(value: 'none' | 'weekly' | 'monthly') => 
              handleSettingChange('seasonality', value)
            }
          >
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="none">None</SelectItem>
              <SelectItem value="weekly">Weekly</SelectItem>
              <SelectItem value="monthly">Monthly</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-3">
          <Label>Recency Weight (0 = even, 1 = heavy recent)</Label>
          <Slider
            value={[settings.recency]}
            onValueChange={([value]) => handleSettingChange('recency', value)}
            min={0}
            max={1}
            step={0.05}
            className="w-full"
          />
          <div className="text-sm text-muted-foreground text-center">
            {settings.recency.toFixed(2)}
          </div>
        </div>

        <div className="flex flex-col gap-2 pt-4">
          {mode === 'single' ? (
            <Button 
              onClick={runOptimization} 
              disabled={isCalculating || data.length === 0}
              className="w-full bg-gradient-primary hover:opacity-90"
            >
              <Rocket className="w-4 h-4 mr-2" />
              {isCalculating ? 'Calculating...' : 'Calculate Optimal Spend'}
            </Button>
          ) : (
            <Button 
              onClick={runOptimization} 
              disabled={isCalculating || data.length === 0}
              className="w-full bg-gradient-primary hover:opacity-90"
            >
              <Package className="w-4 h-4 mr-2" />
              {isCalculating ? 'Optimizing...' : 'Run Portfolio Optimization'}
            </Button>
          )}
          
          <Button 
            variant="outline" 
            onClick={onClearAll}
            className="w-full"
          >
            <Trash2 className="w-4 h-4 mr-2" />
            Clear All
          </Button>
        </div>
      </CardContent>
    </Card>
  );
};