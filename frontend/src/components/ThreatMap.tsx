import { useEffect, useState } from 'react'
import { MapContainer, TileLayer, useMap } from 'react-leaflet'
import 'leaflet/dist/leaflet.css'
import { getEvents, onNewEvent } from '../lib/data'
import type { AttackEvent } from '../types'
import { ArcLayer } from './ArcLayer'

function MapContent() {
  const [events, setEvents] = useState<AttackEvent[]>([])
  const map = useMap()

  useEffect(() => {
    map.setView([25, 20], 2)
    setTimeout(() => map.invalidateSize(), 100)

    getEvents(30).then((data) => setEvents(data.reverse()))

    const unsub = onNewEvent((event) => {
      setEvents((prev) => {
        if (prev.some((e) => e.id === event.id)) return prev
        return [...prev, event].slice(-30)
      })
    })

    return () => { unsub() }
  }, [map])

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

export function ThreatMap() {
  return (
    <MapContainer
      center={[25, 20]}
      zoom={2}
      className="w-full h-full"
      zoomControl={false}
      attributionControl={false}
    >
      <MapContent />
    </MapContainer>
  )
}
