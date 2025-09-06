import { ROASData, MarginSettings, OptimizationSettings, OptimizationResults } from '@/components/roas-optimizer/ROASOptimizer';

// Hill model parameters
interface HillParams {
  alpha: number;  // Saturation level
  gamma: number;  // Shape parameter
  K: number;      // Half-saturation point
}

// Hill model function: y = (alpha * (x/K)^gamma) / (1 + (x/K)^gamma)
function hillY(x: number, params: HillParams): number {
  const ratio = x / Math.max(params.K, 1e-9);
  const powered = Math.pow(ratio, params.gamma);
  return (params.alpha * powered) / (1 + powered);
}

// Marginal Hill model (derivative): marginal revenue at spend x
function hillDY(x: number, params: HillParams): number {
  const ratio = x / Math.max(params.K, 1e-9);
  const powered = Math.pow(ratio, Math.max(params.gamma, 1e-9));
  const numerator = params.alpha * params.gamma * Math.pow(ratio, params.gamma - 1);
  const denominator = params.K * Math.pow(1 + powered, 2);
  return denominator > 0 ? numerator / denominator : 0;
}

// Extended ROASData interface for internal calculations
interface ExtendedROASData extends ROASData {
  ad_sales_adj?: number;
}

// Seasonal adjustment
function adjustForSeasonality(data: ROASData[], mode: string): { adjustedData: ExtendedROASData[], currentFactor: number } {
  if (mode === 'none') {
    return { 
      adjustedData: data.map(d => ({ ...d, ad_sales_adj: d.ad_sales })), 
      currentFactor: 1 
    };
  }

  // Group by seasonal period
  const groups: { [key: string]: { sum: number, count: number } } = {};
  let totalSum = 0;
  let totalCount = 0;

  for (const row of data) {
    const date = new Date(row.date);
    const key = mode === 'weekly' 
      ? date.getDay().toString()  // 0-6 (Sunday-Saturday)
      : date.getMonth().toString(); // 0-11 (Jan-Dec)

    if (!groups[key]) {
      groups[key] = { sum: 0, count: 0 };
    }
    groups[key].sum += row.ad_sales;
    groups[key].count++;
    totalSum += row.ad_sales;
    totalCount++;
  }

  const overallAvg = totalSum / Math.max(totalCount, 1);
  
  // Calculate seasonal factors
  const factors: { [key: string]: number } = {};
  for (const key in groups) {
    const groupAvg = groups[key].sum / Math.max(groups[key].count, 1);
    factors[key] = groupAvg > 0 ? groupAvg / overallAvg : 1;
  }

  // Apply seasonal adjustment
  const adjustedData: ExtendedROASData[] = data.map(row => {
    const date = new Date(row.date);
    const key = mode === 'weekly' ? date.getDay().toString() : date.getMonth().toString();
    const factor = factors[key] || 1;
    return {
      ...row,
      ad_sales_adj: row.ad_sales / factor
    };
  });

  // Current factor (for last data point)
  const lastDate = new Date(data[data.length - 1].date);
  const lastKey = mode === 'weekly' ? lastDate.getDay().toString() : lastDate.getMonth().toString();
  const currentFactor = factors[lastKey] || 1;

  return { adjustedData, currentFactor };
}

// Generate recency weights
function generateRecencyWeights(n: number, recencyFactor: number): number[] {
  const exponent = 1 + 4 * recencyFactor;
  const weights = [];
  
  for (let i = 0; i < n; i++) {
    const t = (i + 1) / n;
    weights.push(Math.pow(t, exponent));
  }
  
  // Normalize to mean = 1
  const sum = weights.reduce((a, b) => a + b, 0);
  return weights.map(w => w * n / sum);
}

