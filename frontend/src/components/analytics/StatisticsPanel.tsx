import { useState, useEffect } from 'react';
import { api, IndicatorType, StatisticsResponse } from '../../api/client';
import { INDICATOR_DEFINITIONS } from '../../data/indicators';
import { DistributionChart } from './DistributionChart';
import { formatNumber } from '../../utils/statistics';
import styles from './StatisticsPanel.module.css';

const INDICATOR_OPTIONS: { type: IndicatorType; label: string }[] = Object.entries(INDICATOR_DEFINITIONS).map(
  ([type, info]) => ({ type: type as IndicatorType, label: info.label })
);

const YEARS = Array.from({ length: 30 }, (_, i) => 2023 - i);

export function StatisticsPanel() {
  const [selectedIndicator, setSelectedIndicator] = useState<IndicatorType>('gdp_per_capita');
  const [selectedYear, setSelectedYear] = useState(2022);
  const [statistics, setStatistics] = useState<StatisticsResponse | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [highlightCountry, setHighlightCountry] = useState<string | null>(null);

  // Fetch statistics
  useEffect(() => {
    const fetchStats = async () => {
      setIsLoading(true);
      setError(null);
      try {
        const data = await api.getStatistics(selectedIndicator, selectedYear);
        setStatistics(data);
      } catch (err) {
        console.error('Failed to fetch statistics:', err);
        setError(err instanceof Error ? err.message : 'Failed to load statistics');
        setStatistics(null);
      } finally {
        setIsLoading(false);
      }
    };
    fetchStats();
  }, [selectedIndicator, selectedYear]);

  const indicatorInfo = INDICATOR_DEFINITIONS[selectedIndicator];

  // Find highlight value
  const highlightValue = highlightCountry
    ? statistics?.distribution.find((d) => d.countries.includes(highlightCountry))?.bin
    : undefined;

  return (
    <div className={styles.panel}>
      {/* Controls */}
      <div className={styles.controls}>
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
      </div>

      {isLoading ? (
        <div className={styles.loading}>
          <div className={styles.spinner} />
          <span>Loading statistics...</span>
        </div>
      ) : error ? (
        <div className={styles.error}>{error}</div>
      ) : statistics ? (
        <>
          {/* Summary Stats */}
          <div className={styles.statsGrid}>
            <div className={styles.statCard}>
              <span className={styles.statLabel}>Countries</span>
              <span className={styles.statValue}>{statistics.count}</span>
            </div>
            <div className={styles.statCard}>
              <span className={styles.statLabel}>Mean</span>
              <span className={styles.statValue}>{formatNumber(statistics.mean)}</span>
            </div>
            <div className={styles.statCard}>
              <span className={styles.statLabel}>Median</span>
              <span className={styles.statValue}>{formatNumber(statistics.median)}</span>
            </div>
            <div className={styles.statCard}>
              <span className={styles.statLabel}>Std Dev</span>
              <span className={styles.statValue}>{formatNumber(statistics.stdDev)}</span>
            </div>
            <div className={styles.statCard}>
              <span className={styles.statLabel}>Min</span>
              <span className={styles.statValue}>{formatNumber(statistics.min)}</span>
            </div>
            <div className={styles.statCard}>
              <span className={styles.statLabel}>Max</span>
              <span className={styles.statValue}>{formatNumber(statistics.max)}</span>
            </div>
          </div>

          {/* Percentiles */}
          <div className={styles.section}>
            <h3 className={styles.sectionTitle}>Percentiles</h3>
            <div className={styles.percentiles}>
              {Object.entries(statistics.percentiles).map(([key, value]) => (
                <div key={key} className={styles.percentile}>
                  <span className={styles.percentileLabel}>{key.replace('p', '')}th</span>
                  <span className={styles.percentileValue}>{formatNumber(value)}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Distribution Chart */}
          <div className={styles.section}>
            <h3 className={styles.sectionTitle}>
              Distribution of {indicatorInfo?.label} ({selectedYear})
            </h3>
            <DistributionChart
              distribution={statistics.distribution}
              mean={statistics.mean}
              median={statistics.median}
              highlightValue={highlightValue}
              highlightCountry={highlightCountry || undefined}
              formatValue={(v) => formatNumber(v, 1)}
            />
          </div>

          {/* Outliers */}
          {statistics.outliers.length > 0 && (
            <div className={styles.section}>
              <h3 className={styles.sectionTitle}>
                Outliers ({statistics.outliers.length})
              </h3>
              <div className={styles.outliersList}>
                {statistics.outliers.map((outlier) => (
                  <div
                    key={outlier.country}
                    className={`${styles.outlierItem} ${outlier.zScore > 0 ? styles.high : styles.low}`}
                    onClick={() => setHighlightCountry(
                      highlightCountry === outlier.country ? null : outlier.country
                    )}
                  >
                    <span className={styles.outlierCountry}>{outlier.country}</span>
                    <span className={styles.outlierValue}>{formatNumber(outlier.value)}</span>
                    <span className={styles.outlierZScore}>
                      z = {outlier.zScore >= 0 ? '+' : ''}{outlier.zScore.toFixed(2)}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Country Rankings */}
          <div className={styles.section}>
            <h3 className={styles.sectionTitle}>Country Rankings (by Z-Score)</h3>
            <p className={styles.sectionNote}>
              Click on any country to highlight in the distribution chart
            </p>
            <div className={styles.rankingsTable}>
              <div className={styles.rankingsHeader}>
                <span>Rank</span>
                <span>Country</span>
                <span>Value</span>
                <span>Z-Score</span>
              </div>
              <div className={styles.rankingsBody}>
                {statistics.distribution
                  .flatMap((bin) =>
                    bin.countries.map((country) => ({
                      country,
                      value: bin.bin,
                      zScore: (bin.bin - statistics.mean) / statistics.stdDev,
                    }))
                  )
                  .sort((a, b) => b.zScore - a.zScore)
                  .slice(0, 20)
                  .map((item, index) => (
                    <div
                      key={item.country}
                      className={`${styles.rankingRow} ${
                        highlightCountry === item.country ? styles.highlighted : ''
                      }`}
                      onClick={() => setHighlightCountry(
                        highlightCountry === item.country ? null : item.country
                      )}
                    >
                      <span className={styles.rank}>{index + 1}</span>
                      <span className={styles.countryName}>{item.country}</span>
                      <span className={styles.value}>{formatNumber(item.value)}</span>
                      <span
                        className={`${styles.zScore} ${
                          item.zScore >= 0 ? styles.positive : styles.negative
                        }`}
                      >
                        {item.zScore >= 0 ? '+' : ''}{item.zScore.toFixed(2)}
                      </span>
                    </div>
                  ))}
              </div>
            </div>
          </div>
        </>
      ) : null}
    </div>
  );
}
