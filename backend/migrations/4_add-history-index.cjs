/* eslint-disable camelcase */

exports.shorthands = undefined;

exports.up = (pgm) => {
  // Add index optimized for country-based historical queries
  // This index supports queries like: SELECT * FROM indicator_values WHERE country_code = 'US' ORDER BY effective_date
  pgm.createIndex('indicator_values', ['country_code', 'indicator_id', 'effective_date'], {
    name: 'idx_indicator_values_country_history',
    ifNotExists: true,
  });
};

exports.down = (pgm) => {
  pgm.dropIndex('indicator_values', ['country_code', 'indicator_id', 'effective_date'], {
    name: 'idx_indicator_values_country_history',
  });
};

