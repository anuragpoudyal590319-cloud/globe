import { useState, useEffect, useCallback, useMemo } from 'react';
import { api, Country, IndicatorValue, IndicatorType, MetaResponse } from './api/client';
import { ChoroplethMap } from './components/ChoroplethMap';
import { CountryModal } from './components/CountryModal';
import { ComparisonModal } from './components/ComparisonModal';
import { CATEGORIES, INDICATOR_DEFINITIONS, CategoryId, getIndicatorsByCategory } from './data/indicators';
import styles from './App.module.css';

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
  const [selectedCategory, setSelectedCategory] = useState<CategoryId>('Economy');
  const [meta, setMeta] = useState<MetaResponse | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedCountry, setSelectedCountry] = useState<Country | null>(null);
  const [showComparison, setShowComparison] = useState(false);

  // Get indicators for the selected category
  const categoryIndicators = useMemo(() => 
    getIndicatorsByCategory(selectedCategory),
    [selectedCategory]
  );

  // Get current indicator details
  const currentIndicator = useMemo(() => 
    INDICATOR_DEFINITIONS[indicatorType],
    [indicatorType]
  );

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

  // Handle category change - also select first indicator in that category
  const handleCategoryChange = (categoryId: CategoryId) => {
    setSelectedCategory(categoryId);
    const indicators = getIndicatorsByCategory(categoryId);
    if (indicators.length > 0) {
      setIndicatorType(indicators[0].type);
    }
  };

  return (
    <div className={styles.app}>
      <header className={styles.header}>
        <div className={styles.headerTop}>
          <div className={styles.brand}>
            <img src="/globe.svg" alt="Globe" className={styles.logo} />
            <h1 className={styles.title}>World Economic Map</h1>
          </div>

          <div className={styles.headerActions}>
            <button 
              className={styles.compareButtonHeader}
              onClick={() => setShowComparison(true)}
            >
              Compare Countries
            </button>
            <div className={styles.meta}>
              <span className={styles.metaLabel}>Updated:</span>
              <span className={styles.metaValue}>{formatLastUpdated(meta, indicatorType)}</span>
            </div>
          </div>
        </div>

        {/* Category tabs */}
        <nav className={styles.categoryNav}>
          {CATEGORIES.map((cat) => (
            <button
              key={cat.id}
              className={`${styles.categoryTab} ${selectedCategory === cat.id ? styles.categoryActive : ''}`}
              onClick={() => handleCategoryChange(cat.id)}
            >
              <span className={styles.categoryIcon}>{cat.icon}</span>
              <span className={styles.categoryLabel}>{cat.label}</span>
            </button>
          ))}
        </nav>

        {/* Indicator buttons for selected category */}
        <div className={styles.indicatorNav}>
          {categoryIndicators.map((indicator) => (
            <button
              key={indicator.type}
              className={`${styles.indicatorButton} ${indicatorType === indicator.type ? styles.indicatorActive : ''}`}
              onClick={() => handleIndicatorChange(indicator.type)}
              title={indicator.description}
            >
              <span className={styles.indicatorIcon}>{indicator.icon}</span>
              <span className={styles.indicatorLabel}>{indicator.shortLabel}</span>
            </button>
          ))}
        </div>

        {/* Current selection display with description */}
        {currentIndicator && (
          <div className={styles.currentSelection}>
            <span className={styles.currentIcon}>{currentIndicator.icon}</span>
            <span className={styles.currentLabel}>{currentIndicator.label}</span>
            <span className={styles.currentDescription}>{currentIndicator.description}</span>
          </div>
        )}
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
        <span>Data: World Bank, Open Exchange Rates</span>
        <span className={styles.separator}>•</span>
        <span>{indicatorValues.length} countries</span>
        <span className={styles.separator}>•</span>
        <span className={styles.hint}>Click a country for historical data</span>
      </footer>

      {selectedCountry && (
        <CountryModal 
          country={selectedCountry} 
          onClose={handleCloseModal} 
        />
      )}

      {showComparison && (
        <ComparisonModal 
          onClose={() => setShowComparison(false)}
        />
      )}
    </div>
  );
}
