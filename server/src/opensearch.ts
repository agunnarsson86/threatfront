import crypto from 'crypto'
import type { AttackEvent } from './simulator.js'

interface OpenSearchHit {
  _id: string
  _source: Record<string, any>
}

interface OpenSearchResponse {
  hits: {
    hits: OpenSearchHit[]
  }
}

const FIELD_MAP: Record<string, string> = {
  id: '@id',
  timestamp: '@timestamp',
  source_ip: 'client_ip',
  source_country: 'geoip.country_iso_code',
  source_lat: 'geoip.location.lat',
  source_lon: 'geoip.location.lon',
  target_ip: 'server_ip',
  target_country: 'server_country',
  target_lat: 'server.geo.lat',
  target_lon: 'server.geo.lon',
  port: 'server_port',
  protocol: 'protocol',
  attack_type: 'waf_rule_id',
  severity: 'waf_severity',
}

const SEVERITY_MAP: Record<string, 'low' | 'medium' | 'high' | 'critical'> = {
  '1': 'low', '2': 'medium', '3': 'high', '4': 'critical', '5': 'critical',
  low: 'low', medium: 'medium', high: 'high', critical: 'critical',
}

function getField(source: Record<string, any>, path: string): any {
  return path.split('.').reduce((o, k) => o?.[k], source)
}

function mapHit(hit: OpenSearchHit): AttackEvent | null {
  const s = hit._source
  try {
    let severity: 'low' | 'medium' | 'high' | 'critical' = 'medium'
    const rawSev = String(getField(s, FIELD_MAP.severity) ?? '')
    if (rawSev) severity = SEVERITY_MAP[rawSev.toLowerCase()] ?? 'medium'

    const lat = parseFloat(getField(s, FIELD_MAP.source_lat)) || 0
    const lon = parseFloat(getField(s, FIELD_MAP.source_lon)) || 0

    return {
      id: hit._id || crypto.randomUUID(),
      timestamp: getField(s, FIELD_MAP.timestamp) || new Date().toISOString(),
      source_ip: String(getField(s, FIELD_MAP.source_ip) ?? ''),
      source_country: String(getField(s, FIELD_MAP.source_country) ?? 'UN'),
      source_lat: lat,
      source_lon: lon,
      target_ip: String(getField(s, FIELD_MAP.target_ip) ?? ''),
      target_country: String(getField(s, FIELD_MAP.target_country) ?? 'UN'),
      target_lat: parseFloat(getField(s, FIELD_MAP.target_lat)) || 0,
      target_lon: parseFloat(getField(s, FIELD_MAP.target_lon)) || 0,
      port: parseInt(getField(s, FIELD_MAP.port)) || 0,
      protocol: String(getField(s, FIELD_MAP.protocol) || 'TCP'),
      attack_type: String(getField(s, FIELD_MAP.attack_type) ?? 'unknown'),
      severity,
    }
  } catch {
    return null
  }
}

const OPENSEARCH_URL = process.env.OPENSEARCH_URL || 'http://localhost:9200'
const OPENSEARCH_AUTH = process.env.OPENSEARCH_AUTH || ''
const OPENSEARCH_INDEX = process.env.OPENSEARCH_INDEX || 'haproxy-waf-*'
const POLL_INTERVAL = parseInt(process.env.OPENSEARCH_POLL_INTERVAL || '10000', 10)

let timer: ReturnType<typeof setInterval> | null = null
let lastTimestamp: string | null = null

function buildQuery(): any {
  const range: any = { '@timestamp': { order: 'asc' } }
  if (lastTimestamp) range['@timestamp'].gte = lastTimestamp
  return {
    size: 100,
    sort: [{ '@timestamp': 'asc' }],
    query: { bool: { filter: [{ range }] } },
  }
}

async function poll(callback: (events: AttackEvent[]) => void) {
  try {
    const headers: Record<string, string> = { 'Content-Type': 'application/json' }
    if (OPENSEARCH_AUTH) {
      headers['Authorization'] = `Basic ${Buffer.from(OPENSEARCH_AUTH).toString('base64')}`
    }
    const res = await fetch(`${OPENSEARCH_URL}/${OPENSEARCH_INDEX}/_search`, {
      method: 'POST',
      headers,
      body: JSON.stringify(buildQuery()),
    })
    if (!res.ok) {
      console.error(`[opensearch] HTTP ${res.status}`)
      return
    }
    const data: OpenSearchResponse = await res.json()
    const hits = data.hits?.hits ?? []
    if (hits.length === 0) return

    const events: AttackEvent[] = []
    for (const hit of hits) {
      const e = mapHit(hit)
      if (e) events.push(e)
    }
    if (events.length > 0) {
      lastTimestamp = events[events.length - 1].timestamp
      callback(events)
    }
  } catch (err: any) {
    console.error(`[opensearch] ${err.message}`)
  }
}

export function start(callback: (events: AttackEvent[]) => void) {
  if (timer) return
  console.log('[opensearch] Starting poller')
  poll(callback)
  timer = setInterval(() => poll(callback), POLL_INTERVAL)
}

export function stop() {
  if (timer) {
    clearInterval(timer)
    timer = null
  }
  lastTimestamp = null
  console.log('[opensearch] Stopped poller')
}
