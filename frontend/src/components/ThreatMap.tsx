import { useEffect, useState } from 'react'
import { MapContainer, TileLayer, useMap } from 'react-leaflet'
import 'leaflet/dist/leaflet.css'
import { getEvents, onNewEvent, matchesFilters } from '../lib/data'
import type { AttackEvent, Filters } from '../types'
import { ArcLayer } from './ArcLayer'

function MapContent({ filters }: { filters: Filters }) {
  const [events, setEvents] = useState<AttackEvent[]>([])
  const map = useMap()

  useEffect(() => {
    map.setView([25, 20], 2)
    setTimeout(() => map.invalidateSize(), 100)

    setEvents([])

    const unsub = onNewEvent((event) => {
      if (!matchesFilters(event, filters)) return
      setEvents((prev) => {
        if (prev.some((e) => e.id === event.id)) return prev
        return [...prev, event].slice(-30)
      })
    })

    return () => { unsub() }
  }, [map, filters])

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
      zoomControl={false}
      attributionControl={false}
    >
      <MapContent filters={filters} />
    </MapContainer>
  )
}
