import { useState, useEffect } from 'react'
import { C, badge, isExpiredDate, inputStyle } from '../../lib/theme'
import SectionTitle from './SectionTitle'

export default function TradePanel({
  market, user, userTrades, tradeSide, setTradeSide,
  tradeAmount, setTradeAmount, orderMode, setOrderMode,
  limitPrice, setLimitPrice, tradeImpact, processing,
  userOrders, onExecuteTrade, onLimitOrder, onCancelOrder, onSell, onClose,
}) {
  const [step, setStep] = useState('form')   // 'form' | 'confirm' | 'success' | 'error'
  const [resultMsg, setResultMsg] = useState('')
  const [resultShares, setResultShares] = useState(null)
  const [impactoTooltip, setImpactoTooltip] = useState(false)

  // Reset to form when market changes
  useEffect(() => { setStep('form') }, [market?.id])

  // Auto-close after success
  useEffect(() => {
    if (step !== 'success') return
    const t = setTimeout(() => onClose?.(), 2000)
    return () => clearTimeout(t)
  }, [step])

  async function handleConfirm() {
    const result = await (orderMode === 'MARKET' ? onExecuteTrade() : onLimitOrder())
    if (result?.success) {
      setResultShares(result.shares ?? result.amount ?? tradeAmount)
      setStep('success')
    } else {
      setResultMsg(result?.error || 'Error desconocido')
      setStep('error')
    }
  }

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

  // ── Success screen ──────────────────────────────────────────────────────
  if (step === 'success') {
    return (
      <div style={{ padding: '32px 20px', textAlign: 'center', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 14 }}>
        <div style={{
          width: 64, height: 64, borderRadius: '50%', background: `${C.yes}18`,
          border: `2px solid ${C.yes}`, display: 'flex', alignItems: 'center', justifyContent: 'center',
          animation: 'fadeIn 0.3s ease',
        }}>
          <span style={{ fontSize: 28, color: C.yes }}>✓</span>
        </div>
        <div>
          <div style={{ fontSize: 16, fontWeight: 700, color: C.text, marginBottom: 4 }}>¡Orden ejecutada!</div>
          <div style={{ fontSize: 13, color: C.textMuted }}>
            {tradeSide === 'YES' ? 'SÍ' : 'NO'} · €{tradeAmount}
          </div>
        </div>
        <div style={{ fontSize: 11, color: C.textDim }}>Cerrando...</div>
      </div>
    )
  }

  // ── Error screen ────────────────────────────────────────────────────────
  if (step === 'error') {
    return (
      <div style={{ padding: '32px 20px', textAlign: 'center', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 14 }}>
        <div style={{
          width: 64, height: 64, borderRadius: '50%', background: `${C.no}18`,
          border: `2px solid ${C.no}`, display: 'flex', alignItems: 'center', justifyContent: 'center',
        }}>
          <span style={{ fontSize: 28, color: C.no }}>✕</span>
        </div>
        <div>
          <div style={{ fontSize: 15, fontWeight: 700, color: C.text, marginBottom: 6 }}>Error al ejecutar</div>
          <div style={{ fontSize: 12, color: C.no }}>{resultMsg}</div>
        </div>
        <button onClick={() => setStep('form')} style={{
          padding: '10px 24px', borderRadius: 8, border: `1px solid ${C.cardBorder}`,
          background: 'transparent', color: C.textMuted, fontSize: 13, cursor: 'pointer',
        }}>
          Reintentar
        </button>
      </div>
    )
  }

  // ── Confirm screen ──────────────────────────────────────────────────────
  if (step === 'confirm') {
    const sideColor = tradeSide === 'YES' ? C.yes : C.no
    const sideLabel = tradeSide === 'YES' ? 'SÍ' : 'NO'
    const priceLabel = orderMode === 'MARKET'
      ? `${tradeSide === 'YES' ? market.prices?.yes : market.prices?.no}¢`
      : `${(limitPrice * 100).toFixed(0)}¢ (límite)`
    return (
      <div style={{ display: 'flex', flexDirection: 'column', gap: 20, padding: '8px 0' }}>
        <div style={{ textAlign: 'center' }}>
          <div style={{ fontSize: 12, color: C.textDim, marginBottom: 8 }}>Confirmar orden</div>
          <div style={{
            padding: '18px 20px', borderRadius: 10,
            background: C.surface, border: `1px solid ${C.cardBorder}`,
            borderLeft: `3px solid ${sideColor}`,
          }}>
            <div style={{ fontSize: 22, fontWeight: 800, color: sideColor, marginBottom: 6 }}>
              {sideLabel} · €{tradeAmount}
            </div>
            <div style={{ fontSize: 12, color: C.textMuted }}>
              Precio: {priceLabel}
            </div>
            <div style={{ fontSize: 11, color: C.textDim, marginTop: 4 }}>
              Saldo tras orden: €{((user?.balance || 0) - tradeAmount).toFixed(2)}
            </div>
          </div>
        </div>
        <div style={{ display: 'flex', gap: 8 }}>
          <button onClick={() => setStep('form')} style={{
            flex: 1, height: 46, borderRadius: 9,
            border: `1px solid ${C.cardBorder}`, background: 'transparent',
            color: C.textDim, fontSize: 13, cursor: 'pointer',
          }}>
            Cancelar
          </button>
          <button onClick={handleConfirm} disabled={processing} style={{
            flex: 2, height: 46, borderRadius: 9, border: 'none',
            background: processing ? C.surface : sideColor,
            color: processing ? C.textDim : '#fff',
            fontSize: 14, fontWeight: 700, cursor: processing ? 'not-allowed' : 'pointer',
            boxShadow: processing ? 'none' : `0 4px 16px ${sideColor}30`,
            transition: 'all 0.15s',
          }}>
            {processing ? 'Procesando...' : 'Confirmar'}
          </button>
        </div>
      </div>
    )
  }

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
                <div style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
                  <span style={{ fontSize: 11, color: C.textDim }}>impacto {tradeImpact.priceImpactPercent}¢</span>
                  <span
                    style={{ position: 'relative', display: 'inline-flex' }}
                    onMouseEnter={() => setImpactoTooltip(true)}
                    onMouseLeave={() => setImpactoTooltip(false)}
                    onClick={() => setImpactoTooltip(v => !v)}
                  >
                    <span style={{
                      display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
                      width: 13, height: 13, borderRadius: '50%',
                      border: `1px solid ${C.textDim}`, color: C.textDim,
                      fontSize: 8, fontWeight: 700, cursor: 'default', lineHeight: 1,
                      userSelect: 'none',
                    }}>?</span>
                    {impactoTooltip && (
                      <span style={{
                        position: 'absolute', bottom: 'calc(100% + 6px)', left: '50%',
                        transform: 'translateX(-50%)',
                        background: '#111', color: '#fff',
                        fontSize: 11, lineHeight: 1.5,
                        padding: '7px 10px', borderRadius: 7,
                        width: 220, whiteSpace: 'normal',
                        boxShadow: '0 4px 16px rgba(0,0,0,0.4)',
                        zIndex: 999, pointerEvents: 'none',
                      }}>
                        El impacto indica cuánto moverá tu compra el precio del mercado. A mayor impacto, más caro pagarán los siguientes compradores.
                        <span style={{
                          position: 'absolute', top: '100%', left: '50%',
                          transform: 'translateX(-50%)',
                          borderWidth: 5, borderStyle: 'solid',
                          borderColor: '#111 transparent transparent transparent',
                        }} />
                      </span>
                    )}
                  </span>
                </div>
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
          onClick={() => !disabledBuy && setStep('confirm')}
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
            : `Comprar ${tradeSide === 'YES' ? 'SÍ' : 'NO'} a ${tradeSide === 'YES' ? market.prices?.yes : market.prices?.no}¢ · €${tradeAmount}`
          }
        </button>
      ) : (
        <button onClick={() => !(processing || tradeAmount > (user?.balance || 0)) && setStep('confirm')} disabled={processing || tradeAmount > (user?.balance || 0)} style={{
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

      {/* Disclaimer */}
      <p style={{ fontSize: 10, color: C.textDim, lineHeight: 1.5, margin: 0 }}>
        PrediMarket usa <strong style={{ color: C.textMuted }}>créditos virtuales</strong> sin valor monetario real. Puedes perder el 100% del crédito invertido. No es asesoramiento financiero.
      </p>
    </div>
  )
}
