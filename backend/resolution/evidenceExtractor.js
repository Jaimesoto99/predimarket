// ============================================================
// Evidence Extractor — pulls supporting articles from the DB
// when a market is being resolved, attaches them as evidence.
//
// Evidence object:
//   { source, headline, url, publishedAt, credibilityScore }
// ============================================================

import { createClient } from '@supabase/supabase-js'

function getSupabase() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY
  )
}

// Keyword set for matching articles to a market
function buildKeywords(market) {
  const t     = (market.title || '').toLowerCase()
  const words = t.split(/\s+/).filter(w => w.length > 4)

  // Add entity-specific keywords
  const ENTITY_KEYWORDS = {
    ibex:      ['ibex', 'bolsa española', 'bolsa madrid'],
    bitcoin:   ['bitcoin', 'btc', 'crypto'],
    ethereum:  ['ethereum', 'eth'],
    brent:     ['brent', 'petróleo', 'petroleo', 'crude'],
    luz:       ['pvpc', 'electricidad', 'precio luz', 'mwh'],
    real:      ['real madrid'],
    barcelona: ['fc barcelona', 'barça'],
    atlético:  ['atlético', 'atletico'],
    ipc:       ['ipc', 'inflación', 'inflacion'],
    euribor:   ['euribor'],
    pib:       ['pib', 'producto interior'],
  }

  const extra = []
  for (const [key, kws] of Object.entries(ENTITY_KEYWORDS)) {
    if (t.includes(key)) extra.push(...kws)
  }

  return [...new Set([...words.slice(0, 6), ...extra])]
}

// ─── Fetch supporting articles from DB ────────────────────────────────────

export async function extractEvidence(market, { sinceHours = 48, maxItems = 5 } = {}) {
  const supabase = getSupabase()
  const since    = new Date(Date.now() - sinceHours * 3600000).toISOString()
  const keywords = buildKeywords(market)

  if (!keywords.length) return []

  try {
    // Fetch recent processed articles
    const { data: articles, error } = await supabase
      .from('articles')
      .select('id, title, url, source_label, credibility, published_at, ingested_at')
      .eq('processed', true)
      .gte('ingested_at', since)
      .order('credibility', { ascending: false })
      .limit(100)

    if (error || !articles?.length) return []

    // Score each article by keyword overlap
    const scored = articles
      .map(a => {
        const text  = (a.title || '').toLowerCase()
        const hits  = keywords.filter(kw => text.includes(kw)).length
        const score = hits * (a.credibility || 0.5)
        return { ...a, _score: score }
      })
      .filter(a => a._score > 0)
      .sort((a, b) => b._score - a._score)
      .slice(0, maxItems)

    return scored.map(a => ({
      source:           a.source_label || 'Unknown',
      headline:         a.title,
      url:              a.url || null,
      publishedAt:      a.published_at || a.ingested_at,
      credibilityScore: a.credibility || 0.5,
    }))
  } catch (err) {
    console.error('[evidenceExtractor] error:', err.message)
    return []
  }
}

// ─── Combined credibility score of evidence set ───────────────────────────

export function computeEvidenceCredibility(evidenceList) {
  if (!evidenceList?.length) return 0
  const total = evidenceList.reduce((s, e) => s + (e.credibilityScore || 0), 0)
  return total / evidenceList.length
}
