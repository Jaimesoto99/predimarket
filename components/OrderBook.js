import { C, computeAMMBook } from '../lib/theme'

export default function OrderBook({ market, orderBook }) {
  if (!market) return null

  const yp = parseFloat(market.yes_pool)
  const np = parseFloat(market.no_pool)
  const ammBook = computeAMMBook(yp, np)

  const hasBids = orderBook.some(o => o.side === 'YES')
  const hasAsks = orderBook.some(o => o.side === 'NO')

  const rawBids = hasBids
    ? orderBook.filter(o => o.side === 'YES').map(o => ({ price: o.target_price * 100, amount: parseFloat(o.total_amount) }))
    : ammBook.bids
  const rawAsks = hasAsks
    ? orderBook.filter(o => o.side === 'NO').map(o => ({ price: o.target_price * 100, amount: parseFloat(o.total_amount) }))
    : ammBook.asks

  // ASK: buy YES (green), sorted highest first (worst deal at top, best near center)
  const asksDesc = [...rawAsks].sort((a, b) => b.price - a.price)
  // BID: buy NO / sell YES (red), sorted highest first (best bid near center)
  const bidsDesc = [...rawBids].sort((a, b) => b.price - a.price)

  // Cumulative volume
  let askCum = 0
  const asksWithTot = asksDesc
    .map(l => { askCum += l.amount; return { ...l, total: askCum } })
    .reverse()
    .map((l, i, arr) => { const cum = arr.slice(0, i + 1).reduce((s, x) => s + x.amount, 0); return { ...l, total: cum } })
    .reverse()

  let bidCum = 0
  const bidsWithTot = bidsDesc.map(l => { bidCum += l.amount; return { ...l, total: bidCum } })

  const maxVol = Math.max(1, ...asksDesc.map(l => l.amount), ...bidsDesc.map(l => l.amount))
  const currentYes = parseFloat(market.prices?.yes || 50)
  const bestAsk = asksDesc.length > 0 ? asksDesc[asksDesc.length - 1].price : currentYes + 2
  const bestBid = bidsDesc.length > 0 ? bidsDesc[0].price : currentYes - 2
  const spread = Math.max(0, bestAsk - bestBid).toFixed(0)

  return (
    <div style={{ background: C.surface, border: `1px solid ${C.cardBorder}`, borderRadius: 8, overflow: 'hidden' }}>
      {/* Column headers */}
      <div style={{
        display: 'grid', gridTemplateColumns: '1fr 1fr 1fr',
        padding: '7px 12px', background: C.card, borderBottom: `1px solid ${C.divider}`,
      }}>
        {['PRECIO', 'CANTIDAD', 'TOTAL'].map((h, i) => (
          <span key={h} style={{
            fontSize: 9, fontWeight: 600, letterSpacing: '0.08em',
            textTransform: 'uppercase', color: C.textDim,
            textAlign: i === 0 ? 'left' : i === 1 ? 'center' : 'right',
          }}>{h}</span>
        ))}
      </div>

      {/* ASK levels — compra SÍ (verde), mayor a menor */}
      {asksWithTot.slice(0, 5).map((level, i) => (
        <div key={i} style={{ position: 'relative', overflow: 'hidden' }}>
          <div style={{
            position: 'absolute', left: 0, top: 0, bottom: 0,
            width: `${(level.amount / maxVol) * 80}%`, background: `${C.yes}18`,
          }} />
          <div style={{
            position: 'relative', display: 'grid', gridTemplateColumns: '1fr 1fr 1fr',
            padding: '5px 12px', alignItems: 'center',
          }}>
            <span style={{ fontFamily: 'ui-monospace, monospace', fontSize: 12, color: C.yes, fontWeight: 600 }}>
              {level.price.toFixed(0)}¢
            </span>
            <span style={{ fontFamily: 'ui-monospace, monospace', fontSize: 11, color: C.textMuted, textAlign: 'center' }}>
              €{level.amount.toFixed(0)}
            </span>
            <span style={{ fontFamily: 'ui-monospace, monospace', fontSize: 11, color: C.textDim, textAlign: 'right' }}>
              €{level.total.toFixed(0)}
            </span>
          </div>
        </div>
      ))}
      {asksWithTot.length === 0 && (
        <div style={{ padding: '8px 12px', fontSize: 11, color: C.textDim }}>Sin niveles SÍ</div>
      )}

      {/* Center spread line */}
      <div style={{
        padding: '8px 12px',
        borderTop: `1px solid ${C.divider}`, borderBottom: `1px solid ${C.divider}`,
        display: 'flex', justifyContent: 'space-between', alignItems: 'center',
        background: C.card,
      }}>
        <span style={{ fontSize: 11 }}>
          <span style={{ color: C.textDim }}>Precio: </span>
          <span style={{ fontFamily: 'ui-monospace, monospace', fontWeight: 700, color: C.text }}>
            {currentYes.toFixed(0)}¢
          </span>
        </span>
        <span style={{ fontSize: 10, color: C.textDim }}>
          Spread: <span style={{ fontFamily: 'ui-monospace, monospace', color: C.warning }}>{spread}¢</span>
        </span>
      </div>

      {/* BID levels — compra NO (rojo), mayor a menor desde centro */}
      {bidsWithTot.slice(0, 5).map((level, i) => (
        <div key={i} style={{ position: 'relative', overflow: 'hidden' }}>
          <div style={{
            position: 'absolute', left: 0, top: 0, bottom: 0,
            width: `${(level.amount / maxVol) * 80}%`, background: `${C.no}18`,
          }} />
          <div style={{
            position: 'relative', display: 'grid', gridTemplateColumns: '1fr 1fr 1fr',
            padding: '5px 12px', alignItems: 'center',
          }}>
            <span style={{ fontFamily: 'ui-monospace, monospace', fontSize: 12, color: C.no, fontWeight: 600 }}>
              {level.price.toFixed(0)}¢
            </span>
            <span style={{ fontFamily: 'ui-monospace, monospace', fontSize: 11, color: C.textMuted, textAlign: 'center' }}>
              €{level.amount.toFixed(0)}
            </span>
            <span style={{ fontFamily: 'ui-monospace, monospace', fontSize: 11, color: C.textDim, textAlign: 'right' }}>
              €{level.total.toFixed(0)}
            </span>
          </div>
        </div>
      ))}
      {bidsWithTot.length === 0 && (
        <div style={{ padding: '8px 12px', fontSize: 11, color: C.textDim }}>Sin niveles NO</div>
      )}

      <div style={{ padding: '4px 12px', background: C.card, borderTop: `1px solid ${C.divider}` }}>
        <span style={{ fontSize: 9, color: C.textDim, letterSpacing: '0.04em', textTransform: 'uppercase' }}>
          {(hasBids || hasAsks) ? 'Órdenes límite reales' : 'AMM sintético'}
        </span>
      </div>
    </div>
  )
}
