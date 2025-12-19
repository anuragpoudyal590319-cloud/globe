/* eslint-disable camelcase */

exports.shorthands = undefined;

exports.up = (pgm) => {
  // First, update the check constraint to include new indicator types
  pgm.sql(`
    ALTER TABLE indicators DROP CONSTRAINT IF EXISTS indicators_indicator_type_check;
    ALTER TABLE indicators ADD CONSTRAINT indicators_indicator_type_check 
      CHECK (indicator_type IN ('interest', 'inflation', 'exchange', 'gdp_per_capita', 'unemployment', 'government_debt', 'gini', 'life_expectancy'));
  `);

  // Then add 5 new economic indicators
  pgm.sql(`
    INSERT INTO indicators (id, indicator_type, source, source_indicator_code, name, unit)
    VALUES 
      ('44444444-4444-4444-4444-444444444444', 'gdp_per_capita', 'worldbank', 'NY.GDP.PCAP.CD', 'GDP per Capita', 'USD'),
      ('55555555-5555-5555-5555-555555555555', 'unemployment', 'worldbank', 'SL.UEM.TOTL.ZS', 'Unemployment Rate', '%'),
      ('66666666-6666-6666-6666-666666666666', 'government_debt', 'worldbank', 'GC.DOD.TOTL.GD.ZS', 'Government Debt', '% of GDP'),
      ('77777777-7777-7777-7777-777777777777', 'gini', 'worldbank', 'SI.POV.GINI', 'GINI Index', 'index'),
      ('88888888-8888-8888-8888-888888888888', 'life_expectancy', 'worldbank', 'SP.DYN.LE00.IN', 'Life Expectancy', 'years')
    ON CONFLICT DO NOTHING;
  `);
};

exports.down = (pgm) => {
  pgm.sql(`
    DELETE FROM indicator_values 
    WHERE indicator_id IN (
      '44444444-4444-4444-4444-444444444444',
      '55555555-5555-5555-5555-555555555555',
      '66666666-6666-6666-6666-666666666666',
      '77777777-7777-7777-7777-777777777777',
      '88888888-8888-8888-8888-888888888888'
    );
  `);

  pgm.sql(`
    DELETE FROM indicators 
    WHERE id IN (
      '44444444-4444-4444-4444-444444444444',
      '55555555-5555-5555-5555-555555555555',
      '66666666-6666-6666-6666-666666666666',
      '77777777-7777-7777-7777-777777777777',
      '88888888-8888-8888-8888-888888888888'
    );
  `);

  pgm.sql(`
    ALTER TABLE indicators DROP CONSTRAINT IF EXISTS indicators_indicator_type_check;
    ALTER TABLE indicators ADD CONSTRAINT indicators_indicator_type_check 
      CHECK (indicator_type IN ('interest', 'inflation', 'exchange'));
  `);
};
