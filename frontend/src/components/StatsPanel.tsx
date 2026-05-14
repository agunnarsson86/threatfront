import { useEffect, useState } from 'react'
import { getTopCountries, getFeedPorts, getAttackDistribution, getSeverityDistribution, onNewEvent } from '../lib/data'
import type { TopCountry, FeedPort, AttackDistribution, SeverityDistribution } from '../types'

const COUNTRY_FLAGS: Record<string, string> = {
  CN: '🇨🇳', RU: '🇷🇺', US: '🇺🇸', KP: '🇰🇵', IR: '🇮🇷',
  BR: '🇧🇷', IN: '🇮🇳', VN: '🇻🇳', NG: '🇳🇬', SE: '🇸🇪',
}

const SEVERITY_COLORS: Record<string, string> = {
  critical: '#ff0033',
  high: '#ff6600',
  medium: '#ffcc00',
  low: '#00d4ff',
}

const SEVERITY_NAMES: Record<string, string> = {
  critical: 'Crit',
  high: 'High',
  medium: 'Med',
  low: 'Low',
}

export function StatsPanel() {
  const [topCountries, setTopCountries] = useState<TopCountry[]>([])
  const [attackDist, setAttackDist] = useState<AttackDistribution[]>([])
  const [severityDist, setSeverityDist] = useState<SeverityDistribution[]>([])
  const [feedPorts, setFeedPorts] = useState<FeedPort[]>([])

  useEffect(() => {
    async function load() {
      const [countries, fports, attacks, severities] = await Promise.all([
        getTopCountries(),
        getFeedPorts(),
        getAttackDistribution(),
        getSeverityDistribution(),
      ])
      setTopCountries(countries)
      setFeedPorts(fports)
      setAttackDist(attacks)
      setSeverityDist(severities)
    }
    load()

    const unsub = onNewEvent(load)

    return () => { unsub() }
  }, [])

  const totalSeverity = severityDist.reduce((s, d) => s + d.count, 0) || 1
  const totalTop = topCountries.reduce((s, c) => s + c.count, 0) || 1

  return (
    <>
      <div className="panel flex-1 overflow-hidden flex flex-col">
        <div className="panel-title">Top Countries</div>
        <div className="space-y-1 overflow-y-auto flex-1">
          {topCountries.map((c) => (
            <div key={c.source_country} className="flex items-center gap-2 text-xs">
              <span className="text-sm">{COUNTRY_FLAGS[c.source_country] || '🏴'}</span>
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
        <div className="space-y-1">
          {severityDist.map((d) => (
            <div key={d.severity} className="flex items-center gap-2 text-xs">
              <span
                className="w-1.5 h-1.5 rounded-full shrink-0"
                style={{ backgroundColor: SEVERITY_COLORS[d.severity] }}
              />
              <span className="text-white/50 w-8">{SEVERITY_NAMES[d.severity]}</span>
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
        <div className="space-y-1">
          {feedPorts.slice(0, 5).map((p) => (
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
