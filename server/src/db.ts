import Database from 'better-sqlite3'
import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const DB_PATH = process.env.DB_PATH || path.join(__dirname, '..', 'data', 'threatfront.db')

let db: Database.Database

export function getDb(): Database.Database {
  if (!db) {
    const dir = path.dirname(DB_PATH)
    fs.mkdirSync(dir, { recursive: true })
    db = new Database(DB_PATH)
    db.pragma('journal_mode = WAL')
    initSchema(db)
  }
  return db
}

function initSchema(db: Database.Database) {
  db.exec(`
    create table if not exists events (
      id text primary key,
      timestamp text not null,
      source_ip text not null,
      source_country text not null,
      source_lat real not null,
      source_lon real not null,
      target_ip text not null,
      target_country text not null,
      target_lat real not null,
      target_lon real not null,
      port integer not null,
      protocol text not null,
      attack_type text not null,
      severity text not null check (severity in ('low', 'medium', 'high', 'critical'))
    );

    create index if not exists idx_events_timestamp on events (timestamp desc);
    create index if not exists idx_events_severity on events (severity);
    create index if not exists idx_events_source_country on events (source_country);
    create index if not exists idx_events_attack_type on events (attack_type);
  `)
}

export function close() {
  if (db) {
    db.close()
  }
}

export interface EventCounts {
  total: number
  last_24h: number
  last_hour: number
}

export function getEventCounts(): EventCounts {
  const db = getDb()
  const row = db.prepare(`
    select
      count(*) as total,
      sum(case when timestamp > datetime('now', '-24 hours') then 1 else 0 end) as last_24h,
      sum(case when timestamp > datetime('now', '-1 hour') then 1 else 0 end) as last_hour
    from events
  `).get() as any
  return { total: row.total, last_24h: row.last_24h, last_hour: row.last_hour }
}

export function getEvents(limit: number = 50, filters?: { severity?: string; attack_type?: string; source_country?: string }) {
  const db = getDb()
  let sql = 'select * from events where 1=1'
  const params: any[] = []
  if (filters?.severity && filters.severity !== 'all') {
    sql += ' and severity = ?'
    params.push(filters.severity)
  }
  if (filters?.attack_type && filters.attack_type !== 'all') {
    sql += ' and attack_type = ?'
    params.push(filters.attack_type)
  }
  if (filters?.source_country && filters.source_country !== 'all') {
    sql += ' and source_country = ?'
    params.push(filters.source_country)
  }
  sql += ' order by timestamp desc limit ?'
  params.push(limit)
  return db.prepare(sql).all(...params)
}

export function insertEvent(event: any) {
  const db = getDb()
  db.prepare(`
    insert into events (id, timestamp, source_ip, source_country, source_lat, source_lon, target_ip, target_country, target_lat, target_lon, port, protocol, attack_type, severity)
    values (@id, @timestamp, @source_ip, @source_country, @source_lat, @source_lon, @target_ip, @target_country, @target_lat, @target_lon, @port, @protocol, @attack_type, @severity)
  `).run(event)
}

export function getTopCountries() {
  const db = getDb()
  return db.prepare('select source_country, count(*) as count from events group by source_country order by count desc limit 10').all()
}

export function getDistinctCountries() {
  const db = getDb()
  return db.prepare('select distinct source_country from events order by source_country').all() as { source_country: string }[]
}

export function getTopPorts() {
  const db = getDb()
  return db.prepare('select port, count(*) as count from events group by port order by count desc limit 10').all()
}

export function getAttackDistribution() {
  const db = getDb()
  return db.prepare('select attack_type, count(*) as count from events group by attack_type order by count desc').all()
}

const CVE_MAP: Record<string, { cve_id: string; name: string }> = {
  'SSH Brute Force': { cve_id: 'CVE-2024-6387', name: 'regreSSHion OpenSSH RCE' },
  'Port Scan': { cve_id: 'CVE-2024-25153', name: 'Mass Port Scanner Activity' },
  'Web Exploit': { cve_id: 'CVE-2024-4577', name: 'PHP CGI Argument Injection' },
  'DDoS': { cve_id: 'CVE-2024-27198', name: 'DDoS Reflection Amplification' },
  'SQL Injection': { cve_id: 'CVE-2023-3464', name: 'SQLi in Enterprise Apps' },
  'Malware Delivery': { cve_id: 'CVE-2024-3400', name: 'Malware Payload Delivery' },
  'RDP Brute Force': { cve_id: 'CVE-2024-38077', name: 'RDP Remote Code Execution' },
  'DNS Tunneling': { cve_id: 'CVE-2023-50387', name: 'DNS KeyTrap Vulnerability' },
}

export interface TopExploit {
  attack_type: string
  count: number
  cve_id: string
  name: string
}

export function getTopExploits(): TopExploit[] {
  const db = getDb()
  const rows = db.prepare('select attack_type, count(*) as count from events group by attack_type order by count desc').all() as { attack_type: string; count: number }[]
  return rows.map((r) => {
    const cve = CVE_MAP[r.attack_type] || { cve_id: 'N/A', name: r.attack_type }
    return { attack_type: r.attack_type, count: r.count, cve_id: cve.cve_id, name: cve.name }
  }).sort((a, b) => b.count - a.count)
}

export function getSeverityDistribution() {
  const db = getDb()
  return db.prepare('select severity, count(*) as count from events group by severity order by count desc').all()
}
