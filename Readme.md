# ThreatFront

A local cybersecurity threat dashboard with real attack simulation, SANS ISC threat intelligence, and RSS feed aggregation.

## Getting Started

```bash
npm install
npm run dev
```

This starts both the server (`localhost:3001`) and frontend (`localhost:5173`) concurrently.

## Features

- **Live Threat Map** — Leaflet-based world map with animated attack arcs. Real SANS ISC IPs mapped to attack types (SSH, DNS, DDoS, SQLi, etc.)
- **Threat Feed** — Real-time event log with lightning-bolt arrows, severity badges, and progressive fade-out
- **Stats Panel** — Top attacker countries, severity distribution, and SANS feed port analysis
- **RSS Feeds** — Add your own RSS/Atom feeds (saved in localStorage, auto-refresh every 5 min)
- **Event Simulator** — Generates 1-5 realistic attack events every 3 seconds using real threat IPs from SANS intelfeed
- **Events/h Counter** — Rolling 60-minute window showing live event throughput

## Architecture

```
threatfront/
├── server/               Express + better-sqlite3 + WebSocket
│   └── src/
│       ├── server.ts     REST API + WebSocket broadcast
│       ├── db.ts         SQLite schema + queries
│       ├── simulator.ts  Event generator
│       ├── threatfeed.ts SANS intelfeed fetcher (~108k IPs)
│       └── rss.ts        RSS/Atom feed parser
├── frontend/             React 18 + Vite + Tailwind
│   └── src/
│       ├── components/   Header, ThreatMap, ThreatFeed, StatsPanel, RssFeed
│       └── lib/data.ts   Data layer (local server via REST)
├── AGENTS.md             OpenCode instructions
└── NOTES.md              Integration ideas (HAProxy WAF, etc.)
```

## Environment

| Variable | Default | Description |
|---|---|---|
| `VITE_API_URL` | `http://localhost:3001` | Local server URL |
| `VITE_WS_URL` | `ws://localhost:3001` | WebSocket URL |

## Data Sources

- **SANS ISC intelfeed** — Fetched at startup, refreshed every 15 min. Categories (`dshieldssh`, `openresolver`, `shodan`, etc.) mapped to attack types
- **Simulator** — Generates events with real SANS IPs + weighted country distribution
- **RSS** — Server-side proxy bypasses CORS for client-added RSS feeds

## API Endpoints

`GET /api/counts`, `/api/events`, `/api/top-countries`, `/api/top-ports`, `/api/attack-dist`, `/api/severity-dist`, `/api/feed-ports`, `POST /api/rss/fetch`, `POST /api/seed`

## Tech Stack

**Server**: Node.js, Express, better-sqlite3, WebSocket (ws), tsx
**Frontend**: React 18, Vite, Tailwind CSS, Leaflet, Recharts, Lucide icons

---

Built with OpenCode
