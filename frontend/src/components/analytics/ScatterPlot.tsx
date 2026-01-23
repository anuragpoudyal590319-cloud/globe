import { useMemo } from 'react';
import {
  ScatterChart,
  Scatter,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  ZAxis,
  ReferenceLine,
} from 'recharts';
import { formatNumber, linearRegression } from '../../utils/statistics';
import styles from './ScatterPlot.module.css';

interface DataPoint {
  country: string;
  region: string | null;
  x: number;
  y: number;
  z?: number;
}

interface ScatterPlotProps {
  data: DataPoint[];
  xLabel: string;
  yLabel: string;
  zLabel?: string;
  showRegression?: boolean;
  colorByRegion?: boolean;
}

const REGION_COLORS: Record<string, string> = {
  'Europe & Central Asia': '#3b82f6',
  'East Asia & Pacific': '#ef4444',
  'Latin America & Caribbean': '#10b981',
  'Middle East & North Africa': '#f59e0b',
  'North America': '#8b5cf6',
  'South Asia': '#ec4899',
  'Sub-Saharan Africa': '#06b6d4',
  null: '#6b7280',
};

const DEFAULT_COLOR = '#3b82f6';

export function ScatterPlot({
  data,
  xLabel,
  yLabel,
  zLabel,
  showRegression = false,
  colorByRegion = true,
}: ScatterPlotProps) {
  // Group data by region
  const groupedData = useMemo(() => {
    if (!colorByRegion) {
      return { all: data };
    }

    const groups: Record<string, DataPoint[]> = {};
    for (const point of data) {
      const region = point.region || 'Other';
      if (!groups[region]) {
        groups[region] = [];
      }
      groups[region].push(point);
    }
    return groups;
  }, [data, colorByRegion]);

  // Calculate regression line
  const regressionLine = useMemo(() => {
    if (!showRegression || data.length < 2) return null;

    const points = data.map((d) => ({ year: d.x, value: d.y }));
    const regression = linearRegression(points);

    const minX = Math.min(...data.map((d) => d.x));
    const maxX = Math.max(...data.map((d) => d.x));

    return {
      start: { x: minX, y: regression.predict(minX) },
      end: { x: maxX, y: regression.predict(maxX) },
      r2: regression.r2,
    };
  }, [data, showRegression]);

  // Get unique regions for legend
  const regions = useMemo(() => {
    if (!colorByRegion) return [];
    return Array.from(new Set(data.map((d) => d.region || 'Other')));
  }, [data, colorByRegion]);

  const CustomTooltip = ({ active, payload }: { active?: boolean; payload?: Array<{ payload: DataPoint }> }) => {
    if (!active || !payload || payload.length === 0) return null;
    const point = payload[0].payload;

    return (
      <div className={styles.tooltip}>
        <div className={styles.tooltipCountry}>{point.country}</div>
        <div className={styles.tooltipRegion}>{point.region || 'Unknown'}</div>
        <div className={styles.tooltipValues}>
          <div>
            <span className={styles.tooltipLabel}>{xLabel}:</span>
            <span className={styles.tooltipValue}>{formatNumber(point.x)}</span>
          </div>
          <div>
            <span className={styles.tooltipLabel}>{yLabel}:</span>
            <span className={styles.tooltipValue}>{formatNumber(point.y)}</span>
          </div>
          {zLabel && point.z !== undefined && (
            <div>
              <span className={styles.tooltipLabel}>{zLabel}:</span>
              <span className={styles.tooltipValue}>{formatNumber(point.z)}</span>
            </div>
          )}
        </div>
      </div>
    );
  };

  if (data.length === 0) {
    return <div className={styles.empty}>No data available</div>;
  }

  return (
    <div className={styles.container}>
      <ResponsiveContainer width="100%" height={400}>
        <ScatterChart margin={{ top: 20, right: 30, bottom: 20, left: 20 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="#2a3547" />
          <XAxis
            type="number"
            dataKey="x"
            name={xLabel}
            stroke="#6b7280"
            tick={{ fill: '#9ca3af', fontSize: 11 }}
            tickFormatter={(v) => formatNumber(v, 0)}
            label={{
              value: xLabel,
              position: 'bottom',
              fill: '#9ca3af',
              fontSize: 12,
            }}
          />
          <YAxis
            type="number"
            dataKey="y"
            name={yLabel}
            stroke="#6b7280"
            tick={{ fill: '#9ca3af', fontSize: 11 }}
            tickFormatter={(v) => formatNumber(v, 0)}
            label={{
              value: yLabel,
              angle: -90,
              position: 'insideLeft',
              fill: '#9ca3af',
              fontSize: 12,
            }}
          />
          {zLabel && (
            <ZAxis
              type="number"
              dataKey="z"
              range={[50, 500]}
              name={zLabel}
            />
          )}
          <Tooltip content={<CustomTooltip />} />

          {colorByRegion
            ? Object.entries(groupedData).map(([region, points]) => (
                <Scatter
                  key={region}
                  name={region}
                  data={points}
                  fill={REGION_COLORS[region] || DEFAULT_COLOR}
                  fillOpacity={0.7}
                />
              ))
            : (
                <Scatter
                  name="Countries"
                  data={data}
                  fill={DEFAULT_COLOR}
                  fillOpacity={0.7}
                />
              )}

          {/* Regression line - drawn manually since Scatter doesn't support it directly */}
          {regressionLine && (
            <ReferenceLine
              segment={[
                { x: regressionLine.start.x, y: regressionLine.start.y },
                { x: regressionLine.end.x, y: regressionLine.end.y },
              ]}
              stroke="#f59e0b"
              strokeDasharray="5 5"
              strokeWidth={2}
            />
          )}
        </ScatterChart>
      </ResponsiveContainer>

      {/* Legend */}
      {colorByRegion && regions.length > 0 && (
        <div className={styles.legend}>
          {regions.map((region) => (
            <div key={region} className={styles.legendItem}>
              <span
                className={styles.legendDot}
                style={{ backgroundColor: REGION_COLORS[region] || DEFAULT_COLOR }}
              />
              <span>{region}</span>
            </div>
          ))}
        </div>
      )}

      {/* Regression info */}
      {regressionLine && (
        <div className={styles.regressionInfo}>
          Regression R² = {regressionLine.r2.toFixed(3)}
        </div>
      )}
    </div>
  );
}
