import { Country, IndicatorValue, IndicatorType } from '../api/client';
import styles from './Tooltip.module.css';

interface TooltipProps {
  country: Country | null;
  value: IndicatorValue | null;
  indicatorType: IndicatorType;
  position: { x: number; y: number };
  visible: boolean;
}

function formatValue(value: number, type: IndicatorType): string {
  switch (type) {
    case 'exchange':
      return value.toFixed(4);
    case 'interest':
    case 'inflation':
    case 'unemployment':
    case 'government_debt':
      return `${value.toFixed(2)}%`;
    case 'gdp_per_capita':
      return `$${value.toLocaleString('en-US', { maximumFractionDigits: 0 })}`;
    case 'gini':
      return value.toFixed(1);
    case 'life_expectancy':
      return `${value.toFixed(1)} years`;
    default:
      return value.toString();
  }
}

function getIndicatorLabel(type: IndicatorType): string {
  switch (type) {
    case 'exchange':
      return 'Exchange Rate (vs USD)';
    case 'interest':
      return 'Real Interest Rate';
    case 'inflation':
      return 'Inflation Rate';
    case 'gdp_per_capita':
      return 'GDP per Capita';
    case 'unemployment':
      return 'Unemployment Rate';
    case 'government_debt':
      return 'Government Debt (% GDP)';
    case 'gini':
      return 'GINI Index';
    case 'life_expectancy':
      return 'Life Expectancy';
    default:
      return 'Value';
  }
}

function formatDate(dateStr: string): string {
  return new Date(dateStr).toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  });
}

export function Tooltip({ country, value, indicatorType, position, visible }: TooltipProps) {
  if (!visible || !country) return null;

  return (
    <div
      className={styles.tooltip}
      style={{
        left: position.x + 15,
        top: position.y - 10,
      }}
    >
      <div className={styles.header}>
        <span className={styles.countryCode}>{country.country_code}</span>
        <span className={styles.countryName}>{country.name}</span>
      </div>
      
      {value ? (
        <div className={styles.content}>
          <div className={styles.indicator}>
            <span className={styles.label}>{getIndicatorLabel(indicatorType)}</span>
            <span className={styles.value}>{formatValue(value.value, indicatorType)}</span>
          </div>
          <div className={styles.meta}>
            <span>As of {formatDate(value.effective_date)}</span>
            <span className={styles.source}>Source: {value.source}</span>
          </div>
        </div>
      ) : (
        <div className={styles.noData}>No data available</div>
      )}
    </div>
  );
}
