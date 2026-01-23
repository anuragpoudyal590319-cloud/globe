import { IndicatorType } from '../api/client';

export interface IndicatorInfo {
  type: IndicatorType;
  label: string;
  shortLabel: string;
  unit: string;
  icon: string;
  category: string;
  description: string;
}

export const INDICATOR_DEFINITIONS: Record<IndicatorType, IndicatorInfo> = {
  // Economy
  gdp_per_capita: {
    type: 'gdp_per_capita',
    label: 'GDP per Capita',
    shortLabel: 'GDP/Cap',
    unit: 'USD',
    icon: '💵',
    category: 'Economy',
    description: 'Total economic output divided by population. Measures average economic productivity and standard of living.',
  },
  inflation: {
    type: 'inflation',
    label: 'Inflation Rate',
    shortLabel: 'Inflation',
    unit: '%',
    icon: '📊',
    category: 'Economy',
    description: 'Annual percentage increase in consumer prices. High inflation erodes purchasing power; moderate inflation (2-3%) is considered healthy.',
  },
  interest: {
    type: 'interest',
    label: 'Real Interest Rate',
    shortLabel: 'Interest',
    unit: '%',
    icon: '📈',
    category: 'Economy',
    description: 'Lending interest rate adjusted for inflation. Affects borrowing costs, savings returns, and investment decisions.',
  },
  exchange: {
    type: 'exchange',
    label: 'Exchange Rate',
    shortLabel: 'FX Rate',
    unit: 'per USD',
    icon: '💱',
    category: 'Economy',
    description: 'Local currency units per US dollar. Lower values mean stronger currency; affects import/export competitiveness.',
  },
  government_debt: {
    type: 'government_debt',
    label: 'Government Debt',
    shortLabel: 'Gov Debt',
    unit: '% of GDP',
    icon: '🏛️',
    category: 'Economy',
    description: 'Total government debt as percentage of GDP. High debt (>100%) may indicate fiscal stress; sustainable levels vary by country.',
  },

  // Trade
  exports: {
    type: 'exports',
    label: 'Exports',
    shortLabel: 'Exports',
    unit: '% of GDP',
    icon: '📦',
    category: 'Trade',
    description: 'Value of goods and services sold abroad as percentage of GDP. Higher values indicate export-oriented economies.',
  },
  imports: {
    type: 'imports',
    label: 'Imports',
    shortLabel: 'Imports',
    unit: '% of GDP',
    icon: '🚢',
    category: 'Trade',
    description: 'Value of goods and services purchased from abroad as percentage of GDP. High imports may indicate consumer demand or resource dependency.',
  },
  fdi_inflows: {
    type: 'fdi_inflows',
    label: 'FDI Inflows',
    shortLabel: 'FDI',
    unit: '% of GDP',
    icon: '💼',
    category: 'Trade',
    description: 'Foreign Direct Investment flowing into the country. Indicates attractiveness to international investors and potential for economic growth.',
  },

  // Labor
  unemployment: {
    type: 'unemployment',
    label: 'Unemployment Rate',
    shortLabel: 'Unemploy',
    unit: '%',
    icon: '📉',
    category: 'Labor',
    description: 'Percentage of labor force without jobs but actively seeking work. Natural rate is typically 4-5%; higher indicates economic distress.',
  },
  labor_force: {
    type: 'labor_force',
    label: 'Labor Force Participation',
    shortLabel: 'Labor Force',
    unit: '%',
    icon: '🏭',
    category: 'Labor',
    description: 'Percentage of working-age population either employed or seeking work. Reflects workforce engagement and economic activity.',
  },
  female_employment: {
    type: 'female_employment',
    label: 'Female Employment',
    shortLabel: 'Female Emp',
    unit: '%',
    icon: '👩‍💼',
    category: 'Labor',
    description: 'Percentage of working-age women who are employed. Indicates gender equality in the workforce and economic opportunity.',
  },

  // Finance
  domestic_credit: {
    type: 'domestic_credit',
    label: 'Domestic Credit',
    shortLabel: 'Credit',
    unit: '% of GDP',
    icon: '💳',
    category: 'Finance',
    description: 'Credit provided by financial sector to private sector as percentage of GDP. Measures financial system depth and access to capital.',
  },

  // Development
  gini: {
    type: 'gini',
    label: 'GINI Index',
    shortLabel: 'GINI',
    unit: '0-100',
    icon: '⚖️',
    category: 'Development',
    description: 'Measures income inequality (0=perfect equality, 100=perfect inequality). Below 30 is low inequality; above 40 is high.',
  },
  life_expectancy: {
    type: 'life_expectancy',
    label: 'Life Expectancy',
    shortLabel: 'Life Exp',
    unit: 'years',
    icon: '❤️',
    category: 'Development',
    description: 'Average years a newborn is expected to live. Key indicator of healthcare quality, nutrition, and overall development.',
  },
  education_spending: {
    type: 'education_spending',
    label: 'Education Spending',
    shortLabel: 'Education',
    unit: '% of GDP',
    icon: '🎓',
    category: 'Development',
    description: 'Government expenditure on education as percentage of GDP. Higher spending typically correlates with better educational outcomes.',
  },
  poverty_headcount: {
    type: 'poverty_headcount',
    label: 'Poverty Rate',
    shortLabel: 'Poverty',
    unit: '%',
    icon: '🏚️',
    category: 'Development',
    description: 'Percentage of population living below the national poverty line. Key measure of economic well-being and development.',
  },

  // Energy
  co2_emissions: {
    type: 'co2_emissions',
    label: 'CO2 Emissions',
    shortLabel: 'CO2',
    unit: 'tons/capita',
    icon: '🏭',
    category: 'Energy',
    description: 'Metric tons of carbon dioxide emitted per person annually. Indicates environmental impact and energy consumption patterns.',
  },
  renewable_energy: {
    type: 'renewable_energy',
    label: 'Renewable Energy',
    shortLabel: 'Renewables',
    unit: '%',
    icon: '🌱',
    category: 'Energy',
    description: 'Percentage of total energy consumption from renewable sources (solar, wind, hydro, etc.). Higher values indicate cleaner energy mix.',
  },

  // Markets
  market_cap: {
    type: 'market_cap',
    label: 'Market Capitalization',
    shortLabel: 'Mkt Cap',
    unit: '% of GDP',
    icon: '📈',
    category: 'Markets',
    description: 'Total value of all publicly listed companies as percentage of GDP. Measures stock market size relative to the economy.',
  },
  stocks_traded: {
    type: 'stocks_traded',
    label: 'Stocks Traded',
    shortLabel: 'Volume',
    unit: '% of GDP',
    icon: '📊',
    category: 'Markets',
    description: 'Total value of shares traded during the year as percentage of GDP. Indicates market liquidity and trading activity.',
  },
  stock_turnover: {
    type: 'stock_turnover',
    label: 'Stock Turnover Ratio',
    shortLabel: 'Turnover',
    unit: '%',
    icon: '🔄',
    category: 'Markets',
    description: 'Value of shares traded divided by market capitalization. Measures how actively stocks change hands; higher means more liquid market.',
  },
};

export const CATEGORIES = [
  { id: 'Economy', icon: '💰', label: 'Economy' },
  { id: 'Trade', icon: '🌐', label: 'Trade' },
  { id: 'Labor', icon: '👥', label: 'Labor' },
  { id: 'Finance', icon: '🏦', label: 'Finance' },
  { id: 'Development', icon: '📈', label: 'Development' },
  { id: 'Energy', icon: '⚡', label: 'Energy' },
  { id: 'Markets', icon: '📊', label: 'Markets' },
] as const;

export type CategoryId = typeof CATEGORIES[number]['id'];

// Helper to get indicators by category
export function getIndicatorsByCategory(category: CategoryId): IndicatorInfo[] {
  return Object.values(INDICATOR_DEFINITIONS).filter(i => i.category === category);
}

// Helper to get indicator info
export function getIndicatorInfo(type: IndicatorType): IndicatorInfo {
  return INDICATOR_DEFINITIONS[type];
}
