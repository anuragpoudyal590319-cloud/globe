/* eslint-disable camelcase */

exports.shorthands = undefined;

exports.up = (pgm) => {
  // Enable uuid extension
  pgm.sql('CREATE EXTENSION IF NOT EXISTS "uuid-ossp"');

  // Countries table
  pgm.createTable('countries', {
    country_code: {
      type: 'char(2)',
      primaryKey: true,
    },
    name: {
      type: 'text',
      notNull: true,
    },
    region: {
      type: 'text',
    },
    income_level: {
      type: 'text',
    },
    currency_code: {
      type: 'char(3)',
    },
    created_at: {
      type: 'timestamptz',
      notNull: true,
      default: pgm.func('now()'),
    },
    updated_at: {
      type: 'timestamptz',
      notNull: true,
      default: pgm.func('now()'),
    },
  });

  // Indicators table
  pgm.createTable('indicators', {
    id: {
      type: 'uuid',
      primaryKey: true,
      default: pgm.func('uuid_generate_v4()'),
    },
    indicator_type: {
      type: 'text',
      notNull: true,
      check: "indicator_type IN ('interest', 'inflation', 'exchange')",
    },
    source: {
      type: 'text',
      notNull: true,
    },
    source_indicator_code: {
      type: 'text',
    },
    name: {
      type: 'text',
      notNull: true,
    },
    unit: {
      type: 'text',
    },
    created_at: {
      type: 'timestamptz',
      notNull: true,
      default: pgm.func('now()'),
    },
    updated_at: {
      type: 'timestamptz',
      notNull: true,
      default: pgm.func('now()'),
    },
  });

  // Index on indicator_type for fast lookups
  pgm.createIndex('indicators', 'indicator_type');

  // Indicator values table (versioned facts)
  pgm.createTable('indicator_values', {
    id: {
      type: 'uuid',
      primaryKey: true,
      default: pgm.func('uuid_generate_v4()'),
    },
    country_code: {
      type: 'char(2)',
      notNull: true,
      references: 'countries',
      onDelete: 'CASCADE',
    },
    indicator_id: {
      type: 'uuid',
      notNull: true,
      references: 'indicators',
      onDelete: 'CASCADE',
    },
    effective_date: {
      type: 'date',
      notNull: true,
    },
    value: {
      type: 'double precision',
      notNull: true,
    },
    fetched_at: {
      type: 'timestamptz',
      notNull: true,
    },
    data_version: {
      type: 'integer',
      notNull: true,
      default: 1,
    },
    created_at: {
      type: 'timestamptz',
      notNull: true,
      default: pgm.func('now()'),
    },
  });

  // Unique constraint for versioning
  pgm.addConstraint('indicator_values', 'indicator_values_unique_version', {
    unique: ['country_code', 'indicator_id', 'effective_date', 'data_version'],
  });

  // Composite index for fast latest lookups by country and indicator
  pgm.createIndex('indicator_values', ['country_code', 'indicator_id', 'effective_date', 'data_version'], {
    name: 'idx_indicator_values_latest_lookup',
  });

  // Index for queries by indicator_id
  pgm.createIndex('indicator_values', 'indicator_id', {
    name: 'idx_indicator_values_indicator',
  });

  // Ingestion logs table
  pgm.createTable('ingestion_logs', {
    id: {
      type: 'uuid',
      primaryKey: true,
      default: pgm.func('uuid_generate_v4()'),
    },
    job_name: {
      type: 'text',
      notNull: true,
    },
    status: {
      type: 'text',
      notNull: true,
      check: "status IN ('success', 'failure', 'partial')",
    },
    started_at: {
      type: 'timestamptz',
      notNull: true,
    },
    finished_at: {
      type: 'timestamptz',
    },
    items_inserted: {
      type: 'integer',
      notNull: true,
      default: 0,
    },
    items_updated: {
      type: 'integer',
      notNull: true,
      default: 0,
    },
    error_message: {
      type: 'text',
    },
  });

  // Index for looking up latest ingestion by job
  pgm.createIndex('ingestion_logs', ['job_name', 'finished_at'], {
    name: 'idx_ingestion_logs_latest',
  });
};

exports.down = (pgm) => {
  pgm.dropTable('ingestion_logs');
  pgm.dropTable('indicator_values');
  pgm.dropTable('indicators');
  pgm.dropTable('countries');
  pgm.sql('DROP EXTENSION IF EXISTS "uuid-ossp"');
};

