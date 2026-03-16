import MarketSection from './MarketSection'

// ─── Helpers ──────────────────────────────────────────────────────────────

function resolveTs(market) {
  return new Date(market.resolution_time || market.close_date).getTime()
}

function durationHours(market) {
  if (market.resolution_time && market.created_at) {
    return (new Date(market.resolution_time) - new Date(market.created_at)) / 3600000
  }
  if (market.close_date && market.created_at) {
    return (new Date(market.close_date) - new Date(market.created_at)) / 3600000
  }
  return 999
}

// ─── HomeSections ─────────────────────────────────────────────────────────
// Pure client-side filtering — uses the markets array already loaded by useMarkets().

export default function HomeSections({ markets, onOpen, onTrade }) {
  const now   = Date.now()
  const in24h = now + 24 * 3600000

  // Only active, non-expired, non-placeholder markets
  const active = markets.filter(m =>
    !m.isExpired && !m.placeholder && m.status !== 'RESOLVED' && m.status !== 'CLOSED'
  )

  // Deduplication — markets appear in at most one section (priority order)
  const used = new Set()
  function unique(list) {
    return list.filter(m => {
      if (used.has(m.id)) return false
      used.add(m.id)
      return true
    })
  }

  // 1. Resolving Today (highest priority)
  const resolvingToday = unique(
    active
      .filter(m => resolveTs(m) > now && resolveTs(m) < in24h)
      .sort((a, b) => resolveTs(a) - resolveTs(b))
      .slice(0, 8)
  )

  // 2. Fast Markets (≤24h duration)
  const fastMarkets = unique(
    active
      .filter(m => durationHours(m) <= 24)
      .sort((a, b) => new Date(b.created_at) - new Date(a.created_at))
      .slice(0, 8)
  )

  const CNMV_CATS = new Set(['ECONOMIA', 'TIPOS', 'ENERGIA'])

  // 3. Trending — top by total_volume in CNMV categories
  const trending = unique(
    active
      .filter(m => CNMV_CATS.has(m.category))
      .sort((a, b) => (parseFloat(b.total_volume) || 0) - (parseFloat(a.total_volume) || 0))
      .slice(0, 8)
  )

  // 4. Popular — top by active_traders in CNMV categories
  const popular = unique(
    active
      .filter(m => CNMV_CATS.has(m.category))
      .sort((a, b) => (parseFloat(b.active_traders) || 0) - (parseFloat(a.active_traders) || 0))
      .slice(0, 8)
  )

  // 5. España
  const espana = unique(
    active
      .filter(m =>
        m.super_category === 'SPAIN' ||
        (m.cluster_id && (
          m.cluster_id.startsWith('SPANISH') ||
          m.cluster_id.startsWith('ES_') ||
          m.cluster_id === 'LA_LIGA' ||
          m.cluster_id === 'CHAMPIONS_LEAGUE'
        ))
      )
      .sort((a, b) => new Date(b.created_at) - new Date(a.created_at))
      .slice(0, 8)
  )

  // 0. Featured (highest priority, before all others)
  const featured = unique(
    active
      .filter(m => m.featured === true)
      .sort((a, b) => (b.popularity_score || 0) - (a.popularity_score || 0))
      .slice(0, 5)
  )

  const hasAnySections =
    featured.length > 0 || resolvingToday.length > 0 || fastMarkets.length > 0 ||
    trending.length > 0 || popular.length > 0 || espana.length > 0

  if (!hasAnySections) return null

  return (
    <div>
      <MarketSection icon="⭐" title="Destacados"        markets={featured}       onOpen={onOpen} onTrade={onTrade} />
      <MarketSection icon="🔥" title="Resuelven hoy"    markets={resolvingToday} onOpen={onOpen} onTrade={onTrade} />
      <MarketSection icon="⚡" title="Mercados rápidos" markets={fastMarkets}    onOpen={onOpen} onTrade={onTrade} />
      <MarketSection icon="📈" title="Trending"          markets={trending}       onOpen={onOpen} onTrade={onTrade} />
      <MarketSection icon="🏆" title="Más populares"     markets={popular}        onOpen={onOpen} onTrade={onTrade} />
      <MarketSection icon="🇪🇸" title="España"           markets={espana}         onOpen={onOpen} onTrade={onTrade} />
    </div>
  )
}
