import { C, badge, getOracleDescription } from '../lib/theme'
import MarketCard from './marketcard'

export default function MarketGrid({
  filtered,
  loading,
  pendingMarkets,
  resolvedMarkets,
  showResolved,
  setShowResolved,
  onOpen,
}) {
  return (
    <div style={{ maxWidth: 1200, margin: '0 auto', padding: '0 24px 56px' }}>
      {loading ? (
        <div style={{ textAlign: 'center', padding: '80px 0', color: C.textDim, fontSize: 13 }}>
          Cargando mercados...
        </div>
      ) : filtered.length === 0 ? (
        <div style={{ textAlign: 'center', padding: '80px 0', color: C.textDim, fontSize: 13 }}>
          No hay mercados activos en este filtro.
        </div>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: 12 }}>
          {filtered.map((m, index) => (
            <MarketCard
              key={m.id}
              market={m}
              index={index}
              total={filtered.length}
              onOpen={onOpen}
            />
          ))}
        </div>
      )}

      {/* Pending resolution notice */}
      {pendingMarkets.length > 0 && (
        <div style={{
          marginTop: 20, padding: '11px 16px',
          background: `${C.warning}07`, border: `1px solid ${C.warning}18`,
          borderRadius: 7, display: 'flex', alignItems: 'center', gap: 10,
        }}>
          <div style={{ width: 5, height: 5, borderRadius: 3, background: C.warning, flexShrink: 0 }} />
          <span style={{ fontSize: 12, color: C.warning, fontWeight: 500 }}>
            {pendingMarkets.length} mercado{pendingMarkets.length > 1 ? 's' : ''} pendiente{pendingMarkets.length > 1 ? 's' : ''} de resolución por el oráculo
          </span>
        </div>
      )}

      {/* Resolved markets section */}
      {resolvedMarkets.length > 0 && (
        <div style={{ marginTop: 56 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', marginBottom: 16 }}>
            <div>
              <div style={{
                fontSize: 10, fontWeight: 600, letterSpacing: '0.09em',
                textTransform: 'uppercase', color: C.textDim, marginBottom: 5,
              }}>Historial</div>
              <div style={{ fontSize: 14, fontWeight: 500, color: C.text }}>Mercados resueltos</div>
            </div>
            <button
              onClick={() => setShowResolved(!showResolved)}
              style={{
                fontSize: 12, color: C.textDim, background: 'none',
                border: `1px solid ${C.cardBorder}`, borderRadius: 5,
                padding: '4px 11px', cursor: 'pointer',
              }}>
              {showResolved ? 'Ver menos' : 'Ver todos'}
            </button>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
            {(showResolved ? resolvedMarkets : resolvedMarkets.slice(0, 10)).map(m => (
              <div key={m.id} style={{
                background: C.card, border: `1px solid ${C.cardBorder}`,
                borderRadius: 8, padding: '12px 16px',
                display: 'flex', alignItems: 'center', gap: 16,
              }}>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{
                    fontSize: 13, fontWeight: 500, color: C.text,
                    overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', marginBottom: 3,
                  }}>{m.title}</div>
                  <div style={{ fontSize: 11, color: C.textDim }}>
                    {m.resolution_source || getOracleDescription(m).source}
                    {m.close_date && ` · ${new Date(m.close_date).toLocaleDateString('es-ES', { day: '2-digit', month: 'short' })}`}
                  </div>
                </div>
                <div style={{ display: 'flex', gap: 10, alignItems: 'center', flexShrink: 0 }}>
                  <span style={{ fontSize: 11, color: C.textDim, fontFamily: 'ui-monospace, monospace' }}>
                    €{(((m.total_volume || 0) - 5000) / 1000).toFixed(1)}K
                  </span>
                  <span style={badge(m.resolved_outcome ? C.yes : C.no)}>
                    {m.resolved_outcome ? 'SÍ' : 'NO'}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
