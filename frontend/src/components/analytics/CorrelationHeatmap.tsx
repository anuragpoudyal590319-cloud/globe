import { useMemo } from 'react';
import { scaleLinear } from 'd3-scale';
import styles from './CorrelationHeatmap.module.css';

interface CorrelationHeatmapProps {
  labels: string[];
  matrix: number[][];
  onCellClick?: (row: number, col: number, value: number) => void;
}

export function CorrelationHeatmap({ labels, matrix, onCellClick }: CorrelationHeatmapProps) {
  // Color scale: negative (red) -> zero (white) -> positive (blue)
  const colorScale = useMemo(() => {
    return scaleLinear<string>()
      .domain([-1, 0, 1])
      .range(['#ef4444', '#1e293b', '#3b82f6']);
  }, []);

  const getTextColor = (value: number): string => {
    const absValue = Math.abs(value);
    return absValue > 0.3 ? '#ffffff' : '#9ca3af';
  };

  if (labels.length === 0 || matrix.length === 0) {
    return (
      <div className={styles.empty}>
        No correlation data available
      </div>
    );
  }

  return (
    <div className={styles.container}>
      <div className={styles.heatmap}>
        {/* Column headers */}
        <div className={styles.headerRow}>
          <div className={styles.cornerCell} />
          {labels.map((label, i) => (
            <div key={i} className={styles.headerCell} title={label}>
              <span className={styles.headerLabel}>{label}</span>
            </div>
          ))}
        </div>

        {/* Data rows */}
        {matrix.map((row, i) => (
          <div key={i} className={styles.row}>
            <div className={styles.rowLabel} title={labels[i]}>
              {labels[i]}
            </div>
            {row.map((value, j) => (
              <div
                key={j}
                className={styles.cell}
                style={{
                  backgroundColor: colorScale(value),
                  color: getTextColor(value),
                }}
                title={`${labels[i]} vs ${labels[j]}: ${value.toFixed(3)}`}
                onClick={() => onCellClick?.(i, j, value)}
              >
                {value.toFixed(2)}
              </div>
            ))}
          </div>
        ))}
      </div>

      {/* Color legend */}
      <div className={styles.legend}>
        <div className={styles.legendBar}>
          <div className={styles.legendGradient} />
        </div>
        <div className={styles.legendLabels}>
          <span>-1.0</span>
          <span>0</span>
          <span>+1.0</span>
        </div>
        <div className={styles.legendTitle}>Correlation Coefficient</div>
      </div>
    </div>
  );
}
