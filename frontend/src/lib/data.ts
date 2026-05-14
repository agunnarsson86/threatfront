import type { AttackEvent, EventCounts, TopCountry, TopPort, FeedPort, AttackDistribution, SeverityDistribution, RssResult } from '../types'

const WS_URL = import.meta.env.VITE_WS_URL || 'ws://localhost:3001'
const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3001'

async function api<T>(path: string): Promise<T> {
  const res = await fetch(`${API_URL}${path}`)
  if (!res.ok) throw new Error(`API error: ${res.status}`)
  return res.json()
}

export async function getEventCounts(): Promise<EventCounts> {
  return api<EventCounts>('/api/counts')
}

export async function getEvents(limit = 50): Promise<AttackEvent[]> {
  return api<AttackEvent[]>(`/api/events?limit=${limit}`)
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

export function onNewEvent(callback: (event: AttackEvent) => void): () => void {
  let ws: WebSocket | null = null
  let retryTimeout: ReturnType<typeof setTimeout> | null = null
  let closed = false

  function connect() {
    if (closed) return
    ws = new WebSocket(WS_URL)
    ws.onopen = () => { /* connected */ }
    ws.onmessage = (msg) => {
      try {
        const data = JSON.parse(msg.data)
        if (data.type === 'new_event') callback(data.event as AttackEvent)
      } catch { /* ignore */ }
    }
    ws.onclose = () => { if (!closed) retryTimeout = setTimeout(connect, 2000) }
  }

  connect()
  return () => {
    closed = true
    if (retryTimeout) clearTimeout(retryTimeout)
    if (ws && ws.readyState === WebSocket.OPEN) {
      ws.close()
    }
  }
}
