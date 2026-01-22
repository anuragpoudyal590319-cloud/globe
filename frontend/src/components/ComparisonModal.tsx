import { useState, useEffect, useCallback } from 'react';
import { api, IndicatorType, CompareResponse, CompareCountryOption } from '../api/client';
import { ComparisonChart } from './ComparisonChart';
import styles from './ComparisonModal.module.css';

interface ComparisonModalProps {
  onClose: () => void;
  initialCountries?: string[];
}

const INDICATOR_OPTIONS: { type: IndicatorType; label: string; icon: string }[] = [
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
  { type: 'female_employment', label: 'Female Emp.', icon: '👩‍💼' },
  // Finance
  { type: 'domestic_credit', label: 'Domestic Credit', icon: '🏦' },
  // Development
  { type: 'gini', label: 'GINI Index', icon: '⚖️' },
  { type: 'life_expectancy', label: 'Life Expectancy', icon: '❤️' },
  { type: 'education_spending', label: 'Education', icon: '🎓' },
  { type: 'poverty_headcount', label: 'Poverty Rate', icon: '🏚️' },
  // Energy
  { type: 'co2_emissions', label: 'CO2 Emissions', icon: '🏭' },
  { type: 'renewable_energy', label: 'Renewables', icon: '🌱' },
];

const MAX_COUNTRIES = 5;

