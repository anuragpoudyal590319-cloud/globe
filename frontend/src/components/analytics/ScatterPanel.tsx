import { useState, useEffect, useMemo } from 'react';
import { api, IndicatorType, BulkDataResponse } from '../../api/client';
import { INDICATOR_DEFINITIONS } from '../../data/indicators';
import { ScatterPlot } from './ScatterPlot';
import styles from './ScatterPanel.module.css';

const INDICATOR_OPTIONS: { type: IndicatorType; label: string }[] = Object.entries(INDICATOR_DEFINITIONS).map(
  ([type, info]) => ({ type: type as IndicatorType, label: info.shortLabel })
);

const YEARS = Array.from({ length: 30 }, (_, i) => 2023 - i);

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

export function ScatterPanel() {
  const [xIndicator, setXIndicator] = useState<IndicatorType>('gdp_per_capita');
  const [yIndicator, setYIndicator] = useState<IndicatorType>('life_expectancy');
  const [zIndicator, setZIndicator] = useState<IndicatorType | 'none'>('none');
  const [selectedYear, setSelectedYear] = useState(2022);
  const [selectedRegion, setSelectedRegion] = useState('All Regions');
  const [showRegression, setShowRegression] = useState(true);
  const [colorByRegion, setColorByRegion] = useState(true);

  const [bulkData, setBulkData] = useState<BulkDataResponse | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Fetch bulk data
  useEffect(() => {
    const fetchData = async () => {
      setIsLoading(true);
      setError(null);

      const indicators = [xIndicator, yIndicator];
      if (zIndicator !== 'none') {
        indicators.push(zIndicator);
      }

      // Validation is handled by the UI (X and Y are always selected)

      try {
        const data = await api.getAnalyticsBulk(indicators, selectedYear, selectedYear);
        setBulkData(data);
      } catch (err) {
        const msg = err instanceof Error ? err.message : 'Failed to load data';
        console.error('Failed to fetch bulk data:', err);
        setError(msg);
        setBulkData(null);
      } finally {
        setIsLoading(false);
      }
    };

    fetchData();
  }, [xIndicator, yIndicator, zIndicator, selectedYear]);

  // Process data for scatter plot
  const scatterData = useMemo(() => {
    if (!bulkData) return [];

    const result: Array<{
      country: string;
      region: string | null;
      x: number;
      y: number;
      z?: number;
    }> = [];

    for (const country of bulkData.countries) {
      const countryData = bulkData.data[country.code];
      if (!countryData) continue;

      const xData = countryData[xIndicator]?.find((d) => d.year === selectedYear);
      const yData = countryData[yIndicator]?.find((d) => d.year === selectedYear);

      if (!xData || !yData) continue;

      // Filter by region if selected
      if (selectedRegion !== 'All Regions' && country.region !== selectedRegion) {
        continue;
      }

      const point: {
        country: string;
        region: string | null;
        x: number;
        y: number;
        z?: number;
      } = {
        country: country.name,
        region: country.region,
        x: xData.value,
        y: yData.value,
      };

      if (zIndicator !== 'none') {
        const zData = countryData[zIndicator]?.find((d) => d.year === selectedYear);
        if (zData) {
          point.z = zData.value;
        }
      }

      result.push(point);
    }

    return result;
  }, [bulkData, xIndicator, yIndicator, zIndicator, selectedYear, selectedRegion]);

  const xLabel = INDICATOR_DEFINITIONS[xIndicator]?.shortLabel || xIndicator;
  const yLabel = INDICATOR_DEFINITIONS[yIndicator]?.shortLabel || yIndicator;
  const zLabel = zIndicator !== 'none' ? INDICATOR_DEFINITIONS[zIndicator]?.shortLabel : undefined;

  return (
    <div className={styles.panel}>
      {/* Controls */}
      <div className={styles.controls}>
        <div className={styles.axisSelectors}>
          <div className={styles.field}>
            <label>X-Axis:</label>
            <select
              value={xIndicator}
              onChange={(e) => setXIndicator(e.target.value as IndicatorType)}
              className={styles.select}
            >
              {INDICATOR_OPTIONS.map(({ type, label }) => (
                <option key={type} value={type}>
                  {label}
                </option>
              ))}
            </select>
          </div>
          <div className={styles.field}>
            <label>Y-Axis:</label>
            <select
              value={yIndicator}
              onChange={(e) => setYIndicator(e.target.value as IndicatorType)}
              className={styles.select}
            >
              {INDICATOR_OPTIONS.map(({ type, label }) => (
                <option key={type} value={type}>
                  {label}
                </option>
              ))}
            </select>
          </div>
          <div className={styles.field}>
            <label>Bubble Size (optional):</label>
            <select
              value={zIndicator}
              onChange={(e) => setZIndicator(e.target.value as IndicatorType | 'none')}
              className={styles.select}
            >
              <option value="none">None (Scatter Plot)</option>
              {INDICATOR_OPTIONS.map(({ type, label }) => (
                <option key={type} value={type}>
                  {label}
                </option>
              ))}
            </select>
          </div>
        </div>

        <div className={styles.filters}>
          <div className={styles.field}>
            <label>Year:</label>
            <select
              value={selectedYear}
              onChange={(e) => setSelectedYear(parseInt(e.target.value, 10))}
              className={styles.select}
            >
              {YEARS.map((year) => (
                <option key={year} value={year}>
                  {year}
                </option>
              ))}
            </select>
          </div>
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
        </div>

        <div className={styles.toggles}>
          <label className={styles.checkboxLabel}>
            <input
              type="checkbox"
              checked={showRegression}
              onChange={(e) => setShowRegression(e.target.checked)}
            />
            <span>Show Regression Line</span>
          </label>
          <label className={styles.checkboxLabel}>
            <input
              type="checkbox"
              checked={colorByRegion}
              onChange={(e) => setColorByRegion(e.target.checked)}
            />
            <span>Color by Region</span>
          </label>
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
        ) : (
          <>
            <h3 className={styles.chartTitle}>
              {yLabel} vs {xLabel}
              {zLabel && ` (Bubble Size: ${zLabel})`}
              {' '}({selectedYear})
            </h3>
            <p className={styles.chartSubtitle}>
              {scatterData.length} countries
              {selectedRegion !== 'All Regions' && ` in ${selectedRegion}`}
            </p>
            <ScatterPlot
              data={scatterData}
              xLabel={xLabel}
              yLabel={yLabel}
              zLabel={zLabel}
              showRegression={showRegression}
              colorByRegion={colorByRegion}
            />
          </>
        )}
      </div>

      {/* Presets */}
      <div className={styles.presets}>
        <span className={styles.presetsLabel}>Quick Presets:</span>
        <button
          className={styles.preset}
          onClick={() => {
            setXIndicator('gdp_per_capita');
            setYIndicator('life_expectancy');
            setZIndicator('none');
          }}
        >
          Wealth vs Health
        </button>
        <button
          className={styles.preset}
          onClick={() => {
            setXIndicator('gdp_per_capita');
            setYIndicator('co2_emissions');
            setZIndicator('none');
          }}
        >
          Wealth vs Emissions
        </button>
        <button
          className={styles.preset}
          onClick={() => {
            setXIndicator('unemployment');
            setYIndicator('inflation');
            setZIndicator('none');
          }}
        >
          Phillips Curve
        </button>
        <button
          className={styles.preset}
          onClick={() => {
            setXIndicator('education_spending');
            setYIndicator('gdp_per_capita');
            setZIndicator('none');
          }}
        >
          Education vs Wealth
        </button>
        <button
          className={styles.preset}
          onClick={() => {
            setXIndicator('gini');
            setYIndicator('life_expectancy');
            setZIndicator('gdp_per_capita');
          }}
        >
          Inequality Bubble
        </button>
      </div>
    </div>
  );
}
