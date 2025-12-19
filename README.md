# World Economic Map

A free, production-grade single-page web application displaying a world choropleth map with:
- **Exchange Rates** (vs USD) - Updated daily
- **Interest Rates** (real interest rate %) - Updated weekly
- **Inflation Rates** (consumer prices annual %) - Updated monthly

## Architecture

```
┌─────────────────┐     ┌──────────────────┐     ┌─────────────────┐
│  External APIs  │     │     Backend      │     │    Frontend     │
│  (World Bank,   │────▶│  (Node.js +      │────▶│  (React + Vite) │
│   Open ER API)  │     │   PostgreSQL)    │     │                 │
└─────────────────┘     └──────────────────┘     └─────────────────┘
        ▲                       │
        │                       │
   Cron Jobs              REST API
   (scheduled)           (read-only)
```

**Key Design Principles:**
- Frontend **never** calls external APIs directly
- All data is fetched by backend cron jobs and stored in PostgreSQL
- Frontend fetches data only from our backend APIs
- No API keys exposed in frontend

## Tech Stack

**Backend:**
- Node.js + TypeScript
- Fastify (web framework)
- PostgreSQL (database)
- node-cron (scheduled jobs)
- Axios (HTTP client)

**Frontend:**
- React 18 + TypeScript
- Vite (build tool)
- react-simple-maps (choropleth rendering)
- d3-scale (color scales)

## Quick Start

### Prerequisites
- Node.js 18+
- Docker Desktop (must be running for PostgreSQL)
- npm 9+

> **Important**: Make sure Docker Desktop is running before starting the database.

### 1. Start the Database

```bash
# Start PostgreSQL in Docker
docker-compose up -d

# Wait for it to be ready
docker-compose logs -f postgres
# (Ctrl+C when you see "database system is ready")
```

### 2. Install Dependencies

```bash
npm install
```

### 3. Set Up the Database

The default configuration uses:
- PostgreSQL on port 5433 (to avoid conflicts with local PostgreSQL)
- Backend API on port 3001
- Frontend dev server on port 5173

You can override by creating a `.env` file in the `backend/` directory:

```bash
# backend/.env (optional - these are the defaults)
DATABASE_URL=postgresql://globe:globe_dev_password@localhost:5433/globe
PORT=3001
CRON_TZ=UTC
```

Run migrations and seed data:

```bash
# Run database migrations
npm run migrate

# Seed countries from World Bank
npm run seed

# Run initial data ingestion (fetches all indicators)
npm run ingest
```

### 4. Start Development Servers

```bash
# Start both backend and frontend
npm run dev

# Or start them separately:
npm run dev:backend   # Backend on http://localhost:3001
npm run dev:frontend  # Frontend on http://localhost:5173
```

### 5. Open the App

Visit http://localhost:5173 in your browser.

## API Endpoints

All endpoints are read-only (GET):

| Endpoint | Description |
|----------|-------------|
| `GET /api/countries` | List all countries with metadata |
| `GET /api/indicators/latest?type=exchange` | Latest exchange rates |
| `GET /api/indicators/latest?type=interest` | Latest interest rates |
| `GET /api/indicators/latest?type=inflation` | Latest inflation rates |
| `GET /api/meta/last-updated` | Ingestion timestamps and counts |
| `GET /api/health` | Health check |

## Data Sources

| Indicator | Source | Update Frequency |
|-----------|--------|------------------|
| Exchange Rates | [Open Exchange Rates API](https://open.er-api.com/) | Daily at 02:00 UTC |
| Interest Rates | [World Bank - FR.INR.RINR](https://data.worldbank.org/indicator/FR.INR.RINR) | Weekly (Sunday 03:00 UTC) |
| Inflation Rates | [World Bank - FP.CPI.TOTL.ZG](https://data.worldbank.org/indicator/FP.CPI.TOTL.ZG) | Monthly (1st at 04:00 UTC) |

## Database Schema

```sql
-- Countries table
countries (
  country_code CHAR(2) PRIMARY KEY,
  name TEXT NOT NULL,
  region TEXT,
  income_level TEXT,
  currency_code CHAR(3),
  created_at TIMESTAMPTZ,
  updated_at TIMESTAMPTZ
)

-- Indicator definitions
indicators (
  id UUID PRIMARY KEY,
  indicator_type TEXT CHECK (IN 'interest', 'inflation', 'exchange'),
  source TEXT NOT NULL,
  source_indicator_code TEXT,
  name TEXT NOT NULL,
  unit TEXT
)

-- Versioned indicator values
indicator_values (
  id UUID PRIMARY KEY,
  country_code CHAR(2) REFERENCES countries,
  indicator_id UUID REFERENCES indicators,
  effective_date DATE NOT NULL,
  value DOUBLE PRECISION NOT NULL,
  fetched_at TIMESTAMPTZ NOT NULL,
  data_version INT DEFAULT 1,
  UNIQUE (country_code, indicator_id, effective_date, data_version)
)

-- Ingestion audit log
ingestion_logs (
  id UUID PRIMARY KEY,
  job_name TEXT NOT NULL,
  status TEXT CHECK (IN 'success', 'failure', 'partial'),
  started_at TIMESTAMPTZ,
  finished_at TIMESTAMPTZ,
  items_inserted INT,
  items_updated INT,
  error_message TEXT
)
```

## Project Structure

```
globe/
├── backend/
│   ├── migrations/           # Database migrations
│   ├── src/
│   │   ├── cache/            # LRU response cache
│   │   ├── db/               # PostgreSQL pool
│   │   ├── jobs/             # Cron scheduler
│   │   ├── routes/           # API routes
│   │   ├── seed/             # Country seeder
│   │   ├── services/
│   │   │   └── ingestion/    # Data ingestion services
│   │   ├── config.ts
│   │   └── server.ts
│   └── package.json
├── frontend/
│   ├── public/
│   ├── src/
│   │   ├── api/              # Backend API client
│   │   ├── components/       # React components
│   │   ├── types/            # TypeScript declarations
│   │   ├── App.tsx
│   │   └── main.tsx
│   └── package.json
├── docker-compose.yml
├── package.json              # Workspace root
└── README.md
```

## Scripts Reference

| Script | Description |
|--------|-------------|
| `npm run dev` | Start both backend and frontend in dev mode |
| `npm run dev:backend` | Start backend only |
| `npm run dev:frontend` | Start frontend only |
| `npm run build` | Build both for production |
| `npm run migrate` | Run database migrations |
| `npm run seed` | Seed countries from World Bank |
| `npm run ingest` | Run all ingestion jobs once |
| `npm run setup` | Full setup (migrate + seed + ingest) |
| `npm run db:start` | Start PostgreSQL container |
| `npm run db:stop` | Stop PostgreSQL container |

## Production Deployment

For production:

1. Set proper environment variables
2. Use a managed PostgreSQL instance
3. Run `npm run build` for optimized builds
4. Serve frontend build with a CDN/static host
5. Run backend with `npm run start`

Cron jobs run automatically in the backend process.

## License

MIT

