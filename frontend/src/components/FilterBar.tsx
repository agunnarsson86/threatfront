import { useEffect, useRef, useState } from 'react'
import { getCountries, getTargetCountries, getMode, setMode } from '../lib/data'
import type { Filters, Mode } from '../types'

interface Props {
  filters: Filters
  onFilterChange: (f: Filters) => void
  mode: Mode
  onModeChange: (m: Mode) => void
}

const SEVERITIES = ['all', 'critical', 'high', 'medium', 'low']
const ATTACK_TYPES = ['all', 'SSH Brute Force', 'Port Scan', 'Web Exploit', 'DDoS', 'SQL Injection', 'Malware Delivery', 'DNS Tunneling', 'RDP Brute Force']

export function FilterBar({ filters, onFilterChange, mode, onModeChange }: Props) {
  const [countries, setCountries] = useState<string[]>([])
  const [targetCountries, setTargetCountries] = useState<string[]>([])
  const [showMenu, setShowMenu] = useState(false)
  const menuRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    getMode().then(({ mode: m }) => onModeChange(m)).catch(() => {})
    getCountries().then(setCountries).catch(() => {})
    getTargetCountries().then(setTargetCountries).catch(() => {})
  }, [])

  useEffect(() => {
    if (!showMenu) return
    function handleClick(e: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setShowMenu(false)
      }
    }
    function handleKey(e: KeyboardEvent) {
      if (e.key === 'Escape') setShowMenu(false)
    }
    document.addEventListener('mousedown', handleClick)
    document.addEventListener('keydown', handleKey)
    return () => {
      document.removeEventListener('mousedown', handleClick)
      document.removeEventListener('keydown', handleKey)
    }
  }, [showMenu])

  function set(key: keyof Filters, value: string) {
    onFilterChange({ ...filters, [key]: value })
  }

  const hasActiveFilters = filters.attack_type !== 'all' || filters.source_country !== 'all' || filters.target_country !== 'all'

  return (
    <div className="panel">
      <div className="panel-title flex items-center justify-between">
        <span>Filters</span>
        <button
          onClick={() => setShowMenu(!showMenu)}
          className={`transition-colors text-xs ${showMenu || hasActiveFilters ? 'text-accent-cyan' : 'text-white/30 hover:text-white/70'}`}
          title="Filter settings"
        >
          ⚙
        </button>
      </div>
      <div className="space-y-3">
        <div>
          <label className="text-[10px] text-white/30 uppercase tracking-wider block mb-1.5">Data Source</label>
          <div className="flex gap-1">
            <button
              onClick={() => setMode('sans').then(({ mode: m }) => onModeChange(m)).catch(() => {})}
              className={`text-[10px] px-2 py-1 rounded transition-colors uppercase tracking-wider ${
                mode === 'sans'
                  ? 'bg-accent-cyan/20 text-accent-cyan'
                  : 'bg-white/5 hover:bg-white/10 text-white/50 hover:text-white/80'
              }`}
            >
              SANS
            </button>
            <button
              onClick={() => setMode('opensearch').then(({ mode: m }) => onModeChange(m)).catch(() => {})}
              className={`text-[10px] px-2 py-1 rounded transition-colors uppercase tracking-wider ${
                mode === 'opensearch'
                  ? 'bg-accent-cyan/20 text-accent-cyan'
                  : 'bg-white/5 hover:bg-white/10 text-white/50 hover:text-white/80'
              }`}
            >
              WAF
            </button>
          </div>
        </div>

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

        {showMenu && (
          <div ref={menuRef} className="space-y-3 p-2 rounded bg-white/5 border border-white/10">
            <div className="text-[10px] text-white/30 uppercase tracking-wider">Advanced Filters</div>
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
            <div>
              <label className="text-[10px] text-white/30 uppercase tracking-wider block mb-1.5">Target Country</label>
              <select
                value={filters.target_country}
                onChange={(e) => set('target_country', e.target.value)}
                className="w-full text-[11px] bg-surface-lighter border border-white/10 rounded px-2 py-1.5 text-white outline-none focus:border-accent-cyan/50"
                style={{ colorScheme: 'dark' }}
              >
                <option value="all" className="bg-surface-lighter text-white">All</option>
                {targetCountries.map((c) => (
                  <option key={c} value={c} className="bg-surface-lighter text-white">{c}</option>
                ))}
              </select>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
