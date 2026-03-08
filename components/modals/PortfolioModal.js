import { C, modalStyle, panelStyle, closeBtnStyle, badge, neutralBadge } from '../../lib/theme'

export default function PortfolioModal({ showPortfolio, setShowPortfolio, openTrades, handleSell }) {
  if (!showPortfolio) return null

  return (
    <div style={modalStyle}>
      <div style={{ minHeight: '100%', padding: '24px 16px' }}>
        <div style={{ ...panelStyle, maxWidth: 640, margin: '0 auto' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
            <h2 style={{ fontSize: 17, fontWeight: 700, letterSpacing: '-0.025em' }}>Posiciones abiertas</h2>
            <button onClick={() => setShowPortfolio(false)} style={closeBtnStyle}>✕</button>
          </div>
          {openTrades.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '48px 0', color: C.textDim, fontSize: 13 }}>
              Sin posiciones abiertas
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {openTrades.map(trade => (
                <div key={trade.id} style={{ background: C.surface, border: `1px solid ${C.cardBorder}`, borderRadius: 8, padding: 16 }}>
                  <div style={{ fontWeight: 500, fontSize: 13, marginBottom: 10, lineHeight: 1.45 }}>
                    {trade.markets.title}
                  </div>
                  <div style={{ display: 'flex', gap: 5, marginBottom: 12 }}>
                    <span style={badge(trade.side === 'YES' ? C.yes : C.no)}>
                      {trade.side === 'YES' ? 'SÍ' : 'NO'}
                    </span>
                    <span style={neutralBadge()}>{trade.shares.toFixed(1)} contratos</span>
                    {trade.isExpired && <span style={badge(C.warning)}>PENDIENTE</span>}
                  </div>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr 1fr', gap: 10, marginBottom: 12 }}>
                    {[
                      ['Invertido',    `€${trade.amount.toFixed(0)}`,                                             null],
                      ['Valor actual', `€${trade.currentValue.toFixed(1)}`,                                      null],
                      ['Si acierta',   `€${trade.potentialPayout.toFixed(1)}`,                                   C.yes],
                      ['P&L',          `${trade.profit > 0 ? '+' : ''}€${trade.profit.toFixed(1)}`, trade.profit > 0 ? C.yes : C.no],
                    ].map(([label, val, col]) => (
                      <div key={label}>
                        <div style={{ fontSize: 9, fontWeight: 600, letterSpacing: '0.06em', textTransform: 'uppercase', color: C.textDim, marginBottom: 3 }}>
                          {label}
                        </div>
                        <div style={{ fontFamily: 'ui-monospace, monospace', fontWeight: 700, fontSize: 13, color: col || C.text }}>
                          {val}
                        </div>
                      </div>
                    ))}
                  </div>
                  {!trade.isExpired && (
                    <button
                      onClick={() => handleSell(trade)}
                      style={{ width: '100%', padding: '7px 0', background: 'transparent', color: C.no, border: `1px solid ${C.no}30`, borderRadius: 6, fontWeight: 500, fontSize: 12, cursor: 'pointer' }}
                    >
                      Vender ~€{trade.currentValue.toFixed(2)}
                    </button>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
