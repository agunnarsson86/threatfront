import { useEffect, useState } from 'react'
import { getCountries } from '../lib/data'
import type { Filters } from '../types'

interface Props {
  filters: Filters
  onFilterChange: (f: Filters) => void
}

const SEVERITIES = ['all', 'critical', 'high', 'medium', 'low']
const ATTACK_TYPES = ['all', 'SSH Brute Force', 'Port Scan', 'Web Exploit', 'DDoS', 'SQL Injection', 'Malware Delivery', 'DNS Tunneling', 'RDP Brute Force']

export function FilterBar({ filters, onFilterChange }: Props) {
  const [countries, setCountries] = useState<string[]>([])

  useEffect(() => {
    getCountries().then(setCountries).catch(() => {})
  }, [])

  function set(key: keyof Filters, value: string) {
    onFilterChange({ ...filters, [key]: value })
  }

  return (
    <div className="panel">
      <div className="panel-title">Filters</div>
      <div className="space-y-3">
        <div>
          <label className="text-[10px] text-white/30 uppercase tracking-wider block mb-1.5">Severity</label>
          <div className="flex gap-1">
            {SEVERITIES.map((s) => (
              <button
                key={s}
                onClick={() => set('severity', s)}
                className={`text-[10px] px-2 py-1 rounded transition-colors uppercase tracking-wider ${
                  filters.severity === s
                    ? 'bg-accent-cyan/20 text-accent-cyan'
                    : 'bg-white/5 hover:bg-white/10 text-white/50 hover:text-white/80'
                }`}
              >
                {s === 'all' ? 'All' : s.slice(0, 2)}
              </button>
            ))}
          </div>
        </div>
        <div>
          <label className="text-[10px] text-white/30 uppercase tracking-wider block mb-1.5">Attack Type</label>
          <select
            value={filters.attack_type}
            onChange={(e) => set('attack_type', e.target.value)}
            className="w-full text-[11px] bg-surface-lighter border border-white/10 rounded px-2 py-1.5 text-white outline-none focus:border-accent-cyan/50"
            style={{ colorScheme: 'dark' }}
          >
            {ATTACK_TYPES.map((t) => (
              <option key={t} value={t} className="bg-surface-lighter text-white">{t === 'all' ? 'All' : t}</option>
            ))}
          </select>
        </div>
        <div>
          <label className="text-[10px] text-white/30 uppercase tracking-wider block mb-1.5">Source Country</label>
          <select
            value={filters.source_country}
            onChange={(e) => set('source_country', e.target.value)}
            className="w-full text-[11px] bg-surface-lighter border border-white/10 rounded px-2 py-1.5 text-white outline-none focus:border-accent-cyan/50"
            style={{ colorScheme: 'dark' }}
          >
            <option value="all" className="bg-surface-lighter text-white">All</option>
            {countries.map((c) => (
              <option key={c} value={c} className="bg-surface-lighter text-white">{c}</option>
            ))}
          </select>
        </div>
      </div>
    </div>
  )
}
