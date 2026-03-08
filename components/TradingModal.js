import { C, badge, getCategoryColor, getCategoryLabel, getTimeLeft, getTypeLabel, isExpiredDate, getOracleDescription, inputStyle } from '../lib/theme'
import OrderBook from './OrderBook'
import ProbabilityChart from './probabilitychart'

// ─── Sub-components ───────────────────────────────────────────────────────────

function SectionTitle({ children }) {
  return (
    <div style={{
      fontSize: 10, fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase',
      color: 'var(--text-dim)', marginBottom: 12,
    }}>
      {children}
    </div>
  )
}

function Divider() {
  return <div style={{ height: 1, background: 'var(--divider)', margin: '20px 0' }} />
}

// ─── MarketHeader ─────────────────────────────────────────────────────────────

function MarketHeader({ market, onClose }) {
  const expired  = isExpiredDate(market.close_date)
  const catColor = getCategoryColor(market.category)

  return (
    <div style={{ padding: '24px 28px 0', borderBottom: `1px solid ${C.cardBorder}` }}>
      {/* Top bar */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
          <span style={{
            fontSize: 10, fontWeight: 700, letterSpacing: '0.06em', textTransform: 'uppercase',
            color: catColor,
          }}>
            {getCategoryLabel(market.category)}
          </span>
          <span style={{ width: 3, height: 3, borderRadius: '50%', background: C.textDim, flexShrink: 0 }} />
          <span style={{ fontSize: 11, color: C.textDim }}>{getTypeLabel(market)}</span>
          <span style={{ width: 3, height: 3, borderRadius: '50%', background: C.textDim, flexShrink: 0 }} />
          <span style={{
            fontSize: 11,
            color: expired ? C.no : C.textDim,
            fontWeight: expired ? 600 : 400,
          }}>
            {expired ? 'Cerrado' : `Cierra en ${getTimeLeft(market.close_date)}`}
          </span>
        </div>
        <button onClick={onClose} style={{
          width: 32, height: 32, borderRadius: 8,
          background: 'transparent', border: `1px solid ${C.cardBorder}`,
          color: C.textDim, cursor: 'pointer', fontSize: 16,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          flexShrink: 0,
        }}>✕</button>
      </div>

      {/* Title */}
      <h2 style={{
        fontSize: 17, fontWeight: 700, lineHeight: 1.35, letterSpacing: '-0.025em',
        color: C.text, marginBottom: 6,
      }}>
        {market.title}
      </h2>

      {/* Credibility line */}
      <p style={{ fontSize: 11, color: C.textDim, marginBottom: 16, lineHeight: 1.5 }}>
        Este mercado se resolverá automáticamente según la fuente indicada.{' '}
        <a href="/metodologia" style={{ color: C.textDim, textDecoration: 'underline', textUnderlineOffset: 2 }}>
          Ver metodología
        </a>
      </p>

      {/* Probability stats strip */}
      <div style={{
        display: 'flex', alignItems: 'center', gap: 24, paddingBottom: 20,
        flexWrap: 'wrap',
      }}>
        {/* YES prob */}
        <div>
          <div style={{ fontSize: 9, fontWeight: 600, letterSpacing: '0.07em', textTransform: 'uppercase', color: C.textDim, marginBottom: 4 }}>SÍ</div>
          <div style={{ fontSize: 28, fontWeight: 800, letterSpacing: '-0.04em', color: C.yes, lineHeight: 1, fontVariantNumeric: 'tabular-nums' }}>
            {market.prices?.yes}¢
          </div>
        </div>
        <div>
          <div style={{ fontSize: 9, fontWeight: 600, letterSpacing: '0.07em', textTransform: 'uppercase', color: C.textDim, marginBottom: 4 }}>NO</div>
          <div style={{ fontSize: 28, fontWeight: 800, letterSpacing: '-0.04em', color: C.no, lineHeight: 1, fontVariantNumeric: 'tabular-nums' }}>
            {market.prices?.no}¢
          </div>
        </div>

        {/* Prob bar */}
        <div style={{ flex: 1, minWidth: 120 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 5 }}>
            <span style={{ fontSize: 10, color: C.yes, fontWeight: 600 }}>SÍ {market.prices?.yes}%</span>
            <span style={{ fontSize: 10, color: C.no, fontWeight: 600 }}>NO {market.prices?.no}%</span>
          </div>
          <div style={{ height: 5, borderRadius: 5, background: `${C.no}20`, overflow: 'hidden' }}>
            <div className="prob-bar-fill" style={{
              height: '100%', borderRadius: 5,
              width: `${market.prices?.yes || 50}%`,
              background: `linear-gradient(to right, ${C.yes}aa, ${C.yes})`,
            }} />
          </div>
        </div>

        {/* Volume */}
        <div style={{ textAlign: 'right' }}>
          <div style={{ fontSize: 9, fontWeight: 600, letterSpacing: '0.07em', textTransform: 'uppercase', color: C.textDim, marginBottom: 4 }}>Volumen</div>
          <div style={{ fontSize: 16, fontWeight: 700, color: C.text, fontVariantNumeric: 'tabular-nums' }}>
            €{((market.total_volume || 0) / 1000).toFixed(1)}K
          </div>
        </div>
      </div>
    </div>
  )
}

// ─── TradePanel ───────────────────────────────────────────────────────────────

function TradePanel({
  market, user, userTrades, tradeSide, setTradeSide,
  tradeAmount, setTradeAmount, orderMode, setOrderMode,
  limitPrice, setLimitPrice, tradeImpact, processing,
  userOrders, onExecuteTrade, onLimitOrder, onCancelOrder, onSell,
}) {
  const expired  = isExpiredDate(market.close_date)
  const myTrades = userTrades.filter(t => t.market_id === market.id && t.status === 'OPEN')

  if (expired) {
    return (
      <div style={{
        padding: '20px', background: C.surface,
        border: `1px solid ${C.cardBorder}`, borderRadius: 12, textAlign: 'center',
      }}>
        <div style={{ fontSize: 13, fontWeight: 600, color: C.textMuted, marginBottom: 4 }}>Mercado cerrado</div>
        <div style={{ fontSize: 12, color: C.textDim }}>Pendiente de resolución automática.</div>
      </div>
    )
  }

  const disabledBuy = !tradeImpact?.valid || tradeAmount > (user?.balance || 0) || processing

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>

      {/* Order mode toggle */}
      <div style={{
        display: 'flex', background: C.surface, borderRadius: 10, padding: 3,
        border: `1px solid ${C.cardBorder}`,
      }}>
        {[['MARKET', 'Mercado'], ['LIMIT', 'Límite']].map(([mode, label]) => (
          <button key={mode} onClick={() => setOrderMode(mode)} style={{
            flex: 1, height: 38, borderRadius: 8, fontSize: 13,
            fontWeight: orderMode === mode ? 700 : 400,
            border: 'none', cursor: 'pointer', transition: 'all 0.15s',
            background: orderMode === mode ? C.card : 'transparent',
            color: orderMode === mode ? C.text : C.textMuted,
            boxShadow: orderMode === mode ? C.shadow : 'none',
          }}>
            {label}
          </button>
        ))}
      </div>

      {/* YES / NO selector */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
        {['YES', 'NO'].map(side => {
          const active = tradeSide === side
          const color  = side === 'YES' ? C.yes : C.no
          return (
            <button key={side} onClick={() => setTradeSide(side)} style={{
              padding: '14px 8px', borderRadius: 10, cursor: 'pointer',
              border: `2px solid ${active ? color : C.cardBorder}`,
              background: active ? color : 'transparent',
              color: active ? '#fff' : color,
              transition: 'all 0.15s',
              boxShadow: active ? `0 4px 16px ${color}30` : 'none',
            }}>
              <div style={{ fontSize: 9, fontWeight: 700, letterSpacing: '0.1em', marginBottom: 4, opacity: active ? 0.85 : 1 }}>
                {side === 'YES' ? 'SÍ' : 'NO'}
              </div>
              <div style={{ fontSize: 22, fontWeight: 800, letterSpacing: '-0.03em', lineHeight: 1, fontVariantNumeric: 'tabular-nums' }}>
                {side === 'YES' ? market.prices?.yes : market.prices?.no}¢
              </div>
            </button>
          )
        })}
      </div>

      {/* Limit price slider */}
      {orderMode === 'LIMIT' && (
        <div style={{ padding: '14px', background: C.surface, borderRadius: 10, border: `1px solid ${C.cardBorder}` }}>
          <SectionTitle>Precio límite</SectionTitle>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 6 }}>
            <input
              type="range" min="5"
              max={Math.max(6, parseInt(tradeSide === 'YES' ? market.prices?.yes : market.prices?.no) - 1)}
              value={limitPrice * 100}
              onChange={e => setLimitPrice(e.target.value / 100)}
              style={{ flex: 1, accentColor: C.accent }}
            />
            <span style={{
              minWidth: 52, textAlign: 'right', fontVariantNumeric: 'tabular-nums',
              fontSize: 20, fontWeight: 800, letterSpacing: '-0.03em', color: C.accent,
            }}>
              {(limitPrice * 100).toFixed(0)}¢
            </span>
          </div>
          <div style={{ fontSize: 11, color: C.textDim }}>
            Actual: {tradeSide === 'YES' ? market.prices?.yes : market.prices?.no}¢ · Retorno: +{((1 / limitPrice - 1) * 100).toFixed(0)}%
          </div>
        </div>
      )}

      {/* Amount */}
      <div>
        <SectionTitle>Cantidad</SectionTitle>
        <input
          type="number" value={tradeAmount}
          onChange={e => setTradeAmount(Math.max(1, Number(e.target.value)))}
          style={{ ...inputStyle, fontSize: 20, fontWeight: 800, letterSpacing: '-0.03em', fontVariantNumeric: 'tabular-nums', marginBottom: 8 }}
          min="1" max={user?.balance || 1000}
        />
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 6 }}>
          {[10, 25, 50, 100].map(v => (
            <button key={v} onClick={() => setTradeAmount(v)} style={{
              padding: '7px 0', fontSize: 12, fontWeight: 500, background: 'transparent',
              color: tradeAmount === v ? C.accent : C.textMuted,
              borderRadius: 8,
              border: `1px solid ${tradeAmount === v ? C.accent : C.cardBorder}`,
              cursor: 'pointer', transition: 'all 0.12s',
            }}>
              €{v}
            </button>
          ))}
        </div>
      </div>

      {/* Summary */}
      {orderMode === 'MARKET' ? (
        tradeImpact?.valid ? (
          <div style={{
            padding: '14px 16px', borderRadius: 10,
            background: C.surface, border: `1px solid ${C.cardBorder}`,
            borderLeft: `3px solid ${tradeSide === 'YES' ? C.yes : C.no}`,
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end' }}>
              <div>
                <div style={{ fontSize: 11, color: C.textDim, marginBottom: 3 }}>{tradeImpact.shares.toFixed(2)} contratos</div>
                <div style={{ fontSize: 11, color: C.textDim }}>impacto {tradeImpact.priceImpactPercent}¢</div>
              </div>
              <div style={{ textAlign: 'right' }}>
                <div style={{ fontSize: 9, color: C.textDim, marginBottom: 3 }}>Si acierta</div>
                <div style={{ fontSize: 22, fontWeight: 800, letterSpacing: '-0.03em', color: C.yes, lineHeight: 1, fontVariantNumeric: 'tabular-nums' }}>
                  +{tradeImpact.roi.toFixed(0)}%
                </div>
                <div style={{ fontSize: 11, color: C.yes, fontVariantNumeric: 'tabular-nums' }}>
                  €{tradeImpact.potentialWinnings.toFixed(2)}
                </div>
              </div>
            </div>
          </div>
        ) : (
          <div style={{ padding: '12px 16px', borderRadius: 10, background: `${C.no}08`, border: `1px solid ${C.no}20` }}>
            <span style={{ fontSize: 12, color: C.no }}>{tradeImpact?.error || 'Introduce una cantidad válida'}</span>
          </div>
        )
      ) : (
        <div style={{ padding: '14px 16px', borderRadius: 10, background: C.surface, border: `1px solid ${C.cardBorder}` }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end' }}>
            <div>
              <div style={{ fontSize: 11, color: C.textDim, marginBottom: 2 }}>Reservado</div>
              <div style={{ fontSize: 16, fontWeight: 700, color: C.text, fontVariantNumeric: 'tabular-nums' }}>€{tradeAmount}</div>
            </div>
            <div style={{ textAlign: 'right' }}>
              <div style={{ fontSize: 9, color: C.textDim, marginBottom: 3 }}>Retorno límite</div>
              <div style={{ fontSize: 22, fontWeight: 800, letterSpacing: '-0.03em', color: C.yes, lineHeight: 1, fontVariantNumeric: 'tabular-nums' }}>
                +{((1 / limitPrice - 1) * 100).toFixed(0)}%
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Execute button */}
      {orderMode === 'MARKET' ? (
        <button
          onClick={onExecuteTrade}
          disabled={disabledBuy}
          style={{
            width: '100%', height: 52, borderRadius: 10,
            fontWeight: 700, fontSize: 14, letterSpacing: '-0.01em',
            border: 'none', cursor: disabledBuy ? 'not-allowed' : 'pointer',
            background: disabledBuy ? C.surface : (tradeSide === 'YES' ? C.yes : C.no),
            color: disabledBuy ? C.textDim : '#fff',
            border: disabledBuy ? `1px solid ${C.cardBorder}` : 'none',
            boxShadow: disabledBuy ? 'none' : `0 4px 20px ${tradeSide === 'YES' ? C.yes : C.no}30`,
            transition: 'all 0.15s',
          }}>
          {processing ? (
            <span style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8 }}>
              <span style={{ width: 14, height: 14, border: '2px solid rgba(255,255,255,0.3)', borderTopColor: '#fff', borderRadius: '50%', display: 'inline-block', animation: 'spin 0.8s linear infinite' }} />
              Procesando...
            </span>
          ) : !tradeImpact         ? 'Calculando...'
            : !tradeImpact.valid   ? tradeImpact.error
            : tradeAmount > (user?.balance || 0) ? 'Saldo insuficiente'
            : `Comprar ${tradeSide === 'YES' ? 'SÍ' : 'NO'} · €${tradeAmount}`
          }
        </button>
      ) : (
        <button onClick={onLimitOrder} disabled={processing || tradeAmount > (user?.balance || 0)} style={{
          width: '100%', height: 52, borderRadius: 10,
          fontWeight: 700, fontSize: 14, border: 'none',
          cursor: (processing || tradeAmount > (user?.balance || 0)) ? 'not-allowed' : 'pointer',
          background: (processing || tradeAmount > (user?.balance || 0)) ? C.surface : C.accent,
          color: (processing || tradeAmount > (user?.balance || 0)) ? C.textDim : '#fff',
          border: (processing || tradeAmount > (user?.balance || 0)) ? `1px solid ${C.cardBorder}` : 'none',
          boxShadow: (processing || tradeAmount > (user?.balance || 0)) ? 'none' : `0 4px 20px ${C.accent}30`,
          transition: 'all 0.15s',
        }}>
          {processing ? 'Procesando...'
            : tradeAmount > (user?.balance || 0) ? 'Saldo insuficiente'
            : `Orden límite ${tradeSide === 'YES' ? 'SÍ' : 'NO'} · ${(limitPrice * 100).toFixed(0)}¢`
          }
        </button>
      )}

      {/* Open positions in this market */}
      {myTrades.length > 0 && (
        <div style={{ padding: '14px 16px', background: C.surface, border: `1px solid ${C.cardBorder}`, borderRadius: 10 }}>
          <SectionTitle>Mis posiciones</SectionTitle>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {myTrades.map(t => (
              <div key={t.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 10 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, minWidth: 0 }}>
                  <span style={badge(t.side === 'YES' ? C.yes : C.no)}>{t.side === 'YES' ? 'SÍ' : 'NO'}</span>
                  <span style={{ fontSize: 11, color: C.textMuted }}>{t.shares?.toFixed(1)} contratos</span>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexShrink: 0 }}>
                  <span style={{ fontSize: 12, fontWeight: 600, fontVariantNumeric: 'tabular-nums', color: (t.profit || 0) >= 0 ? C.yes : C.no }}>
                    {(t.profit || 0) >= 0 ? '+' : ''}€{(t.profit || 0).toFixed(1)}
                  </span>
                  <button onClick={() => onSell(t)} style={{
                    fontSize: 11, color: C.textMuted, background: 'none',
                    border: `1px solid ${C.cardBorder}`, borderRadius: 6,
                    padding: '3px 10px', cursor: 'pointer',
                  }}>
                    Vender
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Pending limit orders */}
      {userOrders.length > 0 && (
        <div style={{ padding: '14px 16px', background: C.surface, border: `1px solid ${C.cardBorder}`, borderRadius: 10 }}>
          <SectionTitle>Órdenes pendientes</SectionTitle>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
            {userOrders.map(o => (
              <div key={o.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                  <span style={badge(o.side === 'YES' ? C.yes : C.no)}>{o.side === 'YES' ? 'SÍ' : 'NO'}</span>
                  <span style={{ fontSize: 12, color: C.textMuted }}>€{o.amount} a {(o.target_price * 100).toFixed(0)}¢</span>
                </div>
                <button onClick={() => onCancelOrder(o.id)} style={{
                  fontSize: 11, color: C.no, background: 'none',
                  border: `1px solid ${C.no}25`, borderRadius: 6,
                  padding: '3px 8px', cursor: 'pointer',
                }}>
                  Cancelar
                </button>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}

// ─── Market metrics panel ─────────────────────────────────────────────────────

function MarketMetrics({ market, topHolders }) {
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

// ─── Signals section ──────────────────────────────────────────────────────────

function SignalsSection({ }) {
  // Placeholder — integrated with actual signals API in pipeline
  return null
}

// ─── Comments ─────────────────────────────────────────────────────────────────

function CommentsSection({ user, comments, newComment, setNewComment, onPostComment, onLikeComment }) {
  return (
    <div>
      <SectionTitle>Debate</SectionTitle>
      {user && (
        <div style={{ display: 'flex', gap: 8, marginBottom: 14 }}>
          <input
            value={newComment}
            onChange={e => setNewComment(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && onPostComment()}
            placeholder="Añade un comentario..."
            style={{ ...inputStyle, flex: 1 }}
          />
          <button onClick={onPostComment} style={{
            padding: '0 16px', background: C.accent, color: '#fff',
            border: 'none', borderRadius: 10, fontSize: 13, fontWeight: 600,
            cursor: 'pointer', flexShrink: 0, height: 42,
          }}>
            Enviar
          </button>
        </div>
      )}
      {comments.length === 0 ? (
        <div style={{ fontSize: 13, color: C.textDim, padding: '16px 0' }}>Sin comentarios aún.</div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          {comments.map(c => {
            const diffMs = Date.now() - new Date(c.created_at)
            const h = Math.floor(diffMs / 3600000)
            const age = h < 1 ? `${Math.floor(diffMs / 60000)}m` : h < 24 ? `${h}h` : `${Math.floor(h / 24)}d`
            return (
              <div key={c.id} style={{ display: 'flex', gap: 10, alignItems: 'flex-start' }}>
                <div style={{
                  width: 30, height: 30, borderRadius: 8, flexShrink: 0,
                  background: `${C.accent}12`,
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  fontSize: 12, fontWeight: 700, color: C.accent,
                }}>
                  {c.user_email[0].toUpperCase()}
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ display: 'flex', gap: 8, alignItems: 'baseline', marginBottom: 4 }}>
                    <span style={{ fontSize: 12, fontWeight: 600, color: C.text }}>{c.user_email.split('@')[0]}</span>
                    <span style={{ fontSize: 10, color: C.textDim }}>hace {age}</span>
                  </div>
                  <p style={{ fontSize: 13, color: C.textMuted, lineHeight: 1.55, wordBreak: 'break-word' }}>{c.text}</p>
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
  )
}

// ─── Recent trades ────────────────────────────────────────────────────────────

function RecentTrades({ recentActivity }) {
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

// ─── Resolution info ──────────────────────────────────────────────────────────

function ResolutionInfo({ market }) {
  const oracle = getOracleDescription(market)
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
      <div style={{ padding: '14px 16px', background: C.surface, border: `1px solid ${C.cardBorder}`, borderRadius: 10 }}>
        <SectionTitle>Oráculo</SectionTitle>
        <div style={{ fontSize: 13, fontWeight: 600, color: C.accentLight, marginBottom: 6 }}>{oracle.source}</div>
        <div style={{ fontSize: 12, color: C.textMuted, lineHeight: 1.65 }}>{oracle.method}</div>
      </div>
      <div style={{ padding: '12px 16px', background: `${C.warning}06`, border: `1px solid ${C.warning}15`, borderRadius: 10 }}>
        <div style={{ fontSize: 11, color: C.warning, fontWeight: 600, marginBottom: 4 }}>Aviso de riesgo</div>
        <div style={{ fontSize: 11, color: C.textDim, lineHeight: 1.6 }}>
          PrediMarket es un mercado de predicción con créditos virtuales. No constituye asesoramiento financiero. Riesgo de pérdida total.
        </div>
      </div>
    </div>
  )
}

// ─── Main modal ───────────────────────────────────────────────────────────────

export default function TradingModal({
  market, user, userTrades,
  tradeSide, setTradeSide,
  tradeAmount, setTradeAmount,
  orderMode, setOrderMode,
  limitPrice, setLimitPrice,
  modalTab, setModalTab,
  tradeImpact, processing,
  priceHistory, recentActivity, orderBook, userOrders,
  comments, newComment, setNewComment, topHolders,
  onClose, onExecuteTrade, onLimitOrder, onCancelOrder, onSell, onPostComment, onLikeComment,
}) {
  return (
    <div style={{
      position: 'fixed', inset: 0,
      background: 'rgba(15,23,42,0.65)',
      backdropFilter: 'blur(12px)', WebkitBackdropFilter: 'blur(12px)',
      zIndex: 50, overflowY: 'auto',
      WebkitOverflowScrolling: 'touch',
    }}>
      <div style={{
        minHeight: '100%', display: 'flex', alignItems: 'flex-start',
        justifyContent: 'center', padding: '32px 16px',
      }}>
        <div className="anim-slide-up" style={{
          background: C.card, border: `1px solid ${C.cardBorder}`,
          borderRadius: 16, width: '100%', maxWidth: 960,
          overflow: 'hidden', boxShadow: '0 24px 80px rgba(15,23,42,0.18)',
        }}>

          {/* ── MarketHeader ─────────────────────────────────────────────── */}
          <MarketHeader market={market} onClose={onClose} />

          <div style={{ padding: '24px 28px' }}>

            {/* ── PriceChart ───────────────────────────────────────────────── */}
            {priceHistory.length > 1 && (
              <>
                <SectionTitle>Historial de probabilidad</SectionTitle>
                <div style={{ marginBottom: 24 }}>
                  <ProbabilityChart priceHistory={priceHistory} market={market} />
                </div>
              </>
            )}

            {/* ── Two-column body ───────────────────────────────────────────── */}
            <div style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))',
              gap: 32, alignItems: 'start',
            }}>

              {/* LEFT — order book, activity, comments, resolution */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>

                {/* Tabs */}
                <div style={{ display: 'flex', gap: 0, borderBottom: `1px solid ${C.cardBorder}` }}>
                  {[['BOOK', 'Liquidez'], ['RESOLUTION', 'Resolución']].map(([t, label]) => (
                    <button key={t} onClick={() => setModalTab(t)} style={{
                      padding: '8px 14px', fontSize: 12, fontWeight: modalTab === t ? 600 : 400,
                      background: 'transparent', border: 'none', cursor: 'pointer',
                      color: modalTab === t ? C.text : C.textDim,
                      borderBottom: `2px solid ${modalTab === t ? C.accent : 'transparent'}`,
                      marginBottom: -1, transition: 'color 0.12s',
                    }}>
                      {label}
                    </button>
                  ))}
                </div>

                {modalTab === 'BOOK' && (
                  <>
                    <MarketMetrics market={market} topHolders={topHolders} />
                    <OrderBook market={market} orderBook={orderBook} />
                    <RecentTrades recentActivity={recentActivity} />
                    <CommentsSection
                      user={user} comments={comments}
                      newComment={newComment} setNewComment={setNewComment}
                      onPostComment={onPostComment} onLikeComment={onLikeComment}
                    />
                  </>
                )}

                {modalTab === 'RESOLUTION' && (
                  <ResolutionInfo market={market} />
                )}
              </div>

              {/* RIGHT (sticky) — TradePanel */}
              <div style={{ position: 'sticky', top: 24 }}>
                <TradePanel
                  market={market} user={user} userTrades={userTrades}
                  tradeSide={tradeSide} setTradeSide={setTradeSide}
                  tradeAmount={tradeAmount} setTradeAmount={setTradeAmount}
                  orderMode={orderMode} setOrderMode={setOrderMode}
                  limitPrice={limitPrice} setLimitPrice={setLimitPrice}
                  tradeImpact={tradeImpact} processing={processing}
                  userOrders={userOrders}
                  onExecuteTrade={onExecuteTrade} onLimitOrder={onLimitOrder}
                  onCancelOrder={onCancelOrder} onSell={onSell}
                />
              </div>
            </div>
          </div>

        </div>
      </div>
    </div>
  )
}
