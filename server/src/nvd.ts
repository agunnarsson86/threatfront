import { getCveCache, setCveCache } from './db.js'

const NVD_API = 'https://services.nvd.nist.gov/rest/json/cves/2.0'
const CACHE_TTL = 24 * 60 * 60 * 1000
const REQUEST_DELAY = 6000

interface NvdCveItem {
  cve: {
    id: string
    descriptions: { lang: string; value: string }[]
    metrics?: {
      cvssMetricV31?: { cvssData: { baseSeverity: string; baseScore: number } }[]
    }
  }
}

interface NvdResponse {
  vulnerabilities: NvdCveItem[]
}

function isStale(lastUpdated: string): boolean {
  const age = Date.now() - new Date(lastUpdated).getTime()
  return isNaN(age) || age > CACHE_TTL
}

async function fetchCve(cveId: string): Promise<void> {
  const cached = getCveCache(cveId)
  if (cached && !isStale(cached.last_updated)) return

  try {
    const res = await fetch(`${NVD_API}?cveId=${cveId}`, {
      headers: { 'User-Agent': 'threatfront-local/1.0' },
    })
    if (!res.ok) {
      console.warn(`[nvd] HTTP ${res.status} for ${cveId}`)
      return
    }
    const data: NvdResponse = await res.json()
    const vuln = data.vulnerabilities?.[0]?.cve
    if (!vuln) {
      console.warn(`[nvd] No data for ${cveId}`)
      return
    }

    const desc = vuln.descriptions?.find((d) => d.lang === 'en')?.value ?? ''
    const cvss = vuln.metrics?.cvssMetricV31?.[0]?.cvssData
    const severity = cvss?.baseSeverity ?? ''
    const score = cvss?.baseScore ?? 0

    setCveCache({ cve_id: cveId, description: desc, severity, score })
    console.log(`[nvd] Cached ${cveId} (${severity}, ${score})`)
  } catch (err) {
    console.warn(`[nvd] Fetch failed for ${cveId}: ${err}`)
  }
}

export async function enrichCves(cveIds: string[]): Promise<void> {
  const unique = [...new Set(cveIds.filter((id) => id !== 'N/A'))]
  console.log(`[nvd] Enriching ${unique.length} CVEs...`)

  for (let i = 0; i < unique.length; i++) {
    await fetchCve(unique[i])
    if (i < unique.length - 1) {
      await new Promise((r) => setTimeout(r, REQUEST_DELAY))
    }
  }
  console.log('[nvd] Enrichment complete')
}
