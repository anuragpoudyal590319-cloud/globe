import { useState, useEffect, useCallback } from 'react';
import { api, IndicatorType, HistoryResponse, Country } from '../api/client';
import { HistoryChart } from './HistoryChart';
import styles from './CountryModal.module.css';

interface CountryModalProps {
  country: Country;
  onClose: () => void;
}

const ALL_INDICATORS: { type: IndicatorType; label: string; icon: string }[] = [
  // Economy
  { type: 'gdp_per_capita', label: 'GDP per Capita', icon: '💰' },
  { type: 'inflation', label: 'Inflation', icon: '📊' },
  { type: 'interest', label: 'Interest Rate', icon: '📈' },
  { type: 'government_debt', label: 'Gov. Debt', icon: '🏛️' },
  // Trade
  { type: 'exports', label: 'Exports', icon: '📦' },
  { type: 'imports', label: 'Imports', icon: '🚢' },
  { type: 'fdi_inflows', label: 'FDI Inflows', icon: '💼' },
  // Labor
  { type: 'unemployment', label: 'Unemployment', icon: '👥' },
  { type: 'labor_force', label: 'Labor Force', icon: '🏭' },
  { type: 'female_employment', label: 'Female Employment', icon: '👩‍💼' },
  // Finance
  { type: 'domestic_credit', label: 'Domestic Credit', icon: '🏦' },
  // Development
  { type: 'gini', label: 'GINI Index', icon: '⚖️' },
  { type: 'life_expectancy', label: 'Life Expectancy', icon: '❤️' },
  { type: 'education_spending', label: 'Education Spending', icon: '🎓' },
  { type: 'poverty_headcount', label: 'Poverty Rate', icon: '🏚️' },
  // Energy
  { type: 'co2_emissions', label: 'CO2 Emissions', icon: '🏭' },
  { type: 'renewable_energy', label: 'Renewable Energy', icon: '🌱' },
];

export function CountryModal({ country, onClose }: CountryModalProps) {
  const [historyData, setHistoryData] = useState<HistoryResponse | null>(null);
  const [selectedIndicators, setSelectedIndicators] = useState<IndicatorType[]>([
    'gdp_per_capita',
    'inflation',
  ]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Fetch history data when modal opens or indicators change
  const fetchHistory = useCallback(async () => {
    if (selectedIndicators.length === 0) {
      setHistoryData(null);
      setIsLoading(false);
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      const data = await api.getCountryHistory(
        country.country_code,
        selectedIndicators
      );
      setHistoryData(data);
    } catch (err) {
      console.error('Failed to fetch history:', err);
      setError('Failed to load historical data');
    } finally {
      setIsLoading(false);
    }
  }, [country.country_code, selectedIndicators]);

  useEffect(() => {
    fetchHistory();
  }, [fetchHistory]);

  // Toggle indicator selection
  const toggleIndicator = (indicator: IndicatorType) => {
    setSelectedIndicators(prev => {
      if (prev.includes(indicator)) {
        return prev.filter(i => i !== indicator);
      } else {
        return [...prev, indicator];
      }
    });
  };

  // Handle click outside to close
  const handleBackdropClick = (e: React.MouseEvent) => {
    if (e.target === e.currentTarget) {
      onClose();
    }
  };

  // Handle escape key
  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
      }
    };
    window.addEventListener('keydown', handleEscape);
    return () => window.removeEventListener('keydown', handleEscape);
  }, [onClose]);

  return (
    <div className={styles.backdrop} onClick={handleBackdropClick}>
      <div className={styles.modal}>
        <div className={styles.header}>
          <div className={styles.countryInfo}>
            <span className={styles.countryCode}>{country.country_code}</span>
            <h2 className={styles.countryName}>{country.name}</h2>
            {country.region && (
              <span className={styles.region}>{country.region}</span>
            )}
          </div>
          <button className={styles.closeButton} onClick={onClose}>
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M18 6L6 18M6 6l12 12" />
            </svg>
          </button>
        </div>

        <div className={styles.indicatorToggles}>
          <span className={styles.toggleLabel}>Select indicators to display:</span>
          <div className={styles.toggleGroup}>
            {ALL_INDICATORS.map(({ type, label, icon }) => (
              <button
                key={type}
                className={`${styles.toggleButton} ${selectedIndicators.includes(type) ? styles.active : ''}`}
                onClick={() => toggleIndicator(type)}
              >
                <span className={styles.toggleIcon}>{icon}</span>
                <span className={styles.toggleText}>{label}</span>
              </button>
            ))}
          </div>
        </div>

        <div className={styles.chartSection}>
          {isLoading ? (
            <div className={styles.loading}>
              <div className={styles.spinner} />
              <span>Loading historical data...</span>
            </div>
          ) : error ? (
            <div className={styles.error}>
              <span>⚠️ {error}</span>
              <button onClick={fetchHistory}>Retry</button>
            </div>
          ) : selectedIndicators.length === 0 ? (
            <div className={styles.placeholder}>
              Select at least one indicator to view historical trends
            </div>
          ) : historyData ? (
            <HistoryChart 
              data={historyData.data} 
              selectedIndicators={selectedIndicators} 
            />
          ) : null}
        </div>

        <div className={styles.footer}>
          <span className={styles.footerNote}>
            Data source: World Bank • Click indicators above to toggle
          </span>
        </div>
      </div>
    </div>
  );
}

