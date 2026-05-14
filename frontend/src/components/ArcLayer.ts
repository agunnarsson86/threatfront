import { useEffect, useRef } from 'react'
import { useMap } from 'react-leaflet'
import L from 'leaflet'
import type { AttackEvent } from '../types'

interface ActiveArc {
  event: AttackEvent
  activatedAt: number
}

const ARC_LIFETIME = 20000
const FADE_IN = 1000
const FADE_OUT = 4000

const SEVERITY_COLORS: Record<string, string> = {
  low: '#00d4ff',
  medium: '#ffcc00',
  high: '#ff6600',
  critical: '#ff0033',
}

export function ArcLayer({ events }: { events: AttackEvent[] }) {
  const map = useMap()
  const arcsRef = useRef<ActiveArc[]>([])
  const animRef = useRef(0)

  useEffect(() => {
    const now = Date.now()
    arcsRef.current = events.map((event) => ({ event, activatedAt: now })).slice(-30)
  }, [events])

  useEffect(() => {
    const canvas = document.createElement('canvas')
    canvas.style.position = 'absolute'
    canvas.style.top = '0'
    canvas.style.left = '0'
    canvas.style.pointerEvents = 'none'
    canvas.style.zIndex = '1000'

    const container = map.getContainer()
    container.appendChild(canvas)

    function resize() {
      const size = map.getSize()
      const dpr = window.devicePixelRatio || 1
      canvas.width = size.x * dpr
      canvas.height = size.y * dpr
      canvas.style.width = `${size.x}px`
      canvas.style.height = `${size.y}px`
    }

    resize()
    map.on('move', resize)
    map.on('zoom', resize)
    map.on('resize', resize)

    function draw() {
      const ctx = canvas.getContext('2d')
      if (!ctx) return

      const size = map.getSize()
      const dpr = window.devicePixelRatio || 1
      ctx.clearRect(0, 0, size.x * dpr, size.y * dpr)
      ctx.scale(dpr, dpr)

      const now = Date.now()
      const active = arcsRef.current.filter((a) => now - a.activatedAt < ARC_LIFETIME)
      arcsRef.current = active

      for (const arc of active) {
        const { event, activatedAt } = arc
        const elapsed = now - activatedAt

        const from = map.latLngToContainerPoint(L.latLng(event.source_lat, event.source_lon))
        const to = map.latLngToContainerPoint(L.latLng(event.target_lat, event.target_lon))

        const midX = (from.x + to.x) / 2
        const midY = (from.y + to.y) / 2
        const dx = to.x - from.x
        const dy = to.y - from.y
        const dist = Math.sqrt(dx * dx + dy * dy)
        const elevation = Math.min(dist * 0.35, 180)

        const angle = Math.atan2(dy, dx)
        const cpX = midX + Math.cos(angle + Math.PI / 2) * elevation
        const cpY = midY + Math.sin(angle + Math.PI / 2) * elevation

        let alpha: number
        if (elapsed < FADE_IN) {
          alpha = elapsed / FADE_IN
        } else if (elapsed < ARC_LIFETIME - FADE_OUT) {
          alpha = 1
        } else {
          alpha = Math.max(0, (ARC_LIFETIME - elapsed) / FADE_OUT)
        }

        const pulse = 0.6 + 0.4 * Math.sin(now * 0.0008 + activatedAt * 0.002)

        const color = SEVERITY_COLORS[event.severity] || '#00d4ff'
        const lineW = event.severity === 'critical' ? 1.5 : 1

        ctx.beginPath()
        ctx.moveTo(from.x, from.y)
        ctx.quadraticCurveTo(cpX, cpY, to.x, to.y)
        ctx.strokeStyle = color
        ctx.lineWidth = lineW
        ctx.globalAlpha = alpha * 0.15
        ctx.stroke()

        ctx.beginPath()
        ctx.arc(from.x, from.y, 4, 0, Math.PI * 2)
        ctx.fillStyle = color
        ctx.globalAlpha = alpha * 0.45 * pulse
        ctx.fill()

        ctx.beginPath()
        ctx.arc(from.x, from.y, 7, 0, Math.PI * 2)
        ctx.strokeStyle = color
        ctx.lineWidth = 1
        ctx.globalAlpha = alpha * 0.12 * pulse
        ctx.stroke()

        ctx.beginPath()
        ctx.arc(to.x, to.y, 2, 0, Math.PI * 2)
        ctx.fillStyle = color
        ctx.globalAlpha = alpha * 0.25
        ctx.fill()

        ctx.globalAlpha = 1
      }

      animRef.current = requestAnimationFrame(draw)
    }

    draw()

    return () => {
      cancelAnimationFrame(animRef.current)
      map.off('move', resize)
      map.off('zoom', resize)
      map.off('resize', resize)
      canvas.remove()
    }
  }, [map])

  return null
}
