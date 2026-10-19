# TransitLens

Tracks delays of Berlin U-Bahn and S-Bahn trains using live data from the BVG API, stores them in SQLite and shows them in a web dashboard.

Built as a team project for the Databases course (CE29) at HTW Berlin.

## What it does

- A Python job calls the BVG REST API every few minutes for 7 big stations (Alexanderplatz, Hauptbahnhof, Ostkreuz, Warschauer Str., Zoo, Gesundbrunnen, Südkreuz).
- Every departure is saved with planned time, real time and delay.
- A Node.js/Express API calculates statistics: average delay, punctuality per line, delay by hour, delay distribution, most delayed stations.
- A web dashboard shows the results, with different views per user role.

## Architecture

```
BVG REST API ──> main.py (cronjob) ──> SQLite (transport.db) <── server.js (Express API) <── frontend (HTML/JS)
```

## Tech stack

- **Data pipeline:** Python, requests, cron
- **Database:** SQLite (6 tables: Linie, Station, Linie_Station, Fahrt, Abfahrt, API_Abruf)
- **Backend:** Node.js, Express
- **Frontend:** HTML, CSS, JavaScript

## Run it locally

Requirements: Python 3.10+, Node.js 20+

```bash
# 1. Create the database
pip install -r requirements.txt
python3 init_db.py

# 2. Import live departures (run it a few times, or set up the cronjob below)
python3 main.py

# 3. Start the API (http://localhost:3000)
cd backend
npm install
node server.js

# 4. Open frontend/index.html in the browser
```

The Analyzer role uses a demo login (`test` / `test`). It is checked in the browser only, so it is not real security.

Cronjob that imports new data every 5 minutes:

```
*/5 * * * * cd /path/to/TransitLens && python3 main.py >> cron.log 2>&1
```

Config via environment variables: `PORT` (default 3000) and `DB_PATH` (default `transport.db`).

## API endpoints

| Endpoint | Returns |
| --- | --- |
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

## Results (15 June – 12 July 2026)

About 44,700 departures collected. U-Bahn punctuality (delay ≤ 1 min): 82.5%, S-Bahn: 67.4%.

## Roadmap

- [ ] Docker setup (API + import job with docker compose)
- [ ] GitHub Actions CI/CD pipeline (test, build, deploy)
- [ ] Deployment on AWS EC2 with a public demo
- [ ] Retry logic when the BVG API fails
