const KEV_URL = 'https://www.cisa.gov/sites/default/files/feeds/known_exploited_vulnerabilities.json'
const REFRESH_INTERVAL = 6 * 60 * 60 * 1000

interface KevVulnerability {
  cveID: string
  vulnerabilityName: string
  dateAdded: string
  shortDescription: string
  requiredAction: string
  knownRansomwareCampaignUse?: string
}

interface KevCatalog {
  vulnerabilities: KevVulnerability[]
}

let kevSet: Set<string> | null = null
let lastFetch = 0

async function fetchKev(): Promise<Set<string>> {
  try {
    const res = await fetch(KEV_URL, {
      headers: { 'User-Agent': 'threatfront-local/1.0' },
    })
    if (!res.ok) throw new Error(`HTTP ${res.status}`)
    const data: KevCatalog = await res.json()
    const cves = new Set(data.vulnerabilities.map((v) => v.cveID))
    console.log(`[kev] Loaded ${cves.size} known exploited CVEs`)
    return cves
  } catch (err) {
    console.warn(`[kev] Fetch failed: ${err}`)
    return new Set()
  }
}

export async function ensureKev(): Promise<Set<string>> {
  if (kevSet && Date.now() - lastFetch < REFRESH_INTERVAL) return kevSet
  kevSet = await fetchKev()
  lastFetch = Date.now()
  return kevSet
}
