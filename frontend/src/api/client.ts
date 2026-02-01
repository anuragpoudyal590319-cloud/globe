// API client - fetches ONLY from our backend, never external APIs

export interface Country {
  country_code: string;
  name: string;
  region: string | null;
  income_level: string | null;
  currency_code: string | null;
}

export interface IndicatorValue {
  country_code: string;
  value: number;
  effective_date: string;
  fetched_at: string;
  source: string;
}

export interface LastIngestion {
  finishedAt: string;
  itemsInserted: number;
  itemsUpdated: number;
}

export interface MetaResponse {
  lastIngestion: Record<string, LastIngestion>;
  dataCounts: Record<string, number>;
  serverTime: string;
}

export type IndicatorType = 
  | 'interest' 
  | 'inflation' 
  | 'exchange'
  | 'gdp_per_capita'
  | 'unemployment'
  | 'government_debt'
  | 'gini'
  | 'life_expectancy'
  // Trade
  | 'exports'
  | 'imports'
  | 'fdi_inflows'
  // Labor
  | 'labor_force'
  | 'female_employment'
  // Finance
  | 'domestic_credit'
  // Development
  | 'education_spending'
  | 'poverty_headcount'
  // Energy
  | 'co2_emissions'
  | 'renewable_energy'
  // Markets
  | 'market_cap'
  | 'stocks_traded'
  | 'stock_turnover';

export interface HistoryDataPoint {
  year: number;
  value: number;
}

export interface HistoryResponse {
  country_code: string;
  country_name: string;
  data: Record<string, HistoryDataPoint[]>;
}

export interface YearRangeResponse {
  country_code: string;
  min_year: number;
  max_year: number;
  data_points: number;
}

export interface IndicatorYearRangeResponse {
  indicator_type: string;
  min_year: number;
  max_year: number;
  total_records: number;
}

export interface CompareCountryInfo {
  code: string;
  name: string;
  region: string | null;
}

export interface IndicatorSummary {
  latest: number | null;
  latestYear: number | null;
  min: number | null;
  max: number | null;
  avg: number | null;
}

export interface CompareDataPoint {
  year: number;
  value: number;
}

export interface CompareResponse {
  countries: CompareCountryInfo[];
  data: Record<string, Record<string, CompareDataPoint[]>>;
  summary: Record<string, Record<string, IndicatorSummary>>;
}

export interface CompareCountryOption {
  code: string;
  name: string;
  region: string | null;
  dataPoints: number;
}

// Analytics types
export interface BulkDataCountry {
  code: string;
  name: string;
  region: string | null;
  income_level: string | null;
}

export interface BulkDataResponse {
  countries: BulkDataCountry[];
  data: Record<string, Record<string, { year: number; value: number }[]>>;
  yearRange: { min: number; max: number };
}

export interface CorrelationMatrix {
  labels: string[];
  matrix: number[][];
}

export interface CorrelationResponse {
  type: 'cross_indicator' | 'cross_country';
  correlation: CorrelationMatrix;
  sampleSize: number;
  yearRange: { from: number; to: number };
}

export interface StatisticsResponse {
  indicator: string;
  year: number;
  count: number;
  mean: number;
  median: number;
  stdDev: number;
  min: number;
  max: number;
  percentiles: Record<string, number>;
  quartiles: { q1: number; median: number; q3: number };
  outliers: Array<{ country: string; value: number; zScore: number }>;
  distribution: Array<{ bin: number; count: number; countries: string[] }>;
}

export interface RollingCorrelationResponse {
  indicator1: string;
  indicator2: string;
  country: string | null;
  windowSize: number;
  years: number[];
  correlations: number[];
}

const BASE_URL = '/api';

async function fetchJson<T>(path: string): Promise<T> {
  const response = await fetch(`${BASE_URL}${path}`);
  if (!response.ok) {
    let errorMessage = `API error: ${response.status} ${response.statusText}`;
    try {
      const errorData = await response.json();
      if (errorData.error) {
        errorMessage = errorData.error;
      } else if (errorData.message) {
        errorMessage = errorData.message;
      }
    } catch {
      // response body was not JSON
    }
    throw new Error(errorMessage);
  }
  return response.json();
}

