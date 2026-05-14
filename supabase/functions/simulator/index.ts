import { serve } from 'https://deno.land/std@0.208.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.0'

interface Country {
  code: string
  lat: number
  lon: number
  weight: number
}

interface AttackDef {
  name: string
  port: number
  protocol: string
  severity: 'low' | 'medium' | 'high' | 'critical'
}

const supabaseUrl = Deno.env.get('SUPABASE_URL')!
const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
const supabase = createClient(supabaseUrl, supabaseKey)

const COUNTRIES: Country[] = [
  { code: 'CN', lat: 35.86, lon: 104.19, weight: 40 },
  { code: 'RU', lat: 61.52, lon: 105.32, weight: 20 },
  { code: 'US', lat: 37.09, lon: -95.71, weight: 10 },
  { code: 'KP', lat: 40.34, lon: 127.51, weight: 10 },
  { code: 'IR', lat: 32.43, lon: 53.69, weight: 6 },
  { code: 'BR', lat: -14.24, lon: -51.93, weight: 5 },
  { code: 'IN', lat: 20.59, lon: 78.96, weight: 5 },
  { code: 'VN', lat: 14.05, lon: 108.28, weight: 3 },
  { code: 'NG', lat: 9.08, lon: 8.68, weight: 1 },
]

const ATTACKS: AttackDef[] = [
  { name: 'SSH Brute Force', port: 22, protocol: 'TCP', severity: 'high' },
  { name: 'Port Scan', port: 22, protocol: 'TCP', severity: 'low' },
  { name: 'Web Exploit', port: 443, protocol: 'HTTPS', severity: 'high' },
  { name: 'DDoS', port: 443, protocol: 'HTTPS', severity: 'critical' },
  { name: 'SQL Injection', port: 3306, protocol: 'TCP', severity: 'critical' },
  { name: 'Malware Delivery', port: 8080, protocol: 'HTTP', severity: 'high' },
  { name: 'RDP Brute Force', port: 3389, protocol: 'TCP', severity: 'medium' },
  { name: 'DNS Tunneling', port: 53, protocol: 'UDP', severity: 'medium' },
  { name: 'Port Scan', port: 443, protocol: 'TCP', severity: 'low' },
  { name: 'Web Exploit', port: 80, protocol: 'HTTP', severity: 'medium' },
]

function randomIp(): string {
  return `${Math.floor(Math.random() * 256)}.${Math.floor(Math.random() * 256)}.${Math.floor(Math.random() * 256)}.${Math.floor(Math.random() * 256)}`
}

function pickCountry(): Country {
  const total = COUNTRIES.reduce((s, c) => s + c.weight, 0)
  let r = Math.random() * total
  for (const c of COUNTRIES) {
    r -= c.weight
    if (r <= 0) return c
  }
  return COUNTRIES[0]
}

function randomAttack(): AttackDef {
  return ATTACKS[Math.floor(Math.random() * ATTACKS.length)]
}

function makeEvent() {
  const country = pickCountry()
  const attack = randomAttack()
  return {
    source_ip: randomIp(),
    source_country: country.code,
    source_lat: country.lat + (Math.random() - 0.5) * 12,
    source_lon: country.lon + (Math.random() - 0.5) * 12,
    target_ip: randomIp(),
    target_country: 'SE',
    target_lat: 62.0 + (Math.random() - 0.5) * 6,
    target_lon: 16.0 + (Math.random() - 0.5) * 6,
    port: attack.port,
    protocol: attack.protocol,
    attack_type: attack.name,
    severity: attack.severity,
  }
}

serve(async (_req) => {
  try {
    const count = Math.floor(Math.random() * 5) + 1
    const events = Array.from({ length: count }, makeEvent)

    const { data, error } = await supabase.from('events').insert(events)

    if (error) throw error

    return new Response(JSON.stringify({ inserted: count }), {
      headers: { 'Content-Type': 'application/json' },
    })
  } catch (err) {
    console.error('Simulator error:', err)
    return new Response(JSON.stringify({ error: err.message }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    })
  }
})
