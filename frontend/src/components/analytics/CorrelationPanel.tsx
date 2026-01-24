import { useState, useEffect, useCallback } from 'react';
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  ReferenceLine,
} from 'recharts';
import { api, IndicatorType, CorrelationResponse, RollingCorrelationResponse } from '../../api/client';
import { INDICATOR_DEFINITIONS } from '../../data/indicators';
import { CorrelationHeatmap } from './CorrelationHeatmap';
import styles from './CorrelationPanel.module.css';

type CorrelationType = 'cross_indicator' | 'cross_country';

const INDICATOR_OPTIONS: { type: IndicatorType; label: string }[] = Object.entries(INDICATOR_DEFINITIONS).map(
  ([type, info]) => ({ type: type as IndicatorType, label: info.shortLabel })
);

interface CountryOption {
  code: string;
  name: string;
}

export function CorrelationPanel() {
  const [correlationType, setCorrelationType] = useState<CorrelationType>('cross_indicator');
  const [selectedIndicators, setSelectedIndicators] = useState<IndicatorType[]>([
    'gdp_per_capita',
    'inflation',
    'unemployment',
    'life_expectancy',
  ]);
  const [selectedCountries, setSelectedCountries] = useState<string[]>(['US', 'DE', 'JP', 'GB', 'CN']);
  const [singleIndicator, setSingleIndicator] = useState<IndicatorType>('gdp_per_capita');
  const [availableCountries, setAvailableCountries] = useState<CountryOption[]>([]);
  const [fromYear, setFromYear] = useState(1990);
  const [toYear, setToYear] = useState(2023);
  
  const [correlationData, setCorrelationData] = useState<CorrelationResponse | null>(null);
  const [rollingData, setRollingData] = useState<RollingCorrelationResponse | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Rolling correlation settings
  const [showRolling, setShowRolling] = useState(false);
  const [rollingIndicator1, setRollingIndicator1] = useState<IndicatorType>('gdp_per_capita');
  const [rollingIndicator2, setRollingIndicator2] = useState<IndicatorType>('inflation');
  const [rollingWindow, setRollingWindow] = useState(10);

  // Load available countries
  useEffect(() => {
    api.getCompareCountries().then((response) => {
      setAvailableCountries(response.countries.map((c) => ({ code: c.code, name: c.name })));
    });
  }, []);

  // Fetch correlation data
  const fetchCorrelation = useCallback(async () => {
    // Validate inputs before making API call
    if (correlationType === 'cross_indicator') {
      if (selectedIndicators.length < 2) {
        setError('Select at least 2 indicators');
        setCorrelationData(null);
        setIsLoading(false);
        return;
      }
    } else {
      if (selectedCountries.length < 2) {
        setError('Select at least 2 countries');
        setCorrelationData(null);
        setIsLoading(false);
        return;
      }
    }

    setIsLoading(true);
    setError(null);

    try {
      if (correlationType === 'cross_indicator') {
        const data = await api.getCorrelation({
          type: 'cross_indicator',
          indicators: selectedIndicators,
          countries: selectedCountries.length > 0 ? selectedCountries : undefined,
          from: fromYear,
          to: toYear,
        });
        setCorrelationData(data);
      } else {
        const data = await api.getCorrelation({
          type: 'cross_country',
          indicator: singleIndicator,
          countries: selectedCountries,
          from: fromYear,
          to: toYear,
        });
        setCorrelationData(data);
      }
    } catch (err) {
      console.error('Failed to fetch correlation:', err);
      const errorMessage = err instanceof Error ? err.message : 'Failed to fetch correlation data';
      setError(errorMessage);
      setCorrelationData(null);
    } finally {
      setIsLoading(false);
    }
  }, [correlationType, selectedIndicators, selectedCountries, singleIndicator, fromYear, toYear]);

  // Fetch rolling correlation
  const fetchRollingCorrelation = useCallback(async () => {
    if (!showRolling) return;

    try {
      const data = await api.getRollingCorrelation(
        rollingIndicator1,
        rollingIndicator2,
        rollingWindow
      );
      setRollingData(data);
    } catch (err) {
      console.error('Failed to fetch rolling correlation:', err);
      setRollingData(null);
    }
  }, [showRolling, rollingIndicator1, rollingIndicator2, rollingWindow]);

  useEffect(() => {
    fetchCorrelation();
  }, [fetchCorrelation]);

  useEffect(() => {
    fetchRollingCorrelation();
  }, [fetchRollingCorrelation]);

  const toggleIndicator = (type: IndicatorType) => {
    setSelectedIndicators((prev) =>
      prev.includes(type) ? prev.filter((t) => t !== type) : [...prev, type]
    );
  };

  const toggleCountry = (code: string) => {
    setSelectedCountries((prev) =>
      prev.includes(code) ? prev.filter((c) => c !== code) : [...prev, code]
    );
  };

  // Get display labels for the heatmap
  const getLabels = (): string[] => {
    if (!correlationData) return [];
    if (correlationType === 'cross_indicator') {
      return correlationData.correlation.labels.map(
        (type) => INDICATOR_DEFINITIONS[type as IndicatorType]?.shortLabel || type
      );
    }
    return correlationData.correlation.labels;
  };

  return (
    <div className={styles.panel}>
      <div className={styles.controls}>
        {/* Correlation Type Toggle */}
        <div className={styles.typeToggle}>
          <button
            className={`${styles.toggleBtn} ${correlationType === 'cross_indicator' ? styles.active : ''}`}
            onClick={() => setCorrelationType('cross_indicator')}
          >
            Cross-Indicator
          </button>
          <button
            className={`${styles.toggleBtn} ${correlationType === 'cross_country' ? styles.active : ''}`}
            onClick={() => setCorrelationType('cross_country')}
          >
            Cross-Country
          </button>
        </div>

        {/* Year Range */}
        <div className={styles.yearRange}>
          <label>Year Range:</label>
          <input
            type="number"
            value={fromYear}
            onChange={(e) => setFromYear(parseInt(e.target.value, 10))}
            min={1960}
            max={2024}
            className={styles.yearInput}
          />
          <span>to</span>
          <input
            type="number"
            value={toYear}
            onChange={(e) => setToYear(parseInt(e.target.value, 10))}
            min={1960}
            max={2024}
            className={styles.yearInput}
          />
        </div>

        {/* Indicator Selection (for cross-indicator) */}
        {correlationType === 'cross_indicator' && (
          <div className={styles.selection}>
            <label>Select Indicators (min 2):</label>
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
        )}

        {/* Single Indicator Selection (for cross-country) */}
        {correlationType === 'cross_country' && (
          <div className={styles.selection}>
            <label>Select Indicator:</label>
            <select
              value={singleIndicator}
              onChange={(e) => setSingleIndicator(e.target.value as IndicatorType)}
              className={styles.select}
            >
              {INDICATOR_OPTIONS.map(({ type, label }) => (
                <option key={type} value={type}>
                  {label}
                </option>
              ))}
            </select>
          </div>
        )}

        {/* Country Selection */}
        <div className={styles.selection}>
          <label>
            {correlationType === 'cross_indicator'
              ? 'Filter by Countries (optional):'
              : 'Select Countries (min 2):'}
          </label>
          {correlationType === 'cross_country' && (
            <p className={styles.hint}>
              Tip: Select countries that have data for the chosen indicator in the selected year range. More countries with complete data will give better correlation results.
            </p>
          )}
          <div className={styles.chips}>
            {availableCountries.map((country) => (
              <button
                key={country.code}
                className={`${styles.chip} ${selectedCountries.includes(country.code) ? styles.chipActive : ''}`}
                onClick={() => toggleCountry(country.code)}
              >
                {country.code}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Results */}
      <div className={styles.results}>
        {isLoading ? (
          <div className={styles.loading}>
            <div className={styles.spinner} />
            <span>Calculating correlations...</span>
          </div>
        ) : error ? (
          <div className={styles.error}>{error}</div>
        ) : correlationData ? (
          <>
            <div className={styles.heatmapSection}>
              <h3 className={styles.sectionTitle}>
                {correlationType === 'cross_indicator'
                  ? 'Indicator Correlation Matrix'
                  : 'Country Correlation Matrix'}
              </h3>
              <p className={styles.sampleInfo}>
                Based on {correlationData.sampleSize}{' '}
                {correlationType === 'cross_indicator' ? 'countries' : 'years'} (
                {correlationData.yearRange.from}-{correlationData.yearRange.to})
              </p>
              <CorrelationHeatmap
                labels={getLabels()}
                matrix={correlationData.correlation.matrix}
              />
            </div>
          </>
        ) : null}

        {/* Rolling Correlation Section */}
        <div className={styles.rollingSection}>
          <div className={styles.rollingHeader}>
            <h3 className={styles.sectionTitle}>Time-Varying Correlation</h3>
            <button
              className={`${styles.toggleBtn} ${showRolling ? styles.active : ''}`}
              onClick={() => setShowRolling(!showRolling)}
            >
              {showRolling ? 'Hide' : 'Show'}
            </button>
          </div>

          {showRolling && (
            <>
              <div className={styles.rollingControls}>
                <div className={styles.rollingField}>
                  <label>Indicator 1:</label>
                  <select
                    value={rollingIndicator1}
                    onChange={(e) => setRollingIndicator1(e.target.value as IndicatorType)}
                    className={styles.select}
                  >
                    {INDICATOR_OPTIONS.map(({ type, label }) => (
                      <option key={type} value={type}>
                        {label}
                      </option>
                    ))}
                  </select>
                </div>
                <div className={styles.rollingField}>
                  <label>Indicator 2:</label>
                  <select
                    value={rollingIndicator2}
                    onChange={(e) => setRollingIndicator2(e.target.value as IndicatorType)}
                    className={styles.select}
                  >
                    {INDICATOR_OPTIONS.map(({ type, label }) => (
                      <option key={type} value={type}>
                        {label}
                      </option>
                    ))}
                  </select>
                </div>
                <div className={styles.rollingField}>
                  <label>Window (years):</label>
                  <input
                    type="number"
                    value={rollingWindow}
                    onChange={(e) => setRollingWindow(parseInt(e.target.value, 10))}
                    min={5}
                    max={20}
                    className={styles.yearInput}
                  />
                </div>
              </div>

              {rollingData && (
                <div className={styles.rollingChart}>
                  <ResponsiveContainer width="100%" height={250}>
                    <LineChart
                      data={rollingData.years.map((year, i) => ({
                        year,
                        correlation: rollingData.correlations[i],
                      }))}
                      margin={{ top: 10, right: 30, left: 0, bottom: 0 }}
                    >
                      <CartesianGrid strokeDasharray="3 3" stroke="#2a3547" />
                      <XAxis
                        dataKey="year"
                        stroke="#6b7280"
                        tick={{ fill: '#9ca3af', fontSize: 12 }}
                      />
                      <YAxis
                        domain={[-1, 1]}
                        stroke="#6b7280"
                        tick={{ fill: '#9ca3af', fontSize: 12 }}
                        tickFormatter={(v) => v.toFixed(1)}
                      />
                      <Tooltip
                        contentStyle={{
                          backgroundColor: '#1e293b',
                          border: '1px solid #334155',
                          borderRadius: 8,
                        }}
                        labelStyle={{ color: '#e5e7eb' }}
                        formatter={(value: number) => [value.toFixed(3), 'Correlation']}
                      />
                      <ReferenceLine y={0} stroke="#4b5563" strokeDasharray="3 3" />
                      <Line
                        type="monotone"
                        dataKey="correlation"
                        stroke="#3b82f6"
                        strokeWidth={2}
                        dot={false}
                        activeDot={{ r: 4, fill: '#3b82f6' }}
                      />
                    </LineChart>
                  </ResponsiveContainer>
                  <p className={styles.chartCaption}>
                    {rollingWindow}-year rolling correlation between{' '}
                    {INDICATOR_DEFINITIONS[rollingIndicator1]?.label} and{' '}
                    {INDICATOR_DEFINITIONS[rollingIndicator2]?.label}
                  </p>
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
}
