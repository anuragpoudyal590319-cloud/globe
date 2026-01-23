import { scaleSequential } from 'd3-scale';
import { IndicatorType } from '../api/client';
import { INDICATOR_DEFINITIONS } from '../data/indicators';
import styles from './Legend.module.css';

interface LegendProps {
  indicatorType: IndicatorType;
  domain: [number, number];
  colorScale: ReturnType<typeof scaleSequential<string>>;
}

function getIndicatorInfo(type: IndicatorType): { label: string; unit: string } {
  const info = INDICATOR_DEFINITIONS[type];
  return { label: info.label, unit: info.unit };
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
