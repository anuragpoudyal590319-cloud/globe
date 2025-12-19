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
      return { label: 'Gov. Debt', unit: '% GDP' };
    case 'gini':
      return { label: 'GINI Index', unit: '0-100' };
    case 'life_expectancy':
      return { label: 'Life Expectancy', unit: 'years' };
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
      return value.toFixed(0);
    case 'gini':
      return value.toFixed(0);
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
