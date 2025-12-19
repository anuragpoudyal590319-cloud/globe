/* eslint-disable camelcase */

exports.shorthands = undefined;

exports.up = (pgm) => {
  // Seed the three indicator types we'll be tracking
  pgm.sql(`
    INSERT INTO indicators (id, indicator_type, source, source_indicator_code, name, unit)
    VALUES 
      ('11111111-1111-1111-1111-111111111111', 'interest', 'worldbank', 'FR.INR.RINR', 'Real Interest Rate', '%'),
      ('22222222-2222-2222-2222-222222222222', 'inflation', 'worldbank', 'FP.CPI.TOTL.ZG', 'Inflation (Consumer Prices)', '%'),
      ('33333333-3333-3333-3333-333333333333', 'exchange', 'open_er_api', NULL, 'Exchange Rate vs USD', 'per USD')
    ON CONFLICT DO NOTHING;
  `);
};

exports.down = (pgm) => {
  pgm.sql(`
    DELETE FROM indicators 
    WHERE id IN (
      '11111111-1111-1111-1111-111111111111',
      '22222222-2222-2222-2222-222222222222',
      '33333333-3333-3333-3333-333333333333'
    );
  `);
};

