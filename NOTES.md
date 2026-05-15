# HAProxy WAF-integrering

## Beslut (2026-05-15)

- **Hämta data från OpenSearch** (dit HAProxy-loggarna redan skickas) istället för att parsera loggfiler direkt.
- **Två lägen, antingen/eller**: SANS+simulator **eller** OpenSearch-pollning. Växlas i UI:t (FilterBar).
- **Rensa DB vid lägesbyte** — ingen historik sparas mellan lägen.
- **GeoIP**: OpenSearch-datan har redan GeoIP berikat. Fallback med `geoip-lite` om fält saknas.

## Plan – OpenSearch-pollare

### 1. `server/src/opensearch.ts` (ny fil)

- Pollar OpenSearch REST API var 10:e sekund
- Auth: Basic auth från `OPENSEARCH_AUTH` (user:pass)
- Range-fråga på `@timestamp` > senast sedda, sorterad ascending, `size: 100`
- Mappar OpenSearch-dokument → `AttackEvent`
- Broadcast via WebSocket (samma som simulatorn)
- Exporterar `start()` / `stop()`

### 2. `server/src/server.ts` — modifieringar

- `GET /api/mode` → `{ mode: 'sans' | 'opensearch' }`
- `POST /api/mode` → sätt läge, rensar DB, startar/stoppar rätt källa
- WebSocket broadcast `{ type: 'mode_changed', mode }`

### 3. Frontend — modifieringar

- **FilterBar**: Mode-toggle-knappar högst upp ("SANS ISC" / "WAF")
- **Header**: Dynamisk etikett ("SANS Live" / "WAF Live")
- Allt annat (ThreatFeed, ThreatMap, StatsPanel) oförändrat — dataflödet är identiskt

### 4. Miljövariabler

```
OPENSEARCH_URL=http://localhost:9200
OPENSEARCH_AUTH=admin:admin
OPENSEARCH_INDEX=haproxy-waf-*
OPENSEARCH_POLL_INTERVAL=10000
OPENSEARCH_FIELD_MAP={"timestamp":"@timestamp","source_ip":"client_ip",...}
```

### 5. Beroenden

- `geoip-lite` (i server, för GeoIP-fallback)
- Inga nya frontend-beroenden

---

## Fältmappning (ATT VÄNTA PÅ SAMPLE-DATA)

| AttackEvent | Gissat OpenSearch-fält | Status |
|---|---|---|
| `id` | `@id` eller auto-genererad UUID | ⏳ |
| `timestamp` | `@timestamp` | ⏳ |
| `source_ip` | `client_ip` | ⏳ |
| `source_country` | `geoip.country_iso_code` | ⏳ |
| `source_lat` | `geoip.location.lat` | ⏳ |
| `source_lon` | `geoip.location.lon` | ⏳ |
| `target_ip` | `server_ip` | ⏳ |
| `target_country` | `server_country` | ⏳ |
| `target_lat` | `server.geo.lat` | ⏳ |
| `target_lon` | `server.geo.lon` | ⏳ |
| `port` | `server_port` | ⏳ |
| `protocol` | `TCP` (default) | ⏳ |
| `attack_type` | `waf_rule_id` / `rule_id` | ⏳ |
| `severity` | `waf_severity` → low/med/high/critical | ⏳ |

När du har ett exempel på ett WAF-blockerat event från OpenSearch så uppdaterar vi mappningen och börjar implementera.
