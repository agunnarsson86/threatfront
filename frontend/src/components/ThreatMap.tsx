import { useEffect, useState } from 'react'
import { MapContainer, TileLayer, useMap } from 'react-leaflet'
import 'leaflet/dist/leaflet.css'
import { getEvents, onNewEvent, matchesFilters } from '../lib/data'
import type { AttackEvent, Filters } from '../types'
import { ArcLayer } from './ArcLayer'

const COUNTRY_COORDS: Record<string, [number, number]> = {
  CN: [35.86, 104.19], RU: [61.52, 105.32], US: [37.09, -95.71],
  KP: [40.34, 127.51], IR: [32.43, 53.69], BR: [-14.24, -51.93],
  IN: [20.59, 78.96], VN: [14.06, 108.28], NG: [9.08, 8.68],
  SE: [60.13, 18.64], DE: [51.17, 10.45], GB: [55.38, -3.44],
  JP: [36.20, 138.25], FR: [46.60, 1.88], AU: [-25.27, 133.78],
  CA: [56.13, -106.35], NL: [52.13, 5.29], SG: [1.35, 103.82],
}

function MapContent({ filters }: { filters: Filters }) {
  const [events, setEvents] = useState<AttackEvent[]>([])
  const map = useMap()

  useEffect(() => {
    const src = filters.source_country !== 'all' ? filters.source_country : null
    const tgt = filters.target_country !== 'all' ? filters.target_country : null

    if (src && tgt) {
      const s = COUNTRY_COORDS[src]
      const t = COUNTRY_COORDS[tgt]
      if (s && t && src !== tgt) {
        map.setView([(s[0] + t[0]) / 2, (s[1] + t[1]) / 2], 2)
      } else if (s) {
        map.setView(s, 3)
      }
    } else if (src) {
      const c = COUNTRY_COORDS[src]
      if (c) map.setView(c, 3)
    } else if (tgt) {
      const c = COUNTRY_COORDS[tgt]
      if (c) map.setView(c, 3)
    }
    setTimeout(() => map.invalidateSize(), 100)
  }, [map, filters.source_country, filters.target_country])

  useEffect(() => {
    setEvents([])

    const unsub = onNewEvent((event) => {
      if (!matchesFilters(event, filters)) return
      setEvents((prev) => {
        if (prev.some((e) => e.id === event.id)) return prev
        return [...prev, event].slice(-30)
      })
    })

    return () => { unsub() }
  }, [filters])

  return (
    <>
      <TileLayer
        url="https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png"
        attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> &copy; <a href="https://carto.com/">CARTO</a>'
      />
      <ArcLayer events={events} />
    </>
  )
}

interface ThreatMapProps {
  filters: Filters
}

export function ThreatMap({ filters }: ThreatMapProps) {
  return (
    <MapContainer
      center={[25, 20]}
      zoom={2}
      className="w-full h-full"
      attributionControl={false}
    >
      <MapContent filters={filters} />
    </MapContainer>
  )
}
