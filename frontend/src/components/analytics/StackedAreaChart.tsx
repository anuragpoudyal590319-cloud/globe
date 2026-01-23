import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
} from 'recharts';
import { formatNumber } from '../../utils/statistics';
import styles from './StackedAreaChart.module.css';

interface StackedDataPoint {
  year: number;
  [key: string]: number;
}

interface StackedAreaChartProps {
  data: StackedDataPoint[];
  series: Array<{ key: string; name: string; color: string }>;
  yAxisLabel?: string;
}

export function StackedAreaChart({ data, series, yAxisLabel }: StackedAreaChartProps) {
  if (data.length === 0 || series.length === 0) {
    return <div className={styles.empty}>No data available</div>;
  }

  return (
    <div className={styles.container}>
      <ResponsiveContainer width="100%" height={350}>
        <AreaChart data={data} margin={{ top: 10, right: 30, left: 10, bottom: 0 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="#2a3547" />
          <XAxis
            dataKey="year"
            stroke="#6b7280"
            tick={{ fill: '#9ca3af', fontSize: 11 }}
          />
          <YAxis
            stroke="#6b7280"
            tick={{ fill: '#9ca3af', fontSize: 11 }}
            tickFormatter={(v) => formatNumber(v, 0)}
            label={
              yAxisLabel
                ? {
                    value: yAxisLabel,
                    angle: -90,
                    position: 'insideLeft',
                    fill: '#6b7280',
                    fontSize: 11,
                  }
                : undefined
            }
          />
          <Tooltip
            contentStyle={{
              backgroundColor: '#1e293b',
              border: '1px solid #334155',
              borderRadius: 8,
            }}
            labelStyle={{ color: '#e5e7eb', marginBottom: 8 }}
            formatter={(value: number, name: string) => {
              const seriesInfo = series.find((s) => s.key === name);
              return [formatNumber(value), seriesInfo?.name || name];
            }}
          />
          <Legend
            wrapperStyle={{ paddingTop: '10px' }}
            formatter={(value) => {
              const seriesInfo = series.find((s) => s.key === value);
              return (
                <span style={{ color: '#9ca3af', fontSize: 12 }}>
                  {seriesInfo?.name || value}
                </span>
              );
            }}
          />
          {series.map((s) => (
            <Area
              key={s.key}
              type="monotone"
              dataKey={s.key}
              stackId="1"
              stroke={s.color}
              fill={s.color}
              fillOpacity={0.6}
            />
          ))}
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
}
