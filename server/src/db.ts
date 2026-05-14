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

export function getEvents(limit: number = 50) {
  const db = getDb()
  return db.prepare('select * from events order by timestamp desc limit ?').all(limit)
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

export function getTopPorts() {
  const db = getDb()
  return db.prepare('select port, count(*) as count from events group by port order by count desc limit 10').all()
}

export function getAttackDistribution() {
  const db = getDb()
  return db.prepare('select attack_type, count(*) as count from events group by attack_type order by count desc').all()
}

export function getSeverityDistribution() {
  const db = getDb()
  return db.prepare('select severity, count(*) as count from events group by severity order by count desc').all()
}
