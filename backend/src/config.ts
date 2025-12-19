import dotenv from 'dotenv';
import path from 'path';

// Load .env from backend directory
dotenv.config({ path: path.resolve(__dirname, '../.env') });

export const config = {
  database: {
    url: process.env.DATABASE_URL || 'postgresql://globe:globe_dev_password@localhost:5433/globe',
  },
  server: {
    port: parseInt(process.env.PORT || '3001', 10),
    isProduction: process.env.NODE_ENV === 'production',
  },
  cron: {
    timezone: process.env.CRON_TZ || 'UTC',
  },
  // Well-known indicator UUIDs (seeded in migration)
  indicators: {
    interest: '11111111-1111-1111-1111-111111111111',
    inflation: '22222222-2222-2222-2222-222222222222',
    exchange: '33333333-3333-3333-3333-333333333333',
    gdp_per_capita: '44444444-4444-4444-4444-444444444444',
    unemployment: '55555555-5555-5555-5555-555555555555',
    government_debt: '66666666-6666-6666-6666-666666666666',
    gini: '77777777-7777-7777-7777-777777777777',
    life_expectancy: '88888888-8888-8888-8888-888888888888',
  },
  // World Bank indicator codes for each type
  worldBankCodes: {
    interest: 'FR.INR.RINR',
    inflation: 'FP.CPI.TOTL.ZG',
    gdp_per_capita: 'NY.GDP.PCAP.CD',
    unemployment: 'SL.UEM.TOTL.ZS',
    government_debt: 'GC.DOD.TOTL.GD.ZS',
    gini: 'SI.POV.GINI',
    life_expectancy: 'SP.DYN.LE00.IN',
  },
  // External API URLs
  apis: {
    worldBankCountries: 'https://api.worldbank.org/v2/country?format=json&per_page=300',
    worldBankIndicator: (indicator: string) =>
      `https://api.worldbank.org/v2/country/all/indicator/${indicator}?format=json&per_page=500&mrnev=1`,
    openExchangeRates: 'https://open.er-api.com/v6/latest/USD',
  },
} as const;

export type IndicatorType = 
  | 'interest' 
  | 'inflation' 
  | 'exchange' 
  | 'gdp_per_capita' 
  | 'unemployment' 
  | 'government_debt' 
  | 'gini' 
  | 'life_expectancy';

export const ALL_INDICATOR_TYPES: IndicatorType[] = [
  'interest',
  'inflation', 
  'exchange',
  'gdp_per_capita',
  'unemployment',
  'government_debt',
  'gini',
  'life_expectancy',
];
