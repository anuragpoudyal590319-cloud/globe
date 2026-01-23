import { useMemo } from 'react';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  ReferenceLine,
  Cell,
} from 'recharts';
import styles from './DistributionChart.module.css';

interface DistributionBin {
  bin: number;
  count: number;
  countries: string[];
}

interface DistributionChartProps {
  distribution: DistributionBin[];
  mean: number;
  median: number;
  highlightValue?: number;
  highlightCountry?: string;
  formatValue?: (value: number) => string;
}

export function DistributionChart({
  distribution,
  mean,
  median,
  highlightValue,
  highlightCountry,
  formatValue = (v) => v.toFixed(1),
}: DistributionChartProps) {
  // Find which bin contains the highlight value
  const highlightBinIndex = useMemo(() => {
    if (highlightValue === undefined) return -1;
    
    return distribution.findIndex((bin, i) => {
      const nextBin = distribution[i + 1];
      if (!nextBin) return true; // Last bin
      return highlightValue >= bin.bin - (bin.bin - (distribution[i - 1]?.bin || 0)) / 2 &&
             highlightValue < nextBin.bin - (nextBin.bin - bin.bin) / 2;
    });
  }, [distribution, highlightValue]);

  return (
    <div className={styles.container}>
      <ResponsiveContainer width="100%" height={250}>
        <BarChart data={distribution} margin={{ top: 20, right: 30, left: 10, bottom: 5 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="#2a3547" vertical={false} />
          <XAxis
            dataKey="bin"
            stroke="#6b7280"
            tick={{ fill: '#9ca3af', fontSize: 11 }}
            tickFormatter={formatValue}
          />
          <YAxis
            stroke="#6b7280"
            tick={{ fill: '#9ca3af', fontSize: 11 }}
            label={{
              value: 'Countries',
              angle: -90,
              position: 'insideLeft',
              fill: '#6b7280',
              fontSize: 11,
            }}
          />
          <Tooltip
            contentStyle={{
              backgroundColor: '#1e293b',
              border: '1px solid #334155',
              borderRadius: 8,
            }}
            labelStyle={{ color: '#e5e7eb' }}
            formatter={(value: number) => [`${value} countries`, 'Count']}
            labelFormatter={(label: number) => `Value: ${formatValue(label)}`}
          />
          
          {/* Mean reference line */}
          <ReferenceLine
            x={mean}
            stroke="#f59e0b"
            strokeDasharray="5 5"
            label={{
              value: `Mean: ${formatValue(mean)}`,
              position: 'top',
              fill: '#f59e0b',
              fontSize: 10,
            }}
          />
          
          {/* Median reference line */}
          <ReferenceLine
            x={median}
            stroke="#8b5cf6"
            strokeDasharray="5 5"
            label={{
              value: `Median: ${formatValue(median)}`,
              position: 'insideTopRight',
              fill: '#8b5cf6',
              fontSize: 10,
            }}
          />

          <Bar dataKey="count" radius={[4, 4, 0, 0]}>
            {distribution.map((_, index) => (
              <Cell
                key={`cell-${index}`}
                fill={index === highlightBinIndex ? '#10b981' : '#3b82f6'}
                fillOpacity={index === highlightBinIndex ? 1 : 0.7}
              />
            ))}
          </Bar>
        </BarChart>
      </ResponsiveContainer>

      {/* Legend */}
      <div className={styles.legend}>
        <div className={styles.legendItem}>
          <span className={styles.legendBar} style={{ backgroundColor: '#3b82f6' }} />
          <span>Distribution</span>
        </div>
        <div className={styles.legendItem}>
          <span className={styles.legendLine} style={{ borderColor: '#f59e0b' }} />
          <span>Mean</span>
        </div>
        <div className={styles.legendItem}>
          <span className={styles.legendLine} style={{ borderColor: '#8b5cf6' }} />
          <span>Median</span>
        </div>
        {highlightCountry && (
          <div className={styles.legendItem}>
            <span className={styles.legendBar} style={{ backgroundColor: '#10b981' }} />
            <span>{highlightCountry}</span>
          </div>
        )}
      </div>
    </div>
  );
}
