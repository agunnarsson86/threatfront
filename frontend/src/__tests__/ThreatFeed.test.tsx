import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen } from '@testing-library/react'
import { ThreatFeed } from '../components/ThreatFeed'
import type { AttackEvent } from '../types'

const NO_FILTERS = { severity: 'all', attack_type: 'all', source_country: 'all' }

const MOCK_EVENTS = vi.hoisted(() => [
  {
    id: '1',
    timestamp: new Date().toISOString(),
    source_ip: '1.2.3.4',
    source_country: 'CN',
    source_lat: 35.86,
    source_lon: 104.19,
    target_ip: '5.6.7.8',
    target_country: 'SE',
    target_lat: 62.0,
    target_lon: 16.0,
    port: 22,
    protocol: 'TCP',
    attack_type: 'SSH Brute Force',
    severity: 'high',
  },
  {
    id: '2',
    timestamp: new Date(Date.now() - 60000).toISOString(),
    source_ip: '2.3.4.5',
    source_country: 'RU',
    source_lat: 61.52,
    source_lon: 105.32,
    target_ip: '6.7.8.9',
    target_country: 'SE',
    target_lat: 62.0,
    target_lon: 16.0,
    port: 443,
    protocol: 'HTTPS',
    attack_type: 'Web Exploit',
    severity: 'critical',
  },
] as AttackEvent[])

vi.mock('../lib/data', () => ({
  getEvents: vi.fn((_limit, _filters) => Promise.resolve(MOCK_EVENTS)),
  getFeedPorts: vi.fn(() => Promise.resolve([])),
  onNewEvent: vi.fn(() => vi.fn()),
}))

describe('ThreatFeed', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('renders the panel title', () => {
    render(<ThreatFeed filters={NO_FILTERS} />)
    expect(screen.getByText('Live Feed')).toBeInTheDocument()
  })

  it('displays event attack types', async () => {
    render(<ThreatFeed filters={NO_FILTERS} />)
    expect(await screen.findByText('SSH Brute Force')).toBeInTheDocument()
    expect(await screen.findByText('Web Exploit')).toBeInTheDocument()
  })

  it('displays severity badges', async () => {
    render(<ThreatFeed filters={NO_FILTERS} />)
    expect(await screen.findByText('HIGH')).toBeInTheDocument()
    expect(await screen.findByText('CRIT')).toBeInTheDocument()
  })

  it('renders feed items with correct structure', async () => {
    render(<ThreatFeed filters={NO_FILTERS} />)
    const items = await screen.findAllByText(/SSH Brute Force|Web Exploit/)
    expect(items).toHaveLength(2)
  })
})
