import type { AttackEvent, EventCounts, TopCountry, TopPort, FeedPort, AttackDistribution, SeverityDistribution, RssResult } from '../types'

const USE_LOCAL = import.meta.env.VITE_USE_LOCAL === 'true'
const WS_URL = import.meta.env.VITE_WS_URL || 'ws://localhost:3001'
const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3001'

async function api<T>(path: string): Promise<T> {
  const res = await fetch(`${API_URL}${path}`)
  if (!res.ok) throw new Error(`API error: ${res.status}`)
  return res.json()
}

async function supabaseQuery<T>(table: string, options?: { limit?: number; order?: string; asc?: boolean; single?: boolean }): Promise<T[]> {
  const { supabase } = await import('./supabase')
  let query = supabase.from(table).select('*')
  if (options?.order) {
    query = query.order(options.order, { ascending: options?.asc ?? false })
  }
  if (options?.limit) {
    query = query.limit(options.limit)
  }
  if (options?.single) {
    const { data } = await query.maybeSingle()
    return data ? [data as T] : []
  }
  const { data } = await query
  return (data as T[]) ?? []
}

export async function getEventCounts(): Promise<EventCounts> {
  if (USE_LOCAL) return api<EventCounts>('/api/counts')
  const rows = await supabaseQuery<any>('event_counts', { single: true })
  return rows[0] ?? { total: 0, last_24h: 0, last_hour: 0 }
}

export async function getEvents(limit = 50): Promise<AttackEvent[]> {
  if (USE_LOCAL) return api<AttackEvent[]>(`/api/events?limit=${limit}`)
  return supabaseQuery<AttackEvent>('events', { limit, order: 'timestamp', asc: false })
}

export async function getTopCountries(): Promise<TopCountry[]> {
  if (USE_LOCAL) return api<TopCountry[]>('/api/top-countries')
  return supabaseQuery<TopCountry>('top_countries')
}

export async function getTopPorts(): Promise<TopPort[]> {
  if (USE_LOCAL) return api<TopPort[]>('/api/top-ports')
  return supabaseQuery<TopPort>('top_ports')
}

export async function getFeedPorts(): Promise<FeedPort[]> {
  if (USE_LOCAL) return api<FeedPort[]>('/api/feed-ports')
  return []
}

export async function getAttackDistribution(): Promise<AttackDistribution[]> {
  if (USE_LOCAL) return api<AttackDistribution[]>('/api/attack-dist')
  return supabaseQuery<AttackDistribution>('attack_distribution')
}

export async function getSeverityDistribution(): Promise<SeverityDistribution[]> {
  if (USE_LOCAL) return api<SeverityDistribution[]>('/api/severity-dist')
  return supabaseQuery<SeverityDistribution>('severity_distribution')
}

export async function fetchRss(url: string): Promise<RssResult> {
  if (USE_LOCAL) {
    const res = await fetch(`${API_URL}/api/rss/fetch`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ url }),
    })
    if (!res.ok) throw new Error(`RSS error: ${res.status}`)
    return res.json()
  }
  throw new Error('RSS only available in local mode')
}

export function onNewEvent(callback: (event: AttackEvent) => void): () => void {
  if (!USE_LOCAL) {
    let cancelled = false
    import('./supabase').then(({ supabase }) => {
      if (cancelled) return
      const channel = supabase
        .channel('realtime-events')
        .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'events' }, (payload: any) => {
          callback(payload.new as AttackEvent)
        })
        .subscribe()
      return () => { supabase.removeChannel(channel) }
    })
    return () => { cancelled = true }
  }

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
