# Plan – OpenSearch WAF-integration

## Beslut

- Hämta blockerade WAF-events från **OpenSearch** (dit HAProxy-loggarna redan skickas)
- **Två lägen, antingen/eller**: SANS+simulator **eller** OpenSearch-pollning
- Väljs i UI:t (FilterBar-panelen)
- **Rensa DB vid lägesbyte** — ingen historik sparas mellan lägen
- OpenSearch-datan har redan GeoIP berikat; fallback med `geoip-lite` om fält saknas

## Implementation

### 1. `server/src/opensearch.ts` (ny fil)

- Pollar OpenSearch REST API var 10:e sekund (`setInterval`)
- Basic auth via `OPENSEARCH_AUTH` (user:pass)
- Range query på `@timestamp` > senast sedda, `sort: [{"@timestamp": "asc"}]`, `size: 100`
- Mappar dokument → `AttackEvent` enligt fältmappning (se tabell nedan)
- Broadcastar via WebSocket precis som simulatorn
- Exporterar `start()` / `stop()`

### 2. `server/src/server.ts` — modifieringar

- `GET /api/mode` → `{ mode: 'sans' | 'opensearch' }`
- `POST /api/mode` → sätt läge:
  1. Stoppa aktiv källa (simulatorns `setInterval` / OpenSearch-poller)
  2. Rensa `events`-tabellen
  3. Starta ny källa
  4. Broadcast `{ type: 'mode_changed', mode }` via WebSocket

### 3. Frontend — modifieringar

- **FilterBar**: Mode-toggle med två knappar längst upp
- **Header**: Dynamisk etikett ("SANS Live" / "WAF Live")

### 4. Miljövariabler

```
OPENSEARCH_URL=http://localhost:9200
OPENSEARCH_AUTH=admin:admin
OPENSEARCH_INDEX=haproxy-waf-*
OPENSEARCH_POLL_INTERVAL=10000
OPENSEARCH_FIELD_MAP=<JSON med fältmappning>
```

### 5. Beroenden (server)

- `geoip-lite` + `@types/geoip-lite`

---

## Fältmappning (ATT VÄNTA PÅ SAMPLE-DATA)

| AttackEvent | Gissat OpenSearch-fält |
|---|---|
| `id` | `@id` eller auto-genererad UUID |
| `timestamp` | `@timestamp` |
| `source_ip` | `client_ip` |
| `source_country` | `geoip.country_iso_code` |
| `source_lat` | `geoip.location.lat` |
| `source_lon` | `geoip.location.lon` |
| `target_ip` | `server_ip` |
| `target_country` | `server_country` |
| `target_lat` | `server.geo.lat` |
| `target_lon` | `server.geo.lon` |
| `port` | `server_port` |
| `protocol` | `TCP` (default) |
| `attack_type` | `waf_rule_id` / `rule_id` |
| `severity` | `waf_severity` → low/med/high/critical |

När du har ett exempel på ett WAF-blockerat event från OpenSearch så uppdaterar vi mappningen och implementerar.
