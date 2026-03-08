// ============================================================
// Topic Analyzer — finds dominant topics in recent RSS articles
// and links them to related active markets.
//
// Pipeline:
//   1. Fetch articles from last 6h
//   2. Score each predefined topic by keyword hits × credibility
//   3. For each qualifying topic: find related active markets
//   4. Upsert to topic_signals table
//
// topic_signals schema:
//   topic, signal_strength, related_market_ids, article_count,
//   sample_headlines, computed_at
// ============================================================

import { createClient } from '@supabase/supabase-js'

function getSupabase() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY
  )
}

// ─── Topic definitions ────────────────────────────────────────────────────

const TOPICS = [
  {
    id:       'IBEX_MARKETS',
    label:    'IBEX 35 y Bolsa Española',
    keywords: ['ibex', 'bolsa', 'madrid', 'mercados', 'acciones', 'bursátil'],
    category: 'ECONOMIA',
  },
  {
    id:       'ECB_RATES',
    label:    'Tipos de Interés BCE / Fed',
    keywords: ['bce', 'ecb', 'fed', 'tipos', 'interés', 'interest rate', 'rate cut', 'rate hike', 'euribor'],
    category: 'ECONOMIA',
  },
  {
    id:       'CRYPTO_PRICES',
    label:    'Criptomonedas',
    keywords: ['bitcoin', 'btc', 'ethereum', 'eth', 'crypto', 'cripto', 'blockchain'],
    category: 'CRIPTO',
  },
  {
    id:       'ENERGY_PRICES',
    label:    'Precio de la Energía',
    keywords: ['pvpc', 'luz', 'electricidad', 'mwh', 'brent', 'petróleo', 'oil', 'gas'],
    category: 'ENERGIA',
  },
  {
    id:       'SPANISH_FOOTBALL',
    label:    'Fútbol Español',
    keywords: ['real madrid', 'barcelona', 'atlético', 'atletico', 'laliga', 'la liga', 'champions'],
    category: 'DEPORTES',
  },
  {
    id:       'SPAIN_POLITICS',
    label:    'Política Española',
    keywords: ['gobierno', 'congreso', 'sánchez', 'sanchez', 'pp', 'psoe', 'senado', 'ley', 'decreto'],
    category: 'POLITICA',
  },
  {
    id:       'EU_POLITICS',
    label:    'Unión Europea',
    keywords: ['comisión europea', 'european commission', 'parlamento europeo', 'bruselas', 'von der leyen'],
    category: 'GEOPOLITICA',
  },
  {
    id:       'INFLATION_DATA',
    label:    'Inflación y Datos Macro',
    keywords: ['ipc', 'inflación', 'inflation', 'cpi', 'pib', 'gdp', 'ine', 'eurostat'],
    category: 'ECONOMIA',
  },
  {
    id:       'AI_TECHNOLOGY',
    label:    'Inteligencia Artificial',
    keywords: ['inteligencia artificial', 'openai', 'gpt', 'nvidia', 'ai ', 'llm', 'chatgpt', 'gemini'],
    category: 'TECNOLOGIA',
  },
  {
    id:       'GEOPOLITICS',
    label:    'Geopolítica Global',
    keywords: ['guerra', 'conflicto', 'ucrania', 'rusia', 'israel', 'nato', 'otan', 'china', 'eeuu', 'trump'],
    category: 'GEOPOLITICA',
  },
]

const MIN_SIGNAL_STRENGTH = 0.15  // discard very weak signals

// ─── Score a topic against a set of articles ─────────────────────────────

function scoreTopic(topic, articles) {
  let totalScore    = 0
  let articleCount  = 0
  const headlines   = []

  for (const article of articles) {
    const text = `${article.title || ''} ${article.description || ''}`.toLowerCase()
    const hits = topic.keywords.filter(kw => text.includes(kw)).length

    if (hits > 0) {
      const articleScore = (hits / topic.keywords.length) * (article.credibility || 0.5)
      totalScore   += articleScore
      articleCount++
      if (headlines.length < 3) headlines.push(article.title?.slice(0, 120) || '')
    }
  }

  if (!articleCount) return null

  const strength = Math.min(1, totalScore / 3)  // normalise: 3.0 total = 1.0

  return { strength, articleCount, headlines }
}

// ─── Find related active markets for a topic ──────────────────────────────

function findRelatedMarkets(topic, markets) {
  const related = []

  for (const market of markets) {
    const text = `${market.title || ''} ${market.description || ''}`.toLowerCase()
    const hits = topic.keywords.filter(kw => text.includes(kw)).length

    // Also match by category
    const catMatch = market.category === topic.category

    if (hits > 0 || catMatch) {
      related.push({ id: market.id, hits, catMatch })
    }
  }

  return related
    .sort((a, b) => b.hits - a.hits)
    .slice(0, 10)
    .map(r => r.id)
}

// ─── Main analysis function ───────────────────────────────────────────────

export async function analyzeTopics() {
  const supabase = getSupabase()

  const since = new Date(Date.now() - 6 * 3600000).toISOString()

  // Fetch recent articles
  const { data: articles, error: aErr } = await supabase
    .from('articles')
    .select('id, title, description, credibility, source_label, ingested_at')
    .eq('processed', true)
    .gte('ingested_at', since)
    .order('ingested_at', { ascending: false })
    .limit(200)

  if (aErr || !articles?.length) return { topics: 0, articles: 0 }

  // Fetch active markets for linking
  const { data: markets } = await supabase
    .from('markets')
    .select('id, title, description, category')
    .eq('status', 'ACTIVE')
    .gt('close_date', new Date().toISOString())

  const now    = new Date().toISOString()
  const upsert = []

  for (const topic of TOPICS) {
    const result = scoreTopic(topic, articles)
    if (!result || result.strength < MIN_SIGNAL_STRENGTH) continue

    const relatedMarketIds = findRelatedMarkets(topic, markets || [])

    upsert.push({
      topic:              topic.id,
      label:              topic.label,
      category:           topic.category,
      signal_strength:    parseFloat(result.strength.toFixed(4)),
      article_count:      result.articleCount,
      sample_headlines:   result.headlines,
      related_market_ids: relatedMarketIds,
      computed_at:        now,
    })

    console.log('[topicAnalyzer]', topic.id,
      `strength:${result.strength.toFixed(3)} articles:${result.articleCount} markets:${relatedMarketIds.length}`)
  }

  if (upsert.length) {
    // Upsert by topic key (best-effort — table may not exist yet)
    await supabase
      .from('topic_signals')
      .upsert(upsert, { onConflict: 'topic' })
      .catch(err => console.error('[topicAnalyzer] upsert error:', err.message))
  }

  return {
    topics:   upsert.length,
    articles: articles.length,
    signals:  upsert.map(u => ({ topic: u.topic, strength: u.signal_strength })),
  }
}
