import { useMemo } from 'react';
import { scaleSequential } from 'd3-scale';
import { interpolateYlOrRd, interpolateRdYlGn } from 'd3-scale-chromatic';
import styles from './TimeHeatmap.module.css';

interface TimeSeriesData {
  years: number[];
  entities: string[];
  entityLabels: string[];
  values: (number | null)[][];  // [year][entity]
}

interface TimeHeatmapProps {
  data: TimeSeriesData;
  colorScheme?: 'sequential' | 'diverging';
  onCellClick?: (year: number, entity: string, value: number | null) => void;
}

export function TimeHeatmap({
  data,
  colorScheme = 'sequential',
  onCellClick,
}: TimeHeatmapProps) {
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
    const interpolator = colorScheme === 'diverging' ? interpolateRdYlGn : interpolateYlOrRd;
    return scaleSequential(interpolator).domain([minValue, maxValue]);
  }, [colorScheme, minValue, maxValue]);

  const getTextColor = (value: number | null): string => {
    if (value === null) return '#6b7280';
    const normalized = (value - minValue) / (maxValue - minValue);
    return normalized > 0.5 ? '#ffffff' : '#1f2937';
  };

  const formatValue = (value: number | null): string => {
    if (value === null) return '';
    if (Math.abs(value) >= 1000) {
      return `${(value / 1000).toFixed(0)}k`;
    }
    return value.toFixed(0);
  };

  if (data.years.length === 0 || data.entities.length === 0) {
    return <div className={styles.empty}>No data available</div>;
  }

  return (
    <div className={styles.container}>
      <div className={styles.heatmap}>
        {/* Entity headers */}
        <div className={styles.headerRow}>
          <div className={styles.cornerCell}>Year</div>
          {data.entityLabels.map((label, i) => (
            <div key={i} className={styles.headerCell} title={label}>
              {label}
            </div>
          ))}
        </div>

        {/* Year rows */}
        {data.years.map((year, yearIdx) => (
          <div key={year} className={styles.row}>
            <div className={styles.yearLabel}>{year}</div>
            {data.values[yearIdx].map((value, entityIdx) => (
              <div
                key={entityIdx}
                className={`${styles.cell} ${value === null ? styles.nullCell : ''}`}
                style={{
                  backgroundColor: value !== null ? colorScale(value) as string : undefined,
                  color: getTextColor(value),
                }}
                title={`${data.entityLabels[entityIdx]} (${year}): ${value !== null ? value.toFixed(2) : 'No data'}`}
                onClick={() => onCellClick?.(year, data.entities[entityIdx], value)}
              >
                {formatValue(value)}
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
