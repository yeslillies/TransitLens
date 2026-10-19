# TransitLens

[![CI](https://github.com/yeslillies/transitlens/actions/workflows/ci.yml/badge.svg)](https://github.com/yeslillies/transitlens/actions/workflows/ci.yml)

Tracks delays of Berlin U-Bahn and S-Bahn trains using live data from the BVG API, stores them in SQLite and shows them in a web dashboard.

The app was built as a team project for a database class at HTW Berlin.

## What it does

- A Python job calls the BVG REST API every few minutes for 7 big stations (Alexanderplatz, Hauptbahnhof, Ostkreuz, Warschauer Str., Zoo, Gesundbrunnen, Südkreuz).
- Every departure is saved with planned time, real time and delay.
- A Node.js/Express API calculates statistics: average delay, punctuality per line, delay by hour, delay distribution, most delayed stations.
- A web dashboard shows the results, with different views per user role.

## Architecture

```
BVG REST API ──> importer (main.py, every 5 min) ──> SQLite volume <── api (Express, serves frontend) <── browser
```

## Tech stack

- **Data pipeline:** Python, requests, cron
- **Database:** SQLite (6 tables: Linie, Station, Linie_Station, Fahrt, Abfahrt, API_Abruf)
- **Backend:** Node.js, Express
- **Frontend:** HTML, CSS, JavaScript
- **DevOps:** Docker, Docker Compose, GitHub Actions

## Run with Docker (recommended)

```bash
docker compose up -d --build
```

Then open http://localhost:3000.

This starts two containers that share one SQLite volume:

- **importer** creates the tables and imports new departures from the BVG API every 5 minutes (`IMPORT_INTERVAL`, in seconds)
- **api** runs the Express API and serves the frontend, with a Docker health check on `/api/health`

Useful commands:

```bash
docker compose ps              # status + health
docker compose logs -f importer
docker compose down            # stop (data stays in the volume)
```

## Run without Docker

Requirements: Python 3.10+, Node.js 20+

```bash
pip install -r requirements.txt
python3 init_db.py
python3 main.py            # import once (or use the cronjob below)

cd backend
npm install
node server.js             # http://localhost:3000
```

Cronjob that imports new data every 5 minutes:

```
*/5 * * * * cd /path/to/TransitLens && python3 main.py >> cron.log 2>&1
```

Config via environment variables: `PORT` (default 3000), `DB_PATH` (default `transport.db`), `FRONTEND_DIR`.

The Analyzer role uses a demo login (`test` / `test`). It is checked in the browser only, so it is not real security.

## API endpoints

| Endpoint | Returns |
| --- | --- |
| `GET /api/health` | Status + time of the last successful import |
| `GET /api/dashboard` | Average delay, most delayed line, busiest station, peak hour |
| `GET /api/lines` | Top 10 most delayed lines |
| `GET /api/stations` | Top 10 most delayed stations |
| `GET /api/allstations` | All tracked stations |
| `GET /api/station/:id` | Latest departures of one station |
| `GET /api/station/:id/trend` | 7-day delay trend of one station |
| `GET /api/delay-by-hour` | Average delay per hour |
| `GET /api/delay-distribution` | Share of departures per delay category |
| `GET /api/line-ranking` | Punctuality ranking (`?period=today/week/month/all`, `?type=subway/suburban`) |
| `GET /api/mode-stats` | U-Bahn vs S-Bahn punctuality |
| `GET /api/line-hour-stats` | Punctuality of one line at one hour (`?line=U2&hour=8`) |

Most endpoints accept `?date=YYYY-MM-DD&time=HH:MM`. Without a date they show the last 24 hours.

## CI pipeline

Every push to `main` runs `.github/workflows/ci.yml`:

1. **Python:** syntax check + creates the database and checks all 6 tables exist
2. **API:** starts the server on an empty database and calls every main endpoint
3. **Docker:** builds both images (only if 1 and 2 pass)

## Results (15 June – 12 July 2026)

About 44,700 departures collected. U-Bahn punctuality (delay ≤ 1 min): 82.5%, S-Bahn: 67.4%.

## Roadmap

- [x] Docker setup (API + import job with docker compose)
- [x] GitHub Actions CI pipeline (Python check, API smoke test, Docker build)
- [ ] Automatic deployment from GitHub Actions
- [ ] Deployment on AWS EC2 with a public demo
- [ ] Retry logic when the BVG API fails
