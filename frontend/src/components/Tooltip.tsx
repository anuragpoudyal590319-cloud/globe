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
    case 'gdp_per_capita':
      return `$${value.toLocaleString('en-US', { maximumFractionDigits: 0 })}`;
    case 'gini':
      return value.toFixed(1);
    case 'life_expectancy':
      return `${value.toFixed(1)} years`;
    case 'co2_emissions':
      return `${value.toFixed(2)} tons`;
    // All percentage-based indicators
    case 'interest':
    case 'inflation':
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
      return `${value.toFixed(2)}%`;
    default:
      return value.toFixed(2);
  }
}

function getIndicatorLabel(type: IndicatorType): string {
  switch (type) {
    // Economy
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
      return 'Government Debt (% of GDP)';
    case 'gini':
      return 'GINI Index';
    case 'life_expectancy':
      return 'Life Expectancy';
    // Trade
    case 'exports':
      return 'Exports (% of GDP)';
    case 'imports':
      return 'Imports (% of GDP)';
    case 'fdi_inflows':
      return 'FDI Inflows (% of GDP)';
    // Labor
    case 'labor_force':
      return 'Labor Force Participation';
    case 'female_employment':
      return 'Female Employment';
    // Finance
    case 'domestic_credit':
      return 'Domestic Credit (% of GDP)';
    // Development
    case 'education_spending':
      return 'Education Spending (% of GDP)';
    case 'poverty_headcount':
      return 'Poverty Rate';
    // Energy
    case 'co2_emissions':
      return 'CO2 Emissions (tons/capita)';
    case 'renewable_energy':
      return 'Renewable Energy';
    // Markets
    case 'market_cap':
      return 'Market Capitalization (% of GDP)';
    case 'stocks_traded':
      return 'Stocks Traded (% of GDP)';
    case 'stock_turnover':
      return 'Stock Turnover Ratio';
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