export const api = {
  getCountries: () => fetchJson<Country[]>('/countries'),
  
  getLatestIndicators: (type: IndicatorType) => 
    fetchJson<IndicatorValue[]>(`/indicators/latest?type=${type}`),

  // Get indicator values for a specific year (for time-lapse animation)
  getIndicatorsByYear: (type: IndicatorType, year: number) =>
    fetchJson<IndicatorValue[]>(`/indicators/year?type=${type}&year=${year}`),

  // Get available year range for an indicator
  getIndicatorYearRange: (type: IndicatorType) =>
    fetchJson<IndicatorYearRangeResponse>(`/indicators/years?type=${type}`),
  
  getMeta: () => fetchJson<MetaResponse>('/meta/last-updated'),

  getCountryHistory: (
    countryCode: string, 
    indicators?: IndicatorType[],
    from?: number,
    to?: number
  ) => {
    let path = `/history/${countryCode}`;
    const params = new URLSearchParams();
    
    if (indicators && indicators.length > 0) {
      params.set('indicators', indicators.join(','));
    }
    if (from) {
      params.set('from', from.toString());
    }
    if (to) {
      params.set('to', to.toString());
    }
    
    const queryString = params.toString();
    if (queryString) {
      path += `?${queryString}`;
    }
    
    return fetchJson<HistoryResponse>(path);
  },

  getCountryYearRange: (countryCode: string) => 
    fetchJson<YearRangeResponse>(`/history/${countryCode}/range`),

  // Comparison API
  compareCountries: (
    countryCodes: string[],
    indicators?: IndicatorType[],
    from?: number,
    to?: number
  ) => {
    const params = new URLSearchParams();
    params.set('countries', countryCodes.join(','));
    
    if (indicators && indicators.length > 0) {
      params.set('indicators', indicators.join(','));
    }
    if (from) {
      params.set('from', from.toString());
    }
    if (to) {
      params.set('to', to.toString());
    }
    
    return fetchJson<CompareResponse>(`/compare?${params.toString()}`);
  },

  getCompareCountries: () => 
    fetchJson<{ countries: CompareCountryOption[] }>('/compare/countries'),

  // Analytics API
  getAnalyticsBulk: (
    indicators: IndicatorType[],
    from?: number,
    to?: number
  ) => {
    const params = new URLSearchParams();
    params.set('indicators', indicators.join(','));
    if (from != null) params.set('from', from.toString());
    if (to != null) params.set('to', to.toString());
    return fetchJson<BulkDataResponse>(`/analytics/bulk?${params.toString()}`);
  },

  getCorrelation: (options: {
    type: 'cross_indicator' | 'cross_country';
    indicators?: IndicatorType[];
    indicator?: IndicatorType;
    countries?: string[];
    from?: number;
    to?: number;
  }) => {
    const params = new URLSearchParams();
    params.set('type', options.type);
    if (options.indicators) params.set('indicators', options.indicators.join(','));
    if (options.indicator) params.set('indicator', options.indicator);
    if (options.countries) params.set('countries', options.countries.join(','));
    if (options.from != null) params.set('from', options.from.toString());
    if (options.to != null) params.set('to', options.to.toString());
    return fetchJson<CorrelationResponse>(`/analytics/correlation?${params.toString()}`);
  },

  getStatistics: (indicator: IndicatorType, year?: number) => {
    const params = new URLSearchParams();
    params.set('indicator', indicator);
    if (year) params.set('year', year.toString());
    return fetchJson<StatisticsResponse>(`/analytics/statistics?${params.toString()}`);
  },

  getRollingCorrelation: (
    indicator1: IndicatorType,
    indicator2: IndicatorType,
    windowSize?: number,
    country?: string
  ) => {
    const params = new URLSearchParams();
    params.set('indicator1', indicator1);
    params.set('indicator2', indicator2);
    if (windowSize) params.set('window', windowSize.toString());
    if (country) params.set('country', country);
    return fetchJson<RollingCorrelationResponse>(`/analytics/rolling-correlation?${params.toString()}`);
  },
};
