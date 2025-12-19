# World Economic Map

A free, production-grade single-page web application displaying a world choropleth map with 8 economic indicators and historical data charts (1960-2024).

## Features

- **8 Economic Indicators**: GDP per Capita, Inflation, Interest Rates, Unemployment, Government Debt, GINI Index, Life Expectancy, Exchange Rates
- **Interactive Choropleth Map**: Color-coded countries with hover tooltips
- **Historical Data Charts**: Click any country to view 60+ years of historical trends
- **Multi-indicator Overlay**: Compare multiple indicators on the same chart
- **Automatic Data Updates**: Cron-based ingestion from World Bank API

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
- Recharts (historical data charts)
- d3-scale (color scales)

## Quick Start (Local Development)

### Prerequisites
- Node.js 18+
- Docker Desktop (must be running for PostgreSQL)
- npm 9+

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

```bash
# Run database migrations
npm run migrate

# Seed countries from World Bank
npm run seed

# Run initial data ingestion (fetches latest indicators)
npm run ingest

# (Optional) Backfill historical data (~5-10 minutes)
npm run backfill
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

## Production Deployment (Railway)

### 1. Push to GitHub

```bash
# Create a new GitHub repository, then:
git remote add origin https://github.com/YOUR_USERNAME/globe.git
git push -u origin main
```

### 2. Deploy to Railway

1. Go to [railway.app](https://railway.app) and sign in with GitHub
2. Click **New Project** → **Deploy from GitHub repo**
3. Select your repository
4. Railway will auto-detect the config from `railway.json`

### 3. Add PostgreSQL Database

1. In Railway dashboard, click **+ New** → **Database** → **PostgreSQL**
2. Railway automatically injects `DATABASE_URL` into your service

### 4. Initialize the Database

After first deploy, run these commands via Railway CLI or dashboard shell:

```bash
# Run migrations
npm run migrate

# Seed countries
npm run seed

# (Optional) Backfill historical data
npm run backfill
```

### 5. Configure Custom Domain

1. Go to your service **Settings** → **Domains**
2. Click **Add Custom Domain**
3. Add the CNAME record to your DNS provider
4. Railway auto-provisions SSL

### Environment Variables

Railway auto-injects these, but you can customize:

| Variable | Default | Description |
|----------|---------|-------------|
| `DATABASE_URL` | (auto) | PostgreSQL connection string |
| `PORT` | (auto) | Server port |
| `NODE_ENV` | production | Environment mode |
| `CRON_TZ` | UTC | Timezone for cron jobs |

## API Endpoints

All endpoints are read-only (GET):

| Endpoint | Description |
|----------|-------------|
| `GET /api/countries` | List all countries with metadata |
| `GET /api/indicators/latest?type={type}` | Latest values for indicator type |
| `GET /api/history/:country_code` | Historical data for a country |
| `GET /api/meta/last-updated` | Ingestion timestamps and counts |
| `GET /api/health` | Health check |

**Indicator types:** `exchange`, `inflation`, `interest`, `gdp_per_capita`, `unemployment`, `government_debt`, `gini`, `life_expectancy`

## Data Sources

| Indicator | Source | Update Frequency |
|-----------|--------|------------------|
| Exchange Rates | [Open Exchange Rates API](https://open.er-api.com/) | Daily |
| Interest Rates | [World Bank - FR.INR.RINR](https://data.worldbank.org/indicator/FR.INR.RINR) | Weekly |
| Inflation Rates | [World Bank - FP.CPI.TOTL.ZG](https://data.worldbank.org/indicator/FP.CPI.TOTL.ZG) | Monthly |
| GDP per Capita | [World Bank - NY.GDP.PCAP.CD](https://data.worldbank.org/indicator/NY.GDP.PCAP.CD) | Monthly |
| Unemployment | [World Bank - SL.UEM.TOTL.ZS](https://data.worldbank.org/indicator/SL.UEM.TOTL.ZS) | Monthly |
| Government Debt | [World Bank - GC.DOD.TOTL.GD.ZS](https://data.worldbank.org/indicator/GC.DOD.TOTL.GD.ZS) | Monthly |
| GINI Index | [World Bank - SI.POV.GINI](https://data.worldbank.org/indicator/SI.POV.GINI) | Monthly |
| Life Expectancy | [World Bank - SP.DYN.LE00.IN](https://data.worldbank.org/indicator/SP.DYN.LE00.IN) | Monthly |

## Scripts Reference

| Script | Description |
|--------|-------------|
| `npm run dev` | Start both backend and frontend in dev mode |
| `npm run build` | Build both for production |
| `npm run start` | Start production server (runs migrations first) |
| `npm run migrate` | Run database migrations |
| `npm run seed` | Seed countries from World Bank |
| `npm run ingest` | Run all ingestion jobs once |
| `npm run backfill` | Backfill historical data (one-time) |
| `npm run setup` | Full setup (migrate + seed + ingest) |
| `npm run db:start` | Start PostgreSQL container |
| `npm run db:stop` | Stop PostgreSQL container |

## License

MIT
