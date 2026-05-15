import { useEffect, useRef, useState } from 'react'
import { Shield, Activity, Clock } from 'lucide-react'
import { getEventCounts, onNewEvent } from '../lib/data'
import type { EventCounts, Mode } from '../types'

interface Props {
  mode: Mode
}

export function Header({ mode }: Props) {
  const [counts, setCounts] = useState<EventCounts>({ total: 0, last_24h: 0, last_hour: 0 })
  const [eventsPerHour, setEventsPerHour] = useState(0)
  const hourTimestamps = useRef<number[]>([])

  useEffect(() => {
    getEventCounts().then(setCounts)

    const unsub = onNewEvent(() => {
      setCounts((prev) => ({ ...prev, total: prev.total + 1, last_24h: prev.last_24h + 1, last_hour: prev.last_hour + 1 }))
      hourTimestamps.current.push(Date.now())
    })

    const hourInterval = setInterval(() => {
      const cutoff = Date.now() - 3600000
      hourTimestamps.current = hourTimestamps.current.filter((t) => t > cutoff)
      setEventsPerHour(hourTimestamps.current.length)
    }, 1000)

    return () => {
      unsub()
      clearInterval(hourInterval)
    }
  }, [])

  return (
    <header className="flex items-center justify-between px-5 py-3 border-b border-white/5 bg-surface/80 backdrop-blur-md">
      <div className="flex items-center gap-3">
        <Shield className="w-5 h-5 text-accent-cyan" />
        <h1 className="text-sm font-bold tracking-widest text-white/90">
          THREATFRONT
        </h1>
        <span className="text-[10px] text-white/20 tracking-wider uppercase ml-2">
          {mode === 'sans' ? 'SANS Live' : 'WAF Live'}
        </span>
      </div>
      <div className="flex items-center gap-6">
        <div className="flex items-center gap-2 text-xs">
          <Activity className="w-3.5 h-3.5 text-accent-cyan" />
          <span className="text-white/50">Events/h:</span>
          <span className="text-white/80 font-medium min-w-[5ch] text-right">{eventsPerHour}</span>
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
