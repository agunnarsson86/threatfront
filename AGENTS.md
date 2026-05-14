# ThreatFront

## Dev commands

| command | what |
|---|---|
| `npm run dev` | start server + frontend concurrently |
| `npm run dev:server` | server only (tsx watch on `server/src/server.ts`) |
| `npm run dev:frontend` | frontend only (vite) |
| `npm run test:run` | vitest (frontend) |
| `npm run build` | `tsc -b && vite build` (frontend only, for GitHub Pages deploy) |

## Architecture

- **Monorepo** with `frontend/` (React 18 + Vite + Tailwind) and `server/` (Express + better-sqlite3 + WebSocket).
- Root `package.json` orchestrates both via `concurrently`.
- **Data layer**: `frontend/src/lib/data.ts` connects to local server at `localhost:3001` via REST + WebSocket.

## Server (`server/src/`)

- **Entry**: `server.ts` — Express on `:3001`, auto-creates SQLite DB in `server/data/`.
- **Schema** auto-created in `db.ts` with indexes on `timestamp`, `severity`, `source_country`, `attack_type`.
- **SANS intelfeed** (`threatfeed.ts`): fetches `https://isc.sans.edu/api/intelfeed?json` at startup (~108k entries), refreshes every 15 min. Category-to-attack mapping: `dshieldssh`→SSH(22), `openresolver`→DNS(53), `shodan`→PortScan(22), `talos`/`booter`→DDoS(443), `rdp`→RDP(3389), `miner`→Malware(8080), `mysql`→SQLi(3306), etc.
- **Simulator** (`simulator.ts`): generates 1-5 events every 3 s using real SANS IPs + mapped attack types. Source countries weighted: CN/RU/US/KP/IR/BR/IN/VN/NG. Target countries weighted: SE/US/DE/GB/JP/FR/AU/CA/NL/SG. Seeded with 200 historical events on first start.
- **REST endpoints**: `/api/counts`, `/api/events`, `/api/top-countries`, `/api/top-ports`, `/api/attack-dist`, `/api/severity-dist`, `/api/feed-ports`, `/api/seed`, `/api/countries`, `/api/target-countries`, `/api/top-exploits`.
- **`/api/events`** accepts optional query params: `severity`, `attack_type`, `source_country`, `target_country`.
- **WebSocket** broadcasts `{ type: 'new_event', event }` for each simulated event.
- **WebSocket** broadcasts `{ type: 'new_event', event }` for each simulated event.
- **Events are deduplicated by `id`** on the frontend (WebSocket can deliver same event via REST + WS).

## Frontend (`frontend/src/`)

- **App layout**: Header → main-area with absolute-positioned map wrapper + panel overlay. `panel-overlay` uses `z-index: 10` to stack above Leaflet tiles.
- **ThreatMap**: Leaflet with CartoDB dark tiles. Must import `leaflet/dist/leaflet.css` (component-level). Calls `map.invalidateSize()` on mount via timeout. Uses canvas-based ArcLayer (arcs with 30s hold + 20s fade = 50s total, matching ThreatFeed item lifetime). ArcLayer removes stale arcs from canvas when events are cleared by filter changes. Only WebSocket events add arcs (no historical burst).
- **ThreatFeed**: max 20 items, newest first, first item always full opacity, older items fade out after 30s, fully gone at 50s. Filtered via `matchesFilters()` both on REST load and on each incoming WebSocket event.
- **FilterBar**: Severity always visible as quick-filter buttons. Gear icon opens advanced filters menu (Attack Type, Source Country, Target Country). Gear highlights cyan when advanced filters are active.
- **StatsPanel**: Top Countries, Severity distribution, SANS Feed Ports (from `/api/feed-ports`). Removed simulated top ports. Reloads all data on each new event.
- **RssFeed**: Gear icon opens inline settings menu to add/remove feeds. All items from all feeds flattened into one list sorted by pubDate, with source column on the right. Stored in localStorage.
- **Header**: rolling events/h counter (timestamps kept in a ref, filtered every 1s).
- **WebSocket**: auto-reconnects with 2s delay. Cleanup always closes the socket (regardless of `readyState`) and nulls `onclose` to prevent reconnection.

## Gotchas

- **React StrictMode** double-invokes effects in dev (WebSocket close warning is harmless; fixed by only closing on `OPEN`).
- **Node.js**: v22.22.3 LTS (via nvm).
- **`.gitignore`** ignores `server/data/` (SQLite DB files). DB auto-recreated on server start if missing.
- **Leaflet CSS** must be imported at component level (in `ThreatMap.tsx`), not in `main.tsx`.
