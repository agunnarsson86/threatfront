import { useEffect, useRef, useState } from 'react'
import { supabase } from '../lib/supabase'
import type { AttackEvent } from '../types'

const SEVERITY_CONFIG: Record<string, { label: string; color: string; bg: string }> = {
  critical: { label: 'CRIT', color: '#ff0033', bg: 'rgba(255,0,51,0.12)' },
  high: { label: 'HIGH', color: '#ff6600', bg: 'rgba(255,102,0,0.12)' },
  medium: { label: 'MED', color: '#ffcc00', bg: 'rgba(255,204,0,0.08)' },
  low: { label: 'LOW', color: '#00d4ff', bg: 'rgba(0,212,255,0.08)' },
}

const COUNTRY_FLAGS: Record<string, string> = {
  CN: '🇨🇳', RU: '🇷🇺', US: '🇺🇸', KP: '🇰🇵', IR: '🇮🇷',
  BR: '🇧🇷', IN: '🇮🇳', VN: '🇻🇳', NG: '🇳🇬', SE: '🇸🇪',
}

export function ThreatFeed() {
  const [events, setEvents] = useState<AttackEvent[]>([])
  const listRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    supabase
      .from('events')
      .select('*')
      .order('timestamp', { ascending: false })
      .limit(50)
      .then(({ data }) => {
        if (data) setEvents(data as AttackEvent[])
      })

    const channel = supabase
      .channel('feed-events')
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'events' },
        (payload) => {
          const newEvent = payload.new as AttackEvent
          setEvents((prev) => [newEvent, ...prev].slice(0, 100))
        }
      )
      .subscribe()

    return () => { supabase.removeChannel(channel) }
  }, [])

  useEffect(() => {
    if (listRef.current) {
      listRef.current.scrollTop = 0
    }
  }, [events.length])

  function timeAgo(timestamp: string): string {
    const sec = Math.floor((Date.now() - new Date(timestamp).getTime()) / 1000)
    if (sec < 5) return 'just now'
    if (sec < 60) return `${sec}s ago`
    if (sec < 3600) return `${Math.floor(sec / 60)}m ago`
    return `${Math.floor(sec / 3600)}h ago`
  }

  return (
    <div className="panel flex-1 overflow-hidden flex flex-col">
      <div className="panel-title flex items-center justify-between">
        <span>Live Feed</span>
        <span className="w-1.5 h-1.5 rounded-full bg-accent-red animate-pulse-glow" />
      </div>
      <div ref={listRef} className="overflow-y-auto flex-1 -mx-1 px-1 space-y-0.5">
        {events.map((e) => {
          const sev = SEVERITY_CONFIG[e.severity]
          return (
            <div
              key={e.id}
              className="flex items-center gap-2 py-1.5 px-2 rounded text-[11px] hover:bg-white/5 transition-colors animate-slide-in"
              style={{ borderLeft: `2px solid ${sev.color}` }}
            >
              <span
                className="text-[9px] font-bold px-1 py-0.5 rounded shrink-0"
                style={{ color: sev.color, backgroundColor: sev.bg }}
              >
                {sev.label}
              </span>
              <span className="text-white/70 truncate min-w-0 shrink">{e.attack_type}</span>
              <span className="text-white/30 shrink-0">
                {COUNTRY_FLAGS[e.source_country] || e.source_country}
                {' → '}
                {COUNTRY_FLAGS[e.target_country] || e.target_country}
              </span>
              <span className="text-white/20 shrink-0">:{e.port}</span>
              <span className="text-white/20 ml-auto shrink-0 whitespace-nowrap">{timeAgo(e.timestamp)}</span>
            </div>
          )
        })}
        {events.length === 0 && (
          <div className="text-xs text-white/20 text-center py-8 animate-fade-in">
            Waiting for events...
          </div>
        )}
      </div>
    </div>
  )
}
