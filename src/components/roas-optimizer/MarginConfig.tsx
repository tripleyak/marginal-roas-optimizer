import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { MarginSettings } from './ROASOptimizer';

interface MarginConfigProps {
  settings: MarginSettings;
  onSettingsChange: (updates: Partial<MarginSettings>) => void;
}

export const MarginConfig = ({ settings, onSettingsChange }: MarginConfigProps) => {
  const handleChange = (field: keyof MarginSettings, value: string) => {
    const numValue = parseFloat(value) || 0;
    onSettingsChange({ [field]: numValue });
  };

  const contributionMarginColor = settings.contributionMargin > 0 ? 'status-positive' : 'status-negative';
  
  return (
    <Card className="card-enhanced h-fit">
      <CardHeader className="pb-4">
        <CardTitle className="text-lg flex items-center gap-2">
          💰 Margin Configuration
        </CardTitle>
      </CardHeader>

      <CardContent className="space-y-4">
        <div className="grid grid-cols-2 gap-3">
          <div className="space-y-2">
            <Label htmlFor="grossMargin" className="text-sm font-medium">
              Gross Margin %
            </Label>
            <Input
              id="grossMargin"
              type="number"
              value={settings.grossMargin}
              onChange={(e) => handleChange('grossMargin', e.target.value)}
              step="0.1"
              min="0"
              max="100"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="requiredNet" className="text-sm font-medium">
              Required Net Margin %
            </Label>
            <Input
              id="requiredNet"
              type="number"
              value={settings.requiredNet}
              onChange={(e) => handleChange('requiredNet', e.target.value)}
              step="0.1"
              min="0"
              max="100"
            />
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4 pt-2">
          <div className="metric-card space-y-1">
            <div className="metric-label">Contribution / TACoS Target</div>
            <div className={`metric-value text-xl ${contributionMarginColor}`}>
              {settings.contributionMargin.toFixed(1)}%
            </div>
            <div className="text-xs text-muted-foreground">= Gross − Required Net</div>
          </div>
          
          <div className="metric-card space-y-1">
            <div className="metric-label">Required mROAS</div>
            <div className="metric-value text-xl">
              {settings.requiredMROAS > 0 ? `${settings.requiredMROAS.toFixed(2)}x` : '—'}
            </div>
            <div className="text-xs text-muted-foreground">= 1 / Contribution</div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};