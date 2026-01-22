import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

// ES module way to get __dirname
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

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
    // New indicators (Trade)
    exports: '99999999-9999-9999-9999-999999999999',
    imports: 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa',
    fdi_inflows: 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb',
    // New indicators (Labor)
    labor_force: 'cccccccc-cccc-cccc-cccc-cccccccccccc',
    female_employment: 'dddddddd-dddd-dddd-dddd-dddddddddddd',
    // New indicators (Finance)
    domestic_credit: 'eeeeeeee-eeee-eeee-eeee-eeeeeeeeeeee',
    // New indicators (Development)
    education_spending: 'ffffffff-ffff-ffff-ffff-ffffffffffff',
    poverty_headcount: '10101010-1010-1010-1010-101010101010',
    // New indicators (Energy)
    co2_emissions: '20202020-2020-2020-2020-202020202020',
    renewable_energy: '30303030-3030-3030-3030-303030303030',
    // New indicators (Markets)
    market_cap: '40404040-4040-4040-4040-404040404040',
    stocks_traded: '50505050-5050-5050-5050-505050505050',
    stock_turnover: '60606060-6060-6060-6060-606060606060',
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
    // Trade indicators
    exports: 'NE.EXP.GNFS.ZS',
    imports: 'NE.IMP.GNFS.ZS',
    fdi_inflows: 'BX.KLT.DINV.WD.GD.ZS',
    // Labor indicators
    labor_force: 'SL.TLF.CACT.ZS',
    female_employment: 'SL.EMP.TOTL.SP.FE.ZS',
    // Finance indicators
    domestic_credit: 'FS.AST.DOMS.GD.ZS',
    // Development indicators
    education_spending: 'SE.XPD.TOTL.GD.ZS',
    poverty_headcount: 'SI.POV.DDAY',
    // Energy indicators
    co2_emissions: 'EN.ATM.CO2E.PC',
    renewable_energy: 'EG.FEC.RNEW.ZS',
    // Markets indicators
    market_cap: 'CM.MKT.LCAP.GD.ZS',
    stocks_traded: 'CM.MKT.TRAD.GD.ZS',
    stock_turnover: 'CM.MKT.TRNR',
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

export const ALL_INDICATOR_TYPES: IndicatorType[] = [
  'interest',
  'inflation', 
  'exchange',
  'gdp_per_capita',
  'unemployment',
  'government_debt',
  'gini',
  'life_expectancy',
  // Trade
  'exports',
  'imports',
  'fdi_inflows',
  // Labor
  'labor_force',
  'female_employment',
  // Finance
  'domestic_credit',
  // Development
  'education_spending',
  'poverty_headcount',
  // Energy
  'co2_emissions',
  'renewable_energy',
  // Markets
  'market_cap',
  'stocks_traded',
  'stock_turnover',
];
