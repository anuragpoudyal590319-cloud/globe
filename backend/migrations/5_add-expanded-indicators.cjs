/* eslint-disable camelcase */

exports.shorthands = undefined;

exports.up = (pgm) => {
  // First, update the check constraint to include new indicator types
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

  // Add 10 new economic indicators
  pgm.sql(`
    INSERT INTO indicators (id, indicator_type, source, source_indicator_code, name, unit)
    VALUES 
      -- Trade indicators
      ('99999999-9999-9999-9999-999999999999', 'exports', 'worldbank', 'NE.EXP.GNFS.ZS', 'Exports (% of GDP)', '% of GDP'),
      ('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 'imports', 'worldbank', 'NE.IMP.GNFS.ZS', 'Imports (% of GDP)', '% of GDP'),
      ('bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb', 'fdi_inflows', 'worldbank', 'BX.KLT.DINV.WD.GD.ZS', 'FDI Inflows (% of GDP)', '% of GDP'),
      -- Labor indicators
      ('cccccccc-cccc-cccc-cccc-cccccccccccc', 'labor_force', 'worldbank', 'SL.TLF.CACT.ZS', 'Labor Force Participation', '%'),
      ('dddddddd-dddd-dddd-dddd-dddddddddddd', 'female_employment', 'worldbank', 'SL.EMP.TOTL.SP.FE.ZS', 'Female Employment Share', '%'),
      -- Finance indicators
      ('eeeeeeee-eeee-eeee-eeee-eeeeeeeeeeee', 'domestic_credit', 'worldbank', 'FS.AST.DOMS.GD.ZS', 'Domestic Credit (% of GDP)', '% of GDP'),
      -- Development indicators
      ('ffffffff-ffff-ffff-ffff-ffffffffffff', 'education_spending', 'worldbank', 'SE.XPD.TOTL.GD.ZS', 'Education Spending (% of GDP)', '% of GDP'),
      ('10101010-1010-1010-1010-101010101010', 'poverty_headcount', 'worldbank', 'SI.POV.DDAY', 'Poverty Rate ($2.15/day)', '%'),
      -- Energy indicators
      ('20202020-2020-2020-2020-202020202020', 'co2_emissions', 'worldbank', 'EN.ATM.CO2E.PC', 'CO2 Emissions per Capita', 'metric tons'),
      ('30303030-3030-3030-3030-303030303030', 'renewable_energy', 'worldbank', 'EG.FEC.RNEW.ZS', 'Renewable Energy Share', '%')
    ON CONFLICT DO NOTHING;
  `);
};

exports.down = (pgm) => {
  // Delete indicator values first (foreign key constraint)
  pgm.sql(`
    DELETE FROM indicator_values 
    WHERE indicator_id IN (
      '99999999-9999-9999-9999-999999999999',
      'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa',
      'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb',
      'cccccccc-cccc-cccc-cccc-cccccccccccc',
      'dddddddd-dddd-dddd-dddd-dddddddddddd',
      'eeeeeeee-eeee-eeee-eeee-eeeeeeeeeeee',
      'ffffffff-ffff-ffff-ffff-ffffffffffff',
      '10101010-1010-1010-1010-101010101010',
      '20202020-2020-2020-2020-202020202020',
      '30303030-3030-3030-3030-303030303030'
    );
  `);

  // Delete the indicators
  pgm.sql(`
    DELETE FROM indicators 
    WHERE id IN (
      '99999999-9999-9999-9999-999999999999',
      'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa',
      'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb',
      'cccccccc-cccc-cccc-cccc-cccccccccccc',
      'dddddddd-dddd-dddd-dddd-dddddddddddd',
      'eeeeeeee-eeee-eeee-eeee-eeeeeeeeeeee',
      'ffffffff-ffff-ffff-ffff-ffffffffffff',
      '10101010-1010-1010-1010-101010101010',
      '20202020-2020-2020-2020-202020202020',
      '30303030-3030-3030-3030-303030303030'
    );
  `);

  // Revert the check constraint
  pgm.sql(`
    ALTER TABLE indicators DROP CONSTRAINT IF EXISTS indicators_indicator_type_check;
    ALTER TABLE indicators ADD CONSTRAINT indicators_indicator_type_check 
      CHECK (indicator_type IN (
        'interest', 'inflation', 'exchange', 'gdp_per_capita', 'unemployment', 
        'government_debt', 'gini', 'life_expectancy'
      ));
  `);
};
