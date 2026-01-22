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

const BASE_URL = '/api';

async function fetchJson<T>(path: string): Promise<T> {
  const response = await fetch(`${BASE_URL}${path}`);
  if (!response.ok) {
    throw new Error(`API error: ${response.status} ${response.statusText}`);
  }
  return response.json();
}

export const api = {
  getCountries: () => fetchJson<Country[]>('/countries'),
  
  getLatestIndicators: (type: IndicatorType) => 
    fetchJson<IndicatorValue[]>(`/indicators/latest?type=${type}`),
  
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
};
