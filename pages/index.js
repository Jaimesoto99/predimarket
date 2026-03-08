import { useEffect, useState } from 'react'
import dynamic from 'next/dynamic'
import { getOrCreateUser, createTrade, getPriceHistory } from '../lib/supabase'
import { supabase } from '../lib/supabase'
import { previewTrade } from '../lib/amm'
import { C } from '../lib/theme'

import useMarkets from '@/hooks/useMarkets'
import useTrades from '@/hooks/useTrades'
import useLeaderboard from '@/hooks/useLeaderboard'

import AppLayout from '@/components/layout/AppLayout'
import MarketGrid from '@/components/MarketGrid'
import TrendingRow from '@/components/TrendingRow'
import Footer from '@/components/Footer'
import KYCModal from '@/components/KYCModal'
import HomeHero from '@/components/home/HomeHero'

import AuthModal from '@/components/modals/AuthModal'
import PortfolioModal from '@/components/modals/PortfolioModal'
import LeaderboardModal from '@/components/modals/LeaderboardModal'
import DisclaimerModal from '@/components/modals/DisclaimerModal'

const TradingModal = dynamic(() => import('../components/TradingModal'), { ssr: false })
const ProfileModal = dynamic(() => import('../components/ProfileModal'), { ssr: false })

export default function Home() {
  // ─── Auth ─────────────────────────────────────────────────────────────────
  const [user, setUser] = useState(null)
  const [email, setEmail] = useState('')
  const [showAuth, setShowAuth] = useState(false)

  // ─── Modal visibility ─────────────────────────────────────────────────────
  const [showPortfolio, setShowPortfolio] = useState(false)
  const [showProfile, setShowProfile] = useState(false)
  const [showLeaderboard, setShowLeaderboard] = useState(false)
  const [showKYC, setShowKYC] = useState(false)
  const [showDisclaimer, setShowDisclaimer] = useState(false)
  const [pendingTradeAction, setPendingTradeAction] = useState(null)
  const [showResolved, setShowResolved] = useState(false)

  // ─── Trading state ────────────────────────────────────────────────────────
  const [selectedMarket, setSelectedMarket] = useState(null)
  const [tradeSide, setTradeSide] = useState('YES')
  const [tradeAmount, setTradeAmount] = useState(10)
  const [showTradeModal, setShowTradeModal] = useState(false)
  const [tradeImpact, setTradeImpact] = useState(null)
  const [processing, setProcessing] = useState(false)
  const [orderMode, setOrderMode] = useState('MARKET')
  const [limitPrice, setLimitPrice] = useState(0.40)
  const [modalTab, setModalTab] = useState('BOOK')

  // ─── Market detail state ──────────────────────────────────────────────────
  const [recentActivity, setRecentActivity] = useState([])
  const [orderBook, setOrderBook] = useState([])
  const [userOrders, setUserOrders] = useState([])
  const [priceHistory, setPriceHistory] = useState([])
  const [comments, setComments] = useState([])
  const [newComment, setNewComment] = useState('')
  const [topHolders, setTopHolders] = useState([])

  // ─── Filters & UI ────────────────────────────────────────────────────────
  const [filter, setFilter] = useState('ALL')
  const [catFilter, setCatFilter] = useState('ALL')
  const [toast, setToast] = useState(null)

  // ─── Hooks ────────────────────────────────────────────────────────────────
  const { markets, resolvedMarkets, loading, loadMarkets } = useMarkets()
  const { userTrades, openTrades, loadUserTrades, handleSell } = useTrades({ user, setUser, onRefreshMarkets: loadMarkets })
  const { leaderboard, loadLeaderboard } = useLeaderboard()

  // ─── Init ─────────────────────────────────────────────────────────────────
  useEffect(() => {
    const savedUser = localStorage.getItem('predi_user')
    if (savedUser) {
      try {
        const u = JSON.parse(savedUser)
        setUser(u)
        loadUserTrades(u.email)
      } catch (e) { localStorage.removeItem('predi_user') }
    }
  }, [])

  // ─── Trade preview ────────────────────────────────────────────────────────
  useEffect(() => {
    if (selectedMarket && tradeAmount > 0) {
      const preview = previewTrade(tradeAmount, tradeSide, selectedMarket.yes_pool, selectedMarket.no_pool)
      setTradeImpact(preview)
    }
  }, [tradeAmount, tradeSide, selectedMarket])

  // ─── Auth ─────────────────────────────────────────────────────────────────
  async function handleLogin(e) {
    e.preventDefault()
    if (!email) return
    const result = await getOrCreateUser(email)
    if (!result.success) { alert(result.error || 'Error al crear usuario'); return }
    setUser(result.user)
    localStorage.setItem('predi_user', JSON.stringify(result.user))
    setShowAuth(false)
    setEmail('')
    loadUserTrades(result.user.email)
  }

  function handleLogout() {
    setUser(null)
    localStorage.removeItem('predi_user')
  }

  // ─── Helpers ──────────────────────────────────────────────────────────────
  function showToast(msg, type = 'success') {
    setToast({ msg, type })
    setTimeout(() => setToast(null), 3500)
  }

  function hasAcceptedDisclaimer() {
    try { return localStorage.getItem('predi_disclaimer_v1') === 'accepted' } catch { return false }
  }

  // ─── Trade modal ──────────────────────────────────────────────────────────
  function openTradeModal(market) {
    if (market.placeholder) return
    if (!user) { setShowAuth(true); return }
    setSelectedMarket(market)
    setShowTradeModal(true)
    setOrderMode('MARKET')
    setModalTab('BOOK')
    setComments([])
    setTopHolders([])
    loadPriceHistory(market.id)
    loadRecentActivity(market.id)
    loadOrderBook(market.id)
    loadComments(market.id)
    loadTopHolders(market.id)
  }

  async function executeTrade() {
    if (!user || !selectedMarket || !tradeImpact || !tradeImpact.valid || processing) return
    if (!hasAcceptedDisclaimer()) { setPendingTradeAction('MARKET'); setShowDisclaimer(true); return }
    setProcessing(true)
    const result = await createTrade(user.email, selectedMarket.id, tradeSide, tradeAmount)
    setProcessing(false)
    if (result.success) {
      const newUser = { ...user, balance: result.new_balance }
      setUser(newUser)
      localStorage.setItem('predi_user', JSON.stringify(newUser))
      setTradeAmount(10)
      loadUserTrades(user.email)
      loadMarkets()
      showToast(`Orden ejecutada: ${tradeSide === 'YES' ? 'SÍ' : 'NO'} €${tradeAmount}`)
    } else {
      showToast(result.error || 'Error al ejecutar orden', 'error')
    }
  }

  async function placeLimitOrder() {
    if (!user || !selectedMarket || processing) return
    if (!hasAcceptedDisclaimer()) { setPendingTradeAction('LIMIT'); setShowDisclaimer(true); return }
    setProcessing(true)
    const { data, error } = await supabase.rpc('place_limit_order', {
      p_email: user.email, p_market_id: selectedMarket.id,
      p_side: tradeSide, p_amount: tradeAmount, p_target_price: limitPrice,
    })
    setProcessing(false)
    if (error) { showToast(error.message, 'error'); return }
    if (data && !data.success) { showToast(data.error, 'error'); return }
    const newUser = { ...user, balance: data.new_balance }
    setUser(newUser)
    localStorage.setItem('predi_user', JSON.stringify(newUser))
    loadOrderBook(selectedMarket.id)
    loadUserTrades(user.email)
    showToast(`Orden límite colocada: ${tradeSide} a ${(limitPrice * 100).toFixed(0)}¢`)
  }

  async function cancelOrder(orderId) {
    const { data, error } = await supabase.rpc('cancel_limit_order', { p_order_id: orderId, p_email: user.email })
    if (error) { alert(error.message); return }
    if (data && !data.success) { alert(data.error); return }
    const newUser = { ...user, balance: data.new_balance }
    setUser(newUser)
    localStorage.setItem('predi_user', JSON.stringify(newUser))
    loadOrderBook(selectedMarket.id)
  }

  async function postComment() {
    if (!user || !newComment.trim() || !selectedMarket) return
    const { error } = await supabase.from('comments').insert({ market_id: selectedMarket.id, user_email: user.email, text: newComment.trim() })
    if (!error) { setNewComment(''); loadComments(selectedMarket.id) }
    else showToast('Error al publicar comentario', 'error')
  }

  async function likeComment(commentId) {
    await supabase.rpc('like_comment', { p_comment_id: commentId })
    loadComments(selectedMarket.id)
  }

  // ─── Market detail loaders ────────────────────────────────────────────────
  async function loadRecentActivity(marketId) {
    const { data, error } = await supabase.from('recent_trades').select('*').eq('market_id', marketId).limit(20)
    if (!error && data) setRecentActivity(data)
  }

  async function loadOrderBook(marketId) {
    const { data } = await supabase.from('order_book').select('*').eq('market_id', marketId)
    if (data) setOrderBook(data)
    if (user) {
      const { data: orders } = await supabase.from('limit_orders').select('*').eq('market_id', marketId).eq('user_email', user.email).eq('status', 'PENDING')
      if (orders) setUserOrders(orders)
    }
  }

  async function loadComments(marketId) {
    const { data } = await supabase.from('comments').select('*').eq('market_id', marketId).order('created_at', { ascending: false }).limit(20)
    if (data) setComments(data)
  }

  async function loadTopHolders(marketId) {
    const { data } = await supabase.from('trades').select('user_email, side, shares').eq('market_id', marketId).eq('status', 'OPEN')
    if (data) {
      const agg = {}
      data.forEach(t => {
        if (!agg[t.user_email]) agg[t.user_email] = { email: t.user_email, yes: 0, no: 0 }
        if (t.side === 'YES') agg[t.user_email].yes += parseFloat(t.shares || 0)
        else agg[t.user_email].no += parseFloat(t.shares || 0)
      })
      setTopHolders(Object.values(agg).map(h => ({ ...h, total: h.yes + h.no })).sort((a, b) => b.total - a.total).slice(0, 10))
    }
  }

  async function loadPriceHistory(marketId) {
    const history = await getPriceHistory(marketId, 168)
    setPriceHistory(history)
  }

  // ─── Computed ─────────────────────────────────────────────────────────────
  const activeMarkets      = markets.filter(m => !m.isExpired)
  const pendingMarkets     = markets.filter(m => m.isExpired)
  const realActiveMarkets  = activeMarkets.filter(m => !m.placeholder)

  const filtered = activeMarkets.filter(m => {
    if (m.placeholder) return filter === 'ALL' && catFilter === 'ALL'
    if (filter !== 'ALL') {
      const t = m.market_type
      if (filter === 'DIARIO'  && t !== 'FLASH'  && t !== 'DIARIO')  return false
      if (filter === 'SEMANAL' && t !== 'SHORT'  && t !== 'SEMANAL') return false
      if (filter === 'MENSUAL' && t !== 'LONG'   && t !== 'MENSUAL') return false
    }
    if (catFilter !== 'ALL' && m.category !== catFilter) return false
    return true
  })

  const trendingMarkets = [...filtered.filter(m => !m.placeholder)]
    .sort((a, b) => (b.total_volume || 0) - (a.total_volume || 0))
    .slice(0, 4)

  const totalVolume  = realActiveMarkets.reduce((s, m) => s + (m.total_volume || 0), 0)
  const totalTraders = realActiveMarkets.reduce((s, m) => s + (m.active_traders || m.total_traders || 0), 0)

  // ─── Render ───────────────────────────────────────────────────────────────
  return (
    <AppLayout
      user={user}
      openTradesCount={openTrades.length}
      onShowLeaderboard={() => { setShowLeaderboard(true); loadLeaderboard() }}
      onShowPortfolio={() => { setShowPortfolio(true); if (user) loadUserTrades(user.email) }}
      onShowProfile={() => { setShowProfile(true); if (user) loadUserTrades(user.email) }}
      onShowAuth={() => setShowAuth(true)}
      onLogout={handleLogout}
      filter={filter}
      setFilter={setFilter}
      catFilter={catFilter}
      setCatFilter={setCatFilter}
      activeMarkets={realActiveMarkets}
    >

      <HomeHero
        marketCount={realActiveMarkets.length}
        totalVolume={totalVolume}
        totalTraders={totalTraders}
      />

      <TrendingRow markets={trendingMarkets} onOpen={openTradeModal} />

      <MarketGrid
        filtered={filtered}
        loading={loading}
        pendingMarkets={pendingMarkets}
        resolvedMarkets={resolvedMarkets}
        showResolved={showResolved}
        setShowResolved={setShowResolved}
        onOpen={openTradeModal}
      />

      <AuthModal
        showAuth={showAuth}
        setShowAuth={setShowAuth}
        email={email}
        setEmail={setEmail}
        handleLogin={handleLogin}
      />

      {showTradeModal && selectedMarket && (
        <TradingModal
          market={selectedMarket}
          user={user}
          userTrades={userTrades}
          tradeSide={tradeSide}     setTradeSide={setTradeSide}
          tradeAmount={tradeAmount} setTradeAmount={setTradeAmount}
          orderMode={orderMode}     setOrderMode={setOrderMode}
          limitPrice={limitPrice}   setLimitPrice={setLimitPrice}
          modalTab={modalTab}       setModalTab={setModalTab}
          tradeImpact={tradeImpact}
          processing={processing}
          priceHistory={priceHistory}
          recentActivity={recentActivity}
          orderBook={orderBook}
          userOrders={userOrders}
          comments={comments}
          newComment={newComment}   setNewComment={setNewComment}
          topHolders={topHolders}
          onClose={() => setShowTradeModal(false)}
          onExecuteTrade={executeTrade}
          onLimitOrder={placeLimitOrder}
          onCancelOrder={cancelOrder}
          onSell={handleSell}
          onPostComment={postComment}
          onLikeComment={likeComment}
        />
      )}

      <PortfolioModal
        showPortfolio={showPortfolio}
        setShowPortfolio={setShowPortfolio}
        openTrades={openTrades}
        handleSell={handleSell}
      />

      {showProfile && user && (
        <ProfileModal
          user={user}
          userTrades={userTrades}
          onClose={() => setShowProfile(false)}
          onShowKYC={() => { setShowProfile(false); setShowKYC(true) }}
        />
      )}

      <LeaderboardModal
        showLeaderboard={showLeaderboard}
        setShowLeaderboard={setShowLeaderboard}
        leaderboard={leaderboard}
        user={user}
      />

      <DisclaimerModal
        showDisclaimer={showDisclaimer}
        setShowDisclaimer={setShowDisclaimer}
        pendingTradeAction={pendingTradeAction}
        setPendingTradeAction={setPendingTradeAction}
        onExecuteTrade={executeTrade}
        onLimitOrder={placeLimitOrder}
      />

      {toast && (
        <div style={{
          position: 'fixed', bottom: 24, left: '50%', transform: 'translateX(-50%)',
          zIndex: 100, padding: '12px 20px', borderRadius: 8, fontSize: 13, fontWeight: 600,
          background: C.card,
          border: `1px solid ${toast.type === 'error' ? C.no + '40' : C.yes + '40'}`,
          color: toast.type === 'error' ? C.no : C.yes,
          boxShadow: '0 4px 24px rgba(15,23,42,0.12)',
          display: 'flex', alignItems: 'center', gap: 8,
          animation: 'fadeInUp 0.2s ease',
          whiteSpace: 'nowrap',
        }}>
          <span>{toast.type === 'error' ? '✕' : '✓'}</span>
          {toast.msg}
        </div>
      )}

      {showKYC && <KYCModal onClose={() => setShowKYC(false)} />}

      <Footer />

      <style>{`
        @keyframes fadeInToast { from { opacity: 0; transform: translateX(-50%) translateY(10px); } to { opacity: 1; transform: translateX(-50%) translateY(0); } }
        @media (max-width: 600px) {
          .modal-panel { padding: 16px !important; border-radius: 16px 16px 0 0 !important; }
        }
      `}</style>
    </AppLayout>
  )
}
