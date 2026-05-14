import { Header } from './components/Header'
import { ThreatMap } from './components/ThreatMap'
import { ThreatFeed } from './components/ThreatFeed'
import { StatsPanel } from './components/StatsPanel'
import { FilterBar } from './components/FilterBar'
import './App.css'

export default function App() {
  return (
    <div className="app-container">
      <Header />
      <div className="main-area">
        <div className="map-wrapper">
          <ThreatMap />
        </div>
        <div className="panel-overlay">
          <div className="panel-left">
            <FilterBar />
            <div className="flex-1 overflow-hidden flex flex-col gap-2">
              <StatsPanel />
            </div>
          </div>
          <div className="panel-right">
            <ThreatFeed />
          </div>
        </div>
      </div>
    </div>
  )
}
