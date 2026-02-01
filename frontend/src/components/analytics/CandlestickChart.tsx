import {
  ComposedChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Cell,
} from 'recharts';
import { formatNumber } from '../../utils/statistics';
import styles from './CandlestickChart.module.css';

interface CandlestickData {
  year: number;
  open: number;
  close: number;
  high: number;
  low: number;
}

interface CandlestickChartProps {
  data: CandlestickData[];
  indicatorLabel: string;
}

export function CandlestickChart({ data, indicatorLabel }: CandlestickChartProps) {
  if (data.length === 0) {
    return <div className={styles.empty}>No data available</div>;
  }

  // Transform data for the chart
  const chartData = data.map((d) => ({
    year: d.year,
    body: Math.abs(d.close - d.open),
    base: Math.min(d.open, d.close),
    high: d.high,
    low: d.low,
    open: d.open,
    close: d.close,
    isUp: d.close >= d.open,
    wick: [d.low - Math.min(d.open, d.close), d.high - Math.max(d.open, d.close)],
  }));

  const CustomTooltip = ({ active, payload }: { active?: boolean; payload?: Array<{ payload: typeof chartData[0] }> }) => {
    if (!active || !payload || payload.length === 0) return null;
    const item = payload[0].payload;

    return (
      <div className={styles.tooltip}>
        <div className={styles.tooltipYear}>{item.year}</div>
        <div className={styles.tooltipRow}>
          <span>Open:</span>
          <span>{formatNumber(item.open)}</span>
        </div>
        <div className={styles.tooltipRow}>
          <span>Close:</span>
          <span>{formatNumber(item.close)}</span>
        </div>
        <div className={styles.tooltipRow}>
          <span>High:</span>
          <span>{formatNumber(item.high)}</span>
        </div>
        <div className={styles.tooltipRow}>
          <span>Low:</span>
          <span>{formatNumber(item.low)}</span>
        </div>
        <div className={`${styles.tooltipChange} ${item.isUp ? styles.up : styles.down}`}>
          {item.isUp ? '▲' : '▼'}{' '}
          {item.open !== 0
            ? `${(((item.close - item.open) / item.open) * 100).toFixed(2)}%`
            : (item.close === item.open ? '0%' : '—')}
        </div>
      </div>
    );
  };

  // Custom shape for candlestick (Recharts passes x, y, width, height, payload)
  const CandlestickBar = (props: {
    x?: number;
    y?: number;
    width?: number;
    height?: number;
    payload?: typeof chartData[0];
  }) => {
    const { x = 0, y = 0, width = 0, height = 0, payload } = props;
    if (!payload) return null;
    const color = payload.isUp ? '#10b981' : '#ef4444';
    const centerX = x + width / 2;
    const bodyPx = Math.max(height, 2);
    const scale = payload.body > 0 ? bodyPx / payload.body : 1;
    const upperWick = (payload.high - Math.max(payload.open, payload.close)) * scale;
    const lowerWick = (Math.min(payload.open, payload.close) - payload.low) * scale;

    return (
      <g>
        {/* Wick: line from high to low */}
        <line
          x1={centerX}
          y1={y - upperWick}
          x2={centerX}
          y2={y + bodyPx + lowerWick}
          stroke={color}
          strokeWidth={1}
        />
        {/* Body */}
        <rect
          x={x}
          y={y}
          width={width}
          height={bodyPx}
          fill={color}
          rx={2}
        />
      </g>
    );
  };

  const minValue = Math.min(...data.map((d) => d.low)) * 0.95;
  const maxValue = Math.max(...data.map((d) => d.high)) * 1.05;

  return (
    <div className={styles.container}>
      <ResponsiveContainer width="100%" height={350}>
        <ComposedChart data={chartData} margin={{ top: 20, right: 30, left: 10, bottom: 5 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="#2a3547" />
          <XAxis
            dataKey="year"
            stroke="#6b7280"
            tick={{ fill: '#9ca3af', fontSize: 11 }}
          />
          <YAxis
            domain={[minValue, maxValue]}
            stroke="#6b7280"
            tick={{ fill: '#9ca3af', fontSize: 11 }}
            tickFormatter={(v) => formatNumber(v, 0)}
          />
          <Tooltip content={<CustomTooltip />} />
          <Bar dataKey="body" shape={<CandlestickBar />}>
            {chartData.map((entry, index) => (
              <Cell key={`cell-${index}`} fill={entry.isUp ? '#10b981' : '#ef4444'} />
            ))}
          </Bar>
        </ComposedChart>
      </ResponsiveContainer>

      <div className={styles.legend}>
        <div className={styles.legendItem}>
          <span className={styles.legendBox} style={{ backgroundColor: '#10b981' }} />
          <span>Close {'>'} Open (Up)</span>
        </div>
        <div className={styles.legendItem}>
          <span className={styles.legendBox} style={{ backgroundColor: '#ef4444' }} />
          <span>Close {'<'} Open (Down)</span>
        </div>
      </div>

      <p className={styles.description}>
        Candlestick chart showing yearly open, close, high, and low values for {indicatorLabel}.
        Useful for visualizing volatility and year-over-year trends.
      </p>
    </div>
  );
}
