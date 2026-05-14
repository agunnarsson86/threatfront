import { Header } from './components/Header'
import { ThreatMap } from './components/ThreatMap'
import { ThreatFeed } from './components/ThreatFeed'
import { StatsPanel } from './components/StatsPanel'
import { ExploitsPanel } from './components/ExploitsPanel'
import { FilterBar } from './components/FilterBar'
import { RssFeed } from './components/RssFeed'
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
          <div className="panel-top-row">
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
