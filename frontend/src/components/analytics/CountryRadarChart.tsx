import {
  Radar,
  RadarChart,
  PolarGrid,
  PolarAngleAxis,
  PolarRadiusAxis,
  ResponsiveContainer,
  Legend,
  Tooltip,
} from 'recharts';
import styles from './CountryRadarChart.module.css';

interface RadarDataPoint {
  indicator: string;
  fullName: string;
  [country: string]: number | string;
}

interface CountryRadarChartProps {
  data: RadarDataPoint[];
  countries: Array<{ code: string; name: string }>;
}

const COLORS = ['#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6'];

export function CountryRadarChart({ data, countries }: CountryRadarChartProps) {
  if (data.length === 0 || countries.length === 0) {
    return <div className={styles.empty}>No data available</div>;
  }

  return (
    <div className={styles.container}>
      <ResponsiveContainer width="100%" height={400}>
        <RadarChart data={data} margin={{ top: 20, right: 30, bottom: 20, left: 30 }}>
          <PolarGrid stroke="#2a3547" />
          <PolarAngleAxis
            dataKey="indicator"
            tick={{ fill: '#9ca3af', fontSize: 11 }}
          />
          <PolarRadiusAxis
            angle={30}
            domain={[0, 100]}
            tick={{ fill: '#6b7280', fontSize: 10 }}
            tickFormatter={(v) => `${v}`}
          />
          <Tooltip
            contentStyle={{
              backgroundColor: '#1e293b',
              border: '1px solid #334155',
              borderRadius: 8,
            }}
            labelStyle={{ color: '#e5e7eb' }}
            formatter={(value: number, name: string) => [
              `${value.toFixed(1)}%`,
              countries.find((c) => c.code === name)?.name || name,
            ]}
            labelFormatter={(label: string) => {
              const point = data.find((d) => d.indicator === label);
              return point?.fullName || label;
            }}
          />
          <Legend
            wrapperStyle={{ paddingTop: '20px' }}
            formatter={(value) => (
              <span style={{ color: '#9ca3af', fontSize: 12 }}>
                {countries.find((c) => c.code === value)?.name || value}
              </span>
            )}
          />
          {countries.map((country, index) => (
            <Radar
              key={country.code}
              name={country.code}
              dataKey={country.code}
              stroke={COLORS[index % COLORS.length]}
              fill={COLORS[index % COLORS.length]}
              fillOpacity={0.2}
              strokeWidth={2}
            />
          ))}
        </RadarChart>
      </ResponsiveContainer>
      <p className={styles.note}>
        Values normalized to 0-100 percentile scale for comparison
      </p>
    </div>
  );
}
