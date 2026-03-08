import { C } from '../../lib/theme'
import { fs, fw, mono, sp } from '../../lib/ds'
import Divider from '../ui/Divider'

function StatPill({ label, value, color }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 2, flexShrink: 0 }}>
      <span style={{ fontSize: fs.xs - 1, color: C.textDim, fontWeight: fw.semibold, letterSpacing: '0.06em', textTransform: 'uppercase', lineHeight: 1 }}>
        {label}
      </span>
      <span style={{ fontSize: fs.base, color: color || C.textMuted, fontWeight: fw.semibold, fontFamily: mono, lineHeight: 1 }}>
        {value}
      </span>
    </div>
  )
}

export default function MarketStats({ market, compact, style }) {
  const vol = parseFloat(market.total_volume) || 0
  const traders = market.active_traders || market.total_traders || 0
  const yesP = parseFloat(market.prices?.yes || 50)

  const volDisplay = vol > 1000 ? `€${(vol / 1000).toFixed(1)}K` : `€${vol.toFixed(0)}`
  const tradersDisplay = traders > 0 ? String(traders) : '—'

  if (compact) {
    return (
      <div style={{ display: 'flex', alignItems: 'center', gap: sp.md, ...style }}>
        <span style={{ fontSize: fs.xs, color: C.textDim, fontFamily: mono }}>
          {volDisplay}
        </span>
        {traders > 0 && (
          <>
            <span style={{ fontSize: fs.xs, color: C.divider }}>·</span>
            <span style={{ fontSize: fs.xs, color: C.textDim }}>
              {tradersDisplay} analistas
            </span>
          </>
        )}
      </div>
    )
  }

  return (
    <div style={{
      display: 'flex', alignItems: 'center', gap: sp.xl,
      flexWrap: 'wrap',
      ...style,
    }}>
      <StatPill label="Volumen" value={volDisplay} />
      <Divider vertical />
      <StatPill label="Analistas" value={tradersDisplay > 0 ? `${tradersDisplay}` : '—'} />
      <Divider vertical />
      <StatPill
        label="Tendencia"
        value={yesP >= 65 ? 'SI mayorit.' : yesP <= 35 ? 'NO mayorit.' : 'Equilibrado'}
        color={yesP >= 65 ? C.yes : yesP <= 35 ? C.no : C.textMuted}
      />
    </div>
  )
}
