import { useState, useEffect, useMemo } from 'react';
import { api, IndicatorType, BulkDataResponse } from '../../api/client';
import { INDICATOR_DEFINITIONS } from '../../data/indicators';
import { MatrixHeatmap } from './MatrixHeatmap';
import { TimeHeatmap } from './TimeHeatmap';
import styles from './HeatmapPanel.module.css';

type ViewMode = 'country-indicator' | 'time-country';

const INDICATOR_OPTIONS: { type: IndicatorType; label: string }[] = Object.entries(INDICATOR_DEFINITIONS).map(
  ([type, info]) => ({ type: type as IndicatorType, label: info.shortLabel })
);

const REGIONS = [
  'All Regions',
  'Europe & Central Asia',
  'East Asia & Pacific',
  'Latin America & Caribbean',
  'Middle East & North Africa',
  'North America',
  'South Asia',
  'Sub-Saharan Africa',
];

export function HeatmapPanel() {
  const [viewMode, setViewMode] = useState<ViewMode>('country-indicator');
  const [selectedIndicators, setSelectedIndicators] = useState<IndicatorType[]>([
    'gdp_per_capita',
    'inflation',
    'unemployment',
    'life_expectancy',
    'gini',
  ]);
  const [selectedIndicator, setSelectedIndicator] = useState<IndicatorType>('gdp_per_capita');
  const [selectedRegion, setSelectedRegion] = useState('All Regions');
  const [selectedYear, setSelectedYear] = useState(2022);
  const [fromYear, setFromYear] = useState(2000);
  const [toYear, setToYear] = useState(2022);
  const [colorScheme, setColorScheme] = useState<'sequential' | 'diverging'>('sequential');
  const [maxCountries, setMaxCountries] = useState(30);

  const [bulkData, setBulkData] = useState<BulkDataResponse | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Fetch bulk data
  useEffect(() => {
    const fetchData = async () => {
      setIsLoading(true);
      setError(null);

      const indicators = viewMode === 'country-indicator' ? selectedIndicators : [selectedIndicator];
      const from = viewMode === 'time-country' ? fromYear : selectedYear;
      const to = viewMode === 'time-country' ? toYear : selectedYear;

      try {
        const data = await api.getAnalyticsBulk(indicators, from, to);
        setBulkData(data);
      } catch (err) {
        console.error('Failed to fetch bulk data:', err);
        setError(err instanceof Error ? err.message : 'Failed to load data');
        setBulkData(null);
      } finally {
        setIsLoading(false);
      }
    };

    fetchData();
  }, [viewMode, selectedIndicators, selectedIndicator, selectedYear, fromYear, toYear]);

  // Process data for country-indicator matrix
  const matrixData = useMemo(() => {
    if (!bulkData || viewMode !== 'country-indicator') return null;

    // Filter and sort countries
    let countries = bulkData.countries.filter((c) => {
      if (selectedRegion !== 'All Regions' && c.region !== selectedRegion) return false;
      // Check if country has data for at least one indicator
      const countryData = bulkData.data[c.code];
      return countryData && selectedIndicators.some((ind) => 
        countryData[ind]?.some((d) => d.year === selectedYear)
      );
    });

    // Limit number of countries
    countries = countries.slice(0, maxCountries);

    const values: (number | null)[][] = countries.map((country) => {
      const countryData = bulkData.data[country.code];
      return selectedIndicators.map((ind) => {
        const point = countryData?.[ind]?.find((d) => d.year === selectedYear);
        return point?.value ?? null;
      });
    });

    return {
      rows: countries.map((c) => c.code),
      columns: selectedIndicators,
      values,
      rowLabels: countries.map((c) => c.name),
      columnLabels: selectedIndicators.map((ind) => INDICATOR_DEFINITIONS[ind]?.shortLabel || ind),
    };
  }, [bulkData, viewMode, selectedIndicators, selectedYear, selectedRegion, maxCountries]);

  // Process data for time-country heatmap
  const timeData = useMemo(() => {
    if (!bulkData || viewMode !== 'time-country') return null;

    // Filter and sort countries
    let countries = bulkData.countries.filter((c) => {
      if (selectedRegion !== 'All Regions' && c.region !== selectedRegion) return false;
      const countryData = bulkData.data[c.code];
      return countryData && countryData[selectedIndicator]?.length > 0;
    });

    // Limit number of countries and sort by latest value
    countries = countries
      .map((c) => {
        const data = bulkData.data[c.code]?.[selectedIndicator] || [];
        const latestValue = data.find((d) => d.year === toYear)?.value ?? 0;
        return { ...c, latestValue };
      })
      .sort((a, b) => b.latestValue - a.latestValue)
      .slice(0, maxCountries);

    // Generate year range
    const years: number[] = [];
    for (let y = fromYear; y <= toYear; y++) {
      years.push(y);
    }

    const values: (number | null)[][] = years.map((year) =>
      countries.map((country) => {
        const countryData = bulkData.data[country.code]?.[selectedIndicator];
        const point = countryData?.find((d) => d.year === year);
        return point?.value ?? null;
      })
    );

    return {
      years,
      entities: countries.map((c) => c.code),
      entityLabels: countries.map((c) => c.name),
      values,
    };
  }, [bulkData, viewMode, selectedIndicator, fromYear, toYear, selectedRegion, maxCountries]);

  const toggleIndicator = (type: IndicatorType) => {
    setSelectedIndicators((prev) =>
      prev.includes(type) ? prev.filter((t) => t !== type) : [...prev, type]
    );
  };

  return (
    <div className={styles.panel}>
      {/* Controls */}
      <div className={styles.controls}>
        <div className={styles.viewToggle}>
          <button
            className={`${styles.toggleBtn} ${viewMode === 'country-indicator' ? styles.active : ''}`}
            onClick={() => setViewMode('country-indicator')}
          >
            Country × Indicator
          </button>
          <button
            className={`${styles.toggleBtn} ${viewMode === 'time-country' ? styles.active : ''}`}
            onClick={() => setViewMode('time-country')}
          >
            Time × Country
          </button>
        </div>

        {viewMode === 'country-indicator' ? (
          <>
            <div className={styles.field}>
              <label>Year:</label>
              <input
                type="number"
                value={selectedYear}
                onChange={(e) => setSelectedYear(parseInt(e.target.value, 10))}
                min={1960}
                max={2024}
                className={styles.input}
              />
            </div>
            <div className={styles.indicatorSelection}>
              <label>Indicators:</label>
              <div className={styles.chips}>
                {INDICATOR_OPTIONS.map(({ type, label }) => (
                  <button
                    key={type}
                    className={`${styles.chip} ${selectedIndicators.includes(type) ? styles.chipActive : ''}`}
                    onClick={() => toggleIndicator(type)}
                  >
                    {label}
                  </button>
                ))}
              </div>
            </div>
          </>
        ) : (
          <>
            <div className={styles.field}>
              <label>Indicator:</label>
              <select
                value={selectedIndicator}
                onChange={(e) => setSelectedIndicator(e.target.value as IndicatorType)}
                className={styles.select}
              >
                {INDICATOR_OPTIONS.map(({ type, label }) => (
                  <option key={type} value={type}>
                    {label}
                  </option>
                ))}
              </select>
            </div>
            <div className={styles.yearRange}>
              <label>Year Range:</label>
              <input
                type="number"
                value={fromYear}
                onChange={(e) => setFromYear(parseInt(e.target.value, 10))}
                min={1960}
                max={2024}
                className={styles.input}
              />
              <span>to</span>
              <input
                type="number"
                value={toYear}
                onChange={(e) => setToYear(parseInt(e.target.value, 10))}
                min={1960}
                max={2024}
                className={styles.input}
              />
            </div>
          </>
        )}

        <div className={styles.filters}>
          <div className={styles.field}>
            <label>Region:</label>
            <select
              value={selectedRegion}
              onChange={(e) => setSelectedRegion(e.target.value)}
              className={styles.select}
            >
              {REGIONS.map((region) => (
                <option key={region} value={region}>
                  {region}
                </option>
              ))}
            </select>
          </div>
          <div className={styles.field}>
            <label>Max Countries:</label>
            <input
              type="number"
              value={maxCountries}
              onChange={(e) => setMaxCountries(parseInt(e.target.value, 10))}
              min={5}
              max={100}
              className={styles.input}
            />
          </div>
          <div className={styles.field}>
            <label>Color Scheme:</label>
            <select
              value={colorScheme}
              onChange={(e) => setColorScheme(e.target.value as 'sequential' | 'diverging')}
              className={styles.select}
            >
              <option value="sequential">Sequential (Yellow-Red)</option>
              <option value="diverging">Diverging (Red-Green)</option>
            </select>
          </div>
        </div>
      </div>

      {/* Chart */}
      <div className={styles.chartContainer}>
        {isLoading ? (
          <div className={styles.loading}>
            <div className={styles.spinner} />
            <span>Loading data...</span>
          </div>
        ) : error ? (
          <div className={styles.error}>{error}</div>
        ) : viewMode === 'country-indicator' && matrixData ? (
          <>
            <h3 className={styles.chartTitle}>
              Country × Indicator Matrix ({selectedYear})
            </h3>
            <p className={styles.chartSubtitle}>
              {matrixData.rows.length} countries, {matrixData.columns.length} indicators
              {selectedRegion !== 'All Regions' && ` in ${selectedRegion}`}
            </p>
            <MatrixHeatmap data={matrixData} colorScheme={colorScheme} />
          </>
        ) : viewMode === 'time-country' && timeData ? (
          <>
            <h3 className={styles.chartTitle}>
              {INDICATOR_DEFINITIONS[selectedIndicator]?.label} Over Time
            </h3>
            <p className={styles.chartSubtitle}>
              {timeData.entities.length} countries, {fromYear}-{toYear}
              {selectedRegion !== 'All Regions' && ` in ${selectedRegion}`}
            </p>
            <TimeHeatmap data={timeData} colorScheme={colorScheme} />
          </>
        ) : (
          <div className={styles.empty}>No data available</div>
        )}
      </div>
    </div>
  );
}