// Fit Hill model using grid search (75 combinations)
function fitHillModel(spend: number[], revenue: number[], weights?: number[]): HillParams {
  const maxRevenue = Math.max(...revenue);
  const maxSpend = Math.max(...spend, 1);

  // Original grid search parameters (75 combinations: 3×5×5)
  const alphas = [1.05, 1.1, 1.2].map(m => m * maxRevenue);
  const gammas = [1.1, 1.3, 1.6, 2.0, 2.5];
  const Ks = [0.25, 0.5, 0.75, 1.0, 1.5].map(m => m * maxSpend);

  let bestParams = { alpha: alphas[0], gamma: 1.6, K: Ks[2] };
  let bestSSE = Infinity;
  const startTime = performance.now();

  for (const alpha of alphas) {
    for (const gamma of gammas) {
      for (const K of Ks) {
        // Timeout protection - abort if taking too long
        if (performance.now() - startTime > 8000) {
          break;
        }
        
        let sse = 0;
        const params = { alpha, gamma, K };
        
        for (let i = 0; i < spend.length; i++) {
          const predicted = hillY(spend[i], params);
          const error = predicted - revenue[i];
          const weight = weights ? weights[i] : 1;
          sse += weight * error * error;
        }
        
        if (sse < bestSSE) {
          bestSSE = sse;
          bestParams = params;
        }
      }
      if (performance.now() - startTime > 8000) break;
    }
    if (performance.now() - startTime > 8000) break;
  }

  return bestParams;
}

// Automatic bound helper
function autoBound(X: number[], params: HillParams, required: number, factorNow: number = 1): number {
  const mAt = (s: number) => hillDY(s, params) * factorNow;
  const maxHist = Math.max(...X, 1);
  // Start with a sensible scale: multiples of observed data and the Hill scale K
  let hi = Math.max(2 * maxHist, 4 * params.K, 1);
  const hiMax = Math.max(50 * maxHist, 20 * params.K); // safety ceiling
  // Expand until mROAS at 'hi' is below the threshold (or ceiling reached)
  for (let i = 0; i < 32 && mAt(hi) > required && hi < hiMax; i++) {
    hi *= 1.8;
  }
  return Math.min(hi, hiMax);
}

// Find optimal spend that achieves target mROAS
function findOptimalSpend(
  targetMROAS: number, 
  params: HillParams, 
  maxSpend: number, 
  seasonalFactor: number = 1
): OptimizationResults {
  // Function to calculate marginal ROAS at given spend
  const marginalROAS = (spend: number) => hillDY(spend, params) * seasonalFactor;

  // Find the peak of the marginal ROAS curve (unimodal assumption)
  const samples = 512;
  let peakSpend = 0;
  let peakMROAS = -Infinity;

  for (let i = 0; i <= samples; i++) {
    const spend = (i / samples) * maxSpend;
    const mroas = marginalROAS(spend);
    if (mroas > peakMROAS) {
      peakMROAS = mroas;
      peakSpend = spend;
    }
  }

  // Check if target is achievable
  if (peakMROAS < targetMROAS) {
    return {
      optimalSpend: 0,
      expectedRevenue: 0,
      mRoas: peakMROAS,
      totalRoas: 0,
      feasible: false
    };
  }

  // Binary search on the declining branch (right side of peak)
  let low = peakSpend;
  let high = maxSpend;
  const iterations = 60;

  for (let i = 0; i < iterations; i++) {
    const mid = (low + high) / 2;
    const mroas = marginalROAS(mid);
    
    if (mroas >= targetMROAS) {
      low = mid;
    } else {
      high = mid;
    }
  }

  const optimalSpend = low;
  const expectedRevenue = hillY(optimalSpend, params) * seasonalFactor;
  const totalRoas = expectedRevenue / Math.max(optimalSpend, 1);

  return {
    optimalSpend,
    expectedRevenue,
    mRoas: marginalROAS(optimalSpend),
    totalRoas,
    feasible: true
  };
}

// Single ASIN optimization
export async function optimizeSingleASIN(
  data: ROASData[], 
  marginSettings: MarginSettings, 
  settings: OptimizationSettings
): Promise<OptimizationResults> {
  if (data.length < 3) {
    throw new Error('At least 3 data points required');
  }

  const contributionMargin = marginSettings.contributionMargin / 100;
  const targetMROAS = 1 / contributionMargin;

  // Sort by date
  const sortedData = [...data].sort((a, b) => a.date.localeCompare(b.date));

  // Apply seasonal adjustment
  const { adjustedData, currentFactor } = adjustForSeasonality(sortedData, settings.seasonality);

  // Prepare data arrays
  const spendArray = adjustedData.map(d => d.spend);
  const revenueArray = adjustedData.map(d => d.ad_sales_adj || d.ad_sales);
  const weights = generateRecencyWeights(adjustedData.length, settings.recency);

  // Fit Hill model
  const params = fitHillModel(spendArray, revenueArray, weights);

  // Find optimal spend
  const maxSearchSpend = autoBound(spendArray, params, targetMROAS, currentFactor);
  const results = findOptimalSpend(targetMROAS, params, maxSearchSpend, currentFactor);

  // Calculate current performance if current spend is provided
  if (settings.currentSpend > 0) {
    const currentRevenue = hillY(settings.currentSpend, params) * currentFactor;
    const currentMROAS = hillDY(settings.currentSpend, params) * currentFactor;
    
    return {
      ...results,
      currentMROAS,
      deltaSpend: results.optimalSpend - settings.currentSpend,
      liftVsCurrent: results.expectedRevenue - currentRevenue
    };
  }

  return results;
}

