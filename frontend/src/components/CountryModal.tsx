import { useState, useEffect, useCallback } from 'react';
import { api, IndicatorType, HistoryResponse, Country } from '../api/client';
import { HistoryChart } from './HistoryChart';
import { INDICATOR_DEFINITIONS } from '../data/indicators';
import styles from './CountryModal.module.css';

interface CountryModalProps {
  country: Country;
  onClose: () => void;
}

// Get ordered list of indicators for display
const ALL_INDICATORS = Object.values(INDICATOR_DEFINITIONS);

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
            {ALL_INDICATORS.map((indicator) => (
              <button
                key={indicator.type}
                className={`${styles.toggleButton} ${selectedIndicators.includes(indicator.type) ? styles.active : ''}`}
                onClick={() => toggleIndicator(indicator.type)}
                title={indicator.description}
              >
                <span className={styles.toggleIcon}>{indicator.icon}</span>
                <span className={styles.toggleText}>{indicator.label}</span>
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

