/**
 * Migration: Add stock market indicators
 * - Market Capitalization (% of GDP)
 * - Stocks Traded (% of GDP)
 * - Stock Turnover Ratio
 */

exports.up = (pgm) => {
  // Update the check constraint to include new indicator types
  pgm.sql(`
    ALTER TABLE indicators DROP CONSTRAINT IF EXISTS indicators_indicator_type_check;
    ALTER TABLE indicators ADD CONSTRAINT indicators_indicator_type_check 
      CHECK (indicator_type IN (
        'interest', 'inflation', 'exchange', 'gdp_per_capita', 'unemployment', 
        'government_debt', 'gini', 'life_expectancy',
        'exports', 'imports', 'fdi_inflows',
        'labor_force', 'female_employment',
        'domestic_credit',
        'education_spending', 'poverty_headcount',
        'co2_emissions', 'renewable_energy',
        'market_cap', 'stocks_traded', 'stock_turnover'
      ));
  `);

  // Insert new stock market indicators
  pgm.sql(`
    INSERT INTO indicators (id, indicator_type, source, source_indicator_code, name, unit)
    VALUES 
      ('40404040-4040-4040-4040-404040404040', 'market_cap', 'worldbank', 'CM.MKT.LCAP.GD.ZS', 'Market Capitalization', '% of GDP'),
      ('50505050-5050-5050-5050-505050505050', 'stocks_traded', 'worldbank', 'CM.MKT.TRAD.GD.ZS', 'Stocks Traded', '% of GDP'),
      ('60606060-6060-6060-6060-606060606060', 'stock_turnover', 'worldbank', 'CM.MKT.TRNR', 'Stock Turnover Ratio', '%')
    ON CONFLICT DO NOTHING;
  `);
};

exports.down = (pgm) => {
  // Remove the new indicators
  pgm.sql(`
    DELETE FROM indicator_values WHERE indicator_id IN (
      '40404040-4040-4040-4040-404040404040',
      '50505050-5050-5050-5050-505050505050',
      '60606060-6060-6060-6060-606060606060'
    );
    DELETE FROM indicators WHERE indicator_type IN ('market_cap', 'stocks_traded', 'stock_turnover');
  `);

  // Revert the check constraint
  pgm.sql(`
    ALTER TABLE indicators DROP CONSTRAINT IF EXISTS indicators_indicator_type_check;
    ALTER TABLE indicators ADD CONSTRAINT indicators_indicator_type_check 
      CHECK (indicator_type IN (
        'interest', 'inflation', 'exchange', 'gdp_per_capita', 'unemployment', 
        'government_debt', 'gini', 'life_expectancy',
        'exports', 'imports', 'fdi_inflows',
        'labor_force', 'female_employment',
        'domestic_credit',
        'education_spending', 'poverty_headcount',
        'co2_emissions', 'renewable_energy'
      ));
  `);
};
