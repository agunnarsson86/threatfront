# ThreatFront

A local cybersecurity threat dashboard with real attack simulation, SANS ISC threat intelligence, OpenSearch WAF integration, and RSS feed aggregation.

## Getting Started

### Development

```bash
npm install
npm run dev
```

Starts both the server (`localhost:3001`) and frontend (`localhost:5173`) concurrently.

### Docker (production)

```bash
docker compose up -d --build
```

Access the dashboard at `http://localhost:3001`.  
Set OpenSearch credentials via `.env` file (see `.env.example`).

## Features

- **Live Threat Map** — Leaflet-based world map with animated attack arcs. Real SANS ISC IPs mapped to attack types (SSH, DNS, DDoS, SQLi, etc.)
- **Threat Feed** — Real-time event log with lightning-bolt arrows, severity badges, and progressive fade-out
- **Stats Panel** — Top attacker countries, severity distribution, and SANS feed port analysis
- **RSS Feeds** — Add your own RSS/Atom feeds (saved in localStorage, auto-refresh every 5 min)
- **Event Simulator** — Generates 1-5 realistic attack events every 3 seconds using real threat IPs from SANS intelfeed
- **Events/h Counter** — Rolling 60-minute window showing live event throughput
- **Dual Mode** — Switch between SANS+simulator and live OpenSearch WAF data via FilterBar
- **Map Country Centering** — Auto-centers map on selected source/target country when filtering

## Architecture

```
threatfront/
├── server/               Express + better-sqlite3 + WebSocket
│   └── src/
│       ├── server.ts     REST API + WebSocket broadcast + mode switching
│       ├── db.ts         SQLite schema + queries
│       ├── simulator.ts  Event generator (SANS mode)
│       ├── opensearch.ts OpenSearch poller (WAF mode)
│       ├── threatfeed.ts SANS intelfeed fetcher (~108k IPs)
│       └── rss.ts        RSS/Atom feed parser
├── frontend/             React 18 + Vite + Tailwind
│   └── src/
│       ├── components/   Header, ThreatMap, ThreatFeed, StatsPanel, RssFeed, FilterBar
│       └── lib/data.ts   Data layer (local server via REST + shared WebSocket)
├── AGENTS.md             OpenCode instructions
└── NOTES.md              OpenSearch WAF integration plan
```

## Environment

| Variable | Default | Description |
|---|---|---|
| `PORT` | `3001` | Server port |
| `SIM_INTERVAL` | `3000` | Simulator interval (ms) |
| `SERVE_STATIC` | — | Set to `true` to serve frontend from Express (Docker) |
| `OPENSEARCH_URL` | `http://localhost:9200` | OpenSearch endpoint (WAF mode) |
| `OPENSEARCH_AUTH` | — | `user:pass` for OpenSearch basic auth |
| `OPENSEARCH_INDEX` | `haproxy-waf-*` | OpenSearch index pattern |
| `OPENSEARCH_POLL_INTERVAL` | `10000` | Poll interval (ms) |
| `VITE_API_URL` | `http://localhost:3001` | Frontend API target |
| `VITE_WS_URL` | `ws://localhost:3001` | Frontend WebSocket target |

## Data Sources

- **SANS ISC intelfeed** — Fetched at startup, refreshed every 15 min. Categories (`dshieldssh`, `openresolver`, `shodan`, etc.) mapped to attack types
- **Simulator** — Generates events with real SANS IPs + weighted country distribution
- **RSS** — Server-side proxy bypasses CORS for client-added RSS feeds

## API Endpoints

`GET /api/mode` — Current data source mode (`sans` / `opensearch`)  
`POST /api/mode` — Switch mode (`{"mode": "sans"}` / `{"mode": "opensearch"}`)  
`GET /api/counts`, `/api/events`, `/api/top-countries`, `/api/top-ports`  
`GET /api/attack-dist`, `/api/severity-dist`, `/api/feed-ports`  
`GET /api/countries`, `/api/target-countries`  
`POST /api/rss/fetch`, `POST /api/seed`

## Tech Stack

**Server**: Node.js, Express, better-sqlite3, WebSocket (ws), tsx
**Frontend**: React 18, Vite, Tailwind CSS, Leaflet, Recharts, Lucide icons

---

Built with OpenCode
