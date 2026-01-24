import { useState, useEffect, useMemo } from 'react';
import { api, IndicatorType, BulkDataResponse } from '../../api/client';
import { INDICATOR_DEFINITIONS } from '../../data/indicators';
import { CountryRadarChart } from './CountryRadarChart';
import { CandlestickChart } from './CandlestickChart';
import { StackedAreaChart } from './StackedAreaChart';
import styles from './AdvancedChartsPanel.module.css';

type ChartType = 'radar' | 'candlestick' | 'stacked';

const INDICATOR_OPTIONS: { type: IndicatorType; label: string }[] = Object.entries(INDICATOR_DEFINITIONS).map(
  ([type, info]) => ({ type: type as IndicatorType, label: info.shortLabel })
);

interface CountryOption {
  code: string;
  name: string;
}

const RADAR_INDICATORS: IndicatorType[] = [
  'gdp_per_capita',
  'life_expectancy',
  'unemployment',
  'inflation',
  'gini',
  'education_spending',
];

const REGION_COLORS: Record<string, string> = {
  'Europe & Central Asia': '#3b82f6',
  'East Asia & Pacific': '#ef4444',
  'Latin America & Caribbean': '#10b981',
  'Middle East & North Africa': '#f59e0b',
  'North America': '#8b5cf6',
  'South Asia': '#ec4899',
  'Sub-Saharan Africa': '#06b6d4',
};

