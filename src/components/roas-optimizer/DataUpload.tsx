import { useState, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { Upload, Download, Zap, HelpCircle } from 'lucide-react';
import { ROASData } from './ROASOptimizer';
import * as Papa from 'papaparse';
import * as XLSX from 'xlsx';

interface DataUploadProps {
  mode: 'single' | 'portfolio';
  onModeChange: (mode: 'single' | 'portfolio') => void;
  data: ROASData[];
  onDataChange: (data: ROASData[]) => void;
  onLog: (message: string) => void;
  onError: (error: string) => void;
  clearError: () => void;
}

const REQUIRED_SINGLE = ['date', 'spend', 'ad_sales'];
const REQUIRED_PORTFOLIO = ['asin', 'date', 'spend', 'ad_sales'];

const HEADER_ALIASES = {
  ad_revenue: 'ad_sales',
  ppc_sales: 'ad_sales', 
  revenue: 'ad_sales',
  sales_attributed: 'ad_sales',
  ad_spend: 'spend',
  ppc_spend: 'spend',
  cost: 'spend',
  ads_cost: 'spend',
  total_revenue: 'total_sales',
  ordered_revenue: 'total_sales',
  sales: 'total_sales',
  gross_sales: 'total_sales',
  item_asin: 'asin',
  sku_asin: 'asin',
  child_asin: 'asin',
  order_date: 'date',
  day: 'date'
};

export const DataUpload = ({ 
  mode, 
  onModeChange, 
  data, 
  onDataChange, 
  onLog, 
  onError,
  clearError 
}: DataUploadProps) => {
  const [manualData, setManualData] = useState('');
  const [fileInfo, setFileInfo] = useState('');
  const fileInputRef = useRef<HTMLInputElement>(null);

  const normalizeKey = (key: string) => key.toLowerCase().trim().replace(/\s+/g, '_');

  const applyAliases = (obj: any) => {
    const normalized = { ...obj };
    for (const [alias, target] of Object.entries(HEADER_ALIASES)) {
      if (alias in normalized && !(target in normalized)) {
        normalized[target] = normalized[alias];
      }
    }
    return normalized;
  };

  const coerceDateYMD = (value: any): string => {
    if (value instanceof Date && !isNaN(value.getTime())) {
      return value.toISOString().split('T')[0];
    }
    if (typeof value === 'number' && isFinite(value)) {
      // Excel serial date
      const epoch = new Date(Date.UTC(1899, 11, 30));
      const date = new Date(epoch.getTime() + value * 86400000);
      return date.toISOString().split('T')[0];
    }
    const str = String(value).trim();
    const iso = str.match(/^(\d{4})-(\d{1,2})-(\d{1,2})/);
    if (iso) {
      const date = new Date(+iso[1], +iso[2] - 1, +iso[3]);
      return date.toISOString().split('T')[0];
    }
    const us = str.match(/^(\d{1,2})\/(\d{1,2})\/(\d{2,4})$/);
    if (us) {
      const year = +us[3] < 100 ? +us[3] + 2000 : +us[3];
      const date = new Date(year, +us[1] - 1, +us[2]);
      return date.toISOString().split('T')[0];
    }
    return str.slice(0, 10);
  };

  const toNumber = (value: any): number => {
    if (value === null || value === undefined || value === '') return 0;
    if (typeof value === 'number') return isFinite(value) ? value : 0;
    const cleaned = String(value).replace(/[^0-9.-]/g, '');
    const num = parseFloat(cleaned);
    return isFinite(num) ? num : 0;
  };

  const parseAndProcessData = (rawData: any[]) => {
    clearError();
    const requiredCols = mode === 'portfolio' ? REQUIRED_PORTFOLIO : REQUIRED_SINGLE;

    // Normalize headers and apply aliases
    const processedRows = rawData.map(row => {
      const normalized: any = {};
      for (const key in row) {
        normalized[normalizeKey(key)] = row[key];
      }
      return applyAliases(normalized);
    });

    // Validate required columns
    if (processedRows.length === 0) {
      onError('No data found');
      return;
    }

    const availableKeys = Object.keys(processedRows[0]);
    const missingCols = requiredCols.filter(col => !availableKeys.includes(col));
    if (missingCols.length > 0) {
      onError(`Missing required columns: ${missingCols.join(', ')}`);
      return;
    }

    // Aggregate data by key (date for single, asin|date for portfolio)
    const aggregatedMap = new Map<string, ROASData>();
    
    for (const row of processedRows) {
      const key = mode === 'portfolio' 
        ? `${String(row.asin || '').trim()}|${coerceDateYMD(row.date)}`
        : coerceDateYMD(row.date);

      if (!aggregatedMap.has(key)) {
        aggregatedMap.set(key, {
          asin: mode === 'portfolio' ? String(row.asin || '').trim() : undefined,
          date: coerceDateYMD(row.date),
          spend: 0,
          ad_sales: 0,
          total_sales: 0,
          gross_margin: row.gross_margin ? toNumber(row.gross_margin) : undefined,
          required_net: row.required_net ? toNumber(row.required_net) : undefined,
        });
      }

      const existing = aggregatedMap.get(key)!;
      existing.spend += toNumber(row.spend);
      existing.ad_sales += toNumber(row.ad_sales);
      if (row.total_sales) existing.total_sales = (existing.total_sales || 0) + toNumber(row.total_sales);
    }

    const finalData = Array.from(aggregatedMap.values())
      .sort((a, b) => a.date.localeCompare(b.date));

    onDataChange(finalData);
    onLog(`Processed ${finalData.length} data points`);
    setFileInfo(`Loaded ${finalData.length} rows`);

    // Update manual textarea
    const csvData = mode === 'portfolio'
      ? ['asin,date,spend,ad_sales,total_sales,gross_margin,required_net']
      : ['date,spend,ad_sales,total_sales'];
    
    csvData.push(
      ...finalData.map(row => {
        if (mode === 'portfolio') {
          return [
            row.asin,
            row.date,
            row.spend.toFixed(2),
            row.ad_sales.toFixed(2),
            (row.total_sales || 0).toFixed(2),
            row.gross_margin || '',
            row.required_net || ''
          ].join(',');
        } else {
          return [
            row.date,
            row.spend.toFixed(2),
            row.ad_sales.toFixed(2),
            (row.total_sales || 0).toFixed(2)
          ].join(',');
        }
      })
    );
    
    setManualData(csvData.join('\n'));
  };

  const handleFileUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    const fileName = file.name.toLowerCase();
    const isCSV = fileName.endsWith('.csv');

    if (isCSV) {
      Papa.parse(file, {
        header: true,
        skipEmptyLines: true,
        dynamicTyping: false,
        transformHeader: normalizeKey,
        complete: (result) => parseAndProcessData(result.data),
        error: (error) => onError(`CSV parsing error: ${error.message}`)
      });
    } else {
      const reader = new FileReader();
      reader.onload = (e) => {
        try {
          const workbook = XLSX.read(e.target?.result, { type: 'array', cellDates: true });
          const worksheet = workbook.Sheets[workbook.SheetNames[0]];
          const jsonData = XLSX.utils.sheet_to_json(worksheet, { raw: false });
          parseAndProcessData(jsonData);
        } catch (error) {
          onError(`Excel parsing error: ${error}`);
        }
      };
      reader.readAsArrayBuffer(file);
    }
  };

  const handleManualDataChange = (value: string) => {
    setManualData(value);
    if (!value.trim()) return;

    try {
      const result = Papa.parse(value, {
        header: true,
        skipEmptyLines: true,
        transformHeader: normalizeKey
      });
      parseAndProcessData(result.data);
    } catch (error) {
      onError(`Manual data parsing error: ${error}`);
    }
  };

  const downloadTemplate = () => {
    const csv = mode === 'portfolio'
      ? 'asin,date,spend,ad_sales,total_sales,gross_margin,required_net\nA1,2025-08-01,300,2600,4200,25,14\nA1,2025-08-02,400,3000,4700,25,14\nA2,2025-08-01,200,1600,2600,30,14\nA2,2025-08-02,260,1800,2900,30,14'
      : 'date,spend,ad_sales,total_sales\n2025-08-01,300,2600,4200\n2025-08-02,400,3000,4700\n2025-08-03,500,3300,5200';
    
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = mode === 'portfolio' ? 'portfolio_template.csv' : 'asin_template.csv';
    a.click();
    URL.revokeObjectURL(url);
  };

  const loadExample = () => {
    const exampleData = mode === 'portfolio'
      ? `asin,date,spend,ad_sales,total_sales,gross_margin,required_net
A1,2025-08-01,300,2600,4200,25,14
A1,2025-08-02,400,3000,4700,25,14
A1,2025-08-03,500,3300,5200,25,14
A2,2025-08-01,200,1600,2600,30,14
A2,2025-08-02,260,1800,2900,30,14
A2,2025-08-03,320,2000,3100,30,14`
      : `date,spend,ad_sales,total_sales
2025-08-01,300,2600,4200
2025-08-02,400,3000,4700
2025-08-03,500,3300,5200
2025-08-04,600,3600,5600
2025-08-05,700,3800,5900
2025-08-06,800,3950,6300
2025-08-07,900,4050,6700
2025-08-08,1000,4120,7100`;

    setManualData(exampleData);
    handleManualDataChange(exampleData);
    onLog('Loaded example data');
  };

  return (
    <Card className="card-enhanced h-fit">
      <CardHeader className="pb-4">
        <div className="flex items-center justify-between">
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <CardTitle className="text-lg">Mode & Data Upload</CardTitle>
              <Tooltip>
                <TooltipTrigger asChild>
                  <HelpCircle className="h-4 w-4 text-muted-foreground cursor-help" />
                </TooltipTrigger>
                <TooltipContent side="top" className="max-w-xs">
                  <p>Choose your optimization mode:</p>
                  <br />
                  <p><strong>Single ASIN:</strong> Optimize spend for one product using time series data</p>
                  <br />
                  <p><strong>Portfolio:</strong> Optimize spend allocation across multiple ASINs</p>
                </TooltipContent>
              </Tooltip>
            </div>
            <Select value={mode} onValueChange={onModeChange}>
              <SelectTrigger className="w-48">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="single">Single ASIN</SelectItem>
                <SelectItem value="portfolio">Portfolio (multi-ASIN)</SelectItem>
              </SelectContent>
            </Select>
          </div>
          
          <div className="flex gap-2">
            <Button variant="outline" size="sm" onClick={downloadTemplate}>
              <Download className="w-4 h-4 mr-2" />
              CSV Template
            </Button>
            <Button variant="outline" size="sm" onClick={loadExample}>
              <Zap className="w-4 h-4 mr-2" />
              Load Example
            </Button>
          </div>
        </div>
      </CardHeader>

      <CardContent className="space-y-4">
        <div>
          <h4 className="font-semibold mb-2">📁 Required Columns</h4>
          <div className="flex flex-wrap gap-2">
            {(mode === 'portfolio' ? REQUIRED_PORTFOLIO : REQUIRED_SINGLE).map(col => (
              <Badge key={col} variant="outline" className="pill">
                {col}
              </Badge>
            ))}
            <Badge variant="outline" className="pill text-muted-foreground">
              total_sales (optional)
            </Badge>
            {mode === 'portfolio' && (
              <>
                <Badge variant="outline" className="pill text-muted-foreground">
                  gross_margin (optional)
                </Badge>
                <Badge variant="outline" className="pill text-muted-foreground">
                  required_net (optional)
                </Badge>
              </>
            )}
          </div>
        </div>

        <div className="space-y-2">
          <div className="flex items-center gap-3">
            <Input
              ref={fileInputRef}
              type="file"
              accept=".csv,.xlsx,.xls"
              onChange={handleFileUpload}
              className="flex-1"
            />
            {fileInfo && (
              <span className="text-sm text-muted-foreground">{fileInfo}</span>
            )}
          </div>
        </div>

        <div className="p-4 bg-muted/20 border border-dashed border-primary/30 rounded-lg">
          <p className="text-sm text-muted-foreground">
            <strong>Header aliases supported:</strong> ad_spend → spend, ppc_sales/ad_revenue → ad_sales, 
            sales/total_revenue → total_sales. Currency symbols and commas are automatically cleaned.
          </p>
        </div>

        <div className="space-y-2">
          <label className="text-sm font-medium">
            Or paste CSV data (headers required)
          </label>
          <Textarea
            value={manualData}
            onChange={(e) => handleManualDataChange(e.target.value)}
            placeholder={`${mode === 'portfolio' ? 'asin,' : ''}date,spend,ad_sales,total_sales
${mode === 'portfolio' ? 'A1,' : ''}2025-08-01,300,2600,4200
${mode === 'portfolio' ? 'A1,' : ''}2025-08-02,400,3000,4700`}
            className="min-h-24 font-mono text-xs"
          />
        </div>
      </CardContent>
    </Card>
  );
};