// Portfolio optimization (simplified version)
export async function optimizePortfolio(
  data: ROASData[], 
  marginSettings: MarginSettings, 
  settings: OptimizationSettings
): Promise<any[]> {
  // Group by ASIN
  const asinGroups: { [asin: string]: ROASData[] } = {};
  
  for (const row of data) {
    const asin = row.asin || 'UNKNOWN';
    if (!asinGroups[asin]) {
      asinGroups[asin] = [];
    }
    asinGroups[asin].push(row);
  }

  const results = [];

  let processedCount = 0;
  for (const [asin, asinData] of Object.entries(asinGroups)) {
    try {
      processedCount++;
      
      if (asinData.length < 3) {
        results.push({
          asin,
          action: 'Insufficient data (< 3 points)',
          feasible: false
        });
        continue;
      }

      // Sort data by date first
      const sortedAsinData = [...asinData].sort((a, b) => a.date.localeCompare(b.date));
      
      // Use ASIN-specific margins if available, otherwise global  
      const firstRow = sortedAsinData[0];
      const cm = (firstRow.gross_margin && firstRow.required_net) 
        ? (firstRow.gross_margin - firstRow.required_net) / 100
        : marginSettings.contributionMargin / 100;

      if (cm <= 0) {
        results.push({
          asin,
          action: 'Non-positive contribution margin',
          feasible: false
        });
        continue;
      }

      const asinMargins = {
        ...marginSettings,
        contributionMargin: cm * 100,
        requiredMROAS: 1 / cm
      };

      // Optimize this ASIN (includes Hill model fitting)
      const asinResults = await optimizeSingleASIN(sortedAsinData, asinMargins, settings);
      const currentSpend = sortedAsinData[sortedAsinData.length - 1].spend;
      
      // Apply seasonal adjustment for consistent calculations
      const { adjustedData: asinAdjustedData } = adjustForSeasonality(sortedAsinData, settings.seasonality);
      
      // Re-fit Hill model using same methodology as optimization
      const spendArray = asinAdjustedData.map(d => d.spend);
      const revenueArray = asinAdjustedData.map(d => d.ad_sales_adj || d.ad_sales);
      const params = fitHillModel(spendArray, revenueArray);
      const currentRevenue = hillY(currentSpend, params);

      // Calculate organic share using sorted data
      const totalSalesSum = sortedAsinData
        .filter(d => d.total_sales != null) // Only exclude null/undefined, include 0
        .reduce((sum, d) => sum + (d.total_sales || 0), 0);
      const adSalesSum = sortedAsinData.reduce((sum, d) => sum + d.ad_sales, 0);
      const organicSales = totalSalesSum - adSalesSum;
      const organicShare = totalSalesSum > 0 ? (organicSales / totalSalesSum) * 100 : null;

      const actionText = asinResults.feasible 
        ? (asinResults.optimalSpend > currentSpend ? 'Increase' : 'Decrease')
        : 'Pause (no feasible solution)';

      results.push({
        asin,
        contributionMargin: `${(cm * 100).toFixed(1)}%`,
        requiredMROAS: `${(1 / cm).toFixed(2)}x`,
        optimalSpend: Math.round(asinResults.optimalSpend),
        expectedAdSales: Math.round(asinResults.expectedRevenue),
        totalROAS: `${asinResults.totalRoas.toFixed(2)}x`,
        mROAS: `${asinResults.mRoas.toFixed(2)}x`,
        currentSpend: Math.round(currentSpend),
        deltaSpend: Math.round(asinResults.optimalSpend - currentSpend),
        liftVsCurrent: Math.round(asinResults.expectedRevenue - currentRevenue),
        organicShare: organicShare !== null ? `${organicShare.toFixed(1)}%` : '—',
        action: actionText,
        feasible: asinResults.feasible
      });

    } catch (error) {
      results.push({
        asin,
        action: `Error: ${error instanceof Error ? error.message : String(error)}`,
        feasible: false
      });
    }
  }

  return results;
}