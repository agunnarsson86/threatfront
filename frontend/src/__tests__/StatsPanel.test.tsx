import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen } from '@testing-library/react'
import { StatsPanel } from '../components/StatsPanel'

const mockData = vi.hoisted(() => ({
  top_countries: [
    { source_country: 'CN', count: 430 },
    { source_country: 'RU', count: 180 },
  ],
  top_ports: [
    { port: 22, count: 520 },
    { port: 443, count: 220 },
  ],
  attack_distribution: [
    { attack_type: 'SSH Brute Force', count: 300 },
  ],
  severity_distribution: [
    { severity: 'critical', count: 50 },
    { severity: 'high', count: 150 },
  ],
}))

vi.mock('../lib/supabase', () => ({
  supabase: {
    from: vi.fn((table: string) => ({
      select: vi.fn(() => Promise.resolve({ data: mockData[table as keyof typeof mockData] || [] })),
    })),
    channel: vi.fn(() => ({
      on: vi.fn().mockReturnThis(),
      subscribe: vi.fn(),
    })),
    removeChannel: vi.fn(),
  },
}))

describe('StatsPanel', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('renders section titles', async () => {
    render(<StatsPanel />)
    expect(screen.getByText('Top Countries')).toBeInTheDocument()
    expect(screen.getByText('Top Ports')).toBeInTheDocument()
  })

  it('displays country codes', async () => {
    render(<StatsPanel />)
    const cn = await screen.findAllByText('CN')
    expect(cn.length).toBeGreaterThan(0)
  })

  it('displays severity types', async () => {
    render(<StatsPanel />)
    expect(await screen.findByText('Crit')).toBeInTheDocument()
    expect(await screen.findByText('High')).toBeInTheDocument()
  })

  it('displays top ports', async () => {
    render(<StatsPanel />)
    expect(await screen.findByText('22')).toBeInTheDocument()
    expect(await screen.findByText('443')).toBeInTheDocument()
  })
})
