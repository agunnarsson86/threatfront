import { useEffect, useState } from 'react'
import { Shield, Activity, Clock } from 'lucide-react'
import { supabase } from '../lib/supabase'
import type { EventCounts } from '../types'

export function Header() {
  const [counts, setCounts] = useState<EventCounts>({ total: 0, last_24h: 0, last_hour: 0 })
  const [eventsPerSec, setEventsPerSec] = useState(0)

  useEffect(() => {
    async function fetchCounts() {
      const { data } = await supabase.from('event_counts').select('*').maybeSingle()
      if (data) setCounts(data as EventCounts)
    }
    fetchCounts()

    const channel = supabase
      .channel('header-counts')
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'events' },
        () => {
          setCounts((prev) => ({ ...prev, total: prev.total + 1, last_24h: prev.last_24h + 1, last_hour: prev.last_hour + 1 }))
          setEventsPerSec((prev) => prev + 1)
        }
      )
      .subscribe()

    const secInterval = setInterval(() => setEventsPerSec(0), 1000)

    return () => {
      supabase.removeChannel(channel)
      clearInterval(secInterval)
    }
  }, [])

  return (
    <header className="flex items-center justify-between px-5 py-3 border-b border-white/5 bg-surface/80 backdrop-blur-md">
      <div className="flex items-center gap-3">
        <Shield className="w-5 h-5 text-accent-cyan" />
        <h1 className="text-sm font-bold tracking-widest text-white/90">
          THREATFRONT
        </h1>
        <span className="text-[10px] text-white/20 tracking-wider uppercase ml-2">Live</span>
      </div>
      <div className="flex items-center gap-6">
        <div className="flex items-center gap-2 text-xs">
          <Activity className="w-3.5 h-3.5 text-accent-cyan" />
          <span className="text-white/50">Events/s:</span>
          <span className="text-white/80 font-medium min-w-[3ch] text-right">{eventsPerSec}</span>
        </div>
        <div className="flex items-center gap-2 text-xs">
          <Clock className="w-3.5 h-3.5 text-accent-cyan" />
          <span className="text-white/50">24h:</span>
          <span className="text-white/80 font-medium">{counts.last_24h.toLocaleString()}</span>
        </div>
        <div className="flex items-center gap-2 text-xs">
          <span className="text-white/50">Total:</span>
          <span className="text-white/80 font-medium">{counts.total.toLocaleString()}</span>
        </div>
      </div>
    </header>
  )
}
