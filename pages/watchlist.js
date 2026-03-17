import { useEffect, useState } from 'react'
import dynamic from 'next/dynamic'
import { C } from '../lib/theme'
import { getAlertMarkets } from '../lib/watchlist'
import { supabase, createTrade, getPriceHistory } from '../lib/supabase'
import { calculatePrices, previewTrade } from '../lib/amm'
import AppLayout from '@/components/layout/AppLayout'
import MarketCard from '@/components/MarketCard'
import useWatchlist from '@/hooks/useWatchlist'

const TradingModal = dynamic(() => import('../components/TradingModal'), { ssr: false })

export default function WatchlistPage() {
  const [user, setUser] = useState(null)
  useEffect(() => {
    try {
      const saved = localStorage.getItem('predi_user')
      if (saved) setUser(JSON.parse(saved))
    } catch { /* ignore */ }
  }, [])

  const { watchlistMarkets, alertCount, loading, isWatching, toggleWatch, loadMarkets } = useWatchlist(user)
  const [suggestions, setSuggestions] = useState([])

  // ── Trade modal state ────────────────────────────────────────────────────
  const [selectedMarket, setSelectedMarket]   = useState(null)
  const [showTradeModal, setShowTradeModal]   = useState(false)
  const [tradeSide, setTradeSide]             = useState('YES')
  const [tradeAmount, setTradeAmount]         = useState(10)
  const [orderMode, setOrderMode]             = useState('MARKET')
  const [limitPrice, setLimitPrice]           = useState(0.40)
  const [modalTab, setModalTab]               = useState('BOOK')
  const [tradeImpact, setTradeImpact]         = useState(null)
  const [processing, setProcessing]           = useState(false)
  const [priceHistory, setPriceHistory]       = useState([])
  const [userOrders, setUserOrders]           = useState([])
  const [userTrades, setUserTrades]           = useState([])

  // Recompute tradeImpact when inputs change
  useEffect(() => {
    if (selectedMarket && tradeAmount > 0) {
      const preview = previewTrade(tradeAmount, tradeSide, selectedMarket.yes_pool, selectedMarket.no_pool)
      setTradeImpact(preview)
    }
  }, [tradeAmount, tradeSide, selectedMarket])

  function openMarket(market) {
    setSelectedMarket(market)
    setTradeSide('YES')
    setTradeAmount(10)
    setOrderMode('MARKET')
    setModalTab('BOOK')
    setTradeImpact(null)
    setShowTradeModal(true)
    getPriceHistory(market.id).then(h => setPriceHistory(h || []))
    supabase.from('limit_orders')
      .select('*').eq('market_id', market.id).eq('status', 'PENDING')
      .then(({ data }) => setUserOrders(data || []))
  }

  async function executeTrade() {
    if (!user || !selectedMarket || !tradeImpact?.valid || processing) return { success: false, error: 'No disponible' }
    setProcessing(true)
    const result = await createTrade(user.email, selectedMarket.id, tradeSide, tradeAmount, selectedMarket)
    setProcessing(false)
    if (result.success) {
      const newUser = { ...user, balance: result.new_balance }
      setUser(newUser)
      localStorage.setItem('predi_user', JSON.stringify(newUser))
      setTradeAmount(10)
    }
    return result
  }

  async function placeLimitOrder() {
    if (!user || !selectedMarket || processing) return { success: false, error: 'No disponible' }
    setProcessing(true)
    await supabase.rpc('get_or_create_user', { p_email: user.email })
    const { data, error } = await supabase.rpc('place_limit_order', {
      p_email: user.email, p_market_id: selectedMarket.id,
      p_side: tradeSide, p_amount: tradeAmount, p_target_price: limitPrice,
    })
    setProcessing(false)
    if (error) return { success: false, error: error.message }
    if (data && !data.success) return { success: false, error: data.error }
    const newUser = { ...user, balance: data.new_balance }
    setUser(newUser)
    localStorage.setItem('predi_user', JSON.stringify(newUser))
    return { success: true, new_balance: data.new_balance }
  }

  useEffect(() => { loadMarkets() }, [loadMarkets])

  useEffect(() => {
    if (loading || watchlistMarkets.length > 0) return
    supabase
      .from('markets')
      .select('id, title, category, yes_pool, no_pool, total_volume, close_date, created_at')
      .eq('status', 'ACTIVE')
      .gt('close_date', new Date().toISOString())
      .order('close_date', { ascending: true })
      .limit(4)
      .then(({ data }) => {
        if (data) setSuggestions(data.map(m => ({
          ...m,
          prices: calculatePrices(parseFloat(m.yes_pool), parseFloat(m.no_pool)),
          isExpired: false,
        })))
      })
  }, [loading, watchlistMarkets.length])

  const alertMarkets  = getAlertMarkets(watchlistMarkets)
  const normalMarkets = watchlistMarkets.filter(m => !alertMarkets.includes(m))

  if (!user) {
    return (
      <AppLayout>
        <div style={{ textAlign: 'center', padding: '80px 0' }}>
          <div style={{ fontSize: 28, marginBottom: 16, opacity: 0.3 }}>♡</div>
          <h2 style={{ fontSize: 16, fontWeight: 700, color: C.text, marginBottom: 8 }}>
            Inicia sesión para ver tu watchlist
          </h2>
          <p style={{ fontSize: 13, color: C.textMuted }}>
            Sigue mercados y recibe alertas cuando la probabilidad cambie.
          </p>
        </div>
      </AppLayout>
    )
  }

  return (
    <AppLayout>
      <div style={{ marginBottom: 28 }}>
        <h1 style={{ fontSize: 20, fontWeight: 800, letterSpacing: '-0.04em', color: C.text, marginBottom: 4 }}>
          Mi watchlist
        </h1>
        <p style={{ fontSize: 13, color: C.textMuted }}>
          {watchlistMarkets.length > 0
            ? `Siguiendo ${watchlistMarkets.length} mercado${watchlistMarkets.length !== 1 ? 's' : ''}.`
            : 'Sigue mercados pulsando ♡ en cualquier card.'}
        </p>
      </div>

      {loading ? (
        <div style={{ color: C.textDim, fontSize: 13, padding: '40px 0', textAlign: 'center' }}>
          Cargando watchlist...
        </div>
      ) : watchlistMarkets.length === 0 ? (
        <div>
          <div style={{ textAlign: 'center', padding: '40px 0 24px', color: C.textDim }}>
            <div style={{ fontSize: 32, marginBottom: 12, opacity: 0.3 }}>♡</div>
            <div style={{ fontSize: 14 }}>Tu watchlist está vacía.</div>
            <div style={{ marginTop: 6, fontSize: 12 }}>
              Pulsa ♡ en cualquier mercado para añadirlo.
            </div>
          </div>
          {suggestions.length > 0 && (
            <div>
              <div style={{
                fontSize: 11, fontWeight: 700, letterSpacing: '0.07em',
                textTransform: 'uppercase', color: C.textDim, marginBottom: 12,
              }}>
                Cierran pronto
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                {suggestions.map(market => (
                  <MarketCard key={market.id} market={market} onOpen={openMarket} />
                ))}
              </div>
            </div>
          )}
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>

          {alertMarkets.length > 0 && (
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 12 }}>
                <span style={{ fontSize: 11, fontWeight: 700, letterSpacing: '0.07em', textTransform: 'uppercase', color: C.warning }}>
                  ⚠ Alertas
                </span>
                <span style={{ fontSize: 10, background: `${C.warning}15`, color: C.warning, border: `1px solid ${C.warning}30`, padding: '1px 6px', borderRadius: 4, fontWeight: 600 }}>
                  {alertMarkets.length}
                </span>
              </div>
              <div style={{ padding: '12px 16px', marginBottom: 12, background: `${C.warning}08`, border: `1px solid ${C.warning}20`, borderRadius: 10, fontSize: 12, color: C.warning }}>
                Los siguientes mercados han variado más de 10 puntos porcentuales en 24h.
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                {alertMarkets.map(market => (
                  <MarketCard key={market.id} market={market} onOpen={openMarket}
                    user={user} isWatching={isWatching}
                    onToggleWatch={async (id) => { await toggleWatch(id); loadMarkets() }}
                  />
                ))}
              </div>
            </div>
          )}

          {normalMarkets.length > 0 && (
            <div>
              {alertMarkets.length > 0 && (
                <div style={{ fontSize: 11, fontWeight: 600, letterSpacing: '0.07em', textTransform: 'uppercase', color: C.textDim, marginBottom: 12 }}>
                  Seguidos
                </div>
              )}
              <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                {normalMarkets.map(market => (
                  <MarketCard key={market.id} market={market} onOpen={openMarket}
                    user={user} isWatching={isWatching}
                    onToggleWatch={async (id) => { await toggleWatch(id); loadMarkets() }}
                  />
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {showTradeModal && selectedMarket && (
        <TradingModal
          market={selectedMarket} user={user} userTrades={userTrades}
          tradeSide={tradeSide}     setTradeSide={setTradeSide}
          tradeAmount={tradeAmount} setTradeAmount={setTradeAmount}
          orderMode={orderMode}     setOrderMode={setOrderMode}
          limitPrice={limitPrice}   setLimitPrice={setLimitPrice}
          modalTab={modalTab}       setModalTab={setModalTab}
          tradeImpact={tradeImpact} processing={processing}
          priceHistory={priceHistory}
          recentActivity={[]} orderBook={[]} userOrders={userOrders}
          comments={[]} newComment='' setNewComment={() => {}} topHolders={[]}
          isWatching={isWatching(selectedMarket.id)}
          onClose={() => setShowTradeModal(false)}
          onExecuteTrade={executeTrade}
          onLimitOrder={placeLimitOrder}
          onCancelOrder={() => {}}
          onSell={() => {}}
          onPostComment={() => {}}
          onLikeComment={() => {}}
          onOpenMarket={openMarket}
        />
      )}
    </AppLayout>
  )
}
