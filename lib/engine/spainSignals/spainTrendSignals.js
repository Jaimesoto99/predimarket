// ============================================================
// Spain Trend Signals — detects trending topics in Spain
//
// Sources:
//   1. Google Trends Spain RSS (free, public)
//   2. Keyword frequency analysis over fetched articles
//
// Returns: Array<{ keyword, score, source, category }>
// ============================================================

// ─── Google Trends Spain RSS ──────────────────────────────────────────────

async function fetchGoogleTrendsES() {
  try {
    const res = await fetch(
      'https://trends.google.es/trending/rss?geo=ES',
      {
        headers: { 'User-Agent': 'Forsii-SpainBot/1.0', 'Accept': 'application/rss+xml' },
        signal:  AbortSignal.timeout(8000),
      }
    )
    if (!res.ok) return []

    const xml      = await res.text()
    const titleRE  = /<title[^>]*>(?:<!\[CDATA\[)?([^<\]]+)(?:\]\]>)?<\/title>/gi
    const titles   = []
    let m

    while ((m = titleRE.exec(xml)) !== null) {
      const t = m[1].trim()
      if (t && t.length > 2 && t !== 'Google Trends' && !t.startsWith('http')) {
        titles.push(t)
      }
    }

    // First title is usually the feed title — skip it
    return titles.slice(1, 21).map((kw, i) => ({
      keyword:  kw,
      score:    1 - (i / 20),        // rank 1 = score 1.0, rank 20 = score 0.05
      source:   'Google Trends ES',
      raw_rank: i + 1,
    }))
  } catch (err) {
    console.error('[spainTrends] Google Trends fetch error:', err.message)
    return []
  }
}

// ─── Keyword frequency from article titles ────────────────────────────────
// Detects suddenly-frequent terms (>= 3 articles in 3h = "trending")

const STOPWORDS = new Set([
  'de','la','el','en','y','a','que','los','las','del','se','un','una','con',
  'por','al','es','su','para','como','le','más','pero','este','esta','o',
  'entre','ya','cuando','si','ante','sobre','uno','hay','ser','ha','era',
  'no','lo','son','fue','han','hasta','donde','tanto','puede','esto',
])

function extractKeywords(title) {
  return title
    .toLowerCase()
    .normalize('NFD').replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z\s]/g, ' ')
    .split(/\s+/)
    .filter(w => w.length >= 4 && !STOPWORDS.has(w))
}

function detectFrequencyTrends(articles) {
  const counts = {}
  for (const article of articles) {
    const kws = extractKeywords(article.title || '')
    for (const kw of kws) {
      counts[kw] = (counts[kw] || 0) + (article.credibility || 0.5)
    }
  }

  // Bigrams (two-word phrases) from higher-credibility articles
  for (const article of articles) {
    if ((article.credibility || 0) < 0.8) continue
    const words = article.title.toLowerCase().split(/\s+/).filter(w => w.length >= 3)
    for (let i = 0; i < words.length - 1; i++) {
      const bigram = `${words[i]} ${words[i+1]}`
      if (bigram.length >= 8) counts[bigram] = (counts[bigram] || 0) + 0.5
    }
  }

  return Object.entries(counts)
    .filter(([, score]) => score >= 1.5)      // at least ~3 mentions
    .sort(([, a], [, b]) => b - a)
    .slice(0, 15)
    .map(([keyword, score]) => ({
      keyword,
      score:  Math.min(1, score / 5),          // normalize: 5 = 1.0
      source: 'Frequency analysis',
    }))
}

// ─── Category inference for trending keywords ─────────────────────────────

const CATEGORY_PATTERNS = [
  { cat: 'DEPORTE_ES',   patterns: /futbol|liga|champions|barça|madrid|atletico|gol|partido|champion|deportes|f1|tenis|baloncesto/i },
  { cat: 'POLITICA_ES',  patterns: /sanchez|gobierno|pp|psoe|vox|congreso|elecciones|partido|ley|ministro|presidente/i },
  { cat: 'ECONOMIA_ES',  patterns: /ibex|bolsa|precio|inflacion|ipc|pib|banco|deuda|sueldo|salario|pension|economia/i },
  { cat: 'CULTURA_ES',   patterns: /pelicula|serie|musica|cancion|eurovision|festival|teatro|libro|arte|cine|famoso/i },
  { cat: 'LA_PLAZA',     patterns: /huelga|manifestacion|accidente|catastrofe|temporal|incendio|terremoto|fallece|muere/i },
]

function inferSpainCategory(keyword) {
  for (const { cat, patterns } of CATEGORY_PATTERNS) {
    if (patterns.test(keyword)) return cat
  }
  return 'ACTUALIDAD_ES'
}

// ─── Main export ──────────────────────────────────────────────────────────

export async function detectSpainTrends(articles = []) {
  const [gTrends, freqTrends] = await Promise.allSettled([
    fetchGoogleTrendsES(),
    Promise.resolve(detectFrequencyTrends(articles)),
  ])

  const gTrendsData   = gTrends.status   === 'fulfilled' ? gTrends.value   : []
  const freqData      = freqTrends.status === 'fulfilled' ? freqTrends.value : []

  // Merge and deduplicate
  const all  = [...gTrendsData, ...freqData]
  const seen = new Set()
  const dedup = all.filter(t => {
    const k = t.keyword.toLowerCase().slice(0, 20)
    if (seen.has(k)) return false
    seen.add(k)
    return true
  })

  const enriched = dedup.map(t => ({
    ...t,
    spain_category: inferSpainCategory(t.keyword),
  }))

  console.log(`[spainTrends] detected ${enriched.length} trending signals (${gTrendsData.length} Google, ${freqData.length} frequency)`)

  return enriched
}
