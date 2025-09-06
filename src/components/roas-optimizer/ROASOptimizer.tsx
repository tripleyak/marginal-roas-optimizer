import { useState, useCallback } from 'react';
import { Header } from './Header';
import { DataUpload } from './DataUpload';
import { MarginConfig } from './MarginConfig';
import { SettingsPanel } from './SettingsPanel';
import { MetricsDisplay } from './MetricsDisplay';
import { ChartSection } from './ChartSection';
import { PortfolioResults } from './PortfolioResults';
import { ConsoleOutput } from './ConsoleOutput';

export interface ROASData {
  asin?: string;
  date: string;
  spend: number;
  ad_sales: number;
  total_sales?: number;
  gross_margin?: number;
  required_net?: number;
}

export interface OptimizationMode {
  mode: 'single' | 'portfolio';
}

export interface MarginSettings {
  grossMargin: number;
  requiredNet: number;
  contributionMargin: number;
  requiredMROAS: number;
}

export interface OptimizationSettings {
  currentSpend: number;
  maxSpend: number;
  seasonality: 'none' | 'weekly' | 'monthly';
  recency: number;
}

export interface OptimizationResults {
  optimalSpend: number;
  expectedRevenue: number;
  mRoas: number;
  totalRoas: number;
  feasible: boolean;
  currentMROAS?: number;
  deltaSpend?: number;
  liftVsCurrent?: number;
}

export const ROASOptimizer = () => {
  console.log("ROASOptimizer component rendering...");
  
  const [mode, setMode] = useState<'single' | 'portfolio'>('single');
  const [data, setData] = useState<ROASData[]>([]);
  const [marginSettings, setMarginSettings] = useState<MarginSettings>({
    grossMargin: 25,
    requiredNet: 14,
    contributionMargin: 11,
    requiredMROAS: 9.09
  });
  const [optimizationSettings, setOptimizationSettings] = useState<OptimizationSettings>({
    currentSpend: 0,
    maxSpend: 3000,
    seasonality: 'none',
    recency: 0.30
  });
  const [results, setResults] = useState<OptimizationResults | null>(null);
  const [portfolioResults, setPortfolioResults] = useState<any[]>([]);
  const [consoleMessages, setConsoleMessages] = useState<string[]>([]);
  const [error, setError] = useState<string | null>(null);

  const log = useCallback((message: string) => {
    setConsoleMessages(prev => [...prev, `${new Date().toLocaleTimeString()}: ${message}`]);
  }, []);

  const clearError = () => setError(null);

  const clearAll = () => {
    setData([]);
    setResults(null);
    setPortfolioResults([]);
    setError(null);
    setConsoleMessages([]);
    setOptimizationSettings(prev => ({
      ...prev,
      currentSpend: 0
    }));
    log('Cleared all data');
  };

  const updateMarginSettings = (newSettings: Partial<MarginSettings>) => {
    const updated = { ...marginSettings, ...newSettings };
    const cm = (updated.grossMargin - updated.requiredNet) / 100;
    updated.contributionMargin = cm * 100;
    updated.requiredMROAS = cm > 0 ? 1 / cm : 0;
    setMarginSettings(updated);
  };

  return (
    <div className="container max-w-7xl mx-auto py-8 px-4 space-y-6">
      <p className="text-sm text-success">ROASOptimizer component loaded successfully!</p>
      <Header />
      
      {/* Input Section - All on same level */}
      <div className="grid grid-cols-12 gap-6">
        {/* Data Upload */}
        <div className="col-span-6">
          <DataUpload
            mode={mode}
            onModeChange={setMode}
            data={data}
            onDataChange={setData}
            onLog={log}
            onError={setError}
            clearError={clearError}
          />
        </div>

        {/* Margin Configuration */}
        <div className="col-span-3">
          <MarginConfig
            settings={marginSettings}
            onSettingsChange={updateMarginSettings}
          />
        </div>

        {/* Settings Panel */}
        <div className="col-span-3">
          <SettingsPanel
            mode={mode}
            settings={optimizationSettings}
            onSettingsChange={setOptimizationSettings}
            data={data}
            marginSettings={marginSettings}
            onResults={setResults}
            onPortfolioResults={setPortfolioResults}
            onLog={log}
            onError={setError}
            clearError={clearError}
            onClearAll={clearAll}
          />
        </div>
      </div>

      {/* Results Section */}
      <div className="grid grid-cols-12 gap-6">

        {/* Results and Charts */}
        {mode === 'single' && results && (
          <>
            <div className="col-span-9">
              <MetricsDisplay
                results={results}
                marginSettings={marginSettings}
                currentSpend={optimizationSettings.currentSpend}
                data={data}
              />
            </div>
            <div className="col-span-12">
              <ChartSection
                data={data}
                results={results}
                marginSettings={marginSettings}
                settings={optimizationSettings}
              />
            </div>
          </>
        )}

        {mode === 'portfolio' && portfolioResults.length > 0 && (
          <div className="col-span-12">
            <PortfolioResults results={portfolioResults} />
          </div>
        )}

        {/* Console */}
        <div className="col-span-12">
          <ConsoleOutput 
            messages={consoleMessages} 
            error={error} 
          />
        </div>
      </div>
    </div>
  );
};