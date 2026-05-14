import { useEffect, useState } from 'react'
import { fetchRss } from '../lib/data'
import type { RssResult } from '../types'

interface SavedFeed {
  url: string
  data: RssResult | null
  error: string | null
  loading: boolean
}

const STORAGE_KEY = 'threatfront-rss-feeds'

function loadFeeds(): string[] {
  try { return JSON.parse(localStorage.getItem(STORAGE_KEY) || '[]') } catch { return [] }
}

function saveFeeds(urls: string[]) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(urls))
}

async function refreshAll(feeds: SavedFeed[]): Promise<SavedFeed[]> {
  return Promise.all(feeds.map(async (feed) => {
    try {
      const data = await fetchRss(feed.url)
      return { ...feed, data, error: null, loading: false }
    } catch (err: any) {
      return { ...feed, error: err.message, loading: false }
    }
  }))
}

export function RssFeed() {
  const [feeds, setFeeds] = useState<SavedFeed[]>([])
  const [input, setInput] = useState('')
  const [adding, setAdding] = useState(false)

  useEffect(() => {
    const urls = loadFeeds()
    const initial = urls.map((url) => ({ url, data: null, error: null, loading: true }))
    setFeeds(initial)
    refreshAll(initial).then(setFeeds)
  }, [])

  useEffect(() => {
    const timer = setInterval(() => {
      setFeeds((prev) => {
        refreshAll(prev).then(setFeeds)
        return prev
      })
    }, 300000)
    return () => clearInterval(timer)
  }, [])

  function addFeed() {
    const url = input.trim()
    if (!url || adding) return
    setAdding(true)
    const urls = loadFeeds()
    if (urls.includes(url)) { setAdding(false); setInput(''); return }
    urls.push(url)
    saveFeeds(urls)
    setFeeds((prev) => [...prev, { url, data: null, error: null, loading: true }])
    setInput('')
    setAdding(false)
  }

  function removeFeed(url: string) {
    const urls = loadFeeds().filter((u) => u !== url)
    saveFeeds(urls)
    setFeeds((prev) => prev.filter((f) => f.url !== url))
  }

  function timeAgo(dateStr: string): string {
    const sec = Math.floor((Date.now() - new Date(dateStr).getTime()) / 1000)
    if (!dateStr || isNaN(sec)) return ''
    if (sec < 60) return `${sec}s`
    if (sec < 3600) return `${Math.floor(sec / 60)}m`
    if (sec < 86400) return `${Math.floor(sec / 3600)}h`
    return `${Math.floor(sec / 86400)}d`
  }

  return (
    <div className="panel h-full flex flex-col overflow-hidden">
      <div className="panel-title">RSS Feeds</div>
      <div className="flex gap-1 mb-1.5">
        <input
          className="flex-1 bg-white/5 border border-white/10 rounded px-2 py-1 text-[11px] text-white/70 outline-none focus:border-accent-cyan/50"
          placeholder="Paste RSS URL..."
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && addFeed()}
        />
        <button
          className="text-[11px] px-2 py-1 rounded bg-accent-cyan/20 text-accent-cyan hover:bg-accent-cyan/30 transition-colors shrink-0"
          onClick={addFeed}
        >
          Add
        </button>
      </div>
      <div className="overflow-y-auto flex-1 space-y-1.5">
        {feeds.length === 0 && (
          <div className="text-[11px] text-white/20 text-center py-3">No feeds added yet</div>
        )}
        {feeds.map((feed) => (
          <div key={feed.url} className="text-[11px]">
            <div className="flex items-center justify-between mb-0.5">
              <span className="text-white/40 truncate text-[10px]">{feed.data?.title || feed.url.replace(/^https?:\/\//, '').slice(0, 40)}</span>
              <button
                className="text-white/20 hover:text-accent-red transition-colors text-[10px] shrink-0 ml-1"
                onClick={() => removeFeed(feed.url)}
              >
                ✕
              </button>
            </div>
            {feed.loading && <div className="text-white/20 text-[10px]">Loading...</div>}
            {feed.error && <div className="text-accent-red text-[10px]">{feed.error}</div>}
            {feed.data?.items.slice(0, 4).map((item, i) => (
              <a
                key={i}
                href={item.link}
                target="_blank"
                rel="noopener noreferrer"
                className="block text-white/60 hover:text-accent-cyan transition-colors truncate"
              >
                <span className="text-accent-cyan mr-1">›</span>
                {item.title}
                {item.pubDate && <span className="text-white/20 ml-1 text-[10px]">{timeAgo(item.pubDate)}</span>}
              </a>
            ))}
          </div>
        ))}
      </div>
    </div>
  )
}
