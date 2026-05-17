import path from 'path'
import { fileURLToPath } from 'url'
import express from 'express'
import cors from 'cors'
import http from 'http'
import { WebSocketServer, WebSocket } from 'ws'
import { getDb, getEventCounts, getEvents, getTopCountries, getTopPorts, getAttackDistribution, getSeverityDistribution, getTopExploits, getDistinctCountries, getDistinctTargetCountries, insertEvent, close, clearEvents } from './db.js'
import { generateBatch, generateHistorical } from './simulator.js'
import type { AttackEvent } from './simulator.js'
import { getRandomThreat, getFeedPorts, ensureFeed, startFeedRefresh } from './threatfeed.js'
import { fetchRss } from './rss.js'
import * as opensearch from './opensearch.js'

function safeInt(val: string | undefined, def: number): number {
  const n = parseInt(val || '', 10)
  return isNaN(n) ? def : n
}

const PORT = safeInt(process.env.PORT, 3001)
const SIM_INTERVAL = safeInt(process.env.SIM_INTERVAL, 3000)

const app = express()
app.use(cors())
app.use(express.json())

const server = http.createServer(app)
const wss = new WebSocketServer({ server })

function broadcast(data: unknown) {
  const msg = JSON.stringify(data)
  wss.clients.forEach((client) => {
    if (client.readyState === WebSocket.OPEN) {
      client.send(msg)
    }
  })
}

let currentMode: 'sans' | 'opensearch' = 'sans'
let simTimer: ReturnType<typeof setInterval> | null = null

function runSimulator() {
  const events = generateBatch(getRandomThreat)
  const insert = getDb().prepare(`
    insert into events (id, timestamp, source_ip, source_country, source_lat, source_lon, target_ip, target_country, target_lat, target_lon, port, protocol, attack_type, severity)
    values (@id, @timestamp, @source_ip, @source_country, @source_lat, @source_lon, @target_ip, @target_country, @target_lat, @target_lon, @port, @protocol, @attack_type, @severity)
  `)
  const tx = getDb().transaction(() => {
    for (const e of events) {
      insert.run(e)
    }
  })
  tx()
  for (const e of events) {
    broadcast({ type: 'new_event', event: e })
  }
  console.log(`[sim] Inserted ${events.length} events`)
}

function seedHistorical(hours: number, total: number) {
  const events = generateHistorical(hours, total, getRandomThreat)
  const insert = getDb().prepare(`
    insert or ignore into events (id, timestamp, source_ip, source_country, source_lat, source_lon, target_ip, target_country, target_lat, target_lon, port, protocol, attack_type, severity)
    values (@id, @timestamp, @source_ip, @source_country, @source_lat, @source_lon, @target_ip, @target_country, @target_lat, @target_lon, @port, @protocol, @attack_type, @severity)
  `)
  const tx = getDb().transaction(() => {
    for (const e of events) {
      insert.run(e)
    }
  })
  tx()
  return events.length
}

function startSans() {
  stopCurrentSource()
  console.log('[mode] Starting SANS+simulator')
  currentMode = 'sans'
  simTimer = setInterval(runSimulator, SIM_INTERVAL)
}

function startOpensearch() {
  stopCurrentSource()
  console.log('[mode] Starting OpenSearch poller')
  currentMode = 'opensearch'
  opensearch.start((events: AttackEvent[]) => {
    for (const e of events) {
      insertEvent(e)
      broadcast({ type: 'new_event', event: e })
    }
    console.log(`[opensearch] Inserted ${events.length} events`)
  })
}

function stopCurrentSource() {
  if (currentMode === 'sans' && simTimer) {
    clearInterval(simTimer)
    simTimer = null
  }
  if (currentMode === 'opensearch') {
    opensearch.stop()
  }
}

function switchMode(mode: 'sans' | 'opensearch') {
  if (mode === currentMode) return
  stopCurrentSource()
  clearEvents()
  if (mode === 'sans') {
    startSans()
  } else {
    startOpensearch()
  }
  broadcast({ type: 'mode_changed', mode })
}

app.get('/api/mode', (_req, res) => {
  res.json({ mode: currentMode })
})

app.post('/api/mode', (req, res) => {
  const { mode } = req.body
  if (mode !== 'sans' && mode !== 'opensearch') {
    res.status(400).json({ error: 'mode must be sans or opensearch' })
    return
  }
  switchMode(mode)
  res.json({ mode: currentMode })
})

app.get('/api/counts', (_req, res) => {
  res.json(getEventCounts())
})

app.get('/api/top-countries', (_req, res) => {
  res.json(getTopCountries())
})

app.get('/api/top-ports', (_req, res) => {
  res.json(getTopPorts())
})

app.get('/api/attack-dist', (_req, res) => {
  res.json(getAttackDistribution())
})

app.get('/api/top-exploits', (_req, res) => {
  res.json(getTopExploits())
})

app.get('/api/feed-ports', (_req, res) => {
  res.json(getFeedPorts())
})

app.get('/api/severity-dist', (_req, res) => {
  res.json(getSeverityDistribution())
})

app.get('/api/countries', (_req, res) => {
  res.json(getDistinctCountries())
})

app.get('/api/target-countries', (_req, res) => {
  res.json(getDistinctTargetCountries())
})

app.get('/api/events', (req, res) => {
  const limit = Math.min(safeInt(req.query.limit as string, 50), 200)
  const filters: { severity?: string | string[]; attack_type?: string; source_country?: string; target_country?: string } = {
    attack_type: req.query.attack_type as string | undefined,
    source_country: req.query.source_country as string | undefined,
    target_country: req.query.target_country as string | undefined,
  }
  const s = req.query.severity
  if (Array.isArray(s)) {
    filters.severity = s as string[]
  } else if (typeof s === 'string') {
    filters.severity = s
  }
  res.json(getEvents(limit, filters))
})

app.post('/api/rss/fetch', async (req, res) => {
  try {
    const { url } = req.body
    if (!url) { res.status(400).json({ error: 'missing url' }); return }
    const result = await fetchRss(url)
    res.json(result)
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'unknown error'
    res.status(500).json({ error: message })
  }
})

app.post('/api/seed', (_req, res) => {
  const count = seedHistorical(48, 200)
  res.json({ seeded: count })
})

if (process.env.SERVE_STATIC === 'true') {
  const __dirname = path.dirname(fileURLToPath(import.meta.url))
  const staticDir = path.resolve(__dirname, '..', '..', 'frontend', 'dist')
  app.use(express.static(staticDir))
  app.get('*', (_req, res) => {
    res.sendFile(path.join(staticDir, 'index.html'))
  })
  console.log(`[server] Serving static files from ${staticDir}`)
}

interface CountC { c: number }

server.listen(PORT, async () => {
  const url = `http://localhost:${PORT}`
  console.log(`ThreatFront server running at ${url}`)
  console.log(`Simulator interval: ${SIM_INTERVAL}ms`)

  await ensureFeed()
  startFeedRefresh()

  console.log('Seeding historical data...')
  const count = getDb().prepare('select count(*) as c from events').get() as CountC
  if (count.c === 0) {
    const seeded = seedHistorical(48, 200)
    console.log(`Seeded ${seeded} historical events`)
  }

  startSans()
})

process.on('SIGINT', () => { close(); process.exit(0) })
process.on('SIGTERM', () => { close(); process.exit(0) })
