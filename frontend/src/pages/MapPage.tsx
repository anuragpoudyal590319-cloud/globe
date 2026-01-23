import { useState, useEffect, useCallback, useMemo } from 'react';
import { api, Country, IndicatorValue, IndicatorType, MetaResponse, IndicatorYearRangeResponse } from '../api/client';
import { ChoroplethMap } from '../components/ChoroplethMap';
import { CountryModal } from '../components/CountryModal';
import { ComparisonModal } from '../components/ComparisonModal';
import { TimeControls } from '../components/TimeControls';
import { CATEGORIES, INDICATOR_DEFINITIONS, CategoryId, getIndicatorsByCategory } from '../data/indicators';
import styles from './MapPage.module.css';

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

export function MapPage() {
  const [countries, setCountries] = useState<Country[]>([]);
  const [indicatorValues, setIndicatorValues] = useState<IndicatorValue[]>([]);
  const [indicatorType, setIndicatorType] = useState<IndicatorType>('gdp_per_capita');
  const [selectedCategory, setSelectedCategory] = useState<CategoryId>('Economy');
  const [meta, setMeta] = useState<MetaResponse | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedCountry, setSelectedCountry] = useState<Country | null>(null);
  const [showComparison, setShowComparison] = useState(false);
  
  // Time-lapse state
  const [currentYear, setCurrentYear] = useState<number | null>(null);
  const [yearRange, setYearRange] = useState<IndicatorYearRangeResponse | null>(null);

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

  // Load year range when indicator type changes
  useEffect(() => {
    async function loadYearRange() {
      try {
        const range = await api.getIndicatorYearRange(indicatorType);
        setYearRange(range);
      } catch (err) {
        console.error('Failed to load year range:', err);
        setYearRange({ indicator_type: indicatorType, min_year: 1960, max_year: 2024, total_records: 0 });
      }
    }
    loadYearRange();
  }, [indicatorType]);

  // Load indicator values when type or year changes
  const loadIndicatorValues = useCallback(async (type: IndicatorType, year: number | null) => {
    setIsLoading(true);
    setError(null);
    try {
      const values = year === null 
        ? await api.getLatestIndicators(type)
        : await api.getIndicatorsByYear(type, year);
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
    loadIndicatorValues(indicatorType, currentYear);
  }, [indicatorType, currentYear, loadIndicatorValues]);

  // Handle year change from TimeControls
  const handleYearChange = useCallback((year: number | null) => {
    setCurrentYear(year);
  }, []);

  const handleIndicatorChange = (type: IndicatorType) => {
    if (type !== indicatorType) {
      setIndicatorType(type);
      setCurrentYear(null);
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

  // Handle category change
  const handleCategoryChange = (categoryId: CategoryId) => {
    setSelectedCategory(categoryId);
    const indicators = getIndicatorsByCategory(categoryId);
    if (indicators.length > 0) {
      setIndicatorType(indicators[0].type);
    }
  };

  return (
    <div className={styles.mapPage}>
      <div className={styles.controls}>
        <div className={styles.controlsTop}>
          <button 
            className={styles.compareButton}
            onClick={() => setShowComparison(true)}
          >
            Compare Countries
          </button>
          <div className={styles.meta}>
            <span className={styles.metaLabel}>Updated:</span>
            <span className={styles.metaValue}>{formatLastUpdated(meta, indicatorType)}</span>
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
      </div>

      <main className={styles.main}>
        {error ? (
          <div className={styles.error}>
            <div className={styles.errorIcon}>⚠️</div>
            <p>{error}</p>
            <button 
              className={styles.retryButton}
              onClick={() => loadIndicatorValues(indicatorType, currentYear)}
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

      {/* Time Controls */}
      {yearRange && yearRange.total_records > 0 && (
        <div className={styles.timeControlsWrapper}>
          <TimeControls
            minYear={yearRange.min_year}
            maxYear={yearRange.max_year}
            currentYear={currentYear}
            onYearChange={handleYearChange}
            isLoading={isLoading}
          />
        </div>
      )}

      <footer className={styles.footer}>
        <span>Data: World Bank, Open Exchange Rates</span>
        <span className={styles.separator}>•</span>
        <span>{indicatorValues.length} countries</span>
        <span className={styles.separator}>•</span>
        <span className={styles.hint}>
          {currentYear ? `Showing ${currentYear} data` : 'Click a country for historical data'}
        </span>
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
