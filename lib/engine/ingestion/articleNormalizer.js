// ============================================================
// Article Normalizer — produces consistent article records
// Input:  raw items from rssFetcher or scraper
// Output: normalized records ready for articleQueue
// ============================================================

const MAX_TITLE_LENGTH       = 300
const MAX_DESCRIPTION_LENGTH = 1000
const MAX_RAW_TEXT_LENGTH    = 4000

// ─── Text utilities ───────────────────────────────────────────────────────

function cleanText(str) {
  if (!str) return ''
  return str
    .replace(/\s+/g, ' ')
    .replace(/[\u0000-\u001F\u007F-\u009F]/g, '')  // control chars
    .trim()
}

function truncate(str, max) {
  if (!str) return null
  const clean = cleanText(str)
  return clean.length > max ? clean.slice(0, max) + '...' : clean
}

// Generate a stable ID for dedup: normalize URL
function normalizeUrl(url) {
  try {
    const u = new URL(url)
    // Remove tracking params
    const TRACKING = ['utm_source','utm_medium','utm_campaign','utm_content','utm_term','ref','fbclid','gclid']
    TRACKING.forEach(p => u.searchParams.delete(p))
    // Remove trailing slash
    return u.toString().replace(/\/$/, '')
  } catch {
    return url
  }
}

// Detect language from text (Spanish vs English heuristic)
function detectLanguage(text) {
  if (!text) return 'es'
  const spanishWords = ['que','los','las','del','por','con','para','una','este','esta','como','son','más']
  const sample = text.toLowerCase().slice(0, 500).split(/\s+/)
  const hits = spanishWords.filter(w => sample.includes(w)).length
  return hits >= 3 ? 'es' : 'en'
}

// Infer category from text if not supplied
function inferCategory(title, description, sourceCategory) {
  if (sourceCategory) return sourceCategory
  const text = ((title || '') + ' ' + (description || '')).toLowerCase()
  if (/bitcoin|btc|ethereum|eth|cripto|crypto|blockchain|altcoin/.test(text)) return 'CRIPTO'
  if (/ibex|bolsa|acciones|bono|euríbor|euribor|economía|pib|inflación|ipc/.test(text)) return 'ECONOMIA'
  if (/real madrid|barcelona|fútbol|futbol|liga|champions|atlético|atletico|gol/.test(text)) return 'DEPORTES'
  if (/pvpc|luz|electricidad|mwh|kwh|energía|brent|petroleo|petróleo/.test(text)) return 'ENERGIA'
  if (/congreso|gobierno|psoe|pp|sánchez|sanchez|parlamento|ley|votación/.test(text)) return 'POLITICA'
  return 'ACTUALIDAD'
}

// ─── Main normalizer ──────────────────────────────────────────────────────

export function normalizeArticle(raw) {
  if (!raw || !raw.url || !raw.title) return null

  const url         = normalizeUrl(raw.url)
  const title       = truncate(raw.title, MAX_TITLE_LENGTH)
  const description = truncate(raw.description, MAX_DESCRIPTION_LENGTH)
  const rawText     = truncate(raw.raw_text || raw.description, MAX_RAW_TEXT_LENGTH)
  const language    = raw.language || detectLanguage(title + ' ' + description)
  const category    = inferCategory(title, description, raw.category)
  const publishedAt = raw.publishedAt
    ? new Date(raw.publishedAt).toISOString()
    : null

  if (!title || title.length < 5) return null

  return {
    url,
    title,
    description,
    raw_text:     rawText,
    source_key:   raw.sourceKey || 'unknown',
    source_label: raw.sourceLabel || raw.sourceKey || '',
    category,
    language,
    published_at: publishedAt,
    processed:    false,
    entities:     [],
    event_type:   null,
  }
}

// ─── Batch normalize ──────────────────────────────────────────────────────

export function normalizeArticles(rawItems) {
  const seen  = new Set()
  const result = []

  for (const raw of rawItems) {
    const article = normalizeArticle(raw)
    if (!article) continue

    // Dedup within batch by URL
    if (seen.has(article.url)) continue
    seen.add(article.url)

    result.push(article)
  }

  return result
}
