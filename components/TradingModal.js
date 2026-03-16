import { useEffect, useRef } from 'react'
import { C } from '../lib/theme'
import OrderBook from './OrderBook'
import ProbabilityChart from './ProbabilityChart'

import MarketHeader from './trading/MarketHeader'
import TradePanel from './trading/TradePanel'
import MarketMetrics from './trading/MarketMetrics'
import CommentsSection from './trading/CommentsSection'
import RecentTrades from './trading/RecentTrades'
import ResolutionInfo from './trading/ResolutionInfo'
import MarketInsights from './analytics/MarketInsights'

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
  relatedMarkets = [],
  isWatching, onToggleWatch,
  onClose, onExecuteTrade, onLimitOrder, onCancelOrder, onSell, onPostComment, onLikeComment, onOpenMarket,
}) {
  const scrollRef = useRef(null)
  useEffect(() => {
    if (scrollRef.current) scrollRef.current.scrollTop = 0
  }, [market?.id])

  return (
    <div style={{
      position: 'fixed', inset: 0,
      background: 'rgba(15,23,42,0.65)',
      backdropFilter: 'blur(12px)', WebkitBackdropFilter: 'blur(12px)',
      zIndex: 1200, overflowY: 'auto',
      WebkitOverflowScrolling: 'touch',
    }}>
      <div style={{
        minHeight: '100%', display: 'flex', alignItems: 'flex-start',
        justifyContent: 'center', padding: '32px 16px',
      }}>
        <div className="anim-slide-up trading-modal-panel" style={{
          background: C.card, border: `1px solid ${C.cardBorder}`,
          borderRadius: 16, width: '100%', maxWidth: 960,
          overflow: 'hidden', boxShadow: '0 24px 80px rgba(15,23,42,0.18)',
        }}>

          {/* ── MarketHeader ─────────────────────────────────────────────── */}
          <MarketHeader
            market={market}
            onClose={onClose}
            user={user}
            isWatching={isWatching}
            onToggleWatch={onToggleWatch}
          />

          <div ref={scrollRef} className="trading-modal-scroll" style={{ padding: '24px 28px' }}>

            {/* ── PriceChart ───────────────────────────────────────────────── */}
            {priceHistory.length > 1 && (
              <>
                <div style={{
                  fontSize: 10, fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase',
                  color: 'var(--text-dim)', marginBottom: 12,
                }}>
                  Historial de probabilidad
                </div>
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
                  {[['BOOK', 'Liquidez'], ['INSIGHTS', 'Análisis'], ['RESOLUTION', 'Resolución']].map(([t, label]) => (
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

                {modalTab === 'INSIGHTS' && (
                  <MarketInsights
                    market={market}
                    relatedMarkets={relatedMarkets}
                    onOpenMarket={onOpenMarket}
                  />
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
