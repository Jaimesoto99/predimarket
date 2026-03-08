// ============================================================
// Market Clusterer — groups active markets into topic clusters
//
// Strategy:
//   1. Primary cluster = category (ECONOMIA, DEPORTES, etc.)
//   2. Sub-cluster = shared entity keywords within category
//
// Named clusters:
//   ECONOMIA   → EU_ECONOMY | CRYPTO_MARKETS | COMMODITIES | RATES
//   DEPORTES   → SPANISH_FOOTBALL | EUROPEAN_FOOTBALL
//   POLITICA   → ES_POLITICS | EU_POLITICS
//   ENERGIA    → ELECTRICITY | OIL_GAS
//   TECNOLOGIA → AI_TECH | BIG_TECH
//   GEOPOLITICA→ WAR_CONFLICT | TRADE
//   (default)  → matches category key
//
// Result stored in markets.cluster_id
// ============================================================

import { createClient } from '@supabase/supabase-js'

function getSupabase() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY
  )
}

// ─── Sub-cluster rules (ordered: first match wins) ───────────────────────

const SUB_CLUSTER_RULES = [
  // ECONOMIA sub-clusters
  { cluster: 'CRYPTO_MARKETS',    test: t => /bitcoin|btc|ethereum|eth|cripto|crypto/i.test(t) },
  { cluster: 'RATES_INFLATION',   test: t => /euribor|tipo.*inter|inflaci[oó]n|ipc|bce|fed|rate/i.test(t) },
  { cluster: 'COMMODITIES',       test: t => /brent|petr[oó]leo|oro|gold|oil|commodity/i.test(t) },
  { cluster: 'STOCK_INDICES',     test: t => /ibex|s&p|nasdaq|dax|bolsa|[ií]ndice|dow/i.test(t) },
  { cluster: 'EU_ECONOMY',        test: t => /pib|gdp|euro.*zona|eurozona|ocde|eurostat/i.test(t) },

  // DEPORTES sub-clusters
  { cluster: 'CHAMPIONS_LEAGUE',  test: t => /champions|liga.*campeones/i.test(t) },
  { cluster: 'LA_LIGA',           test: t => /la liga|laliga|liga espa[nñ]ola/i.test(t) },
  { cluster: 'SPANISH_FOOTBALL',  test: t => /real madrid|barcelona|atl[eé]tico|sevilla|copa.*rey/i.test(t) },

  // ENERGIA sub-clusters
  { cluster: 'ELECTRICITY',       test: t => /luz|pvpc|mwh|electricidad|pool.*el[eé]ctrico/i.test(t) },
  { cluster: 'OIL_GAS',          test: t => /brent|petr[oó]leo|gas natural|wti/i.test(t) },

  // POLITICA sub-clusters
  { cluster: 'ES_POLITICS',       test: t => /congreso|sánchez|sanchez|pp|psoe|vox|gobierno.*esp/i.test(t) },
  { cluster: 'EU_POLITICS',       test: t => /comisi[oó]n.*europea|parlamento.*europeo|von der leyen/i.test(t) },

  // TECNOLOGIA sub-clusters
  { cluster: 'AI_TECH',           test: t => /inteligencia.*artificial|openai|gpt|llm|nvidia|ai /i.test(t) },
  { cluster: 'BIG_TECH',         test: t => /apple|microsoft|google|amazon|meta|alphabet/i.test(t) },

  // GEOPOLITICA sub-clusters
  { cluster: 'WAR_CONFLICT',      test: t => /guerra|conflicto|ucrania|rusia|israel|nato|otan/i.test(t) },
  { cluster: 'TRADE_GEOPOLITICS', test: t => /aranceles|tariff|comercio.*inter|china.*eeuu|trump.*trade/i.test(t) },
]

// ─── Assign cluster to a market ───────────────────────────────────────────

function assignCluster(market) {
  const text = `${market.title} ${market.description || ''}`.toLowerCase()

  for (const rule of SUB_CLUSTER_RULES) {
    if (rule.test(text)) return rule.cluster
  }

  // Fall back to category key
  return market.category || 'GENERAL'
}

// ─── Main clustering function ─────────────────────────────────────────────

export async function clusterMarkets() {
  const supabase = getSupabase()

  const { data: markets, error } = await supabase
    .from('markets')
    .select('id, title, description, category, status, close_date')
    .in('status', ['ACTIVE', 'CLOSING'])
    .gt('close_date', new Date().toISOString())

  if (error || !markets?.length) return { clustered: 0, clusters: {} }

  const clusterMap = {}

  const updates = markets.map(market => {
    const clusterId = assignCluster(market)
    clusterMap[clusterId] = (clusterMap[clusterId] || 0) + 1
    return supabase
      .from('markets')
      .update({ cluster_id: clusterId })
      .eq('id', market.id)
  })

  await Promise.all(updates)

  const sorted = Object.entries(clusterMap)
    .sort(([, a], [, b]) => b - a)

  console.log('[marketClusterer] clustered', markets.length, 'markets into', sorted.length, 'clusters')

  return {
    clustered: markets.length,
    clusters:  Object.fromEntries(sorted),
    topCluster: sorted[0]?.[0] || null,
  }
}
