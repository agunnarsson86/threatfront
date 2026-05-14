import { useEffect, useState, useMemo, useRef } from 'react'
import { fetchRss } from '../lib/data'
import type { RssItem, RssResult } from '../types'

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

function timeAgo(dateStr: string): string {
  const sec = Math.floor((Date.now() - new Date(dateStr).getTime()) / 1000)
  if (!dateStr || isNaN(sec)) return ''
  if (sec < 60) return `${sec}s`
  if (sec < 3600) return `${Math.floor(sec / 60)}m`
  if (sec < 86400) return `${Math.floor(sec / 3600)}h`
  return `${Math.floor(sec / 86400)}d`
}

export function RssFeed() {
  const [feeds, setFeeds] = useState<SavedFeed[]>([])
  const [input, setInput] = useState('')
  const [adding, setAdding] = useState(false)
  const [showSettings, setShowSettings] = useState(false)
  const settingsRef = useRef<HTMLDivElement>(null)

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

  useEffect(() => {
    if (!showSettings) return
    function handleClick(e: MouseEvent) {
      if (settingsRef.current && !settingsRef.current.contains(e.target as Node)) {
        setShowSettings(false)
      }
    }
    function handleKey(e: KeyboardEvent) {
      if (e.key === 'Escape') setShowSettings(false)
    }
    document.addEventListener('mousedown', handleClick)
    document.addEventListener('keydown', handleKey)
    return () => {
      document.removeEventListener('mousedown', handleClick)
      document.removeEventListener('keydown', handleKey)
    }
  }, [showSettings])

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

  const flatItems = useMemo(() => {
    const seen = new Set<string>()
    const items: { item: RssItem; source: string }[] = []
    for (const feed of feeds) {
      if (!feed.data) continue
      for (const item of feed.data.items) {
        const key = `${feed.url}|${item.link}`
        if (seen.has(key)) continue
        seen.add(key)
        items.push({ item, source: feed.data.title })
      }
    }
    items.sort((a, b) => {
      const da = a.item.pubDate ? new Date(a.item.pubDate).getTime() : 0
      const db = b.item.pubDate ? new Date(b.item.pubDate).getTime() : 0
      return db - da
    })
    return items
  }, [feeds])

  const anyLoading = feeds.some((f) => f.loading)

  return (
    <div className="panel h-full flex flex-col">
      <div className="panel-title flex items-center justify-between">
        <span>RSS Feeds</span>
        <button
          onClick={() => setShowSettings(!showSettings)}
          className={`transition-colors text-xs ${showSettings ? 'text-accent-cyan' : 'text-white/30 hover:text-white/70'}`}
          title="Feed settings"
        >
          ⚙
        </button>
      </div>

      {showSettings && (
        <div ref={settingsRef} className="mb-2 p-2 rounded bg-white/5 border border-white/10 space-y-2">
          <div className="text-[10px] text-white/30 uppercase tracking-wider">Manage Feeds</div>
          <div className="flex gap-1">
            <input
              className="flex-1 bg-white/5 border border-white/10 rounded px-2 py-1 text-[11px] text-white/70 outline-none focus:border-accent-cyan/50"
              placeholder="Paste RSS URL..."
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && addFeed()}
              autoFocus
            />
            <button
              className="text-[11px] px-2 py-1 rounded bg-accent-cyan/20 text-accent-cyan hover:bg-accent-cyan/30 transition-colors shrink-0"
              onClick={addFeed}
            >
              Add
            </button>
          </div>
          <div className="space-y-1 max-h-32 overflow-y-auto">
            {feeds.map((feed) => (
              <div key={feed.url} className="flex items-center justify-between py-0.5">
                <span className="text-[11px] text-white/60 truncate">
                  {feed.loading ? 'Loading...' : feed.error ? <span className="text-accent-red">{feed.error}</span> : feed.data?.title || feed.url.replace(/^https?:\/\//, '').slice(0, 40)}
                </span>
                <button
                  className="text-white/20 hover:text-accent-red transition-colors text-[10px] shrink-0 ml-1"
                  onClick={() => removeFeed(feed.url)}
                >
                  ✕
                </button>
              </div>
            ))}
            {feeds.length === 0 && (
              <div className="text-[11px] text-white/20">No feeds saved yet</div>
            )}
          </div>
        </div>
      )}

      <div className="flex items-center text-[10px] text-white/30 mb-1 px-0.5">
        <span className="flex-1">Headline</span>
        <span className="w-16 text-right">Source</span>
      </div>

      <div className="overflow-y-auto flex-1 min-h-0">
        {flatItems.length === 0 && !anyLoading && (
          <div className="text-[11px] text-white/20 text-center py-3">No feeds added yet</div>
        )}
        {anyLoading && flatItems.length === 0 && (
          <div className="text-white/20 text-[10px] text-center py-3">Loading feeds...</div>
        )}
        <div className="space-y-0.5">
          {flatItems.map(({ item, source }, i) => (
            <a
              key={`${source}-${i}`}
              href={item.link}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-2 text-white/60 hover:text-accent-cyan transition-colors px-0.5 py-0.5 rounded hover:bg-white/[0.03]"
            >
              <span className="flex-1 truncate text-[11px]">
                <span className="text-accent-cyan mr-1">›</span>
                {item.title}
                {item.pubDate && <span className="text-white/20 ml-1 text-[10px]">{timeAgo(item.pubDate)}</span>}
              </span>
              <span className="w-16 text-right text-white/30 truncate text-[10px] shrink-0">{source}</span>
            </a>
          ))}
        </div>
      </div>
    </div>
  )
}
