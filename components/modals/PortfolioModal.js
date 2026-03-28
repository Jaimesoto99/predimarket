import { useState } from 'react'
import { C, modalStyle, panelStyle, closeBtnStyle, badge, neutralBadge } from '../../lib/theme'

// Group trades by market and compute net YES/NO position
function computeNetPositions(openTrades) {
  const grouped = {}
  openTrades.forEach(t => {
    const mid = t.market_id
    if (!grouped[mid]) grouped[mid] = { market: t.markets, yes: [], no: [] }
    if (t.side === 'YES') grouped[mid].yes.push(t)
    else                  grouped[mid].no.push(t)
  })

  return Object.values(grouped).map(g => {
    const allTrades  = [...g.yes, ...g.no]
    const yesShares  = g.yes.reduce((s, t) => s + parseFloat(t.shares  || 0), 0)
    const noShares   = g.no.reduce( (s, t) => s + parseFloat(t.shares  || 0), 0)
    const totalAmt   = allTrades.reduce((s, t) => s + parseFloat(t.amount || 0), 0)
    const curVal     = allTrades.reduce((s, t) => s + (t.currentValue || 0), 0)
    const profit     = curVal - totalAmt
    const netYes     = yesShares - noShares
    const isExpired  = allTrades.some(t => t.isExpired)
    return {
      market_id:    g.yes[0]?.market_id ?? g.no[0]?.market_id,
      marketTitle:  g.market?.title || 'Mercado',
      isExpired,
      yesShares, noShares,
      netSide:      netYes >= 0 ? 'YES' : 'NO',
      netShares:    Math.abs(netYes),
      hasOffset:    yesShares > 0 && noShares > 0,
      totalAmt, curVal, profit,
      potentialPayout: Math.max(yesShares, noShares),
      allTrades,
    }
  })
}