export function AdvancedChartsPanel() {
  const [chartType, setChartType] = useState<ChartType>('radar');
  const [availableCountries, setAvailableCountries] = useState<CountryOption[]>([]);
  
  // Radar state
  const [radarCountries, setRadarCountries] = useState<string[]>(['US', 'DE', 'CN']);
  const [radarYear, setRadarYear] = useState(2022);
  
  // Candlestick state
  const [candlestickCountry, setCandlestickCountry] = useState('US');
  const [candlestickIndicator, setCandlestickIndicator] = useState<IndicatorType>('inflation');
  
  // Stacked state
  const [stackedIndicator, setStackedIndicator] = useState<IndicatorType>('gdp_per_capita');
  const [stackedMode, setStackedMode] = useState<'region' | 'countries'>('region');
  const [stackedCountries, setStackedCountries] = useState<string[]>(['US', 'CN', 'JP', 'DE', 'GB']);

  const [bulkData, setBulkData] = useState<BulkDataResponse | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Load available countries
  useEffect(() => {
    api.getCompareCountries().then((response) => {
      setAvailableCountries(response.countries.map((c) => ({ code: c.code, name: c.name })));
    });
  }, []);

  // Fetch data based on chart type
  useEffect(() => {
    const fetchData = async () => {
      setIsLoading(true);
      setError(null);

      try {
        let indicators: IndicatorType[];
        let from: number;
        let to: number;

        if (chartType === 'radar') {
          if (radarCountries.length === 0) {
            setError('Please select at least one country for the radar chart');
            setIsLoading(false);
            return;
          }
          indicators = RADAR_INDICATORS;
          from = radarYear;
          to = radarYear;
        } else if (chartType === 'candlestick') {
          indicators = [candlestickIndicator];
          from = 1990;
          to = 2023;
        } else {
          if (stackedMode === 'countries' && stackedCountries.length === 0) {
            setError('Please select at least one country for the stacked area chart');
            setIsLoading(false);
            return;
          }
          indicators = [stackedIndicator];
          from = 1990;
          to = 2023;
        }

        const data = await api.getAnalyticsBulk(indicators, from, to);
        setBulkData(data);
      } catch (err) {
        console.error('Failed to fetch data:', err);
        setError(err instanceof Error ? err.message : 'Failed to load data');
        setBulkData(null);
      } finally {
        setIsLoading(false);
      }
    };

    fetchData();
  }, [chartType, radarYear, radarCountries, candlestickIndicator, stackedIndicator, stackedMode, stackedCountries]);

  // Process radar data
  const radarData = useMemo(() => {
    if (!bulkData || chartType !== 'radar') return null;

    // Calculate percentiles for normalization
    const indicatorStats: Record<string, { min: number; max: number }> = {};
    
    for (const indicator of RADAR_INDICATORS) {
      const values: number[] = [];
      for (const country of bulkData.countries) {
        const point = bulkData.data[country.code]?.[indicator]?.find((d) => d.year === radarYear);
        if (point) values.push(point.value);
      }
      if (values.length > 0) {
        indicatorStats[indicator] = {
          min: Math.min(...values),
          max: Math.max(...values),
        };
      }
    }

    // Normalize to 0-100 scale
    const data = RADAR_INDICATORS.map((indicator) => {
      const point: { indicator: string; fullName: string; [key: string]: number | string } = {
        indicator: INDICATOR_DEFINITIONS[indicator]?.shortLabel || indicator,
        fullName: INDICATOR_DEFINITIONS[indicator]?.label || indicator,
      };

      for (const countryCode of radarCountries) {
        const value = bulkData.data[countryCode]?.[indicator]?.find((d) => d.year === radarYear)?.value;
        if (value !== undefined && indicatorStats[indicator]) {
          const { min, max } = indicatorStats[indicator];
          // For GINI and unemployment, lower is better, so invert
          const inverted = ['gini', 'unemployment', 'inflation'].includes(indicator);
          const normalized = ((value - min) / (max - min)) * 100;
          point[countryCode] = inverted ? 100 - normalized : normalized;
        } else {
          point[countryCode] = 0;
        }
      }

      return point;
    });

    const countries = radarCountries.map((code) => ({
      code,
      name: availableCountries.find((c) => c.code === code)?.name || code,
    }));

    return { data, countries };
  }, [bulkData, chartType, radarCountries, radarYear, availableCountries]);

  // Process candlestick data
  const candlestickData = useMemo(() => {
    if (!bulkData || chartType !== 'candlestick') return null;

    const countryData = bulkData.data[candlestickCountry]?.[candlestickIndicator];
    if (!countryData || countryData.length === 0) return null;

    // Group by year and calculate OHLC (for annual data, we simulate with value variations)
    const yearlyData = countryData
      .sort((a, b) => a.year - b.year)
      .map((point, index, arr) => {
        const prev = arr[index - 1];
        
        // Simulate OHLC from annual data
        const open = prev?.value || point.value;
        const close = point.value;
        const variation = Math.abs(close - open) * 0.2;
        const high = Math.max(open, close) + variation;
        const low = Math.min(open, close) - variation;

        return {
          year: point.year,
          open,
          close,
          high,
          low,
        };
      });

    return yearlyData;
  }, [bulkData, chartType, candlestickCountry, candlestickIndicator]);

  // Process stacked data
  const stackedData = useMemo(() => {
    if (!bulkData || chartType !== 'stacked') return null;

    if (stackedMode === 'region') {
      // Aggregate by region
      const years = new Set<number>();
      const regionData: Record<string, Record<number, number[]>> = {};

      for (const country of bulkData.countries) {
        const region = country.region || 'Other';
        const data = bulkData.data[country.code]?.[stackedIndicator];
        if (!data) continue;

        if (!regionData[region]) regionData[region] = {};
        
        for (const point of data) {
          years.add(point.year);
          if (!regionData[region][point.year]) regionData[region][point.year] = [];
          regionData[region][point.year].push(point.value);
        }
      }

      const sortedYears = Array.from(years).sort((a, b) => a - b);
      const regions = Object.keys(regionData).sort();

      const chartData = sortedYears.map((year) => {
        const point: { year: number; [key: string]: number } = { year };
        for (const region of regions) {
          const values = regionData[region][year] || [];
          point[region] = values.reduce((sum, v) => sum + v, 0) / (values.length || 1);
        }
        return point;
      });

      const series = regions.map((region) => ({
        key: region,
        name: region,
        color: REGION_COLORS[region] || '#6b7280',
      }));

      return { data: chartData, series };
    } else {
      // Show selected countries
      const years = new Set<number>();
      
      for (const countryCode of stackedCountries) {
        const data = bulkData.data[countryCode]?.[stackedIndicator];
        if (data) {
          data.forEach((d) => years.add(d.year));
        }
      }

      const sortedYears = Array.from(years).sort((a, b) => a - b);

      const chartData = sortedYears.map((year) => {
        const point: { year: number; [key: string]: number } = { year };
        for (const countryCode of stackedCountries) {
          const value = bulkData.data[countryCode]?.[stackedIndicator]?.find((d) => d.year === year)?.value;
          point[countryCode] = value || 0;
        }
        return point;
      });

      const colors = ['#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#ec4899', '#06b6d4'];
      const series = stackedCountries.map((code, i) => ({
        key: code,
        name: availableCountries.find((c) => c.code === code)?.name || code,
        color: colors[i % colors.length],
      }));

      return { data: chartData, series };
    }
  }, [bulkData, chartType, stackedMode, stackedIndicator, stackedCountries, availableCountries]);

  const toggleRadarCountry = (code: string) => {
    setRadarCountries((prev) => {
      if (prev.includes(code)) {
        return prev.filter((c) => c !== code);
      }
      if (prev.length < 5) {
        return [...prev, code];
      }
      return prev;
    });
  };

  const toggleStackedCountry = (code: string) => {
    setStackedCountries((prev) => {
      if (prev.includes(code)) {
        return prev.filter((c) => c !== code);
      }
      if (prev.length < 7) {
        return [...prev, code];
      }
      return prev;
    });
  };

  return (
    <div className={styles.panel}>
      {/* Chart Type Selector */}
      <div className={styles.chartTypeSelector}>
        <button
          className={`${styles.typeBtn} ${chartType === 'radar' ? styles.active : ''}`}
          onClick={() => setChartType('radar')}
        >
          <span className={styles.typeIcon}>🎯</span>
          <span>Radar Chart</span>
        </button>
        <button
          className={`${styles.typeBtn} ${chartType === 'candlestick' ? styles.active : ''}`}
          onClick={() => setChartType('candlestick')}
        >
          <span className={styles.typeIcon}>📊</span>
          <span>Candlestick</span>
        </button>
        <button
          className={`${styles.typeBtn} ${chartType === 'stacked' ? styles.active : ''}`}
          onClick={() => setChartType('stacked')}
        >
          <span className={styles.typeIcon}>📈</span>
          <span>Stacked Area</span>
        </button>
      </div>

      {/* Controls */}
      <div className={styles.controls}>
        {chartType === 'radar' && (
          <>
            <div className={styles.field}>
              <label>Year:</label>
              <input
                type="number"
                value={radarYear}
                onChange={(e) => setRadarYear(parseInt(e.target.value, 10))}
                min={1990}
                max={2023}
                className={styles.input}
              />
            </div>
            <div className={styles.countrySelection}>
              <label>Countries (max 5):</label>
              <div className={styles.chips}>
                {availableCountries.map((country) => (
                  <button
                    key={country.code}
                    className={`${styles.chip} ${radarCountries.includes(country.code) ? styles.chipActive : ''}`}
                    onClick={() => toggleRadarCountry(country.code)}
                  >
                    {country.code}
                  </button>
                ))}
              </div>
            </div>
          </>
        )}

        {chartType === 'candlestick' && (
          <>
            <div className={styles.field}>
              <label>Country:</label>
              <select
                value={candlestickCountry}
                onChange={(e) => setCandlestickCountry(e.target.value)}
                className={styles.select}
              >
                {availableCountries.map((c) => (
                  <option key={c.code} value={c.code}>
                    {c.name}
                  </option>
                ))}
              </select>
            </div>
            <div className={styles.field}>
              <label>Indicator:</label>
              <select
                value={candlestickIndicator}
                onChange={(e) => setCandlestickIndicator(e.target.value as IndicatorType)}
                className={styles.select}
              >
                {INDICATOR_OPTIONS.map(({ type, label }) => (
                  <option key={type} value={type}>
                    {label}
                  </option>
                ))}
              </select>
            </div>
          </>
        )}

        {chartType === 'stacked' && (
          <>
            <div className={styles.field}>
              <label>Indicator:</label>
              <select
                value={stackedIndicator}
                onChange={(e) => setStackedIndicator(e.target.value as IndicatorType)}
                className={styles.select}
              >
                {INDICATOR_OPTIONS.map(({ type, label }) => (
                  <option key={type} value={type}>
                    {label}
                  </option>
                ))}
              </select>
            </div>
            <div className={styles.modeToggle}>
              <button
                className={`${styles.modeBtn} ${stackedMode === 'region' ? styles.active : ''}`}
                onClick={() => setStackedMode('region')}
              >
                By Region
              </button>
              <button
                className={`${styles.modeBtn} ${stackedMode === 'countries' ? styles.active : ''}`}
                onClick={() => setStackedMode('countries')}
              >
                By Countries
              </button>
            </div>
            {stackedMode === 'countries' && (
              <div className={styles.countrySelection}>
                <label>Countries (max 7):</label>
                <div className={styles.chips}>
                  {availableCountries.map((country) => (
                    <button
                      key={country.code}
                      className={`${styles.chip} ${stackedCountries.includes(country.code) ? styles.chipActive : ''}`}
                      onClick={() => toggleStackedCountry(country.code)}
                    >
                      {country.code}
                    </button>
                  ))}
                </div>
              </div>
            )}
          </>
        )}
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
        ) : chartType === 'radar' && radarData ? (
          <>
            <h3 className={styles.chartTitle}>
              Multi-Indicator Country Profile ({radarYear})
            </h3>
            <CountryRadarChart data={radarData.data} countries={radarData.countries} />
          </>
        ) : chartType === 'candlestick' && candlestickData ? (
          <>
            <h3 className={styles.chartTitle}>
              {INDICATOR_DEFINITIONS[candlestickIndicator]?.label} Volatility -{' '}
              {availableCountries.find((c) => c.code === candlestickCountry)?.name}
            </h3>
            <CandlestickChart
              data={candlestickData}
              indicatorLabel={INDICATOR_DEFINITIONS[candlestickIndicator]?.label || candlestickIndicator}
            />
          </>
        ) : chartType === 'stacked' && stackedData ? (
          <>
            <h3 className={styles.chartTitle}>
              {INDICATOR_DEFINITIONS[stackedIndicator]?.label} -{' '}
              {stackedMode === 'region' ? 'Regional Comparison' : 'Country Comparison'}
            </h3>
            <StackedAreaChart
              data={stackedData.data}
              series={stackedData.series}
              yAxisLabel={INDICATOR_DEFINITIONS[stackedIndicator]?.unit}
            />
          </>
        ) : (
          <div className={styles.empty}>No data available</div>
        )}
      </div>
    </div>
  );
}
