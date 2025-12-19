import { useState, useEffect, useCallback } from 'react';
import { api, Country, IndicatorValue, IndicatorType, MetaResponse } from './api/client';
import { ChoroplethMap } from './components/ChoroplethMap';
import { CountryModal } from './components/CountryModal';
import styles from './App.module.css';

const INDICATOR_OPTIONS: { value: IndicatorType; label: string; icon: string; shortLabel: string }[] = [
  { value: 'exchange', label: 'Exchange Rate', shortLabel: 'FX', icon: '💱' },
  { value: 'inflation', label: 'Inflation', shortLabel: 'Infl', icon: '📊' },
  { value: 'interest', label: 'Interest Rate', shortLabel: 'Int', icon: '📈' },
  { value: 'gdp_per_capita', label: 'GDP per Capita', shortLabel: 'GDP', icon: '💰' },
  { value: 'unemployment', label: 'Unemployment', shortLabel: 'Unemp', icon: '👥' },
  { value: 'government_debt', label: 'Gov. Debt', shortLabel: 'Debt', icon: '🏛️' },
  { value: 'gini', label: 'GINI Index', shortLabel: 'GINI', icon: '⚖️' },
  { value: 'life_expectancy', label: 'Life Expectancy', shortLabel: 'Life', icon: '❤️' },
];

function formatLastUpdated(meta: MetaResponse | null, type: IndicatorType): string {
  if (!meta?.lastIngestion?.[type]) return 'No data yet';
  const date = new Date(meta.lastIngestion[type].finishedAt);
  return date.toLocaleDateString('en-US', { 
    month: 'short', 
    day: 'numeric',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

export default function App() {
  const [countries, setCountries] = useState<Country[]>([]);
  const [indicatorValues, setIndicatorValues] = useState<IndicatorValue[]>([]);
  const [indicatorType, setIndicatorType] = useState<IndicatorType>('gdp_per_capita');
  const [meta, setMeta] = useState<MetaResponse | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedCountry, setSelectedCountry] = useState<Country | null>(null);

  // Initial load: countries + meta
  useEffect(() => {
    async function loadInitial() {
      try {
        const [countriesData, metaData] = await Promise.all([
          api.getCountries(),
          api.getMeta(),
        ]);
        setCountries(countriesData);
        setMeta(metaData);
      } catch (err) {
        console.error('Failed to load initial data:', err);
        setError('Failed to connect to server. Please ensure the backend is running.');
      }
    }
    loadInitial();
  }, []);

  // Load indicator values when type changes
  const loadIndicatorValues = useCallback(async (type: IndicatorType) => {
    setIsLoading(true);
    setError(null);
    try {
      const values = await api.getLatestIndicators(type);
      setIndicatorValues(values);
    } catch (err) {
      console.error('Failed to load indicator values:', err);
      setError(`Failed to load ${type.replace('_', ' ')} data`);
      setIndicatorValues([]);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    loadIndicatorValues(indicatorType);
  }, [indicatorType, loadIndicatorValues]);

  const handleIndicatorChange = (type: IndicatorType) => {
    if (type !== indicatorType) {
      setIndicatorType(type);
    }
  };

  const handleCountryClick = (countryCode: string) => {
    const country = countries.find(c => c.country_code === countryCode);
    if (country) {
      setSelectedCountry(country);
    }
  };

  const handleCloseModal = () => {
    setSelectedCountry(null);
  };

  return (
    <div className={styles.app}>
      <header className={styles.header}>
        <div className={styles.brand}>
          <img src="/globe.svg" alt="Globe" className={styles.logo} />
          <h1 className={styles.title}>World Economic Map</h1>
        </div>
        
        <nav className={styles.nav}>
          {INDICATOR_OPTIONS.map((option) => (
            <button
              key={option.value}
              className={`${styles.navButton} ${indicatorType === option.value ? styles.active : ''}`}
              onClick={() => handleIndicatorChange(option.value)}
              title={option.label}
            >
              <span className={styles.navIcon}>{option.icon}</span>
              <span className={styles.navLabel}>{option.label}</span>
              <span className={styles.navShortLabel}>{option.shortLabel}</span>
            </button>
          ))}
        </nav>

        <div className={styles.meta}>
          <span className={styles.metaLabel}>Last updated:</span>
          <span className={styles.metaValue}>{formatLastUpdated(meta, indicatorType)}</span>
        </div>
      </header>

      <main className={styles.main}>
        {error ? (
          <div className={styles.error}>
            <div className={styles.errorIcon}>⚠️</div>
            <p>{error}</p>
            <button 
              className={styles.retryButton}
              onClick={() => loadIndicatorValues(indicatorType)}
            >
              Retry
            </button>
          </div>
        ) : (
          <ChoroplethMap
            countries={countries}
            indicatorValues={indicatorValues}
            indicatorType={indicatorType}
            isLoading={isLoading}
            onCountryClick={handleCountryClick}
          />
        )}
      </main>

      <footer className={styles.footer}>
        <span>Data sources: World Bank, Open Exchange Rates API</span>
        <span className={styles.separator}>•</span>
        <span>{indicatorValues.length} countries with data</span>
        <span className={styles.separator}>•</span>
        <span className={styles.hint}>Click a country for historical data</span>
      </footer>

      {selectedCountry && (
        <CountryModal 
          country={selectedCountry} 
          onClose={handleCloseModal} 
        />
      )}
    </div>
  );
}
