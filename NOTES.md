# Plan – OpenSearch WAF-integration

## Status

All infrastruktur är implementerad. Det enda som återstår är att validera fältmappningen mot verklig WAF-data.

### Redan klart

- `server/src/opensearch.ts` — Pollar OpenSearch REST API var 10:e sek, mappar fält → `AttackEvent`, broadcast via WebSocket
- `server/src/server.ts` — `GET/POST /api/mode`, lägesväxling (stoppar källa → rensar DB → startar ny)
- `frontend` — Mode-toggle i FilterBar (SANS / WAF), dynamisk etikett i Header ("SANS Live" / "WAF Live")
- `.env.example` + `docker-compose.yml` — Miljövariabler för OpenSearch

### Återstår (kräver sample-data)

Uppdatera fältmappningen i `server/src/opensearch.ts` (rad 15–29) när du har ett exempel på ett WAF-blockerat event från OpenSearch.

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

När du har sample-data: uppdatera `FIELD_MAP` i `server/src/opensearch.ts` och testa med `POST /api/mode {"mode": "opensearch"}`.
