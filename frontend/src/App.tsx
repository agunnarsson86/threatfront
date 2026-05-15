import { useState } from 'react'
import { Header } from './components/Header'
import { ThreatMap } from './components/ThreatMap'
import { ThreatFeed } from './components/ThreatFeed'
import { StatsPanel } from './components/StatsPanel'
import { ExploitsPanel } from './components/ExploitsPanel'
import { FilterBar } from './components/FilterBar'
import { RssFeed } from './components/RssFeed'
import type { Filters } from './types'
import type { Mode } from './lib/data'
import './App.css'

export default function App() {
  const [filters, setFilters] = useState<Filters>({ severity: 'all', attack_type: 'all', source_country: 'all', target_country: 'all' })
  const [mode, setMode] = useState<Mode>('sans')

  return (
    <div className="app-container">
      <Header mode={mode} onModeChange={setMode} />
      <div className="main-area">
        <div className="map-wrapper">
          <ThreatMap filters={filters} />
        </div>
        <div className="panel-overlay">
          <div className="panel-top-row">
            <div className="panel-left">
              <FilterBar filters={filters} onFilterChange={setFilters} mode={mode} onModeChange={setMode} />
              <div className="flex-1 overflow-hidden flex flex-col gap-2">
                <StatsPanel />
              </div>
            </div>
            <div className="panel-right">
              <ThreatFeed filters={filters} />
            </div>
          </div>
          <div className="panel-bottom-row">
            <div className="panel-bottom-left">
              <ExploitsPanel />
            </div>
            <div className="panel-bottom-right">
              <RssFeed />
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
