import { C } from '../../lib/theme'
import SectionTitle from './SectionTitle'

export default function MarketMetrics({ market, topHolders }) {
  const yesP    = parseFloat(market.prices?.yes || 50)
  const noP     = 100 - yesP
  const volume  = market.total_volume || 0
  const yesPool = parseFloat(market.yes_pool) || 5000
  const noPool  = parseFloat(market.no_pool) || 5000
  const liquidity = Math.min(yesPool, noPool)
  const participants = topHolders?.length || 0

  const metrics = [
    { label: 'Probabilidad',   value: `${yesP.toFixed(0)}%`,                      sub: `NO ${noP.toFixed(0)}%` },
    { label: 'Volumen total',  value: `€${volume > 1000 ? (volume/1000).toFixed(1)+'K' : volume.toFixed(0)}`, sub: null },
    { label: 'Liquidez',       value: `€${liquidity > 1000 ? (liquidity/1000).toFixed(1)+'K' : liquidity.toFixed(0)}`, sub: null },
    { label: 'Participantes',  value: participants > 0 ? participants : '—',        sub: null },
  ]

  return (
    <div style={{
      display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)',
      gap: 0, borderRadius: 10, overflow: 'hidden',
      border: `1px solid ${C.cardBorder}`,
    }}>
      {metrics.map(({ label, value, sub }, idx) => (
        <div key={label} style={{
          padding: '12px 14px', background: C.surface,
          display: 'flex', flexDirection: 'column', gap: 3,
          borderRight: idx < metrics.length - 1 ? `1px solid ${C.cardBorder}` : 'none',
        }}>
          <div style={{ fontSize: 9, fontWeight: 600, letterSpacing: '0.08em', textTransform: 'uppercase', color: C.textDim }}>
            {label}
          </div>
          <div style={{ fontSize: 16, fontWeight: 700, color: C.text, fontVariantNumeric: 'tabular-nums', lineHeight: 1 }}>
            {value}
          </div>
          {sub && <div style={{ fontSize: 10, color: C.textDim }}>{sub}</div>}
        </div>
      ))}
    </div>
  )
}
