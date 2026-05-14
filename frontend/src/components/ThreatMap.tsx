import { useEffect, useState } from 'react'
import { MapContainer, TileLayer, useMap } from 'react-leaflet'
import { supabase } from '../lib/supabase'
import type { AttackEvent } from '../types'
import { ArcLayer } from './ArcLayer'

function MapContent() {
  const [events, setEvents] = useState<AttackEvent[]>([])
  const map = useMap()

  useEffect(() => {
    map.setView([25, 20], 2)

    supabase
      .from('events')
      .select('*')
      .order('timestamp', { ascending: false })
      .limit(30)
      .then(({ data }) => {
        if (data) setEvents((data as AttackEvent[]).reverse())
      })

    const channel = supabase
      .channel('map-events')
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'events' },
        (payload) => {
          setEvents((prev) => [...prev, payload.new as AttackEvent].slice(-30))
        }
      )
      .subscribe()

    return () => { supabase.removeChannel(channel) }
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