export function ComparisonModal({ onClose, initialCountries = [] }: ComparisonModalProps) {
  const [availableCountries, setAvailableCountries] = useState<CompareCountryOption[]>([]);
  const [selectedCountries, setSelectedCountries] = useState<string[]>(
    initialCountries.slice(0, MAX_COUNTRIES)
  );
  const [selectedIndicators, setSelectedIndicators] = useState<IndicatorType[]>([
    'gdp_per_capita',
    'inflation',
  ]);
  const [compareData, setCompareData] = useState<CompareResponse | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isLoadingCountries, setIsLoadingCountries] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Load available countries
  useEffect(() => {
    api.getCompareCountries()
      .then(response => {
        setAvailableCountries(response.countries);
        // If no initial countries, select US and Germany by default
        if (initialCountries.length === 0) {
          const hasUS = response.countries.some(c => c.code === 'US');
          const hasDE = response.countries.some(c => c.code === 'DE');
          if (hasUS && hasDE) {
            setSelectedCountries(['US', 'DE']);
          } else if (response.countries.length >= 2) {
            setSelectedCountries([response.countries[0].code, response.countries[1].code]);
          }
        }
      })
      .catch(err => {
        console.error('Failed to load countries:', err);
        setError('Failed to load countries list');
      })
      .finally(() => {
        setIsLoadingCountries(false);
      });
  }, [initialCountries.length]);

  // Fetch comparison data when countries or indicators change
  const fetchCompareData = useCallback(async () => {
    if (selectedCountries.length < 2 || selectedIndicators.length === 0) {
      setCompareData(null);
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      const data = await api.compareCountries(
        selectedCountries,
        selectedIndicators
      );
      setCompareData(data);
    } catch (err) {
      console.error('Failed to fetch comparison data:', err);
      setError('Failed to load comparison data');
    } finally {
      setIsLoading(false);
    }
  }, [selectedCountries, selectedIndicators]);

  useEffect(() => {
    fetchCompareData();
  }, [fetchCompareData]);

  // Add a country
  const addCountry = (code: string) => {
    if (selectedCountries.length < MAX_COUNTRIES && !selectedCountries.includes(code)) {
      setSelectedCountries([...selectedCountries, code]);
    }
  };

  // Remove a country
  const removeCountry = (code: string) => {
    setSelectedCountries(selectedCountries.filter(c => c !== code));
  };

  // Toggle indicator
  const toggleIndicator = (type: IndicatorType) => {
    setSelectedIndicators(prev => {
      if (prev.includes(type)) {
        return prev.filter(i => i !== type);
      } else {
        return [...prev, type];
      }
    });
  };

  // Handle backdrop click
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

  // Get country name from code
  const getCountryName = (code: string) => {
    return availableCountries.find(c => c.code === code)?.name || code;
  };

  // Get summary stats for display
  const getSummaryValue = (countryCode: string, indicator: IndicatorType) => {
    const summary = compareData?.summary[countryCode]?.[indicator];
    if (!summary || summary.latest === null) return 'N/A';
    
    switch (indicator) {
      case 'gdp_per_capita':
        return `$${summary.latest.toLocaleString('en-US', { maximumFractionDigits: 0 })}`;
      case 'life_expectancy':
        return `${summary.latest.toFixed(1)} yrs`;
      case 'gini':
        return summary.latest.toFixed(1);
      case 'co2_emissions':
        return `${summary.latest.toFixed(1)} t`;
      default:
        return `${summary.latest.toFixed(1)}%`;
    }
  };

  return (
    <div className={styles.backdrop} onClick={handleBackdropClick}>
      <div className={styles.modal}>
        <div className={styles.header}>
          <h2 className={styles.title}>Country Comparison Tool</h2>
          <button className={styles.closeButton} onClick={onClose}>
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M18 6L6 18M6 6l12 12" />
            </svg>
          </button>
        </div>

        <div className={styles.controls}>
          {/* Country selector */}
          <div className={styles.countrySection}>
            <label className={styles.sectionLabel}>
              Select Countries (max {MAX_COUNTRIES}):
            </label>
            <div className={styles.selectedCountries}>
              {selectedCountries.map(code => (
                <div key={code} className={styles.countryTag}>
                  <span>{getCountryName(code)}</span>
                  <button 
                    className={styles.removeButton}
                    onClick={() => removeCountry(code)}
                    title="Remove"
                  >
                    ×
                  </button>
                </div>
              ))}
              {selectedCountries.length < MAX_COUNTRIES && (
                <select 
                  className={styles.countrySelect}
                  onChange={(e) => {
                    if (e.target.value) {
                      addCountry(e.target.value);
                      e.target.value = '';
                    }
                  }}
                  disabled={isLoadingCountries}
                >
                  <option value="">+ Add country</option>
                  {availableCountries
                    .filter(c => !selectedCountries.includes(c.code))
                    .map(c => (
                      <option key={c.code} value={c.code}>
                        {c.name}
                      </option>
                    ))
                  }
                </select>
              )}
            </div>
          </div>

          {/* Indicator toggles */}
          <div className={styles.indicatorSection}>
            <label className={styles.sectionLabel}>Select Indicators:</label>
            <div className={styles.indicatorToggles}>
              {INDICATOR_OPTIONS.map(({ type, label, icon }) => (
                <button
                  key={type}
                  className={`${styles.indicatorToggle} ${selectedIndicators.includes(type) ? styles.active : ''}`}
                  onClick={() => toggleIndicator(type)}
                >
                  <span className={styles.indicatorIcon}>{icon}</span>
                  <span className={styles.indicatorLabel}>{label}</span>
                </button>
              ))}
            </div>
          </div>
        </div>

        <div className={styles.content}>
          {isLoading ? (
            <div className={styles.loading}>
              <div className={styles.spinner} />
              <span>Loading comparison data...</span>
            </div>
          ) : error ? (
            <div className={styles.error}>
              <span>⚠️ {error}</span>
              <button onClick={fetchCompareData}>Retry</button>
            </div>
          ) : selectedCountries.length < 2 ? (
            <div className={styles.placeholder}>
              Select at least 2 countries to compare
            </div>
          ) : selectedIndicators.length === 0 ? (
            <div className={styles.placeholder}>
              Select at least one indicator to compare
            </div>
          ) : compareData ? (
            <>
              {/* Charts */}
              <div className={styles.chartsSection}>
                {selectedIndicators.map(indicator => (
                  <ComparisonChart
                    key={indicator}
                    data={compareData.data}
                    countries={compareData.countries}
                    indicator={indicator}
                  />
                ))}
              </div>

              {/* Summary table */}
              <div className={styles.summarySection}>
                <h3 className={styles.summaryTitle}>Latest Values</h3>
                <div className={styles.tableWrapper}>
                  <table className={styles.summaryTable}>
                    <thead>
                      <tr>
                        <th>Indicator</th>
                        {compareData.countries.map(c => (
                          <th key={c.code}>{c.name}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {selectedIndicators.map(indicator => (
                        <tr key={indicator}>
                          <td className={styles.indicatorCell}>
                            {INDICATOR_OPTIONS.find(o => o.type === indicator)?.icon}{' '}
                            {INDICATOR_OPTIONS.find(o => o.type === indicator)?.label}
                          </td>
                          {compareData.countries.map(c => (
                            <td key={c.code} className={styles.valueCell}>
                              {getSummaryValue(c.code, indicator)}
                            </td>
                          ))}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </>
          ) : null}
        </div>

        <div className={styles.footer}>
          <span className={styles.footerNote}>
            Data source: World Bank • Historical data from 1960-present
          </span>
        </div>
      </div>
    </div>
  );
}
