import { C } from '../lib/theme'

export default function ProbabilityChart({ priceHistory, market }) {
  if (!market) return null

  const rawPrices = (priceHistory || []).map(p => parseFloat(p.yes_price))
  const currentPrice = parseFloat(market.prices?.yes || 50)
  const prices = rawPrices.length > 0 ? [50, ...rawPrices, currentPrice] : [50, currentPrice]

  if (prices.length < 2) {
    return (
      <div style={{ padding: 24, textAlign: 'center', color: C.textDim, fontSize: 13 }}>
        Sin historial de precios
      </div>
    )
  }

  const minP = Math.max(0, Math.min(...prices) - 5)
  const maxP = Math.min(100, Math.max(...prices) + 5)
  const range = maxP - minP || 1
  const first = prices[0], last = prices[prices.length - 1]
  const trend = last > first ? C.yes : last < first ? C.no : C.accent

  return (
    <div style={{ padding: '14px 16px', background: C.surface, border: `1px solid ${C.cardBorder}`, borderRadius: 8 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
        <div style={{
          fontSize: 12, fontWeight: 600, color: C.textDim,
          letterSpacing: '0.06em', textTransform: 'uppercase',
        }}>Precio SÍ</div>
        <div style={{ fontSize: 12, display: 'flex', gap: 8, alignItems: 'baseline' }}>
          <span style={{ fontFamily: 'ui-monospace, monospace', fontWeight: 700, fontSize: 20, color: trend }}>
            {last.toFixed(1)}¢
          </span>
          <span style={{ color: last > first ? C.yes : C.no, fontSize: 11, fontFamily: 'ui-monospace, monospace' }}>
            {last > first ? '+' : ''}{(last - first).toFixed(1)} pts
          </span>
        </div>
      </div>

      <div style={{ height: 160, position: 'relative' }}>
        <svg width="100%" height="100%" viewBox="0 0 100 100" preserveAspectRatio="none">
          <defs>
            <linearGradient id="chartGrad" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor={trend} stopOpacity="0.15" />
              <stop offset="100%" stopColor={trend} stopOpacity="0.01" />
            </linearGradient>
          </defs>
          <polygon
            points={`0,100 ${prices.map((p, i) => `${(i / Math.max(prices.length - 1, 1)) * 100},${100 - ((p - minP) / range) * 100}`).join(' ')} 100,100`}
            fill="url(#chartGrad)" stroke="none"
          />
          <polyline
            points={prices.map((p, i) => `${(i / Math.max(prices.length - 1, 1)) * 100},${100 - ((p - minP) / range) * 100}`).join(' ')}
            fill="none" stroke={trend} strokeWidth="1.5" vectorEffect="non-scaling-stroke"
          />
          {/* 50% reference line */}
          <line
            x1="0" y1={`${100 - ((50 - minP) / range) * 100}`}
            x2="100" y2={`${100 - ((50 - minP) / range) * 100}`}
            stroke={C.textDim} strokeWidth="0.5" strokeDasharray="2,3"
            vectorEffect="non-scaling-stroke" opacity="0.4"
          />
        </svg>
      </div>

      <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 9, color: C.textDim, marginTop: 6 }}>
        <span>Apertura 50%</span>
        <span>Ahora {currentPrice.toFixed(1)}%</span>
      </div>

      <div style={{ display: 'flex', gap: 16, marginTop: 14, paddingTop: 12, borderTop: `1px solid ${C.divider}`, flexWrap: 'wrap' }}>
        {[
          { k: 'Volumen',  v: `€${((market.total_volume || 0) / 1000).toFixed(1)}K` },
          { k: 'Traders',  v: `${market.active_traders || market.total_traders || 0}` },
          market.vol_24h != null
            ? { k: 'Vol. 24h', v: `${parseFloat(market.vol_24h).toFixed(2)}pp` }
            : null,
          market.prob_change_24h != null
            ? { k: 'Δ 24h', v: `${parseFloat(market.prob_change_24h) > 0 ? '+' : ''}${parseFloat(market.prob_change_24h).toFixed(1)}pp`, change: parseFloat(market.prob_change_24h) }
            : null,
          { k: 'Cierre', v: (() => {
            const diff = new Date(market.close_date) - new Date()
            if (diff < 0) return 'Expirado'
            const h = Math.floor(diff / 3600000), m = Math.floor((diff % 3600000) / 60000)
            if (h > 24) return `${Math.floor(h / 24)}d ${h % 24}h`
            if (h > 0) return `${h}h ${m}m`
            return `${m}m`
          })() },
        ].filter(Boolean).map(({ k, v, change }) => (
          <div key={k}>
            <div style={{
              fontSize: 9, fontWeight: 600, letterSpacing: '0.07em',
              textTransform: 'uppercase', color: C.textDim, marginBottom: 3,
            }}>{k}</div>
            <div style={{
              fontSize: 13, fontWeight: 600, fontFamily: 'ui-monospace, monospace',
              color: change != null ? (change > 0 ? C.yes : change < 0 ? C.no : C.textDim) : C.text,
            }}>{v}</div>
          </div>
        ))}
      </div>
    </div>
  )
}
