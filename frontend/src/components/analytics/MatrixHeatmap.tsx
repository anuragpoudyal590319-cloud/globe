import { useMemo } from 'react';
import { scaleSequential } from 'd3-scale';
import { interpolateYlOrRd, interpolateRdYlGn, interpolateBlues } from 'd3-scale-chromatic';
import styles from './MatrixHeatmap.module.css';

interface MatrixData {
  rows: string[];
  columns: string[];
  values: (number | null)[][];
  rowLabels: string[];
  columnLabels: string[];
}

interface MatrixHeatmapProps {
  data: MatrixData;
  colorScheme?: 'sequential' | 'diverging' | 'cool';
  showValues?: boolean;
  onCellClick?: (row: number, col: number, value: number | null) => void;
}

export function MatrixHeatmap({
  data,
  colorScheme = 'sequential',
  showValues = true,
  onCellClick,
}: MatrixHeatmapProps) {
  // Calculate min/max for color scaling
  const { minValue, maxValue } = useMemo(() => {
    let min = Infinity;
    let max = -Infinity;
    
    for (const row of data.values) {
      for (const val of row) {
        if (val !== null) {
          min = Math.min(min, val);
          max = Math.max(max, val);
        }
      }
    }
    
    return { minValue: min, maxValue: max };
  }, [data.values]);

  // Color scale
  const colorScale = useMemo(() => {
    const interpolator = 
      colorScheme === 'diverging' ? interpolateRdYlGn :
      colorScheme === 'cool' ? interpolateBlues :
      interpolateYlOrRd;
    
    return scaleSequential(interpolator)
      .domain(colorScheme === 'diverging' ? [minValue, maxValue] : [minValue, maxValue]);
  }, [colorScheme, minValue, maxValue]);

  const getTextColor = (value: number | null): string => {
    if (value === null) return '#6b7280';
    const normalized = (value - minValue) / (maxValue - minValue);
    return normalized > 0.5 ? '#ffffff' : '#1f2937';
  };

  const formatValue = (value: number | null): string => {
    if (value === null) return '-';
    if (Math.abs(value) >= 1000) {
      return `${(value / 1000).toFixed(1)}k`;
    }
    if (Math.abs(value) < 1) {
      return value.toFixed(2);
    }
    return value.toFixed(1);
  };

  if (data.rows.length === 0 || data.columns.length === 0) {
    return <div className={styles.empty}>No data available</div>;
  }

  return (
    <div className={styles.container}>
      <div className={styles.matrix}>
        {/* Column headers */}
        <div className={styles.headerRow}>
          <div className={styles.cornerCell} />
          {data.columnLabels.map((label, i) => (
            <div key={i} className={styles.headerCell} title={label}>
              <span className={styles.headerLabel}>{label}</span>
            </div>
          ))}
        </div>

        {/* Data rows */}
        {data.values.map((row, i) => (
          <div key={i} className={styles.row}>
            <div className={styles.rowLabel} title={data.rowLabels[i]}>
              {data.rowLabels[i]}
            </div>
            {row.map((value, j) => (
              <div
                key={j}
                className={`${styles.cell} ${value === null ? styles.nullCell : ''}`}
                style={{
                  backgroundColor: value !== null ? colorScale(value) as string : undefined,
                  color: getTextColor(value),
                }}
                title={`${data.rowLabels[i]} × ${data.columnLabels[j]}: ${value !== null ? value.toFixed(2) : 'No data'}`}
                onClick={() => onCellClick?.(i, j, value)}
              >
                {showValues && formatValue(value)}
              </div>
            ))}
          </div>
        ))}
      </div>

      {/* Color legend */}
      <div className={styles.legend}>
        <div className={styles.legendBar}>
          <div 
            className={styles.legendGradient}
            style={{
              background: `linear-gradient(to right, ${colorScale(minValue)}, ${colorScale((minValue + maxValue) / 2)}, ${colorScale(maxValue)})`,
            }}
          />
        </div>
        <div className={styles.legendLabels}>
          <span>{formatValue(minValue)}</span>
          <span>{formatValue((minValue + maxValue) / 2)}</span>
          <span>{formatValue(maxValue)}</span>
        </div>
      </div>
    </div>
  );
}
