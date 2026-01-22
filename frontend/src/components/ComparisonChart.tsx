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
import { IndicatorType, CompareDataPoint } from '../api/client';
import styles from './ComparisonChart.module.css';

interface ComparisonChartProps {
  data: Record<string, Record<string, CompareDataPoint[]>>;
  countries: Array<{ code: string; name: string }>;
  indicator: IndicatorType;
}

// Color palette for different countries
const COUNTRY_COLORS = [
  '#10b981', // Emerald
  '#3b82f6', // Blue
  '#f59e0b', // Amber
  '#ef4444', // Red
  '#8b5cf6', // Purple
  '#ec4899', // Pink
  '#06b6d4', // Cyan
  '#84cc16', // Lime
  '#f97316', // Orange
  '#6366f1', // Indigo
];

// Display names for indicators
const INDICATOR_NAMES: Record<IndicatorType, string> = {
  exchange: 'Exchange Rate',
  inflation: 'Inflation %',
  interest: 'Interest Rate %',
  gdp_per_capita: 'GDP per Capita ($)',
  unemployment: 'Unemployment %',
  government_debt: 'Gov. Debt (% GDP)',
  gini: 'GINI Index',
  life_expectancy: 'Life Expectancy (years)',
  exports: 'Exports (% GDP)',
  imports: 'Imports (% GDP)',
  fdi_inflows: 'FDI Inflows (% GDP)',
  labor_force: 'Labor Force Participation %',
  female_employment: 'Female Employment %',
  domestic_credit: 'Domestic Credit (% GDP)',
  education_spending: 'Education Spending (% GDP)',
  poverty_headcount: 'Poverty Rate %',
  co2_emissions: 'CO2 Emissions (tons/capita)',
  renewable_energy: 'Renewable Energy %',
  market_cap: 'Market Cap (% GDP)',
  stocks_traded: 'Stocks Traded (% GDP)',
  stock_turnover: 'Stock Turnover %',
};

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
      return `${value.toFixed(2)}%`;
  }
}

// Custom tooltip component
function CustomTooltip({ 
  active, 
  payload, 
  label,
  indicator,
}: { 
  active?: boolean; 
  payload?: Array<{ dataKey: string; value: number; color: string; name: string }>; 
  label?: number;
  indicator: IndicatorType;
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
            {entry.name}:
          </span>
          <span className={styles.tooltipValue}>
            {formatValue(entry.value, indicator)}
          </span>
        </div>
      ))}
    </div>
  );
}

export function ComparisonChart({ data, countries, indicator }: ComparisonChartProps) {
  // Merge all country data into a single array by year
  const chartData = useMemo(() => {
    const yearMap = new Map<number, Record<string, number | undefined>>();
    
    for (const country of countries) {
      const points = data[country.code]?.[indicator] || [];
      for (const point of points) {
        const existing = yearMap.get(point.year) || { year: point.year };
        existing[country.code] = point.value;
        yearMap.set(point.year, existing);
      }
    }
    
    return Array.from(yearMap.values()).sort((a, b) => (a.year as number) - (b.year as number));
  }, [data, countries, indicator]);

  if (chartData.length === 0) {
    return (
      <div className={styles.noData}>
        <span>No data available for {INDICATOR_NAMES[indicator]}</span>
      </div>
    );
  }

  return (
    <div className={styles.chartContainer}>
      <h3 className={styles.chartTitle}>{INDICATOR_NAMES[indicator]}</h3>
      <ResponsiveContainer width="100%" height={300}>
        <LineChart data={chartData} margin={{ top: 5, right: 30, left: 20, bottom: 5 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="#2a3547" />
          <XAxis 
            dataKey="year" 
            stroke="#6b7280"
            tick={{ fill: '#9ca3af', fontSize: 12 }}
          />
          <YAxis 
            stroke="#6b7280"
            tick={{ fill: '#9ca3af', fontSize: 12 }}
            tickFormatter={(value) => {
              if (indicator === 'gdp_per_capita') {
                if (value >= 1000000) return `$${(value / 1000000).toFixed(0)}M`;
                if (value >= 1000) return `$${(value / 1000).toFixed(0)}k`;
                return `$${value.toFixed(0)}`;
              }
              return value.toFixed(0);
            }}
          />
          <Tooltip content={<CustomTooltip indicator={indicator} />} />
          <Legend 
            wrapperStyle={{ paddingTop: '10px' }}
            formatter={(value) => (
              <span style={{ color: '#e5e7eb', fontSize: 12 }}>
                {countries.find(c => c.code === value)?.name || value}
              </span>
            )}
          />
          {countries.map((country, index) => (
            <Line
              key={country.code}
              type="monotone"
              dataKey={country.code}
              name={country.code}
              stroke={COUNTRY_COLORS[index % COUNTRY_COLORS.length]}
              strokeWidth={2}
              dot={false}
              activeDot={{ r: 4, fill: COUNTRY_COLORS[index % COUNTRY_COLORS.length] }}
              connectNulls
            />
          ))}
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}
