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

export default function HomeSections({ markets, onOpen }) {
  const now   = Date.now()
  const in24h = now + 24 * 3600000

  // Only active, non-expired, non-placeholder markets
  const active = markets.filter(m =>
    !m.isExpired && !m.placeholder && m.status !== 'RESOLVED' && m.status !== 'CLOSED'
  )

  // 1. Resolving Today
  const resolvingToday = active
    .filter(m => resolveTs(m) > now && resolveTs(m) < in24h)
    .sort((a, b) => resolveTs(a) - resolveTs(b))
    .slice(0, 8)

  // 2. Fast Markets (≤24h duration)
  const fastMarkets = active
    .filter(m => durationHours(m) <= 24)
    .sort((a, b) => new Date(b.created_at) - new Date(a.created_at))
    .slice(0, 8)

  // 3. Trending
  const trending = active
    .filter(m => m.trending)
    .sort((a, b) => (parseFloat(b.prob_change_6h) || 0) - (parseFloat(a.prob_change_6h) || 0))
    .slice(0, 8)

  // 4. Popular
  const popular = active
    .filter(m => m.popularity_score != null)
    .sort((a, b) => (b.popularity_score || 0) - (a.popularity_score || 0))
    .slice(0, 8)

  // 5. España
  const espana = active
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

  const hasAnySections =
    resolvingToday.length > 0 || fastMarkets.length > 0 ||
    trending.length > 0 || popular.length > 0 || espana.length > 0

  if (!hasAnySections) return null

  return (
    <div>
      <MarketSection icon="🔥" title="Resuelven hoy"    markets={resolvingToday} onOpen={onOpen} />
      <MarketSection icon="⚡" title="Mercados rápidos" markets={fastMarkets}    onOpen={onOpen} />
      <MarketSection icon="📈" title="Trending"          markets={trending}       onOpen={onOpen} />
      <MarketSection icon="⭐" title="Más populares"     markets={popular}        onOpen={onOpen} />
      <MarketSection icon="🇪🇸" title="España"           markets={espana}         onOpen={onOpen} />
    </div>
  )
}
