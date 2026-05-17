import dns from 'dns'

export interface RssItem {
  title: string
  link: string
  pubDate: string
  description: string
}

export interface RssResult {
  title: string
  items: RssItem[]
}

function extractTag(xml: string, tag: string): string {
  const m = xml.match(new RegExp(`<${tag}[^>]*>([\\s\\S]*?)<\\/${tag}>`, 'i'))
  return m ? m[1].trim() : ''
}

function stripHtml(html: string): string {
  return html.replace(/<[^>]*>/g, '').trim()
}

function isValidUrl(url: string): boolean {
  try {
    const u = new URL(url)
    return u.protocol === 'http:' || u.protocol === 'https:'
  } catch {
    return false
  }
}

function ipToInt(ip: string): number {
  return ip.split('.').reduce((acc, octet) => (acc << 8) + parseInt(octet, 10), 0) >>> 0
}

function isPrivateIp(ip: string): boolean {
  const n = ipToInt(ip)
  if (n === 0) return true
  if ((n >>> 24) === 127) return true
  if ((n >>> 24) === 10) return true
  if ((n >>> 20) === 2753) return true
  if ((n >>> 16) === 49320) return true
  if ((n >>> 24) === 169 && ((n >>> 16) & 0xff) === 254) return true
  return false
}

async function isPublicUrl(url: string): Promise<boolean> {
  try {
    const { hostname } = new URL(url)
    const { address } = await dns.promises.lookup(hostname, { family: 4 })
    return !isPrivateIp(address)
  } catch {
    return false
  }
}

export async function fetchRss(url: string): Promise<RssResult> {
  if (!isValidUrl(url)) throw new Error('Invalid URL')
  if (!(await isPublicUrl(url))) throw new Error('URL must point to a public address')
  const res = await fetch(url, {
    headers: { 'User-Agent': 'threatfront-rss/1.0' },
    signal: AbortSignal.timeout(10000),
  })
  if (!res.ok) throw new Error(`HTTP ${res.status}`)
  const xml = await res.text()

  const channelTitle = extractTag(xml.match(/<channel>[\s\S]*<\/channel>/i)?.[0] || xml, 'title')

  const items: RssItem[] = []
  const itemRegex = /<item>([\s\S]*?)<\/item>/gi
  let match: RegExpExecArray | null
  while ((match = itemRegex.exec(xml)) !== null) {
    const block = match[1]
    items.push({
      title: stripHtml(extractTag(block, 'title')),
      link: extractTag(block, 'link'),
      pubDate: extractTag(block, 'pubDate') || extractTag(block, 'dc:date'),
      description: stripHtml(extractTag(block, 'description')).slice(0, 200),
    })
  }

  return { title: channelTitle || url, items }
}
