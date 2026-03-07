import { C, modalStyle, panelStyle, closeBtnStyle, inputStyle, badge, neutralBadge, getCategoryColor, getCategoryLabel, getTimeLeft, getTypeLabel, isExpiredDate, getOracleDescription } from '../lib/theme'
import OrderBook from './OrderBook'
import ProbabilityChart from './probabilitychart'

function catBadge(cat) {
  return (
    <span style={{
      fontSize: 10, padding: '2px 7px', borderRadius: 4, fontWeight: 500,
      letterSpacing: '0.05em', textTransform: 'uppercase',
      border: `1px solid ${C.cardBorder}`, color: C.textDim, background: 'transparent',
      display: 'inline-flex', alignItems: 'center', gap: 4,
    }}>
      <span style={{
        width: 4, height: 4, borderRadius: 2,
        background: getCategoryColor(cat), display: 'inline-block', flexShrink: 0,
      }} />
      {getCategoryLabel(cat)}
    </span>
  )
}

function sectionLabel(text) {
  return (
    <div style={{ fontSize: 10, fontWeight: 600, letterSpacing: '0.09em', textTransform: 'uppercase', color: C.textDim, marginBottom: 10 }}>
      {text}
    </div>
  )
}

export default function TradingModal({
  market,
  user,
  userTrades,
  tradeSide, setTradeSide,
  tradeAmount, setTradeAmount,
  orderMode, setOrderMode,
  limitPrice, setLimitPrice,
  modalTab, setModalTab,
  tradeImpact,
  processing,
  priceHistory,
  recentActivity,
  orderBook,
  userOrders,
  comments,
  newComment, setNewComment,
  topHolders,
  onClose,
  onExecuteTrade,
  onLimitOrder,
  onCancelOrder,
  onSell,
  onPostComment,
  onLikeComment,
}) {
  const expired = isExpiredDate(market.close_date)
  const oracle = getOracleDescription(market)
  const myTrades = userTrades.filter(t => t.market_id == market.id && t.status === 'OPEN')

  return (
    <div style={modalStyle}>
      <div style={{ minHeight: '100%', display: 'flex', alignItems: 'flex-start', justifyContent: 'center', padding: '24px 16px' }}>
        <div style={{ ...panelStyle, maxWidth: 920, width: '100%' }}>

          {/* Header */}
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 12, gap: 16 }}>
            <div style={{ flex: 1 }}>
              <div style={{ display: 'flex', gap: 5, flexWrap: 'wrap', marginBottom: 8, alignItems: 'center' }}>
                {catBadge(market.category)}
                <span style={neutralBadge()}>{getTypeLabel(market)}</span>
                <span style={{ fontSize: 11, color: expired ? C.no : C.textDim, fontWeight: 400 }}>
                  {expired ? 'Expirado' : getTimeLeft(market.close_date)}
                </span>
              </div>
              <h2 style={{ fontSize: 16, fontWeight: 600, lineHeight: 1.4, letterSpacing: '-0.02em', color: C.text }}>
                {market.title}
              </h2>
            </div>
            <button onClick={onClose} style={closeBtnStyle}>✕</button>
          </div>

          {/* Tabs */}
          <div style={{ display: 'flex', borderBottom: `1px solid ${C.cardBorder}`, marginBottom: 20 }}>
            {[['BOOK', 'Libro de Pedidos'], ['CHART', 'Gráfico'], ['RESOLUTION', 'Resolución']].map(([t, label]) => (
              <button key={t} onClick={() => setModalTab(t)} style={{
                padding: '8px 16px', fontSize: 12, fontWeight: modalTab === t ? 600 : 400,
                background: 'transparent', border: 'none', cursor: 'pointer',
                color: modalTab === t ? C.text : C.textDim,
                borderBottom: `2px solid ${modalTab === t ? C.accent : 'transparent'}`,
                marginBottom: -1, transition: 'all 0.15s ease',
              }}>
                {label}
              </button>
            ))}
          </div>

          {/* 2-column body */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: 20, alignItems: 'start' }}>

            {/* LEFT COLUMN — Tab content */}
            <div>

              {/* BOOK TAB */}
              {modalTab === 'BOOK' && (
                <>
                  <div style={{ marginBottom: 16 }}>
                    <OrderBook market={market} orderBook={orderBook} />
                  </div>

                  {/* Recent trades */}
                  {recentActivity.length > 0 && (
                    <div style={{
                      padding: '12px 14px', background: C.surface,
                      border: `1px solid ${C.cardBorder}`, borderRadius: 8, marginBottom: 16,
                    }}>
                      {sectionLabel('Últimas operaciones')}
                      <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                        {recentActivity.slice(0, 8).map((a, i) => (
                          <div key={i} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: 11 }}>
                            <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
                              <span style={badge(a.side === 'YES' ? C.yes : C.no)}>{a.side === 'YES' ? 'SÍ' : 'NO'}</span>
                              <span style={{ color: C.textMuted, fontFamily: 'ui-monospace, monospace' }}>€{parseFloat(a.amount).toFixed(0)}</span>
                            </div>
                            <span style={{ color: C.textDim, fontSize: 10 }}>
                              {new Date(a.created_at).toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' })}
                            </span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Top Holders */}
                  {topHolders.length > 0 && (
                    <div style={{
                      padding: '12px 14px', background: C.surface,
                      border: `1px solid ${C.cardBorder}`, borderRadius: 8, marginBottom: 16,
                    }}>
                      {sectionLabel('Top holders')}
                      <div style={{ display: 'flex', flexDirection: 'column', gap: 5 }}>
                        {topHolders.map((h, i) => (
                          <div key={h.email} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: 12 }}>
                            <div style={{ display: 'flex', gap: 7, alignItems: 'center' }}>
                              <span style={{ fontSize: 10, color: C.textDim, fontFamily: 'ui-monospace, monospace', minWidth: 16 }}>{i + 1}</span>
                              <span style={{ color: C.textMuted, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: 130 }}>
                                {h.email.split('@')[0]}
                              </span>
                            </div>
                            <div style={{ display: 'flex', gap: 5, flexShrink: 0 }}>
                              {h.yes > 0 && <span style={badge(C.yes)}>{h.yes.toFixed(0)} SÍ</span>}
                              {h.no > 0 && <span style={badge(C.no)}>{h.no.toFixed(0)} NO</span>}
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Comments */}
                  <div style={{
                    padding: '12px 14px', background: C.surface,
                    border: `1px solid ${C.cardBorder}`, borderRadius: 8,
                  }}>
                    {sectionLabel('Comentarios')}
                    {user && (
                      <div style={{ display: 'flex', gap: 8, marginBottom: 12 }}>
                        <input
                          value={newComment}
                          onChange={e => setNewComment(e.target.value)}
                          onKeyDown={e => e.key === 'Enter' && onPostComment()}
                          placeholder="Añade un comentario..."
                          style={{ ...inputStyle, flex: 1, fontSize: 13 }}
                        />
                        <button onClick={onPostComment} style={{
                          padding: '8px 14px', background: C.accent, color: '#fff',
                          border: 'none', borderRadius: 7, fontSize: 12, fontWeight: 600,
                          cursor: 'pointer', flexShrink: 0,
                        }}>
                          Publicar
                        </button>
                      </div>
                    )}
                    {comments.length === 0 ? (
                      <div style={{ fontSize: 12, color: C.textDim, textAlign: 'center', padding: '12px 0' }}>
                        Sin comentarios aún
                      </div>
                    ) : (
                      <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                        {comments.map(c => {
                          const diffMs = Date.now() - new Date(c.created_at)
                          const h = Math.floor(diffMs / 3600000)
                          const age = h < 1 ? `${Math.floor(diffMs / 60000)}m` : h < 24 ? `${h}h` : `${Math.floor(h / 24)}d`
                          return (
                            <div key={c.id} style={{ display: 'flex', gap: 9, alignItems: 'flex-start' }}>
                              <div style={{
                                width: 28, height: 28, borderRadius: 6,
                                background: `${C.accent}18`, border: `1px solid ${C.accent}25`,
                                display: 'flex', alignItems: 'center', justifyContent: 'center',
                                fontSize: 12, fontWeight: 700, color: C.accent, flexShrink: 0,
                              }}>
                                {c.user_email[0].toUpperCase()}
                              </div>
                              <div style={{ flex: 1, minWidth: 0 }}>
                                <div style={{ display: 'flex', gap: 6, alignItems: 'baseline', marginBottom: 3 }}>
                                  <span style={{ fontSize: 12, fontWeight: 600, color: C.text }}>{c.user_email.split('@')[0]}</span>
                                  <span style={{ fontSize: 10, color: C.textDim }}>hace {age}</span>
                                </div>
                                <div style={{ fontSize: 13, color: C.textMuted, lineHeight: 1.5, wordBreak: 'break-word' }}>{c.text}</div>
                                <button onClick={() => onLikeComment(c.id)} style={{
                                  marginTop: 4, fontSize: 11, color: C.textDim,
                                  background: 'none', border: 'none', cursor: 'pointer', padding: 0,
                                }}>
                                  ♡ {c.likes || 0}
                                </button>
                              </div>
                            </div>
                          )
                        })}
                      </div>
                    )}
                  </div>
                </>
              )}

              {/* CHART TAB */}
              {modalTab === 'CHART' && (
                <ProbabilityChart priceHistory={priceHistory} market={market} />
              )}

              {/* RESOLUTION TAB */}
              {modalTab === 'RESOLUTION' && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                  <div style={{ padding: '14px 16px', background: C.surface, border: `1px solid ${C.cardBorder}`, borderRadius: 8 }}>
                    {sectionLabel('Fuente del oráculo')}
                    <div style={{ fontSize: 13, fontWeight: 600, color: C.accentLight, marginBottom: 6 }}>{oracle.source}</div>
                    <div style={{ fontSize: 12, color: C.textMuted, lineHeight: 1.6 }}>{oracle.method}</div>
                    {oracle.url && (
                      <a href={oracle.url} target="_blank" rel="noopener noreferrer" onClick={e => e.stopPropagation()}
                        style={{ display: 'inline-flex', alignItems: 'center', gap: 4, marginTop: 8, fontSize: 11, color: C.accent, textDecoration: 'none' }}>
                        Ver fuente oficial ↗
                      </a>
                    )}
                  </div>
                  <div style={{ padding: '14px 16px', background: C.surface, border: `1px solid ${C.cardBorder}`, borderRadius: 8 }}>
                    {sectionLabel('Reglas de resolución')}
                    <div style={{ fontSize: 12, color: C.textMuted, lineHeight: 1.7 }}>
                      {market.resolution_rules || `Este mercado se resolverá como SÍ si se cumple la condición indicada, según datos de ${oracle.source} publicados en ${oracle.url || 'fuente oficial'}. Se resolverá como NO en caso contrario. La resolución es automática y basada en datos públicos verificables. PrediMarket actúa como intermediario tecnológico; no emite opinión sobre el resultado ni garantiza beneficios. Existe riesgo de pérdida total del capital invertido.`}
                    </div>
                  </div>
                  <div style={{ padding: '12px 14px', background: `${C.warning}06`, border: `1px solid ${C.warning}18`, borderRadius: 8 }}>
                    <div style={{ fontSize: 11, color: C.warning, fontWeight: 600, marginBottom: 4 }}>Aviso de riesgo</div>
                    <div style={{ fontSize: 11, color: C.textDim, lineHeight: 1.6 }}>
                      PrediMarket es un mercado de predicción con créditos virtuales. La resolución depende de fuentes externas. No constituye asesoramiento financiero. Riesgo de pérdida total del capital.
                    </div>
                  </div>
                </div>
              )}

            </div>{/* end left column */}

            {/* RIGHT COLUMN — Trade controls (always visible) */}
            <div style={{ position: 'sticky', top: 24 }}>
              {!expired ? (
                <>
                  {/* Order type toggle */}
                  <div style={{
                    display: 'flex', background: C.surface, borderRadius: 8,
                    padding: 3, marginBottom: 14, border: `1px solid ${C.cardBorder}`,
                  }}>
                    {[['MARKET', 'Mercado'], ['LIMIT', 'Límite']].map(([mode, label]) => (
                      <button key={mode} onClick={() => setOrderMode(mode)} style={{
                        flex: 1, height: 44, borderRadius: 6, fontSize: 13,
                        fontWeight: orderMode === mode ? 700 : 400,
                        border: 'none', cursor: 'pointer', transition: 'all 0.2s ease',
                        background: orderMode === mode ? '#fff' : 'transparent',
                        color: orderMode === mode ? '#0a0a0a' : C.textDim,
                        boxShadow: orderMode === mode ? '0 1px 3px rgba(0,0,0,0.3)' : 'none',
                      }}>
                        {label}
                      </button>
                    ))}
                  </div>

                  {/* YES / NO selector */}
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8, marginBottom: 14 }}>
                    {['YES', 'NO'].map(side => {
                      const isSelected = tradeSide === side
                      const color = side === 'YES' ? C.yes : C.no
                      return (
                        <button key={side} onClick={() => setTradeSide(side)} style={{
                          minHeight: 56, padding: '12px 8px', borderRadius: 8, fontWeight: 700, cursor: 'pointer',
                          border: `2px solid ${isSelected ? color : C.cardBorder}`,
                          background: isSelected ? color : `${color}08`,
                          color: isSelected ? '#fff' : color,
                          transition: 'all 0.2s ease',
                          transform: isSelected ? 'scale(1.02)' : 'scale(1)',
                          boxShadow: isSelected ? `0 4px 16px ${color}40` : 'none',
                        }}>
                          <div style={{ fontSize: 10, fontWeight: 700, letterSpacing: '0.1em', marginBottom: 4 }}>
                            {side === 'YES' ? 'SÍ' : 'NO'}
                          </div>
                          <div style={{ fontSize: 24, fontFamily: 'ui-monospace, monospace', lineHeight: 1 }}>
                            {side === 'YES' ? market.prices?.yes : market.prices?.no}¢
                          </div>
                        </button>
                      )
                    })}
                  </div>

                  {/* Limit price slider */}
                  {orderMode === 'LIMIT' && (
                    <div style={{
                      marginBottom: 14, padding: '12px 14px',
                      background: C.surface, borderRadius: 7, border: `1px solid ${C.cardBorder}`,
                    }}>
                      <div style={{ fontSize: 10, fontWeight: 600, letterSpacing: '0.09em', textTransform: 'uppercase', color: C.textDim, marginBottom: 10 }}>
                        Precio límite
                      </div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                        <input
                          type="range" min="5"
                          max={Math.max(6, parseInt(tradeSide === 'YES' ? market.prices?.yes : market.prices?.no) - 1)}
                          value={limitPrice * 100}
                          onChange={e => setLimitPrice(e.target.value / 100)}
                          style={{ flex: 1, accentColor: C.accent }}
                        />
                        <span style={{
                          minWidth: 48, textAlign: 'right',
                          fontFamily: 'ui-monospace, monospace', fontWeight: 700,
                          fontSize: 18, color: C.accentLight,
                        }}>
                          {(limitPrice * 100).toFixed(0)}¢
                        </span>
                      </div>
                      <div style={{ marginTop: 6, fontSize: 11, color: C.textDim }}>
                        Actual: {tradeSide === 'YES' ? market.prices?.yes : market.prices?.no}¢ · Retorno si ejecuta: +{((1 / limitPrice - 1) * 100).toFixed(0)}%
                      </div>
                    </div>
                  )}

                  {/* Amount */}
                  <div style={{ marginBottom: 14 }}>
                    <div style={{ fontSize: 10, fontWeight: 600, letterSpacing: '0.09em', textTransform: 'uppercase', color: C.textDim, marginBottom: 10 }}>
                      Cantidad
                    </div>
                    <input
                      type="number" value={tradeAmount}
                      onChange={e => setTradeAmount(Math.max(1, Number(e.target.value)))}
                      style={{ ...inputStyle, fontSize: 18, fontWeight: 700, fontFamily: 'ui-monospace, monospace', marginBottom: 8 }}
                      min="1" max={user?.balance || 1000}
                    />
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 6 }}>
                      {[10, 25, 50, 100].map(v => (
                        <button key={v} onClick={() => setTradeAmount(v)} style={{
                          padding: '6px 0', fontSize: 12, fontWeight: 500, background: 'transparent',
                          color: tradeAmount === v ? C.text : C.textDim,
                          borderRadius: 6,
                          border: `1px solid ${tradeAmount === v ? C.accent : C.cardBorder}`,
                          cursor: 'pointer',
                        }}>
                          {v}€
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Summary box */}
                  <div style={{
                    background: '#111114',
                    border: `1px solid ${C.cardBorder}`,
                    borderLeft: `3px solid ${tradeSide === 'YES' ? C.yes : C.no}`,
                    borderRadius: 7, padding: '14px 16px', marginBottom: 14,
                  }}>
                    {orderMode === 'MARKET' ? (
                      tradeImpact && tradeImpact.valid ? (
                        <>
                          <div style={{ fontSize: 12, color: C.textMuted, marginBottom: 10 }}>
                            Compras <span style={{ fontWeight: 700, color: C.text }}>{tradeImpact.shares.toFixed(2)} contratos</span> de{' '}
                            <span style={{ fontWeight: 700, color: tradeSide === 'YES' ? C.yes : C.no }}>{tradeSide === 'YES' ? 'SÍ' : 'NO'}</span> a{' '}
                            <span style={{ fontFamily: 'ui-monospace, monospace' }}>{(tradeImpact.avgPrice * 100).toFixed(1)}¢</span>
                          </div>
                          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end' }}>
                            <div>
                              <div style={{ fontSize: 10, color: C.textDim, marginBottom: 2 }}>Impacto precio</div>
                              <div style={{ fontSize: 12, fontFamily: 'ui-monospace, monospace', color: C.textMuted }}>{tradeImpact.priceImpactPercent}¢</div>
                            </div>
                            <div style={{ textAlign: 'right' }}>
                              <div style={{ fontSize: 10, color: C.textDim, marginBottom: 2 }}>Retorno potencial</div>
                              <div style={{ fontSize: 22, fontFamily: 'ui-monospace, monospace', fontWeight: 700, color: C.yes, lineHeight: 1 }}>
                                +{tradeImpact.roi.toFixed(0)}%
                              </div>
                              <div style={{ fontSize: 11, color: C.yes, fontFamily: 'ui-monospace, monospace' }}>
                                €{tradeImpact.potentialWinnings.toFixed(2)} si acierta
                              </div>
                            </div>
                          </div>
                        </>
                      ) : (
                        <div style={{ fontSize: 12, color: C.no }}>{tradeImpact?.error || 'Introduce una cantidad'}</div>
                      )
                    ) : (
                      <>
                        <div style={{ fontSize: 12, color: C.textMuted, marginBottom: 10 }}>
                          Orden límite {tradeSide} — ejecutar a ≤{(limitPrice * 100).toFixed(0)}¢
                        </div>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end' }}>
                          <div>
                            <div style={{ fontSize: 10, color: C.textDim, marginBottom: 2 }}>Reservado</div>
                            <div style={{ fontSize: 12, fontFamily: 'ui-monospace, monospace', color: C.textMuted }}>€{tradeAmount}</div>
                          </div>
                          <div style={{ textAlign: 'right' }}>
                            <div style={{ fontSize: 10, color: C.textDim, marginBottom: 2 }}>Retorno potencial</div>
                            <div style={{ fontSize: 22, fontFamily: 'ui-monospace, monospace', fontWeight: 700, color: C.yes, lineHeight: 1 }}>
                              +{((1 / limitPrice - 1) * 100).toFixed(0)}%
                            </div>
                          </div>
                        </div>
                      </>
                    )}
                  </div>

                  {/* Execute button */}
                  {orderMode === 'MARKET' ? (
                    <button
                      onClick={onExecuteTrade}
                      disabled={!tradeImpact || !tradeImpact.valid || tradeAmount > (user?.balance || 0) || processing}
                      style={{
                        width: '100%', height: 56, borderRadius: 8, fontWeight: 700, fontSize: 15,
                        border: 'none', letterSpacing: '-0.01em', transition: 'all 0.15s ease',
                        cursor: (!tradeImpact || !tradeImpact.valid || tradeAmount > (user?.balance || 0) || processing) ? 'not-allowed' : 'pointer',
                        background: (!tradeImpact || !tradeImpact.valid || tradeAmount > (user?.balance || 0) || processing) ? C.cardBorder : (tradeSide === 'YES' ? C.yes : C.no),
                        color: (!tradeImpact || !tradeImpact.valid || tradeAmount > (user?.balance || 0) || processing) ? C.textDim : '#fff',
                        boxShadow: (!tradeImpact || !tradeImpact.valid || tradeAmount > (user?.balance || 0) || processing) ? 'none' : `0 4px 20px ${tradeSide === 'YES' ? C.yes : C.no}40`,
                        marginBottom: 14,
                      }}
                      onMouseEnter={e => { if (!processing && tradeImpact?.valid) { e.currentTarget.style.filter = 'brightness(1.12)' } }}
                      onMouseLeave={e => { e.currentTarget.style.filter = '' }}>
                      {processing ? (
                        <span style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8 }}>
                          <span style={{ width: 14, height: 14, border: '2px solid rgba(255,255,255,0.3)', borderTopColor: '#fff', borderRadius: '50%', display: 'inline-block', animation: 'spin 0.8s linear infinite' }} />
                          Procesando...
                        </span>
                      ) : !tradeImpact ? 'Calculando...'
                        : !tradeImpact.valid ? tradeImpact.error
                        : tradeAmount > (user?.balance || 0) ? 'Saldo insuficiente'
                        : `Comprar ${tradeSide === 'YES' ? 'SÍ' : 'NO'} — €${tradeAmount}`}
                    </button>
                  ) : (
                    <button
                      onClick={onLimitOrder}
                      disabled={processing || tradeAmount > (user?.balance || 0)}
                      style={{
                        width: '100%', height: 56, borderRadius: 8, fontWeight: 700, fontSize: 15,
                        border: 'none', transition: 'all 0.15s ease',
                        cursor: (processing || tradeAmount > (user?.balance || 0)) ? 'not-allowed' : 'pointer',
                        background: (processing || tradeAmount > (user?.balance || 0)) ? C.cardBorder : C.accent,
                        color: (processing || tradeAmount > (user?.balance || 0)) ? C.textDim : '#fff',
                        boxShadow: (processing || tradeAmount > (user?.balance || 0)) ? 'none' : `0 4px 20px ${C.accent}40`,
                        marginBottom: 14,
                      }}>
                      {processing ? 'Procesando...'
                        : tradeAmount > (user?.balance || 0) ? 'Saldo insuficiente'
                        : `Colocar límite ${tradeSide === 'YES' ? 'SÍ' : 'NO'} a ${(limitPrice * 100).toFixed(0)}¢`}
                    </button>
                  )}

                  {/* User's open positions in this market */}
                  {myTrades.length > 0 && (
                    <div style={{
                      padding: '12px 14px', background: C.surface,
                      border: `1px solid ${C.cardBorder}`, borderRadius: 7, marginBottom: 14,
                    }}>
                      <div style={{ fontSize: 10, fontWeight: 600, letterSpacing: '0.09em', textTransform: 'uppercase', color: C.textDim, marginBottom: 10 }}>
                        Mis posiciones en este mercado
                      </div>
                      {myTrades.map(t => (
                        <div key={t.id} style={{ padding: '8px 0', borderBottom: `1px solid ${C.divider}` }}>
                          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 }}>
                            <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
                              <span style={badge(t.side === 'YES' ? C.yes : C.no)}>{t.side === 'YES' ? 'SÍ' : 'NO'}</span>
                              <span style={{ fontSize: 11, color: C.textMuted }}>{t.shares?.toFixed(1)} contratos · €{t.amount?.toFixed(0)} invertido</span>
                            </div>
                            <span style={{ fontSize: 11, fontFamily: 'ui-monospace, monospace', fontWeight: 600, color: (t.profit || 0) >= 0 ? C.yes : C.no }}>
                              {(t.profit || 0) >= 0 ? '+' : ''}€{(t.profit || 0).toFixed(1)}
                            </span>
                          </div>
                          <button onClick={() => onSell(t)} style={{
                            fontSize: 11, color: C.no, background: 'none',
                            border: `1px solid ${C.no}25`, borderRadius: 4,
                            padding: '3px 10px', cursor: 'pointer', width: '100%',
                          }}>
                            Vender ~€{t.currentValue?.toFixed(2)}
                          </button>
                        </div>
                      ))}
                    </div>
                  )}

                  {/* Pending limit orders */}
                  {userOrders.length > 0 && (
                    <div style={{
                      padding: '12px 14px', background: C.surface,
                      borderRadius: 7, border: `1px solid ${C.cardBorder}`,
                    }}>
                      <div style={{ fontSize: 10, fontWeight: 600, letterSpacing: '0.09em', textTransform: 'uppercase', color: C.textDim, marginBottom: 10 }}>
                        Mis órdenes pendientes
                      </div>
                      {userOrders.map(o => (
                        <div key={o.id} style={{
                          display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                          padding: '6px 0', borderBottom: `1px solid ${C.divider}`,
                        }}>
                          <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                            <span style={badge(o.side === 'YES' ? C.yes : C.no)}>{o.side === 'YES' ? 'SÍ' : 'NO'}</span>
                            <span style={{ fontSize: 12, color: C.textMuted }}>€{o.amount} a {(o.target_price * 100).toFixed(0)}¢</span>
                          </div>
                          <button onClick={() => onCancelOrder(o.id)} style={{
                            fontSize: 11, color: C.no, background: 'none',
                            border: `1px solid ${C.no}30`, borderRadius: 4,
                            padding: '3px 8px', cursor: 'pointer',
                          }}>
                            Cancelar
                          </button>
                        </div>
                      ))}
                    </div>
                  )}
                </>
              ) : (
                <div style={{ padding: 24, background: C.surface, border: `1px solid ${C.cardBorder}`, borderRadius: 8, textAlign: 'center' }}>
                  <div style={{ fontSize: 13, fontWeight: 500, color: C.textMuted, marginBottom: 5 }}>Mercado cerrado</div>
                  <div style={{ fontSize: 12, color: C.textDim }}>Pendiente de resolución automática por el oráculo.</div>
                </div>
              )}
            </div>{/* end right column */}

          </div>{/* end 2-column grid */}
        </div>
      </div>
    </div>
  )
}
