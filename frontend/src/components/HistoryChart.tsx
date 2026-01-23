import { useMemo } from 'react';
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from 'recharts';
import { IndicatorType, HistoryDataPoint } from '../api/client';
import { INDICATOR_DEFINITIONS } from '../data/indicators';
import styles from './HistoryChart.module.css';

interface HistoryChartProps {
  data: Record<string, HistoryDataPoint[]>;
  selectedIndicators: IndicatorType[];
}

// Color palette for different indicators
const INDICATOR_COLORS: Record<IndicatorType, string> = {
  exchange: '#3b82f6',         // Blue
  inflation: '#ef4444',        // Red
  interest: '#f59e0b',         // Amber
  gdp_per_capita: '#10b981',   // Emerald
  unemployment: '#8b5cf6',     // Purple
  government_debt: '#ec4899',  // Pink
  gini: '#06b6d4',             // Cyan
  life_expectancy: '#22c55e',  // Green
  // Trade
  exports: '#14b8a6',          // Teal
  imports: '#f97316',          // Orange
  fdi_inflows: '#a855f7',      // Violet
  // Labor
  labor_force: '#0ea5e9',      // Sky
  female_employment: '#d946ef', // Fuchsia
  // Finance
  domestic_credit: '#eab308',  // Yellow
  // Development
  education_spending: '#6366f1', // Indigo
  poverty_headcount: '#dc2626', // Red-600
  // Energy
  co2_emissions: '#71717a',    // Gray
  renewable_energy: '#84cc16', // Lime
  // Markets
  market_cap: '#059669',       // Emerald-600
  stocks_traded: '#0284c7',    // Sky-600
  stock_turnover: '#ea580c',   // Orange-600
};

// Get display name for indicator (with unit)
function getIndicatorName(type: IndicatorType): string {
  const info = INDICATOR_DEFINITIONS[type];
  if (info.unit === '% of GDP') {
    return `${info.shortLabel} (% GDP)`;
  } else if (info.unit === '%') {
    return `${info.shortLabel} %`;
  } else if (info.unit) {
    return `${info.shortLabel} (${info.unit})`;
  }
  return info.shortLabel;
}

// Format value for tooltip
function formatValue(value: number, indicator: IndicatorType): string {
  switch (indicator) {
    case 'gdp_per_capita':
      return `$${value.toLocaleString('en-US', { maximumFractionDigits: 0 })}`;
    case 'exchange':
      return value.toFixed(4);
    case 'life_expectancy':
      return `${value.toFixed(1)} years`;
    case 'gini':
      return value.toFixed(1);
    case 'co2_emissions':
      return `${value.toFixed(2)} tons`;
    default:
      // All percentage-based indicators
      return `${value.toFixed(2)}%`;
  }
}

// Custom tooltip component
function CustomTooltip({ active, payload, label }: { 
  active?: boolean; 
  payload?: Array<{ dataKey: string; value: number; color: string }>; 
  label?: number 
}) {
  if (!active || !payload || payload.length === 0) return null;

  return (
    <div className={styles.customTooltip}>
      <div className={styles.tooltipYear}>{label}</div>
      {payload.map((entry) => (
        <div key={entry.dataKey} className={styles.tooltipRow}>
          <span 
            className={styles.tooltipDot} 
            style={{ backgroundColor: entry.color }}
          />
          <span className={styles.tooltipLabel}>
            {getIndicatorName(entry.dataKey as IndicatorType)}:
          </span>
          <span className={styles.tooltipValue}>
            {formatValue(entry.value, entry.dataKey as IndicatorType)}
          </span>
        </div>
      ))}
    </div>
  );
}

export function HistoryChart({ data, selectedIndicators }: HistoryChartProps) {
  // Merge all indicator data into a single array by year
  const chartData = useMemo(() => {
    const yearMap = new Map<number, Record<string, number>>();
    
    for (const indicator of selectedIndicators) {
      const points = data[indicator] || [];
      for (const point of points) {
        const existing = yearMap.get(point.year) || { year: point.year };
        existing[indicator] = point.value;
        yearMap.set(point.year, existing);
      }
    }
    
    return Array.from(yearMap.values()).sort((a, b) => a.year - b.year);
  }, [data, selectedIndicators]);

  // Check which indicators need a secondary Y axis (different scales)
  const needsDualAxis = useMemo(() => {
    if (selectedIndicators.length < 2) return false;
    
    // GDP per capita is usually much larger than percentages
    const hasGdp = selectedIndicators.includes('gdp_per_capita');
    const hasPercentage = selectedIndicators.some(i => 
      [
        'inflation', 'interest', 'unemployment', 'government_debt',
        'exports', 'imports', 'fdi_inflows', 'labor_force', 'female_employment',
        'domestic_credit', 'education_spending', 'poverty_headcount', 'renewable_energy',
        'market_cap', 'stocks_traded', 'stock_turnover'
      ].includes(i)
    );
    
    return hasGdp && hasPercentage;
  }, [selectedIndicators]);

  // Determine which indicators go on which axis
  // Left axis: absolute values (GDP, exchange rate, CO2, life expectancy)
  const LEFT_AXIS_TYPES: IndicatorType[] = ['gdp_per_capita', 'exchange', 'co2_emissions', 'life_expectancy', 'gini'];
  const rightAxisIndicators = selectedIndicators.filter(i => 
    !LEFT_AXIS_TYPES.includes(i)
  );

  if (chartData.length === 0) {
    return (
      <div className={styles.noData}>
        <span>No historical data available for selected indicators</span>
      </div>
    );
  }

  return (
    <div className={styles.chartContainer}>
      <ResponsiveContainer width="100%" height={350}>
        <LineChart data={chartData} margin={{ top: 5, right: 30, left: 20, bottom: 5 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="#2a3547" />
          <XAxis 
            dataKey="year" 
            stroke="#6b7280"
            tick={{ fill: '#9ca3af', fontSize: 12 }}
          />
          <YAxis 
            yAxisId="left"
            stroke="#6b7280"
            tick={{ fill: '#9ca3af', fontSize: 12 }}
            tickFormatter={(value) => {
              if (value >= 1000000) return `${(value / 1000000).toFixed(0)}M`;
              if (value >= 1000) return `${(value / 1000).toFixed(0)}k`;
              return value.toFixed(0);
            }}
          />
          {needsDualAxis && rightAxisIndicators.length > 0 && (
            <YAxis 
              yAxisId="right"
              orientation="right"
              stroke="#6b7280"
              tick={{ fill: '#9ca3af', fontSize: 12 }}
              tickFormatter={(value) => `${value.toFixed(0)}%`}
            />
          )}
          <Tooltip content={<CustomTooltip />} />
          <Legend 
            wrapperStyle={{ paddingTop: '10px' }}
            formatter={(value) => (
              <span style={{ color: '#e5e7eb', fontSize: 12 }}>
                {getIndicatorName(value as IndicatorType)}
              </span>
            )}
          />
          {selectedIndicators.map((indicator) => {
            const useRightAxis = needsDualAxis && rightAxisIndicators.includes(indicator);
            return (
              <Line
                key={indicator}
                type="monotone"
                dataKey={indicator}
                name={indicator}
                stroke={INDICATOR_COLORS[indicator]}
                strokeWidth={2}
                dot={false}
                activeDot={{ r: 4, fill: INDICATOR_COLORS[indicator] }}
                yAxisId={useRightAxis ? 'right' : 'left'}
                connectNulls
              />
            );
          })}
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}