export default function PortfolioModal({ showPortfolio, setShowPortfolio, openTrades, handleSell }) {
  const [expanded, setExpanded] = useState({})
  if (!showPortfolio) return null

  const netPositions = computeNetPositions(openTrades)
  const totalInvested = netPositions.reduce((s, p) => s + p.totalAmt, 0)
  const totalCurVal   = netPositions.reduce((s, p) => s + p.curVal,   0)
  const totalProfit   = totalCurVal - totalInvested

  return (
    <div style={modalStyle}>
      <div style={{ minHeight: '100%', padding: '24px 16px' }}>
        <div style={{ ...panelStyle, maxWidth: 640, margin: '0 auto' }}>

          {/* Header */}
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
            <h2 style={{ fontSize: 17, fontWeight: 700, letterSpacing: '-0.025em' }}>Posiciones abiertas</h2>
            <button onClick={() => setShowPortfolio(false)} style={closeBtnStyle}>✕</button>
          </div>

          {/* Summary row */}
          {netPositions.length > 0 && (
            <div style={{
              display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 8,
              padding: '12px 14px', background: C.surface,
              border: `1px solid ${C.cardBorder}`, borderRadius: 8, marginBottom: 16,
            }}>
              {[
                ['Invertido',        `€${totalInvested.toFixed(0)}`,                                                null],
                ['Valor est. total', `€${totalCurVal.toFixed(1)}`,                                                  null],
                ['P/L No Realizado', `${totalProfit >= 0 ? '+' : ''}€${totalProfit.toFixed(1)}`, totalProfit >= 0 ? C.yes : C.no],
              ].map(([label, val, col]) => (
                <div key={label}>
                  <div style={{ fontSize: 9, fontWeight: 600, letterSpacing: '0.06em', textTransform: 'uppercase', color: C.textDim, marginBottom: 3 }}>{label}</div>
                  <div style={{ fontFamily: 'ui-monospace, monospace', fontWeight: 700, fontSize: 13, color: col || C.text }}>{val}</div>
                </div>
              ))}
            </div>
          )}

          {netPositions.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '48px 0', color: C.textDim, fontSize: 13 }}>
              Sin posiciones abiertas
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {netPositions.map(pos => (
                <div key={pos.market_id} style={{ background: C.surface, border: `1px solid ${C.cardBorder}`, borderRadius: 8, padding: 16 }}>

                  <div style={{ fontWeight: 500, fontSize: 13, marginBottom: 10, lineHeight: 1.45 }}>
                    {pos.marketTitle}
                  </div>

                  {/* Position badges */}
                  <div style={{ display: 'flex', gap: 5, marginBottom: 12, flexWrap: 'wrap' }}>
                    {pos.hasOffset ? (
                      <>
                        <span style={badge(pos.netSide === 'YES' ? C.yes : C.no)}>
                          {pos.netSide === 'YES' ? 'SÍ' : 'NO'} neto
                        </span>
                        <span style={neutralBadge()}>{pos.netShares.toFixed(1)} contratos netos</span>
                        <span style={{ fontSize: 10, color: C.textDim, alignSelf: 'center', padding: '2px 6px', background: '#fef3c730', border: '1px solid #fbbf2430', borderRadius: 4 }}>
                          {pos.yesShares.toFixed(1)} SÍ · {pos.noShares.toFixed(1)} NO (compensados)
                        </span>
                      </>
                    ) : (
                      <>
                        <span style={badge(pos.netSide === 'YES' ? C.yes : C.no)}>
                          {pos.netSide === 'YES' ? 'SÍ' : 'NO'}
                        </span>
                        <span style={neutralBadge()}>{pos.netShares.toFixed(1)} contratos</span>
                      </>
                    )}
                    {pos.isExpired && <span style={badge('#f59e0b')}>PENDIENTE RESOLUCIÓN</span>}
                  </div>

                  {/* Stats grid */}
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr 1fr', gap: 10, marginBottom: 12 }}>
                    {[
                      ['Invertido',   `€${pos.totalAmt.toFixed(0)}`,                                                              null],
                      ['Valor est.',  `€${pos.curVal.toFixed(1)}`,                                                                null],
                      ['Si acierta',  `€${pos.potentialPayout.toFixed(1)}`,                                                       C.yes],
                      ['P/L Est.',    `${pos.profit >= 0 ? '+' : ''}€${pos.profit.toFixed(1)}`,  pos.profit >= 0 ? C.yes : C.no],
                    ].map(([label, val, col]) => (
                      <div key={label}>
                        <div style={{ fontSize: 9, fontWeight: 600, letterSpacing: '0.06em', textTransform: 'uppercase', color: C.textDim, marginBottom: 3 }}>{label}</div>
                        <div style={{ fontFamily: 'ui-monospace, monospace', fontWeight: 700, fontSize: 13, color: col || C.text }}>{val}</div>
                      </div>
                    ))}
                  </div>

                  {/* Sell buttons — toggle detail when positions offset */}
                  {!pos.isExpired && (() => {
                    const showDetail = !pos.hasOffset || expanded[pos.market_id]
                    return (
                      <>
                        {pos.hasOffset && (
                          <button
                            onClick={() => setExpanded(prev => ({ ...prev, [pos.market_id]: !prev[pos.market_id] }))}
                            style={{
                              width: '100%', marginBottom: 6,
                              padding: '6px 0', background: 'transparent',
                              color: C.textDim, border: `1px solid ${C.cardBorder}`,
                              borderRadius: 6, fontWeight: 500, fontSize: 11, cursor: 'pointer',
                            }}
                          >
                            {showDetail ? '▲ Ocultar posiciones individuales' : '▼ Ver posiciones individuales'}
                          </button>
                        )}
                        {showDetail && pos.allTrades.map(t => (
                          <button
                            key={t.id}
                            onClick={() => handleSell(t)}
                            style={{
                              width: '100%', marginBottom: 4,
                              padding: '7px 0', background: 'transparent',
                              color: t.side === 'YES' ? C.yes : C.no,
                              border: `1px solid ${t.side === 'YES' ? C.yes : C.no}30`,
                              borderRadius: 6, fontWeight: 500, fontSize: 12, cursor: 'pointer',
                            }}
                          >
                            Vender {t.side === 'YES' ? 'SÍ' : 'NO'} ({parseFloat(t.shares).toFixed(1)} ctrs) ~€{(t.currentValue || 0).toFixed(2)}
                          </button>
                        ))}
                      </>
                    )
                  })()}
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
