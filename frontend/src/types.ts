export interface AttackEvent {
  id: string
  timestamp: string
  source_ip: string
  source_country: string
  source_lat: number
  source_lon: number
  target_ip: string
  target_country: string
  target_lat: number
  target_lon: number
  port: number
  protocol: string
  attack_type: string
  severity: 'low' | 'medium' | 'high' | 'critical'
}

export interface TopCountry {
  source_country: string
  count: number
}

export interface TopPort {
  port: number
  count: number
}

export interface AttackDistribution {
  attack_type: string
  count: number
}

export interface Exploit {
  attack_type: string
  count: number
  cve_id: string
  name: string
}

export interface SeverityDistribution {
  severity: string
  count: number
}

export interface FeedPort {
  port: number
  count: number
  label: string
}

export interface EventCounts {
  total: number
  last_24h: number
  last_hour: number
}

export interface RssItem {
  title: string
  link: string
  pubDate: string
  description: string
}

export interface RssResult {
  title: string
  items: RssItem[]
}

export interface Filters {
  severity: string
  source_country: string
  attack_type: string
  target_country: string
}

export type Mode = 'sans' | 'opensearch'

export const COUNTRY_FLAGS: Record<string, string> = {
  CN: '🇨🇳', RU: '🇷🇺', US: '🇺🇸', KP: '🇰🇵', IR: '🇮🇷',
  BR: '🇧🇷', IN: '🇮🇳', VN: '🇻🇳', NG: '🇳🇬', SE: '🇸🇪',
}

export const SEVERITY_CONFIG: Record<string, { label: string; color: string; bg: string }> = {
  critical: { label: 'CRIT', color: '#ff0044', bg: 'rgba(255,0,68,0.15)' },
  high: { label: 'HIGH', color: '#ff4400', bg: 'rgba(255,68,0,0.15)' },
  medium: { label: 'MED', color: '#ffe600', bg: 'rgba(255,230,0,0.10)' },
  low: { label: 'LOW', color: '#00f7ff', bg: 'rgba(0,247,255,0.10)' },
}

export const SEVERITY_COLORS: Record<string, string> = {
  critical: '#ff0033',
  high: '#ff6600',
  medium: '#ffcc00',
  low: '#00d4ff',
}
