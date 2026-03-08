// ============================================================
// Scraper — lightweight fetch-based text extractor (no headless browser)
// Used for sources that don't offer RSS or need enrichment
// ============================================================

const FETCH_TIMEOUT_MS = 10000
const MAX_TEXT_LENGTH  = 4000

// ─── HTML text extractor ─────────────────────────────────────────────────

function extractMetaContent(html, name) {
  const patterns = [
    new RegExp(`<meta[^>]+name=["']${name}["'][^>]+content=["']([^"']+)["']`, 'i'),
    new RegExp(`<meta[^>]+content=["']([^"']+)["'][^>]+name=["']${name}["']`, 'i'),
    new RegExp(`<meta[^>]+property=["']${name}["'][^>]+content=["']([^"']+)["']`, 'i'),
    new RegExp(`<meta[^>]+content=["']([^"']+)["'][^>]+property=["']${name}["']`, 'i'),
  ]
  for (const re of patterns) {
    const m = html.match(re)
    if (m) return m[1].trim()
  }
  return ''
}

function extractTitle(html) {
  const og  = extractMetaContent(html, 'og:title')
  if (og)  return og
  const tw  = extractMetaContent(html, 'twitter:title')
  if (tw)  return tw
  const tag = html.match(/<title[^>]*>([^<]+)<\/title>/i)
  return tag ? tag[1].trim() : ''
}

function extractDescription(html) {
  const og = extractMetaContent(html, 'og:description')
  if (og)  return og
  const desc = extractMetaContent(html, 'description')
  if (desc) return desc
  const tw = extractMetaContent(html, 'twitter:description')
  return tw || ''
}

// Extract visible text from main article body (best-effort)
function extractBodyText(html) {
  // Remove script, style, nav, header, footer, aside
  let clean = html
    .replace(/<script[\s\S]*?<\/script>/gi, '')
    .replace(/<style[\s\S]*?<\/style>/gi, '')
    .replace(/<nav[\s\S]*?<\/nav>/gi, '')
    .replace(/<header[\s\S]*?<\/header>/gi, '')
    .replace(/<footer[\s\S]*?<\/footer>/gi, '')
    .replace(/<aside[\s\S]*?<\/aside>/gi, '')

  // Try to isolate article/main content
  const articleMatch = clean.match(/<article[^>]*>([\s\S]*?)<\/article>/i)
    || clean.match(/<main[^>]*>([\s\S]*?)<\/main>/i)
    || clean.match(/<div[^>]+class="[^"]*(?:article|content|body)[^"]*"[^>]*>([\s\S]*?)<\/div>/i)

  const body = articleMatch ? articleMatch[1] : clean

  return body
    .replace(/<[^>]+>/g, ' ')
    .replace(/\s+/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&nbsp;/g, ' ')
    .replace(/&#(\d+);/g, (_, n) => String.fromCharCode(parseInt(n, 10)))
    .trim()
    .slice(0, MAX_TEXT_LENGTH)
}

// ─── Main scraper function ────────────────────────────────────────────────

export async function scrapeUrl(url, opts = {}) {
  const { credibility = 0.5, category = 'ACTUALIDAD', sourceKey = 'scraper', sourceLabel = 'Web' } = opts
  const controller = new AbortController()
  const timer = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS)

  try {
    const res = await fetch(url, {
      signal: controller.signal,
      headers: {
        'User-Agent': 'Mozilla/5.0 (compatible; PrediMarket/1.0)',
        'Accept':     'text/html,application/xhtml+xml',
        'Accept-Language': 'es-ES,es;q=0.9,en;q=0.5',
      },
    })
    clearTimeout(timer)

    if (!res.ok) return { url, item: null, error: `HTTP ${res.status}` }

    const html = await res.text()
    const title       = extractTitle(html)
    const description = extractDescription(html)
    const bodyText    = extractBodyText(html)

    if (!title || title.length < 5) {
      return { url, item: null, error: 'No title extracted' }
    }

    return {
      url,
      item: {
        title,
        description: description || bodyText.slice(0, 300),
        raw_text:    bodyText,
        url,
        publishedAt: null,   // scraped pages may not have dates
        sourceKey,
        sourceLabel,
        category,
        credibility,
        language: 'es',
      },
      error: null,
    }
  } catch (err) {
    clearTimeout(timer)
    return {
      url,
      item:  null,
      error: err.name === 'AbortError' ? 'Timeout' : err.message,
    }
  }
}

// ─── Batch scrape ─────────────────────────────────────────────────────────

export async function scrapeUrls(urls, opts = {}) {
  // Stagger requests to be polite (100ms between each)
  const results = []
  for (const url of urls) {
    results.push(await scrapeUrl(url, opts))
    await new Promise(r => setTimeout(r, 100))
  }
  return results
}
