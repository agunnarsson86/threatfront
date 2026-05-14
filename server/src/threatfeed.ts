import type { AttackDef } from './simulator.js'

const INTELFEED_URL = 'https://isc.sans.edu/api/intelfeed?json'
const REFRESH_INTERVAL = 15 * 60 * 1000

interface FeedEntry {
  ip: string
  categories: string[]
}

let entries: FeedEntry[] = []
let lastFetch = 0

const CATEGORY_MAP: Record<string, AttackDef> = {
  dshieldssh: { name: 'SSH Brute Force', port: 22, protocol: 'TCP', severity: 'high' },
  shodan: { name: 'Port Scan', port: 22, protocol: 'TCP', severity: 'low' },
  openresolver: { name: 'DNS Tunneling', port: 53, protocol: 'UDP', severity: 'medium' },
  miner: { name: 'Malware Delivery', port: 8080, protocol: 'HTTP', severity: 'high' },
  mastodon: { name: 'Web Exploit', port: 443, protocol: 'HTTPS', severity: 'medium' },
  talos: { name: 'DDoS', port: 443, protocol: 'HTTPS', severity: 'critical' },
  booter: { name: 'DDoS', port: 443, protocol: 'HTTPS', severity: 'critical' },
  rdp: { name: 'RDP Brute Force', port: 3389, protocol: 'TCP', severity: 'medium' },
  ssh: { name: 'SSH Brute Force', port: 22, protocol: 'TCP', severity: 'high' },
  telnet: { name: 'Port Scan', port: 23, protocol: 'TCP', severity: 'medium' },
  http: { name: 'Web Exploit', port: 80, protocol: 'HTTP', severity: 'medium' },
  https: { name: 'Web Exploit', port: 443, protocol: 'HTTPS', severity: 'medium' },
  mysql: { name: 'SQL Injection', port: 3306, protocol: 'TCP', severity: 'critical' },
}

function parseCategories(description: string): string[] {
  return description.split(',').map((s) => s.trim().toLowerCase()).filter(Boolean)
}

function mapCategoryToAttack(categories: string[]): AttackDef | null {
  for (const cat of categories) {
    const attack = CATEGORY_MAP[cat]
    if (attack) return attack
  }
  return null
}

async function fetchFeed(): Promise<FeedEntry[]> {
  try {
    const res = await fetch(INTELFEED_URL, {
      headers: { 'User-Agent': 'threatfront-local/1.0 (dev) contact@example.com' },
    })
    if (!res.ok) throw new Error(`HTTP ${res.status}`)
    const data: { ip: string; description: string }[] = await res.json()
    return data.map((item) => ({
      ip: item.ip,
      categories: parseCategories(item.description),
    }))
  } catch (err) {
    console.warn(`[threatfeed] Fetch failed: ${err}`)
    return []
  }
}

export async function ensureFeed(): Promise<void> {
  if (entries.length > 0) return
  entries = await fetchFeed()
  lastFetch = Date.now()
  console.log(`[threatfeed] Loaded ${entries.length} entries`)
}

export function getRandomIp(): string | null {
  if (entries.length === 0) return null
  return entries[Math.floor(Math.random() * entries.length)].ip
}

export function getRandomThreat(): { ip: string; attack: AttackDef } | null {
  if (entries.length === 0) return null
  const entry = entries[Math.floor(Math.random() * entries.length)]
  const attack = mapCategoryToAttack(entry.categories) ?? {
    name: 'Port Scan',
    port: 22,
    protocol: 'TCP',
    severity: 'low',
  }
  return { ip: entry.ip, attack }
}

export function getFeedPorts(): { port: number; count: number; label: string }[] {
  const portCounts: Record<number, number> = {}
  for (const entry of entries) {
    const attack = mapCategoryToAttack(entry.categories)
    const port = attack?.port ?? 22
    portCounts[port] = (portCounts[port] || 0) + 1
  }
  return Object.entries(portCounts)
    .map(([port, count]) => ({ port: Number(port), count, label: `:${port}` }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 10)
}

export function startFeedRefresh(): void {
  setInterval(async () => {
    const fresh = await fetchFeed()
    if (fresh.length > 0) {
      entries = fresh
      lastFetch = Date.now()
      console.log(`[threatfeed] Refreshed: ${entries.length} entries`)
    }
  }, REFRESH_INTERVAL)
}

export function getFeedStats(): { count: number; lastFetch: number } {
  return { count: entries.length, lastFetch }
}
