import { C, modalStyle, panelStyle, closeBtnStyle, badge, neutralBadge, getCategoryColor, getCategoryLabel, getTradeStatusLabel, getTradeStatusColor } from '../lib/theme'
import { useState } from 'react'

function sectionLabel(text) {
  return (
    <div style={{ fontSize: 10, fontWeight: 600, letterSpacing: '0.09em', textTransform: 'uppercase', color: C.textDim, marginBottom: 10 }}>
      {text}
    </div>
  )
}

export default function ProfileModal({ user, userTrades, onClose, onShowKYC }) {
  const [tradeHistoryFilter, setTradeHistoryFilter] = useState('ALL')

  const openTrades = userTrades.filter(t => t.status === 'OPEN')
  const realizedTrades = userTrades.filter(t => t.status === 'WON' || t.status === 'LOST' || t.status === 'SOLD')
  const wonTrades = userTrades.filter(t => t.status === 'WON')
  const lostTrades = userTrades.filter(t => t.status === 'LOST')
  const soldTrades = userTrades.filter(t => t.status === 'SOLD')
  const realizedPnL = realizedTrades.reduce((s, t) => s + (t.pnl || 0), 0)
  const totalInvested = openTrades.reduce((s, t) => s + t.amount, 0)
  const winRate = (wonTrades.length + lostTrades.length) > 0
    ? (wonTrades.length / (wonTrades.length + lostTrades.length) * 100) : 0

  const catBreakdown = {}
  userTrades.forEach(t => {
    const cat = t.markets?.category || 'OTRO'
    if (!catBreakdown[cat]) catBreakdown[cat] = { count: 0, pnl: 0, won: 0, lost: 0 }
    catBreakdown[cat].count++
    catBreakdown[cat].pnl += (t.pnl || 0)
    if (t.status === 'WON') catBreakdown[cat].won++
    if (t.status === 'LOST') catBreakdown[cat].lost++
  })

  const filteredHistory = userTrades.filter(t => {
    if (tradeHistoryFilter === 'ALL') return true
    return t.status === tradeHistoryFilter
  })

  const streakData = (() => {
    const closed = [...userTrades]
      .filter(t => t.status === 'WON' || t.status === 'LOST')
      .sort((a, b) => new Date(b.created_at) - new Date(a.created_at))
    if (closed.length === 0) return { count: 0, type: null }
    const first = closed[0].status
    let count = 0
    for (const t of closed) {
      if (t.status === first) count++
      else break
    }
    return { count, type: first }
  })()

  const now = new Date()
  const thisMonthStart = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1))
  const prevMonthStart = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() - 1, 1))
  const tradesThisMonth = userTrades.filter(t => new Date(t.created_at) >= thisMonthStart).length
  const tradesPrevMonth = userTrades.filter(t => {
    const d = new Date(t.created_at)
    return d >= prevMonthStart && d < thisMonthStart
  }).length

  return (
    <div style={modalStyle}>
      <div style={{ minHeight: '100%', padding: '24px 16px' }}>
        <div style={{ ...panelStyle, maxWidth: 560, margin: '0 auto' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 }}>
            <h2 style={{ fontSize: 17, fontWeight: 700, letterSpacing: '-0.025em' }}>Mi perfil</h2>
            <button onClick={onClose} style={closeBtnStyle}>✕</button>
          </div>

          {/* User header */}
          <div style={{
            display: 'flex', alignItems: 'center', gap: 14, marginBottom: 20,
            padding: '14px 16px', background: C.surface,
            borderRadius: 8, border: `1px solid ${C.cardBorder}`,
          }}>
            <div style={{
              width: 40, height: 40, borderRadius: 8,
              background: `${C.accent}15`, border: `1px solid ${C.accent}25`,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontSize: 16, fontWeight: 700, color: C.accent,
            }}>
              {(user.display_name || user.email || '?')[0].toUpperCase()}
            </div>
            <div style={{ flex: 1 }}>
              <div style={{ fontSize: 14, fontWeight: 600 }}>{user.display_name || user.email.split('@')[0]}</div>
              <div style={{ fontSize: 11, color: C.textDim }}>{user.email}</div>
            </div>
            <div style={{ textAlign: 'right' }}>
              <div style={{ fontSize: 20, fontWeight: 700, fontFamily: 'ui-monospace, monospace', color: C.accentLight }}>
                €{parseFloat(user.balance).toFixed(0)}
              </div>
              <div style={{ fontSize: 9, color: C.textDim, letterSpacing: '0.06em', textTransform: 'uppercase' }}>Saldo</div>
            </div>
          </div>

          {/* KYC banner */}
          {onShowKYC && (() => {
            let kycDone = false
            try { kycDone = localStorage.getItem('kycCompleted') === 'true' } catch {}
            return !kycDone ? (
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12, padding: '12px 16px', background: `${C.accent}08`, border: `1px solid ${C.accent}25`, borderRadius: 8, marginBottom: 16 }}>
                <div>
                  <div style={{ fontSize: 12, fontWeight: 600, color: C.accent, marginBottom: 2 }}>Verificación de identidad pendiente</div>
                  <div style={{ fontSize: 11, color: C.textDim }}>Requerida para operar con fondos reales</div>
                </div>
                <button onClick={onShowKYC} style={{ padding: '7px 14px', background: C.accent, border: 'none', borderRadius: 6, color: '#fff', fontSize: 12, fontWeight: 600, cursor: 'pointer', flexShrink: 0 }}>
                  Verificar
                </button>
              </div>
            ) : (
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '10px 14px', background: `${C.yes}08`, border: `1px solid ${C.yes}25`, borderRadius: 8, marginBottom: 16 }}>
                <span style={{ fontSize: 13, color: C.yes }}>✓</span>
                <span style={{ fontSize: 12, color: C.yes, fontWeight: 600 }}>Identidad verificada (KYC completado)</span>
              </div>
            )
          })()}

          {/* KPI cards */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 8, marginBottom: 16 }}>
            {[
              { label: 'P/L realizado', value: `${realizedPnL >= 0 ? '+' : ''}€${realizedPnL.toFixed(0)}`, color: realizedPnL >= 0 ? C.yes : C.no, sub: 'Solo cerrados' },
              { label: 'Win rate', value: `${winRate.toFixed(0)}%`, color: winRate >= 50 ? C.yes : C.no, sub: `${wonTrades.length}G · ${lostTrades.length}P` },
              { label: 'Retorno', value: `${((user.balance - 1000) / 10).toFixed(1)}%`, color: user.balance >= 1000 ? C.yes : C.no, sub: 'vs 1.000 inicial' },
            ].map(({ label, value, color, sub }) => (
              <div key={label} style={{ background: C.surface, borderRadius: 7, padding: '12px 14px', border: `1px solid ${C.cardBorder}` }}>
                <div style={{ fontSize: 9, fontWeight: 600, letterSpacing: '0.07em', textTransform: 'uppercase', color: C.textDim, marginBottom: 7 }}>{label}</div>
                <div style={{ fontSize: 18, fontWeight: 700, fontFamily: 'ui-monospace, monospace', color, lineHeight: 1 }}>{value}</div>
                <div style={{ fontSize: 10, color: C.textDim, marginTop: 5 }}>{sub}</div>
              </div>
            ))}
          </div>

          {/* Open exposure */}
          {openTrades.length > 0 && (
            <div style={{
              padding: '11px 14px', background: `${C.warning}06`,
              border: `1px solid ${C.warning}18`, borderRadius: 7, marginBottom: 14,
              display: 'flex', justifyContent: 'space-between', alignItems: 'center',
            }}>
              <div>
                <div style={{ fontSize: 12, fontWeight: 500, color: C.warning }}>Exposición abierta</div>
                <div style={{ fontSize: 11, color: C.textDim }}>{openTrades.length} posiciones · €{totalInvested.toFixed(0)} en juego</div>
              </div>
              <span style={badge(C.warning)}>ABIERTO</span>
            </div>
          )}

          {/* Category breakdown */}
          {Object.keys(catBreakdown).length > 0 && (() => {
            const sorted = Object.entries(catBreakdown).sort((a, b) => b[1].count - a[1].count)
            const maxCount = Math.max(1, ...sorted.map(([, d]) => d.count))
            const bestCat = sorted.reduce((best, cur) => {
              const wr = (cur[1].won + cur[1].lost) > 0 ? cur[1].won / (cur[1].won + cur[1].lost) : 0
              const bestWr = (best[1].won + best[1].lost) > 0 ? best[1].won / (best[1].won + best[1].lost) : 0
              return wr > bestWr ? cur : best
            }, sorted[0])
            const worstCat = sorted.reduce((worst, cur) => {
              const wr = (cur[1].won + cur[1].lost) > 0 ? cur[1].won / (cur[1].won + cur[1].lost) : 1
              const worstWr = (worst[1].won + worst[1].lost) > 0 ? worst[1].won / (worst[1].won + worst[1].lost) : 1
              return wr < worstWr ? cur : worst
            }, sorted[0])
            return (
              <div style={{ padding: '14px 16px', background: C.surface, borderRadius: 7, border: `1px solid ${C.cardBorder}`, marginBottom: 14 }}>
                {sectionLabel('Por categoría')}
                <div style={{ display: 'flex', gap: 8, marginBottom: 14 }}>
                  <div style={{ flex: 1, padding: '8px 10px', background: `${C.yes}08`, border: `1px solid ${C.yes}20`, borderRadius: 6 }}>
                    <div style={{ fontSize: 9, fontWeight: 600, letterSpacing: '0.08em', color: C.yes, marginBottom: 2 }}>MEJOR</div>
                    <div style={{ fontSize: 12, fontWeight: 500 }}>{getCategoryLabel(bestCat[0])}</div>
                    <div style={{ fontSize: 10, color: C.textDim }}>{((bestCat[1].won + bestCat[1].lost) > 0 ? bestCat[1].won / (bestCat[1].won + bestCat[1].lost) * 100 : 0).toFixed(0)}% WR</div>
                  </div>
                  <div style={{ flex: 1, padding: '8px 10px', background: `${C.no}08`, border: `1px solid ${C.no}20`, borderRadius: 6 }}>
                    <div style={{ fontSize: 9, fontWeight: 600, letterSpacing: '0.08em', color: C.no, marginBottom: 2 }}>PEOR</div>
                    <div style={{ fontSize: 12, fontWeight: 500 }}>{getCategoryLabel(worstCat[0])}</div>
                    <div style={{ fontSize: 10, color: C.textDim }}>{((worstCat[1].won + worstCat[1].lost) > 0 ? worstCat[1].won / (worstCat[1].won + worstCat[1].lost) * 100 : 0).toFixed(0)}% WR</div>
                  </div>
                </div>
                {sorted.map(([cat, data]) => {
                  const wr = (data.won + data.lost) > 0 ? (data.won / (data.won + data.lost) * 100) : 0
                  const color = getCategoryColor(cat)
                  return (
                    <div key={cat} style={{ marginBottom: 10 }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 7 }}>
                          <div style={{ width: 6, height: 6, borderRadius: 2, background: color, flexShrink: 0 }} />
                          <span style={{ fontSize: 12, fontWeight: 500 }}>{getCategoryLabel(cat)}</span>
                          <span style={{ fontSize: 10, color: C.textDim }}>{data.count} trades</span>
                        </div>
                        <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                          <span style={{ fontSize: 10, color: C.textDim }}>{wr.toFixed(0)}% WR</span>
                          <span style={{ fontSize: 11, fontFamily: 'ui-monospace, monospace', fontWeight: 700, color: data.pnl >= 0 ? C.yes : C.no }}>
                            {data.pnl >= 0 ? '+' : ''}€{data.pnl.toFixed(0)}
                          </span>
                        </div>
                      </div>
                      <div style={{ height: 3, borderRadius: 2, background: C.divider, overflow: 'hidden' }}>
                        <div style={{ width: `${(data.count / maxCount) * 100}%`, height: '100%', background: color, opacity: 0.6, transition: 'width 0.4s ease' }} />
                      </div>
                    </div>
                  )
                })}
              </div>
            )
          })()}

          {/* Stats */}
          <div style={{ padding: '14px 16px', background: C.surface, borderRadius: 7, border: `1px solid ${C.cardBorder}`, marginBottom: 14 }}>
            {sectionLabel('Estadísticas')}
            {[
              ['Total operaciones', userTrades.length, null],
              ['Ganadas', wonTrades.length, C.yes],
              ['Perdidas', lostTrades.length, C.no],
              ['Vendidas', soldTrades.length, C.accentLight],
              ['Mayor ganancia', realizedTrades.length > 0 ? `+€${Math.max(0, ...realizedTrades.map(t => t.pnl || 0)).toFixed(0)}` : '—', C.yes],
              ['Mayor pérdida', realizedTrades.length > 0 ? `-€${Math.abs(Math.min(0, ...realizedTrades.map(t => t.pnl || 0))).toFixed(0)}` : '—', C.no],
              ['Avg por trade', realizedTrades.length > 0 ? `${realizedPnL >= 0 ? '+' : ''}€${(realizedPnL / realizedTrades.length).toFixed(1)}` : '—', null],
              ['Racha actual', streakData.count > 0 ? `${streakData.count} ${streakData.type === 'WON' ? 'ganadas' : 'perdidas'}` : '—', streakData.type === 'WON' ? C.yes : streakData.type === 'LOST' ? C.no : null],
              ['Este mes', `${tradesThisMonth} trades`, null],
              ['Mes anterior', `${tradesPrevMonth} trades`, tradesPrevMonth > 0 && tradesThisMonth > tradesPrevMonth ? C.yes : null],
              ['Capital inicial', '€1.000', null],
              ['Saldo actual', `€${parseFloat(user.balance).toFixed(0)}`, user.balance >= 1000 ? C.yes : C.no],
            ].map(([label, val, col], i, arr) => (
              <div key={label} style={{ display: 'flex', justifyContent: 'space-between', padding: '7px 0', borderBottom: i < arr.length - 1 ? `1px solid ${C.divider}` : 'none' }}>
                <span style={{ fontSize: 12, color: C.textMuted }}>{label}</span>
                <span style={{ fontSize: 12, fontWeight: 600, fontFamily: 'ui-monospace, monospace', color: col || C.text }}>{val}</span>
              </div>
            ))}
          </div>

          {/* Trade history */}
          <div style={{ padding: '14px 16px', background: C.surface, borderRadius: 7, border: `1px solid ${C.cardBorder}` }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
              {sectionLabel('Historial de trades')}
              <span style={{ fontSize: 11, color: C.textDim, marginBottom: 10 }}>{filteredHistory.length} operaciones</span>
            </div>
            <div style={{ display: 'flex', background: C.bg, borderRadius: 6, padding: 2, marginBottom: 12 }}>
              {[['ALL', 'Todos'], ['OPEN', 'Abiertos'], ['WON', 'Ganados'], ['LOST', 'Perdidos'], ['SOLD', 'Vendidos']].map(([f, l]) => (
                <button key={f} onClick={() => setTradeHistoryFilter(f)} style={{
                  flex: 1, padding: '5px 0', borderRadius: 4, fontSize: 10,
                  fontWeight: tradeHistoryFilter === f ? 600 : 400,
                  border: 'none', cursor: 'pointer',
                  background: tradeHistoryFilter === f ? C.card : 'transparent',
                  color: tradeHistoryFilter === f ? C.text : C.textDim,
                  transition: 'all 0.12s',
                }}>
                  {l}
                </button>
              ))}
            </div>
            {filteredHistory.length === 0 ? (
              <div style={{ textAlign: 'center', padding: '24px 0', color: C.textDim, fontSize: 12 }}>Sin trades en este filtro</div>
            ) : (
              <div style={{ maxHeight: 320, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: 6 }}>
                {filteredHistory.map(trade => {
                  const pnl = trade.pnl || 0
                  const statusColor = getTradeStatusColor(trade.status)
                  return (
                    <div key={trade.id} style={{ background: C.card, border: `1px solid ${C.cardBorder}`, borderRadius: 6, padding: '10px 12px' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 6 }}>
                        <div style={{ fontSize: 12, fontWeight: 500, color: C.text, flex: 1, marginRight: 8, lineHeight: 1.4, overflow: 'hidden', display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical' }}>
                          {trade.markets?.title}
                        </div>
                        <span style={{ ...badge(statusColor), flexShrink: 0 }}>{getTradeStatusLabel(trade.status)}</span>
                      </div>
                      <div style={{ display: 'flex', gap: 12, alignItems: 'center' }}>
                        <span style={badge(trade.side === 'YES' ? C.yes : C.no)}>{trade.side === 'YES' ? 'SÍ' : 'NO'}</span>
                        <span style={{ fontSize: 11, color: C.textDim }}>€{trade.amount.toFixed(0)} invertido</span>
                        {trade.status !== 'OPEN' && (
                          <span style={{ fontSize: 11, fontFamily: 'ui-monospace, monospace', fontWeight: 600, color: pnl >= 0 ? C.yes : C.no, marginLeft: 'auto' }}>
                            {pnl >= 0 ? '+' : ''}€{pnl.toFixed(1)}
                          </span>
                        )}
                        {trade.status === 'OPEN' && (
                          <span style={{ fontSize: 11, fontFamily: 'ui-monospace, monospace', color: trade.profit >= 0 ? C.yes : C.no, marginLeft: 'auto' }}>
                            {trade.profit >= 0 ? '+' : ''}€{trade.profit.toFixed(1)} (ahora)
                          </span>
                        )}
                      </div>
                      <div style={{ fontSize: 10, color: C.textDim, marginTop: 5 }}>
                        {new Date(trade.created_at).toLocaleDateString('es-ES', { day: '2-digit', month: 'short', year: '2-digit', hour: '2-digit', minute: '2-digit' })}
                        {trade.markets?.category && ` · ${getCategoryLabel(trade.markets.category)}`}
                      </div>
                    </div>
                  )
                })}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
