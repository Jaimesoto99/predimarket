// ============================================================
// RSS Fetcher — parses RSS 2.0 and Atom feeds (no external deps)
// ============================================================

const FETCH_TIMEOUT_MS = 8000
const MAX_ITEMS_PER_FEED = 20

// ─── Lightweight XML helpers ──────────────────────────────────────────────

function extractTag(block, tag) {
  // Handles: <tag>text</tag>, <tag><![CDATA[text]]></tag>, <tag attr="x">text</tag>
  const re = new RegExp(
    `<${tag}(?:\\s[^>]*)?>(?:<!\\[CDATA\\[)?([\\s\\S]*?)(?:\\]\\]>)?<\\/${tag}>`,
    'i'
  )
  const m = block.match(re)
  if (!m) return ''
  return m[1].replace(/<!\[CDATA\[|\]\]>/g, '').trim()
}

function extractAttr(tag, attr) {
  const re = new RegExp(`${attr}="([^"]+)"`, 'i')
  const m = tag.match(re)
  return m ? m[1].trim() : ''
}

// For Atom <link href="..."/> or RSS <link>url</link>
function extractLink(block) {
  // Atom style: <link href="..." .../>
  const atomMatch = block.match(/<link[^>]+href="([^"]+)"/)
  if (atomMatch) return atomMatch[1].trim()
  // RSS style: <link>url</link>
  const rssMatch = block.match(/<link>([^<]+)<\/link>/i)
  if (rssMatch) return rssMatch[1].trim()
  // GUID as fallback
  const guid = extractTag(block, 'guid')
  if (guid && (guid.startsWith('http://') || guid.startsWith('https://'))) return guid
  return ''
}

function decodeEntities(str) {
  return str
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#039;/g, "'")
    .replace(/&apos;/g, "'")
    .replace(/&nbsp;/g, ' ')
    .replace(/&#(\d+);/g, (_, n) => String.fromCharCode(parseInt(n, 10)))
}

function stripHtml(str) {
  return str.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim()
}

function parseDate(str) {
  if (!str) return null
  try {
    const d = new Date(str)
    return isNaN(d.getTime()) ? null : d.toISOString()
  } catch {
    return null
  }
}

// ─── Parse RSS 2.0 ────────────────────────────────────────────────────────

function parseRSS(xml) {
  const items = []
  const itemRe = /<item(?:\s[^>]*)?>[\s\S]*?<\/item>/gi
  let m
  while ((m = itemRe.exec(xml)) !== null && items.length < MAX_ITEMS_PER_FEED) {
    const block = m[0]
    items.push({
      title:       decodeEntities(stripHtml(extractTag(block, 'title'))),
      description: decodeEntities(stripHtml(
        extractTag(block, 'description') || extractTag(block, 'content:encoded') || ''
      )),
      url:         extractLink(block),
      publishedAt: parseDate(extractTag(block, 'pubDate') || extractTag(block, 'dc:date')),
    })
  }
  return items
}

// ─── Parse Atom ───────────────────────────────────────────────────────────

function parseAtom(xml) {
  const items = []
  const entryRe = /<entry(?:\s[^>]*)?>[\s\S]*?<\/entry>/gi
  let m
  while ((m = entryRe.exec(xml)) !== null && items.length < MAX_ITEMS_PER_FEED) {
    const block = m[0]
    items.push({
      title:       decodeEntities(stripHtml(extractTag(block, 'title'))),
      description: decodeEntities(stripHtml(
        extractTag(block, 'summary') || extractTag(block, 'content') || ''
      )),
      url:         extractLink(block),
      publishedAt: parseDate(extractTag(block, 'published') || extractTag(block, 'updated')),
    })
  }
  return items
}

// ─── Main fetcher ─────────────────────────────────────────────────────────

export async function fetchFeed(source) {
  const controller = new AbortController()
  const timer = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS)

  try {
    const res = await fetch(source.url, {
      signal: controller.signal,
      headers: {
        'User-Agent': 'Forsii-Engine/1.0 (prediction market; news aggregator)',
        'Accept':     'application/rss+xml, application/atom+xml, application/xml, text/xml, */*',
        'Cache-Control': 'no-cache',
      },
    })
    clearTimeout(timer)

    if (!res.ok) {
      return { source: source.key, items: [], error: `HTTP ${res.status}` }
    }

    const xml = await res.text()
    const isAtom = xml.includes('<feed') && xml.includes('xmlns')
    const items = isAtom ? parseAtom(xml) : parseRSS(xml)

    // Filter out items without URL or title, add source metadata
    const valid = items
      .filter(i => i.url && i.title && i.title.length > 5)
      .map(i => ({
        ...i,
        sourceKey:   source.key,
        sourceLabel: source.label,
        category:    source.category,
        credibility: source.credibility,
        language:    source.language,
      }))

    return { source: source.key, items: valid, error: null }
  } catch (err) {
    clearTimeout(timer)
    const isTimeout = err.name === 'AbortError'
    return {
      source: source.key,
      items:  [],
      error:  isTimeout ? 'Timeout' : err.message,
    }
  }
}

// ─── Fetch multiple feeds in parallel ────────────────────────────────────

export async function fetchAllFeeds(sources) {
  const results = await Promise.allSettled(sources.map(s => fetchFeed(s)))

  const allItems = []
  const errors   = []
  let   fetched  = 0

  for (const result of results) {
    if (result.status === 'fulfilled') {
      const { source, items, error } = result.value
      if (error) {
        errors.push({ source, error })
      } else {
        allItems.push(...items)
        fetched++
      }
    } else {
      errors.push({ source: 'unknown', error: result.reason?.message })
    }
  }

  return { items: allItems, fetched, errors }
}
