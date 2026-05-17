import type { AttackEvent, EventCounts, TopCountry, TopPort, FeedPort, AttackDistribution, SeverityDistribution, Exploit, RssResult, Filters, Mode } from '../types'

export function matchesFilters(e: AttackEvent, f: Filters): boolean {
  if (f.severity.length > 0 && !f.severity.includes(e.severity)) return false
  if (f.attack_type && f.attack_type !== 'all' && e.attack_type !== f.attack_type) return false
  if (f.source_country && f.source_country !== 'all' && e.source_country !== f.source_country) return false
  if (f.target_country && f.target_country !== 'all' && e.target_country !== f.target_country) return false
  return true
}

const WS_URL = import.meta.env.VITE_WS_URL || 'ws://localhost:3001'
const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3001'

function toParams(f?: Partial<Filters>): string {
  if (!f) return ''
  const p = new URLSearchParams()
  if (f.severity && f.severity.length > 0) {
    for (const s of f.severity) p.append('severity', s)
  }
  if (f.attack_type && f.attack_type !== 'all') p.set('attack_type', f.attack_type)
  if (f.source_country && f.source_country !== 'all') p.set('source_country', f.source_country)
  if (f.target_country && f.target_country !== 'all') p.set('target_country', f.target_country)
  const s = p.toString()
  return s ? `&${s}` : ''
}

async function api<T>(path: string, init?: RequestInit): Promise<T> {
  const res = await fetch(`${API_URL}${path}`, init)
  if (!res.ok) throw new Error(`API error: ${res.status}`)
  return res.json()
}

export async function getMode(): Promise<{ mode: Mode }> {
  return api<{ mode: Mode }>('/api/mode')
}

export async function setMode(mode: Mode): Promise<{ mode: Mode }> {
  return api<{ mode: Mode }>('/api/mode', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ mode }),
  })
}

export async function getEventCounts(): Promise<EventCounts> {
  return api<EventCounts>('/api/counts')
}

export async function getEvents(limit = 50, filters?: Partial<Filters>): Promise<AttackEvent[]> {
  return api<AttackEvent[]>(`/api/events?limit=${limit}${toParams(filters)}`)
}

export async function getCountries(): Promise<string[]> {
  const data = await api<{ source_country: string }[]>('/api/countries')
  return data.map((d) => d.source_country).sort()
}

export async function getTargetCountries(): Promise<string[]> {
  const data = await api<{ target_country: string }[]>('/api/target-countries')
  return data.map((d) => d.target_country).sort()
}

export async function getTopCountries(): Promise<TopCountry[]> {
  return api<TopCountry[]>('/api/top-countries')
}

export async function getTopPorts(): Promise<TopPort[]> {
  return api<TopPort[]>('/api/top-ports')
}

export async function getFeedPorts(): Promise<FeedPort[]> {
  return api<FeedPort[]>('/api/feed-ports')
}

export async function getAttackDistribution(): Promise<AttackDistribution[]> {
  return api<AttackDistribution[]>('/api/attack-dist')
}

export async function getTopExploits(): Promise<Exploit[]> {
  return api<Exploit[]>('/api/top-exploits')
}

export async function getSeverityDistribution(): Promise<SeverityDistribution[]> {
  return api<SeverityDistribution[]>('/api/severity-dist')
}

export async function fetchRss(url: string): Promise<RssResult> {
  const res = await fetch(`${API_URL}/api/rss/fetch`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ url }),
  })
  if (!res.ok) throw new Error(`RSS error: ${res.status}`)
  return res.json()
}

type WsCallback = (e: AttackEvent) => void
type ModeCallback = (mode: Mode) => void

let sharedWs: WebSocket | null = null
let wsRefCount = 0
let wsRetryTimeout: ReturnType<typeof setTimeout> | null = null
let wsClosed = false
const eventListeners = new Set<WsCallback>()
const modeListeners = new Set<ModeCallback>()

function connectSharedWs() {
  if (wsClosed) return
  sharedWs = new WebSocket(WS_URL)
  sharedWs.onopen = () => { /* connected */ }
  sharedWs.onerror = () => { /* ignore */ }
  sharedWs.onmessage = (msg) => {
    try {
      const data = JSON.parse(msg.data)
      if (data.type === 'new_event') {
        for (const cb of eventListeners) cb(data.event as AttackEvent)
      } else if (data.type === 'mode_changed') {
        for (const cb of modeListeners) cb(data.mode as Mode)
      }
    } catch { /* ignore */ }
  }
  sharedWs.onclose = () => {
    if (!wsClosed) wsRetryTimeout = setTimeout(connectSharedWs, 2000)
  }
}

function disconnectSharedWs() {
  wsClosed = true
  if (wsRetryTimeout) clearTimeout(wsRetryTimeout)
  if (sharedWs) {
    sharedWs.onclose = null
    sharedWs.close()
    sharedWs = null
  }
}

export function onNewEvent(callback: WsCallback): () => void {
  eventListeners.add(callback)
  if (!sharedWs) connectSharedWs()
  wsRefCount++
  return () => {
    eventListeners.delete(callback)
    wsRefCount--
    if (wsRefCount === 0) disconnectSharedWs()
  }
}

export function onModeChanged(callback: ModeCallback): () => void {
  modeListeners.add(callback)
  if (!sharedWs) connectSharedWs()
  wsRefCount++
  return () => {
    modeListeners.delete(callback)
    wsRefCount--
    if (wsRefCount === 0) disconnectSharedWs()
  }
}
