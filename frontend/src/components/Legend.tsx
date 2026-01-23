import { scaleSequential } from 'd3-scale';
import { IndicatorType } from '../api/client';
import styles from './Legend.module.css';

interface LegendProps {
  indicatorType: IndicatorType;
  domain: [number, number];
  colorScale: ReturnType<typeof scaleSequential<string>>;
}

function getIndicatorInfo(type: IndicatorType): { label: string; unit: string } {
  switch (type) {
    // Economy
    case 'exchange':
      return { label: 'Exchange Rate', unit: 'per USD' };
    case 'interest':
      return { label: 'Real Interest Rate', unit: '%' };
    case 'inflation':
      return { label: 'Inflation Rate', unit: '%' };
    case 'gdp_per_capita':
      return { label: 'GDP per Capita', unit: 'USD' };
    case 'unemployment':
      return { label: 'Unemployment', unit: '%' };
    case 'government_debt':
      return { label: 'Gov. Debt', unit: '% of GDP' };
    case 'gini':
      return { label: 'GINI Index', unit: '0-100' };
    case 'life_expectancy':
      return { label: 'Life Expectancy', unit: 'years' };
    // Trade
    case 'exports':
      return { label: 'Exports', unit: '% of GDP' };
    case 'imports':
      return { label: 'Imports', unit: '% of GDP' };
    case 'fdi_inflows':
      return { label: 'FDI Inflows', unit: '% of GDP' };
    // Labor
    case 'labor_force':
      return { label: 'Labor Force Participation', unit: '%' };
    case 'female_employment':
      return { label: 'Female Employment', unit: '%' };
    // Finance
    case 'domestic_credit':
      return { label: 'Domestic Credit', unit: '% of GDP' };
    // Development
    case 'education_spending':
      return { label: 'Education Spending', unit: '% of GDP' };
    case 'poverty_headcount':
      return { label: 'Poverty Rate', unit: '%' };
    // Energy
    case 'co2_emissions':
      return { label: 'CO2 Emissions', unit: 'tons/capita' };
    case 'renewable_energy':
      return { label: 'Renewable Energy', unit: '%' };
    // Markets
    case 'market_cap':
      return { label: 'Market Capitalization', unit: '% of GDP' };
    case 'stocks_traded':
      return { label: 'Stocks Traded', unit: '% of GDP' };
    case 'stock_turnover':
      return { label: 'Stock Turnover Ratio', unit: '%' };
    default:
      return { label: 'Value', unit: '' };
  }
}

function formatValue(value: number, type: IndicatorType): string {
  switch (type) {
    case 'exchange':
      if (value >= 1000) return `${(value / 1000).toFixed(0)}k`;
      if (value >= 100) return value.toFixed(0);
      return value.toFixed(2);
    case 'gdp_per_capita':
      if (value >= 1000) return `${(value / 1000).toFixed(0)}k`;
      return value.toFixed(0);
    case 'life_expectancy':
    case 'gini':
      return value.toFixed(0);
    case 'co2_emissions':
      return value.toFixed(1);
    // All percentage-based indicators
    case 'inflation':
    case 'interest':
    case 'unemployment':
    case 'government_debt':
    case 'exports':
    case 'imports':
    case 'fdi_inflows':
    case 'labor_force':
    case 'female_employment':
    case 'domestic_credit':
    case 'education_spending':
    case 'poverty_headcount':
    case 'renewable_energy':
    case 'market_cap':
    case 'stocks_traded':
    case 'stock_turnover':
      return value.toFixed(1);
    default:
      return value.toFixed(1);
  }
}

export function Legend({ indicatorType, domain, colorScale }: LegendProps) {
  const info = getIndicatorInfo(indicatorType);
  const steps = 6;
  const stepSize = (domain[1] - domain[0]) / steps;
  
  // Generate gradient stops
  const gradientStops = Array.from({ length: 10 }, (_, i) => {
    const t = i / 9;
    const value = domain[0] + t * (domain[1] - domain[0]);
    return { offset: `${t * 100}%`, color: colorScale(value) };
  });

  return (
    <div className={styles.legend}>
      <div className={styles.title}>
        <span className={styles.label}>{info.label}</span>
        <span className={styles.unit}>{info.unit}</span>
      </div>
      
      <div className={styles.gradientContainer}>
        <svg className={styles.gradient} viewBox="0 0 200 12">
          <defs>
            <linearGradient id="legendGradient" x1="0%" y1="0%" x2="100%" y2="0%">
              {gradientStops.map((stop, i) => (
                <stop key={i} offset={stop.offset} stopColor={stop.color} />
              ))}
            </linearGradient>
          </defs>
          <rect x="0" y="0" width="200" height="12" rx="3" fill="url(#legendGradient)" />
        </svg>
      </div>
      
      <div className={styles.ticks}>
        {Array.from({ length: steps + 1 }, (_, i) => {
          const value = domain[0] + i * stepSize;
          return (
            <span key={i} className={styles.tick}>
              {formatValue(value, indicatorType)}
            </span>
          );
        })}
      </div>
    </div>
  );
}
