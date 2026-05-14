import { useEffect, useRef } from 'react'
import { useMap } from 'react-leaflet'
import L from 'leaflet'
import type { AttackEvent } from '../types'

interface ActiveArc {
  event: AttackEvent
  activatedAt: number
}

const ARC_HOLD = 20000
const ARC_FADE = 10000
const ARC_LIFETIME = ARC_HOLD + ARC_FADE
const TRAVEL_TIME = 2500

const SEVERITY_COLORS: Record<string, string> = {
  low: '#00f7ff',
  medium: '#ffe600',
  high: '#ff4400',
  critical: '#ff0044',
}

function quadBezier(t: number, p0: number, p1: number, p2: number): number {
  return (1 - t) * (1 - t) * p0 + 2 * (1 - t) * t * p1 + t * t * p2
}

export function ArcLayer({ events }: { events: AttackEvent[] }) {
  const map = useMap()
  const arcsRef = useRef<Map<string, ActiveArc>>(new Map())
  const animRef = useRef(0)

  useEffect(() => {
    const now = Date.now()
    for (const event of events) {
      if (!arcsRef.current.has(event.id)) {
        arcsRef.current.set(event.id, { event, activatedAt: now })
      }
    }
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

      for (const [id, arc] of arcsRef.current) {
        const elapsed = now - arc.activatedAt
        if (elapsed > ARC_LIFETIME) {
          arcsRef.current.delete(id)
          continue
        }

        const { event } = arc
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

        let arcAlpha: number
        if (elapsed < TRAVEL_TIME) {
          arcAlpha = elapsed / TRAVEL_TIME
        } else if (elapsed < ARC_HOLD) {
          arcAlpha = 1
        } else {
          arcAlpha = Math.max(0, 1 - (elapsed - ARC_HOLD) / ARC_FADE)
        }

        const color = SEVERITY_COLORS[event.severity] || '#00d4ff'
        const isCritical = event.severity === 'critical'

        ctx.beginPath()
        ctx.moveTo(from.x, from.y)
        ctx.quadraticCurveTo(cpX, cpY, to.x, to.y)
        ctx.strokeStyle = color
        ctx.lineWidth = isCritical ? 2 : 1.2
        ctx.globalAlpha = arcAlpha * 0.35
        ctx.stroke()

        const travelT = Math.min(elapsed / TRAVEL_TIME, 1)
        const bx = quadBezier(travelT, from.x, cpX, to.x)
        const by = quadBezier(travelT, from.y, cpY, to.y)

        const pulse = 0.7 + 0.3 * Math.sin(now * 0.001 + arc.activatedAt * 0.003)
        const srcGlow = isCritical ? 8 : 6
        const srcDot = isCritical ? 5 : 4

        ctx.beginPath()
        ctx.arc(from.x, from.y, srcGlow, 0, Math.PI * 2)
        ctx.strokeStyle = color
        ctx.lineWidth = 1.2
        ctx.globalAlpha = arcAlpha * 0.18 * pulse
        ctx.stroke()

        ctx.beginPath()
        ctx.arc(from.x, from.y, srcDot, 0, Math.PI * 2)
        ctx.fillStyle = color
        ctx.globalAlpha = arcAlpha * 0.6 * pulse
        ctx.fill()

        ctx.beginPath()
        ctx.arc(to.x, to.y, 2.5, 0, Math.PI * 2)
        ctx.fillStyle = color
        ctx.globalAlpha = arcAlpha * 0.35
        ctx.fill()

        if (elapsed < TRAVEL_TIME) {
          ctx.beginPath()
          ctx.arc(bx, by, 6, 0, Math.PI * 2)
          ctx.fillStyle = '#ffffff'
          ctx.globalAlpha = 1
          ctx.shadowBlur = 22
          ctx.shadowColor = color
          ctx.fill()

          ctx.beginPath()
          ctx.arc(bx, by, 3.5, 0, Math.PI * 2)
          ctx.fillStyle = color
          ctx.globalAlpha = 0.8
          ctx.shadowBlur = 0
          ctx.fill()
        } else {
          ctx.shadowBlur = 0
        }

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
