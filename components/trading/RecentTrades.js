import { C, badge } from '../../lib/theme'
import SectionTitle from './SectionTitle'

export default function RecentTrades({ recentActivity }) {
  if (!recentActivity.length) return null
  return (
    <div>
      <SectionTitle>Actividad reciente</SectionTitle>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
        {recentActivity.slice(0, 8).map((a, i) => (
          <div key={i} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
              <span style={badge(a.side === 'YES' ? C.yes : C.no)}>{a.side === 'YES' ? 'SÍ' : 'NO'}</span>
              <span style={{ fontSize: 12, color: C.textMuted, fontVariantNumeric: 'tabular-nums' }}>€{parseFloat(a.amount).toFixed(0)}</span>
            </div>
            <span style={{ fontSize: 11, color: C.textDim }}>
              {new Date(a.created_at).toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' })}
            </span>
          </div>
        ))}
      </div>
    </div>
  )
}
