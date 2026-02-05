import { useState, useEffect, useMemo } from 'react';
import {
  ComposedChart,
  Line,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  ReferenceLine,
} from 'recharts';
import { api, IndicatorType } from '../../api/client';
import { INDICATOR_DEFINITIONS } from '../../data/indicators';
import {
  linearRegression,
  simpleMovingAverage,
  exponentialMovingAverage,
  yoyGrowth,
  cagr,
  generateProjection,
  Point,
  formatNumber,
} from '../../utils/statistics';
import styles from './ForecastPanel.module.css';

interface CountryOption {
  code: string;
  name: string;
}

const INDICATOR_OPTIONS: { type: IndicatorType; label: string }[] = Object.entries(INDICATOR_DEFINITIONS).map(
  ([type, info]) => ({ type: type as IndicatorType, label: info.label })
);

export function ForecastPanel() {
  const [selectedCountry, setSelectedCountry] = useState<string>('US');
  const [selectedIndicator, setSelectedIndicator] = useState<IndicatorType>('gdp_per_capita');
  const [availableCountries, setAvailableCountries] = useState<CountryOption[]>([]);
  const [historyData, setHistoryData] = useState<Point[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Overlay toggles
  const [showTrend, setShowTrend] = useState(true);
  const [showSMA, setShowSMA] = useState(false);
  const [showEMA, setShowEMA] = useState(false);
  const [showProjection, setShowProjection] = useState(true);

  // Parameters
  const [smaWindow, setSmaWindow] = useState(5);
  const [emaWindow, setEmaWindow] = useState(5);
  const [projectionYears, setProjectionYears] = useState(5);

  // Load available countries
  useEffect(() => {
    api.getCompareCountries().then((response) => {
      setAvailableCountries(response.countries.map((c) => ({ code: c.code, name: c.name })));
    });
  }, []);

  // Load history data
  useEffect(() => {
    const fetchHistory = async () => {
      setIsLoading(true);
      setError(null);
      try {
        const response = await api.getCountryHistory(selectedCountry, [selectedIndicator]);
        const data = response.data[selectedIndicator] || [];
        if (data.length === 0) {
          setError('No historical data available for this country and indicator combination.');
        } else {
          setHistoryData(data.map((d) => ({ year: d.year, value: d.value })));
        }
      } catch (err) {
        const errorMessage = err instanceof Error ? err.message : 'Failed to load historical data';
        console.error('Failed to fetch history:', err);
        setError(errorMessage);
        setHistoryData([]);
      } finally {
        setIsLoading(false);
      }
    };
    fetchHistory();
  }, [selectedCountry, selectedIndicator]);

  // Calculate derived data
  const chartData = useMemo(() => {
    if (historyData.length === 0) return [];

    const sorted = [...historyData].sort((a, b) => a.year - b.year);
    const values = sorted.map((p) => p.value);
    const regression = linearRegression(sorted);
    const sma = simpleMovingAverage(values, smaWindow);
    const ema = exponentialMovingAverage(values, emaWindow);
    const projection = generateProjection(sorted, projectionYears);

    // Combine actual data
    const combined = sorted.map((p, i) => ({
      year: p.year,
      actual: p.value,
      trend: regression.predict(p.year),
      sma: sma[i],
      ema: ema[i],
      isProjection: false,
    }));

    // Add projection data
    if (showProjection) {
      projection.forEach((p) => {
        combined.push({
          year: p.year,
          actual: null as unknown as number,
          trend: regression.predict(p.year),
          sma: null,
          ema: null,
          isProjection: true,
        });
      });
    }

    return combined;
  }, [historyData, smaWindow, emaWindow, projectionYears, showProjection]);

  // Calculate metrics
  const metrics = useMemo(() => {
    if (historyData.length < 2) return null;

    const sorted = [...historyData].sort((a, b) => a.year - b.year);
    const regression = linearRegression(sorted);
    const growthRates = yoyGrowth(sorted);
    const firstPoint = sorted[0];
    const lastPoint = sorted[sorted.length - 1];
    const years = lastPoint.year - firstPoint.year;

    return {
      r2: regression.r2,
      slope: regression.slope,
      avgGrowth: growthRates.length > 0 
        ? growthRates.reduce((sum, p) => sum + p.value, 0) / growthRates.length 
        : 0,
      cagr: cagr(firstPoint.value, lastPoint.value, years),
      latestValue: lastPoint.value,
      latestYear: lastPoint.year,
    };
  }, [historyData]);

  const countryName = availableCountries.find((c) => c.code === selectedCountry)?.name || selectedCountry;
  const indicatorInfo = INDICATOR_DEFINITIONS[selectedIndicator];

  return (
    <div className={styles.panel}>
      {/* Controls */}
      <div className={styles.controls}>
        <div className={styles.selectors}>
          <div className={styles.field}>
            <label>Country:</label>
            <select
              value={selectedCountry}
              onChange={(e) => setSelectedCountry(e.target.value)}
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
        </div>

        <div className={styles.overlays}>
          <label>Overlays:</label>
          <div className={styles.toggles}>
            <button
              className={`${styles.toggle} ${showTrend ? styles.active : ''}`}
              onClick={() => setShowTrend(!showTrend)}
            >
              Trend Line
            </button>
            <button
              className={`${styles.toggle} ${showSMA ? styles.active : ''}`}
              onClick={() => setShowSMA(!showSMA)}
              title="SMA (Simple Moving Average): smooths the series by taking the average of the last N years. Good for seeing the underlying trend but reacts more slowly to recent changes."
            >
              SMA ({smaWindow}y)
            </button>
            <button
              className={`${styles.toggle} ${showEMA ? styles.active : ''}`}
              onClick={() => setShowEMA(!showEMA)}
              title="EMA (Exponential Moving Average): similar to SMA but gives more weight to recent years, so it reacts faster to new information."
            >
              EMA ({emaWindow}y)
            </button>
            <button
              className={`${styles.toggle} ${showProjection ? styles.active : ''}`}
              onClick={() => setShowProjection(!showProjection)}
            >
              Projection ({projectionYears}y)
            </button>
          </div>
        </div>

        <div className={styles.parameters}>
          <div className={styles.param}>
            <label>SMA Window:</label>
            <input
              type="range"
              min={2}
              max={10}
              value={smaWindow}
              onChange={(e) => setSmaWindow(parseInt(e.target.value, 10))}
            />
            <span>{smaWindow} years</span>
          </div>
          <div className={styles.param}>
            <label>EMA Window:</label>
            <input
              type="range"
              min={2}
              max={10}
              value={emaWindow}
              onChange={(e) => setEmaWindow(parseInt(e.target.value, 10))}
            />
            <span>{emaWindow} years</span>
          </div>
          <div className={styles.param}>
            <label>Projection:</label>
            <input
              type="range"
              min={1}
              max={10}
              value={projectionYears}
              onChange={(e) => setProjectionYears(parseInt(e.target.value, 10))}
            />
            <span>{projectionYears} years</span>
          </div>
        </div>
      </div>

      {/* Metrics */}
      {metrics && (
        <div className={styles.metrics}>
          <div className={styles.metric}>
            <span className={styles.metricLabel}>Latest Value</span>
            <span className={styles.metricValue}>
              {formatNumber(metrics.latestValue)} ({metrics.latestYear})
            </span>
          </div>
          <div className={styles.metric}>
            <span className={styles.metricLabel}>CAGR</span>
            <span className={`${styles.metricValue} ${metrics.cagr >= 0 ? styles.positive : styles.negative}`}>
              {metrics.cagr >= 0 ? '+' : ''}{metrics.cagr.toFixed(2)}%
            </span>
          </div>
          <div className={styles.metric}>
            <span className={styles.metricLabel}>Avg YoY Growth</span>
            <span className={`${styles.metricValue} ${metrics.avgGrowth >= 0 ? styles.positive : styles.negative}`}>
              {metrics.avgGrowth >= 0 ? '+' : ''}{metrics.avgGrowth.toFixed(2)}%
            </span>
          </div>
          <div className={styles.metric}>
            <span className={styles.metricLabel}>Trend R²</span>
            <span className={styles.metricValue}>{metrics.r2.toFixed(3)}</span>
          </div>
        </div>
      )}

      {/* Chart */}
      <div className={styles.chartContainer}>
        {isLoading ? (
          <div className={styles.loading}>
            <div className={styles.spinner} />
            <span>Loading data...</span>
          </div>
        ) : error ? (
          <div className={styles.error}>{error}</div>
        ) : chartData.length === 0 ? (
          <div className={styles.empty}>No data available</div>
        ) : (
          <>
            <h3 className={styles.chartTitle}>
              {indicatorInfo?.label} - {countryName}
            </h3>
            <ResponsiveContainer width="100%" height={400}>
              <ComposedChart data={chartData} margin={{ top: 10, right: 30, left: 10, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#2a3547" />
                <XAxis
                  dataKey="year"
                  stroke="#6b7280"
                  tick={{ fill: '#9ca3af', fontSize: 12 }}
                />
                <YAxis
                  stroke="#6b7280"
                  tick={{ fill: '#9ca3af', fontSize: 12 }}
                  tickFormatter={(v) => formatNumber(v, 1)}
                />
                <Tooltip
                  contentStyle={{
                    backgroundColor: '#1e293b',
                    border: '1px solid #334155',
                    borderRadius: 8,
                  }}
                  labelStyle={{ color: '#e5e7eb' }}
                  formatter={(value) => {
                    if (value === null || value === undefined) return ['-', ''];
                    return [formatNumber(Number(value)), ''];
                  }}
                />
                <Legend />

                {/* Projection area (background) */}
                {showProjection && (
                  <Area
                    type="monotone"
                    dataKey={(d) => (d.isProjection ? d.trend : null)}
                    fill="rgba(139, 92, 246, 0.1)"
                    stroke="none"
                    name="Projection Zone"
                  />
                )}

                {/* Actual data */}
                <Line
                  type="monotone"
                  dataKey="actual"
                  stroke="#10b981"
                  strokeWidth={2}
                  dot={{ r: 3, fill: '#10b981' }}
                  activeDot={{ r: 5, fill: '#10b981' }}
                  name="Actual"
                  connectNulls={false}
                />

                {/* Trend line */}
                {showTrend && (
                  <Line
                    type="monotone"
                    dataKey="trend"
                    stroke="#8b5cf6"
                    strokeWidth={2}
                    strokeDasharray="5 5"
                    dot={false}
                    name="Trend"
                  />
                )}

                {/* SMA */}
                {showSMA && (
                  <Line
                    type="monotone"
                    dataKey="sma"
                    stroke="#f59e0b"
                    strokeWidth={2}
                    dot={false}
                    name={`SMA (${smaWindow}y)`}
                    connectNulls
                  />
                )}

                {/* EMA */}
                {showEMA && (
                  <Line
                    type="monotone"
                    dataKey="ema"
                    stroke="#ec4899"
                    strokeWidth={2}
                    dot={false}
                    name={`EMA (${emaWindow}y)`}
                    connectNulls
                  />
                )}

                {/* Reference line at zero for percentage indicators */}
                {indicatorInfo?.unit === '%' && <ReferenceLine y={0} stroke="#4b5563" />}
              </ComposedChart>
            </ResponsiveContainer>
          </>
        )}
      </div>

      {/* Growth Rate Chart */}
      {historyData.length > 1 && (
        <div className={styles.growthChart}>
          <h3 className={styles.chartTitle}>Year-over-Year Growth Rate</h3>
          <ResponsiveContainer width="100%" height={200}>
            <ComposedChart
              data={yoyGrowth(historyData)}
              margin={{ top: 10, right: 30, left: 10, bottom: 0 }}
            >
              <CartesianGrid strokeDasharray="3 3" stroke="#2a3547" />
              <XAxis
                dataKey="year"
                stroke="#6b7280"
                tick={{ fill: '#9ca3af', fontSize: 12 }}
              />
              <YAxis
                stroke="#6b7280"
                tick={{ fill: '#9ca3af', fontSize: 12 }}
                tickFormatter={(v) => `${v.toFixed(0)}%`}
              />
              <Tooltip
                contentStyle={{
                  backgroundColor: '#1e293b',
                  border: '1px solid #334155',
                  borderRadius: 8,
                }}
                labelStyle={{ color: '#e5e7eb' }}
                formatter={(value: number) => [`${value.toFixed(2)}%`, 'YoY Growth']}
              />
              <ReferenceLine y={0} stroke="#4b5563" />
              <Area
                type="monotone"
                dataKey="value"
                fill="rgba(59, 130, 246, 0.2)"
                stroke="#3b82f6"
                strokeWidth={2}
                name="YoY Growth"
              />
            </ComposedChart>
          </ResponsiveContainer>
        </div>
      )}
    </div>
  );
}
