# HAProxy WAF-integrering

Frågor att utreda innan implementation:

1. Hur körs HAProxy? (samma maskin, Docker, annan host?)
2. Används HAProxy med ModSecurity/WAF eller bara vanliga ACL-regler?
3. Finns loggning redan på plats? (t.ex. syslog till fil, JSON-endpoint)
4. Skulle en webhook-modell funka — HAProxy gör HTTP-anrop till ThreatFront
   vid blockerade requests, istället för att vi watchnar loggfiler?

Möjliga angreppssätt:
- **Webhook**: HAProxy `http-after-response` anropar `/api/haproxy/alert`
  med JSON. Enklast, ingen log-parsing.
- **Log watch**: `fs.watch` på HAProxy-loggen, parserar HTTP log-format.
  Kräver GeoIP-databas (MaxMind GeoLite2).
- **Stats poll**: Periodisk polling av HAProxy stats socket för att
  detektera blockerade requests.

Varje blockerade request skulle mappas till en AttackEvent i vårt
schema och broadcastas via WebSocket precis som simulatorn gör idag.
