import { useState, useEffect, useCallback, useMemo } from 'react';
import { api, Country, IndicatorValue, IndicatorType, MetaResponse } from './api/client';
import { ChoroplethMap } from './components/ChoroplethMap';
import { CountryModal } from './components/CountryModal';
import { ComparisonModal } from './components/ComparisonModal';
import styles from './App.module.css';

interface IndicatorOption {
  value: IndicatorType;
  label: string;
  icon: string;
  category: string;
}

// Category definitions with icons
const CATEGORIES = [
  { id: 'Economy', icon: '💰', label: 'Economy' },
  { id: 'Trade', icon: '🌐', label: 'Trade' },
  { id: 'Labor', icon: '👥', label: 'Labor' },
  { id: 'Finance', icon: '🏦', label: 'Finance' },
  { id: 'Development', icon: '📈', label: 'Development' },
  { id: 'Energy', icon: '⚡', label: 'Energy' },
  { id: 'Markets', icon: '📊', label: 'Markets' },
] as const;

type CategoryId = typeof CATEGORIES[number]['id'];

const INDICATOR_OPTIONS: IndicatorOption[] = [
  // Economy
  { value: 'gdp_per_capita', label: 'GDP per Capita', icon: '💵', category: 'Economy' },
  { value: 'inflation', label: 'Inflation', icon: '📊', category: 'Economy' },
  { value: 'interest', label: 'Interest Rate', icon: '📈', category: 'Economy' },
  { value: 'exchange', label: 'Exchange Rate', icon: '💱', category: 'Economy' },
  { value: 'government_debt', label: 'Gov. Debt', icon: '🏛️', category: 'Economy' },
  // Trade
  { value: 'exports', label: 'Exports', icon: '📦', category: 'Trade' },
  { value: 'imports', label: 'Imports', icon: '🚢', category: 'Trade' },
  { value: 'fdi_inflows', label: 'FDI Inflows', icon: '💼', category: 'Trade' },
  // Labor
  { value: 'unemployment', label: 'Unemployment', icon: '📉', category: 'Labor' },
  { value: 'labor_force', label: 'Labor Force', icon: '🏭', category: 'Labor' },
  { value: 'female_employment', label: 'Female Employment', icon: '👩‍💼', category: 'Labor' },
  // Finance
  { value: 'domestic_credit', label: 'Domestic Credit', icon: '💳', category: 'Finance' },
  // Development
  { value: 'gini', label: 'GINI Index', icon: '⚖️', category: 'Development' },
  { value: 'life_expectancy', label: 'Life Expectancy', icon: '❤️', category: 'Development' },
  { value: 'education_spending', label: 'Education', icon: '🎓', category: 'Development' },
  { value: 'poverty_headcount', label: 'Poverty Rate', icon: '🏚️', category: 'Development' },
  // Energy
  { value: 'co2_emissions', label: 'CO2 Emissions', icon: '🏭', category: 'Energy' },
  { value: 'renewable_energy', label: 'Renewables', icon: '🌱', category: 'Energy' },
  // Markets
  { value: 'market_cap', label: 'Market Cap', icon: '📈', category: 'Markets' },
  { value: 'stocks_traded', label: 'Stocks Traded', icon: '📊', category: 'Markets' },
  { value: 'stock_turnover', label: 'Turnover', icon: '🔄', category: 'Markets' },
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
  const [selectedCategory, setSelectedCategory] = useState<CategoryId>('Economy');
  const [meta, setMeta] = useState<MetaResponse | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedCountry, setSelectedCountry] = useState<Country | null>(null);
  const [showComparison, setShowComparison] = useState(false);

  // Get indicators for the selected category
  const categoryIndicators = useMemo(() => 
    INDICATOR_OPTIONS.filter(opt => opt.category === selectedCategory),
    [selectedCategory]
  );

  // Get current indicator details
  const currentIndicator = useMemo(() => 
    INDICATOR_OPTIONS.find(opt => opt.value === indicatorType),
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
    const firstIndicator = INDICATOR_OPTIONS.find(opt => opt.category === categoryId);
    if (firstIndicator) {
      setIndicatorType(firstIndicator.value);
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
          {categoryIndicators.map((option) => (
            <button
              key={option.value}
              className={`${styles.indicatorButton} ${indicatorType === option.value ? styles.indicatorActive : ''}`}
              onClick={() => handleIndicatorChange(option.value)}
            >
              <span className={styles.indicatorIcon}>{option.icon}</span>
              <span className={styles.indicatorLabel}>{option.label}</span>
            </button>
          ))}
        </div>

        {/* Current selection display */}
        {currentIndicator && (
          <div className={styles.currentSelection}>
            <span className={styles.currentIcon}>{currentIndicator.icon}</span>
            <span className={styles.currentLabel}>{currentIndicator.label}</span>
            <span className={styles.currentCategory}>({selectedCategory})</span>
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
