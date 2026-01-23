/**
 * Statistical utilities for analytics
 */

export interface Point {
  year: number;
  value: number;
}

export interface LinearRegressionResult {
  slope: number;
  intercept: number;
  r2: number;
  predict: (x: number) => number;
}

/**
 * Calculate linear regression for a set of data points
 */
export function linearRegression(data: Point[]): LinearRegressionResult {
  const n = data.length;
  if (n < 2) {
    return { slope: 0, intercept: data[0]?.value || 0, r2: 0, predict: () => data[0]?.value || 0 };
  }

  const sumX = data.reduce((sum, p) => sum + p.year, 0);
  const sumY = data.reduce((sum, p) => sum + p.value, 0);
  const sumXY = data.reduce((sum, p) => sum + p.year * p.value, 0);
  const sumX2 = data.reduce((sum, p) => sum + p.year * p.year, 0);

  const slope = (n * sumXY - sumX * sumY) / (n * sumX2 - sumX * sumX);
  const intercept = (sumY - slope * sumX) / n;

  // Calculate R-squared
  const meanY = sumY / n;
  const ssTotal = data.reduce((sum, p) => sum + Math.pow(p.value - meanY, 2), 0);
  const ssResidual = data.reduce((sum, p) => {
    const predicted = slope * p.year + intercept;
    return sum + Math.pow(p.value - predicted, 2);
  }, 0);
  const r2 = ssTotal > 0 ? 1 - ssResidual / ssTotal : 0;

  return {
    slope,
    intercept,
    r2,
    predict: (x: number) => slope * x + intercept,
  };
}

/**
 * Calculate Simple Moving Average (SMA)
 */
export function simpleMovingAverage(data: number[], window: number): (number | null)[] {
  const result: (number | null)[] = [];
  
  for (let i = 0; i < data.length; i++) {
    if (i < window - 1) {
      result.push(null);
    } else {
      const windowData = data.slice(i - window + 1, i + 1);
      const avg = windowData.reduce((sum, val) => sum + val, 0) / window;
      result.push(avg);
    }
  }
  
  return result;
}

/**
 * Calculate Exponential Moving Average (EMA)
 */
export function exponentialMovingAverage(data: number[], window: number): (number | null)[] {
  const result: (number | null)[] = [];
  const multiplier = 2 / (window + 1);
  
  for (let i = 0; i < data.length; i++) {
    if (i < window - 1) {
      result.push(null);
    } else if (i === window - 1) {
      // First EMA is SMA
      const sma = data.slice(0, window).reduce((sum, val) => sum + val, 0) / window;
      result.push(sma);
    } else {
      const prevEma = result[i - 1] as number;
      const ema = (data[i] - prevEma) * multiplier + prevEma;
      result.push(ema);
    }
  }
  
  return result;
}

/**
 * Calculate Year-over-Year growth rates
 */
export function yoyGrowth(data: Point[]): Point[] {
  if (data.length < 2) return [];
  
  const sorted = [...data].sort((a, b) => a.year - b.year);
  const result: Point[] = [];
  
  for (let i = 1; i < sorted.length; i++) {
    const prev = sorted[i - 1];
    const curr = sorted[i];
    
    if (prev.value !== 0) {
      const growth = ((curr.value - prev.value) / Math.abs(prev.value)) * 100;
      result.push({ year: curr.year, value: growth });
    }
  }
  
  return result;
}

/**
 * Calculate Compound Annual Growth Rate (CAGR)
 */
export function cagr(startValue: number, endValue: number, years: number): number {
  if (startValue <= 0 || years <= 0) return 0;
  return (Math.pow(endValue / startValue, 1 / years) - 1) * 100;
}

/**
 * Calculate percentile value from sorted array
 */
export function percentile(sortedData: number[], p: number): number {
  if (sortedData.length === 0) return 0;
  if (p <= 0) return sortedData[0];
  if (p >= 100) return sortedData[sortedData.length - 1];
  
  const index = (p / 100) * (sortedData.length - 1);
  const lower = Math.floor(index);
  const upper = Math.ceil(index);
  const weight = index - lower;
  
  return sortedData[lower] * (1 - weight) + sortedData[upper] * weight;
}

/**
 * Calculate quartiles
 */
export function quartiles(data: number[]): { q1: number; median: number; q3: number } {
  const sorted = [...data].sort((a, b) => a - b);
  return {
    q1: percentile(sorted, 25),
    median: percentile(sorted, 50),
    q3: percentile(sorted, 75),
  };
}

/**
 * Calculate mean
 */
export function mean(data: number[]): number {
  if (data.length === 0) return 0;
  return data.reduce((sum, val) => sum + val, 0) / data.length;
}

/**
 * Calculate standard deviation
 */
export function standardDeviation(data: number[]): number {
  if (data.length === 0) return 0;
  const avg = mean(data);
  const squaredDiffs = data.map(val => Math.pow(val - avg, 2));
  return Math.sqrt(mean(squaredDiffs));
}

/**
 * Calculate z-score
 */
export function zScore(value: number, dataMean: number, stdDev: number): number {
  if (stdDev === 0) return 0;
  return (value - dataMean) / stdDev;
}

/**
 * Detect outliers using IQR method
 */
export function detectOutliers(data: number[]): { lower: number[]; upper: number[] } {
  const q = quartiles(data);
  const iqr = q.q3 - q.q1;
  const lowerBound = q.q1 - 1.5 * iqr;
  const upperBound = q.q3 + 1.5 * iqr;
  
  return {
    lower: data.filter(val => val < lowerBound),
    upper: data.filter(val => val > upperBound),
  };
}

/**
 * Generate projection data points
 */
export function generateProjection(
  data: Point[],
  yearsAhead: number
): Point[] {
  if (data.length < 2) return [];
  
  const regression = linearRegression(data);
  const lastYear = Math.max(...data.map(p => p.year));
  const projections: Point[] = [];
  
  for (let i = 1; i <= yearsAhead; i++) {
    const year = lastYear + i;
    projections.push({
      year,
      value: regression.predict(year),
    });
  }
  
  return projections;
}

/**
 * Format number for display
 */
export function formatNumber(value: number, decimals: number = 2): string {
  if (Math.abs(value) >= 1e9) {
    return `${(value / 1e9).toFixed(decimals)}B`;
  }
  if (Math.abs(value) >= 1e6) {
    return `${(value / 1e6).toFixed(decimals)}M`;
  }
  if (Math.abs(value) >= 1e3) {
    return `${(value / 1e3).toFixed(decimals)}K`;
  }
  return value.toFixed(decimals);
}
