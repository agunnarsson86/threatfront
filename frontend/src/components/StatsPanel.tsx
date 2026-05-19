import { useEffect, useRef, useState } from 'react'
import { getTopCountries, getFeedPorts, getSeverityDistribution, onNewEvent } from '../lib/data'
import type { TopCountry, FeedPort, SeverityDistribution } from '../types'
import { SEVERITY_COLORS } from '../types'
import { useVisibleItems } from '../lib/useVisibleItems'

const SEVERITY_NAMES: Record<string, string> = {
  critical: 'Critical',
  high: 'High',
  medium: 'Medium',
  low: 'Low',
}

const ROW_HEIGHT = 26

export function StatsPanel() {
  const [topCountries, setTopCountries] = useState<TopCountry[]>([])
  const [severityDist, setSeverityDist] = useState<SeverityDistribution[]>([])
  const [feedPorts, setFeedPorts] = useState<FeedPort[]>([])
  const debounceRef = useRef<ReturnType<typeof setTimeout>>()

  useEffect(() => {
    async function load() {
      const [countries, fports, severities] = await Promise.all([
        getTopCountries(),
        getFeedPorts(),
        getSeverityDistribution(),
      ])
      setTopCountries(countries)
      setFeedPorts(fports)
      setSeverityDist(severities)
    }
    load()

    const unsub = onNewEvent(() => {
      if (debounceRef.current) clearTimeout(debounceRef.current)
      debounceRef.current = setTimeout(load, 2000)
    })

    return () => {
      unsub()
      clearTimeout(debounceRef.current)
    }
  }, [])

  const totalSeverity = severityDist.reduce((s, d) => s + d.count, 0) || 1
  const totalTop = topCountries.reduce((s, c) => s + c.count, 0) || 1

  const countries = useVisibleItems(ROW_HEIGHT, 2, 10)
  const severities = useVisibleItems(ROW_HEIGHT, 2, 4)
  const ports = useVisibleItems(ROW_HEIGHT, 2, 10)

  return (
    <>
      <div className="panel">
        <div className="panel-title">Top Countries</div>
        <div ref={countries.ref} className="panel-content space-y-1">
          {topCountries.slice(0, countries.count).map((c) => (
            <div key={c.source_country} className="flex items-center gap-2 text-xs">
              <img
                src={`https://flagcdn.com/24x18/${c.source_country.toLowerCase()}.png`}
                alt={c.source_country}
                className="w-4 h-3 object-cover rounded-sm"
              />
              <span className="text-white/60 w-6">{c.source_country}</span>
              <div className="flex-1 h-1.5 bg-white/5 rounded-full overflow-hidden">
                <div
                  className="h-full rounded-full bg-gradient-to-r from-accent-cyan to-accent-red"
                  style={{ width: `${(c.count / totalTop) * 100}%` }}
                />
              </div>
              <span className="text-white/40 w-12 text-right">{((c.count / totalTop) * 100).toFixed(0)}%</span>
            </div>
          ))}
          {topCountries.length === 0 && (
            <div className="text-xs text-white/20 text-center py-4">Waiting for data...</div>
          )}
        </div>
      </div>

      <div className="panel">
        <div className="panel-title">Severity</div>
        <div ref={severities.ref} className="panel-content space-y-1">
          {severityDist.slice(0, severities.count).map((d) => (
            <div key={d.severity} className="flex items-center gap-2 text-xs">
              <span
                className="w-1.5 h-1.5 rounded-full shrink-0"
                style={{ backgroundColor: SEVERITY_COLORS[d.severity] }}
              />
              <span className="text-white/50 w-14">{SEVERITY_NAMES[d.severity]}</span>
              <div className="flex-1 h-1 bg-white/5 rounded-full overflow-hidden">
                <div
                  className="h-full rounded-full transition-all duration-500"
                  style={{ width: `${(d.count / totalSeverity) * 100}%`, backgroundColor: SEVERITY_COLORS[d.severity] }}
                />
              </div>
              <span className="text-white/40 w-12 text-right">{d.count}</span>
            </div>
          ))}
        </div>
      </div>

      <div className="panel">
        <div className="panel-title">Top Ports (SANS Feed)</div>
        <div ref={ports.ref} className="panel-content space-y-1">
          {feedPorts.slice(0, ports.count).map((p) => (
            <div key={p.port} className="flex items-center gap-2 text-xs">
              <span className="text-accent-cyan w-8 font-medium">{p.port}</span>
              <div className="flex-1 h-1 bg-white/5 rounded-full overflow-hidden">
                <div
                  className="h-full rounded-full bg-accent-cyan/60"
                  style={{ width: `${(p.count / (feedPorts[0]?.count || 1)) * 100}%` }}
                />
              </div>
              <span className="text-white/40 w-12 text-right">{p.count.toLocaleString()}</span>
            </div>
          ))}
          {feedPorts.length === 0 && (
            <div className="text-xs text-white/20 text-center py-4">Waiting for SANS data...</div>
          )}
        </div>
      </div>
    </>
  )
}
