// GET /api/admin/trending-spain?key=ADMIN_KEY
//
// Fetches the top 30 Spanish headlines from major RSS feeds published in the last 48h.
// Used by the oracle-rating system to score news relevance.
// Returns: { headlines, count, sources, fetched_at }

const FEEDS = [
  { name: 'El País',       url: 'https://feeds.elpais.com/mrss-s/pages/ep/site/elpais.com/portada' },
  { name: 'El Mundo',      url: 'https://e00-elmundo.uecdn.es/elmundo/rss/portada.xml' },
  { name: '20 Minutos',    url: 'https://www.20minutos.es/rss/' },
  { name: 'RTVE',          url: 'https://www.rtve.es/api/noticias.xml' },
  { name: 'La Vanguardia', url: 'https://www.lavanguardia.com/rss/home.xml' },
]

const STOP_WORDS = new Set([
  'el','la','los','las','un','una','unos','unas','de','del','al','en','es','se',
  'que','por','con','para','como','más','este','esta','su','sus','pero','ya','muy',
  'si','ha','han','sin','sobre','hasta','desde','lo','le','les','entre','durante',
  'tras','ante','bajo','bien','ser','estar','hay','haber','también','puede','cuando',
  'donde','porque','aunque','antes','después','sobre','cómo','qué','cuál','dónde',
  'cuándo','quién','cuáles','cuanto','cuanta','solo','solo','cada','otro','otra',
])

function extractKeywords(text) {
  return text
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9\s]/g, ' ')
    .split(/\s+/)
    .filter(w => w.length > 3 && !STOP_WORDS.has(w))
}

function extractTag(xml, tag) {
  const m = xml.match(
    new RegExp(`<${tag}(?:\\s[^>]*)?>(?:<!\\[CDATA\\[)?([\\s\\S]*?)(?:\\]\\]>)?<\/${tag}>`, 'i')
  )
  return m ? m[1].replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&amp;/g, '&').replace(/&quot;/g, '"').trim() : null
}

function parseRSS(xml, sourceName) {
  const items = []
  const itemMatches = xml.match(/<item[\s>][\s\S]*?<\/item>/gi) || []
  const cutoff = Date.now() - 48 * 3600 * 1000

  for (const item of itemMatches.slice(0, 20)) {
    const title = extractTag(item, 'title')
    if (!title || title.length < 10) continue

    const pubDate = extractTag(item, 'pubDate')
    if (pubDate) {
      const d = new Date(pubDate)
      if (!isNaN(d.getTime()) && d.getTime() < cutoff) continue
    }

    items.push({
      title:    title.trim(),
      source:   sourceName,
      date:     pubDate || null,
      keywords: extractKeywords(title),
    })
  }
  return items
}

async function fetchFeed(feed) {
  try {
    const controller = new AbortController()
    const timer = setTimeout(() => controller.abort(), 8000)
    const res = await fetch(feed.url, {
      headers: { 'User-Agent': 'Mozilla/5.0', 'Accept': 'application/xml,text/xml,*/*' },
      signal:  controller.signal,
    })
    clearTimeout(timer)
    if (!res.ok) return []
    const xml = await res.text()
    return parseRSS(xml, feed.name)
  } catch (e) {
    console.error(`[trending-spain] ${feed.name} failed:`, e.message)
    return []
  }
}

// Exported for use by oracle-rating without going through the HTTP endpoint
export async function fetchTrendingNews() {
  const results = await Promise.all(FEEDS.map(fetchFeed))
  const all     = results.flat()

  // Deduplicate by first 40 chars of title
  const seen   = new Set()
  const unique = []
  for (const item of all) {
    const key = item.title.toLowerCase().slice(0, 40)
    if (!seen.has(key)) {
      seen.add(key)
      unique.push(item)
    }
  }

  return unique.slice(0, 30)
}

export default async function handler(req, res) {
  if (req.method !== 'GET') return res.status(405).json({ error: 'Method not allowed' })

  const key      = (req.query.key || req.headers['x-admin-key'] || '').trim()
  const expected = (process.env.ADMIN_API_KEY || '').trim()
  if (!expected || key !== expected) return res.status(401).json({ error: 'No autorizado' })

  const headlines = await fetchTrendingNews()

  return res.status(200).json({
    headlines,
    count:      headlines.length,
    sources:    [...new Set(headlines.map(h => h.source))],
    fetched_at: new Date().toISOString(),
  })
}
