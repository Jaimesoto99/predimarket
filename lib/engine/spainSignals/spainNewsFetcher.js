// ============================================================
// Spain News Fetcher — fetches and normalizes articles
// from Spanish media RSS sources.
//
// Uses the same XML parsing approach as the global rssFetcher
// but adds Spain-specific normalization.
// ============================================================

import { getActiveSpainSources } from './spainSourceRegistry'

const FETCH_TIMEOUT_MS = 8000
const MAX_ITEMS        = 15   // per source

// ─── Lightweight XML helpers (same as global rssFetcher) ─────────────────

function extractTag(block, tag) {
  const re = new RegExp(
    `<${tag}(?:\\s[^>]*)?>(?:<!\[CDATA\[)?([\\s\\S]*?)(?:\]\]>)?<\\/${tag}>`,
    'i'
  )
  const m = block.match(re)
  if (!m) return ''
  return m[1].replace(/<!\[CDATA\[|\]\]>/g, '').trim()
}

function extractLink(block) {
  const atomMatch = block.match(/<link[^>]+href="([^"]+)"/)
  if (atomMatch) return atomMatch[1].trim()
  const rssMatch  = block.match(/<link>([^<]+)<\/link>/)
  return rssMatch ? rssMatch[1].trim() : ''
}

function cleanText(str) {
  return (str || '')
    .replace(/<[^>]+>/g, ' ')
    .replace(/&amp;/g, '&').replace(/&lt;/g, '<').replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"').replace(/&#39;/g, "'").replace(/&nbsp;/g, ' ')
    .replace(/\s+/g, ' ').trim()
}

function parseItems(xml) {
  const items   = []
  const itemRE  = /<item[^>]*>([\s\S]*?)<\/item>/gi
  const entryRE = /<entry[^>]*>([\s\S]*?)<\/entry>/gi
  let m

  const regex = xml.includes('<entry') ? entryRE : itemRE
  while ((m = regex.exec(xml)) !== null) {
    const block       = m[1]
    const title       = cleanText(extractTag(block, 'title'))
    const description = cleanText(extractTag(block, 'description') || extractTag(block, 'summary'))
    const link        = extractLink(block)
    const pubDate     = extractTag(block, 'pubDate') || extractTag(block, 'published') || extractTag(block, 'updated')

    if (title) items.push({ title, description: description.slice(0, 400), link, pubDate })
    if (items.length >= MAX_ITEMS) break
  }

  return items
}

// ─── Fetch a single source ────────────────────────────────────────────────

async function fetchSource(source) {
  try {
    const res = await fetch(source.url, {
      headers: { 'User-Agent': 'PrediMarket-SpainBot/1.0', 'Accept': 'application/rss+xml, application/xml, text/xml, */*' },
      signal:  AbortSignal.timeout(FETCH_TIMEOUT_MS),
    })
    if (!res.ok) return { source: source.key, items: [], error: `HTTP ${res.status}` }

    const xml   = await res.text()
    const items = parseItems(xml)

    return {
      source:    source.key,
      label:     source.label,
      items:     items.map(item => ({
        ...item,
        source_key:     source.key,
        source_label:   source.label,
        category:       source.category,
        spain_category: source.spainCategory,
        credibility:    source.credibility,
        language:       'es',
        published_at:   item.pubDate ? new Date(item.pubDate).toISOString() : new Date().toISOString(),
      })),
      error: null,
    }
  } catch (err) {
    return { source: source.key, items: [], error: err.message }
  }
}

// ─── Fetch all Spain sources ──────────────────────────────────────────────

export async function fetchSpainNews() {
  const sources = getActiveSpainSources()

  const results = await Promise.allSettled(sources.map(fetchSource))

  let totalItems = 0
  let errors     = 0
  const allItems = []

  for (const result of results) {
    if (result.status === 'fulfilled') {
      allItems.push(...result.value.items)
      totalItems += result.value.items.length
      if (result.value.error) errors++
    } else {
      errors++
    }
  }

  // Deduplicate by title similarity (exact title match)
  const seen  = new Set()
  const dedup = allItems.filter(item => {
    const key = item.title.toLowerCase().slice(0, 60)
    if (seen.has(key)) return false
    seen.add(key)
    return true
  })

  console.log(`[spainNewsFetcher] fetched ${totalItems} items from ${sources.length} sources (${errors} errors). Dedup: ${dedup.length}`)

  return { items: dedup, fetched: sources.length - errors, errors }
}
