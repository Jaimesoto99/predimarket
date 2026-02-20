import { useEffect, useState } from 'react'
import { getActiveMarkets, getOrCreateUser, createTrade, getUserTrades, getPriceHistory, sellPosition } from '../lib/supabase'
import { previewTrade, previewSellValue, calculatePrices } from '../lib/amm'

export default function Home() {
  const [markets, setMarkets] = useState([])
  const [loading, setLoading] = useState(true)
  const [user, setUser] = useState(null)
  const [showAuth, setShowAuth] = useState(false)
  const [email, setEmail] = useState('')
  const [selectedMarket, setSelectedMarket] = useState(null)
  const [tradeSide, setTradeSide] = useState('YES')
  const [tradeAmount, setTradeAmount] = useState(10)
  const [showTradeModal, setShowTradeModal] = useState(false)
  const [showPortfolio, setShowPortfolio] = useState(false)
  const [userTrades, setUserTrades] = useState([])
  const [priceHistory, setPriceHistory] = useState([])
  const [tradeImpact, setTradeImpact] = useState(null)
  const [processing, setProcessing] = useState(false)
  
  useEffect(() => {
    loadMarkets()
    const savedUser = localStorage.getItem('predi_user')
    if (savedUser) {
      const u = JSON.parse(savedUser)
      setUser(u)
      loadUserTrades(u.email)
    }
  }, [])
  
  useEffect(() => {
    if (selectedMarket && tradeAmount > 0) {
      const preview = previewTrade(
        tradeAmount,
        tradeSide,
        parseFloat(selectedMarket.yes_pool),
        parseFloat(selectedMarket.no_pool)
      )
      setTradeImpact(preview)
    }
  }, [tradeAmount, tradeSide, selectedMarket])
  
  async function loadMarkets() {
    setLoading(true)
    const data = await getActiveMarkets()
    const withPrices = data.map(m => ({
      ...m,
      prices: calculatePrices(parseFloat(m.yes_pool), parseFloat(m.no_pool))
    }))
    setMarkets(withPrices)
    setLoading(false)
  }
  
  async function loadUserTrades(userEmail) {
    const data = await getUserTrades(userEmail)
    const enriched = data.map(t => {
      const currentPrice = calculatePrices(
        parseFloat(t.markets.yes_pool),
        parseFloat(t.markets.no_pool)
      )
      const currentValue = previewSellValue(
        t.shares,
        t.side,
        parseFloat(t.markets.yes_pool),
        parseFloat(t.markets.no_pool)
      )
      return {
        ...t,
        currentPrice,
        currentValue,
        potentialPayout: t.shares,
        profit: currentValue - t.amount
      }
    })
    setUserTrades(enriched)
  }
  
  async function loadPriceHistory(marketId) {
    const history = await getPriceHistory(marketId, 168)
    setPriceHistory(history)
  }
  
  async function handleLogin(e) {
    e.preventDefault()
    if (!email) return
    
    const result = await getOrCreateUser(email)
    if (!result.success) {
      alert('Error al crear usuario')
      return
    }
    
    const userData = result.user
    setUser(userData)
    localStorage.setItem('predi_user', JSON.stringify(userData))
    setShowAuth(false)
    setEmail('')
    loadUserTrades(userData.email)
  }
  
  function handleLogout() {
    setUser(null)
    localStorage.removeItem('predi_user')
    setUserTrades([])
  }
  
  function openTradeModal(market) {
    if (!user) {
      setShowAuth(true)
      return
    }
    setSelectedMarket(market)
    setShowTradeModal(true)
    loadPriceHistory(market.id)
  }
  
  async function executeTrade() {
    if (!user || !selectedMarket || !tradeImpact || !tradeImpact.valid || processing) {
      return
    }
    
    setProcessing(true)
    
    const result = await createTrade(user.email, selectedMarket.id, tradeSide, tradeAmount)
    
    setProcessing(false)
    
    if (result.success) {
      const newBalance = result.new_balance
      setUser({ ...user, balance: newBalance })
      localStorage.setItem('predi_user', JSON.stringify({ ...user, balance: newBalance }))
      
      setShowTradeModal(false)
      setTradeAmount(10)
      loadUserTrades(user.email)
      loadMarkets()
      
      alert(`✅ Apuesta realizada!\n\n${result.shares} puntos ${tradeSide}\nCosto: €${tradeAmount}\nGanas si aciertas: €${result.shares}`)
    } else {
      alert(`❌ ${result.error}`)
    }
  }
  
  async function handleSell(trade) {
    const sellValue = previewSellValue(
      trade.shares,
      trade.side,
      parseFloat(trade.markets.yes_pool),
      parseFloat(trade.markets.no_pool)
    )
    
    if (!confirm(`¿Vender ${trade.shares.toFixed(1)} puntos ${trade.side} por ~€${sellValue.toFixed(2)}?`)) return
    
    const result = await sellPosition(trade.id, user.email)
    
    if (result.success) {
      const newBalance = result.new_balance
      setUser({ ...user, balance: newBalance })
      localStorage.setItem('predi_user', JSON.stringify({ ...user, balance: newBalance }))
      loadUserTrades(user.email)
      loadMarkets()
      alert(`✅ Vendido por €${result.sell_value}`)
    } else {
      alert(`❌ ${result.error}`)
    }
  }
  
  function getTimeLeft(closeDate) {
    const now = new Date()
    const close = new Date(closeDate)
    const diff = close - now
    
    if (diff < 0) return 'Cerrado'
    
    const hours = Math.floor(diff / 3600000)
    const minutes = Math.floor((diff % 3600000) / 60000)
    
    if (hours > 24) return `${Math.floor(hours / 24)}d ${hours % 24}h`
    if (hours > 0) return `${hours}h ${minutes}m`
    return `${minutes}m`
  }
  
  return (
    <div className="min-h-screen bg-gradient-to-b from-gray-950 to-black text-white">
      {/* Header */}
      <header className="border-b border-green-900/30 bg-gradient-to-r from-[#0D5C2B] to-[#1A7A3E] sticky top-0 z-50 shadow-lg">
        <div className="container mx-auto px-4 sm:px-6 py-4">
          <div className="flex justify-between items-center">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-gradient-to-br from-[#1A7A3E] to-[#0D5C2B] rounded-xl flex items-center justify-center text-xl font-bold shadow-lg shadow-green-500/30 border border-green-400/20">
                P
              </div>
              <div>
                <h1 className="text-xl sm:text-2xl font-bold text-white">
                  PrediMarket
                </h1>
                <div className="text-xs text-green-200">Beta</div>
              </div>
            </div>
            
            {user ? (
              <div className="flex items-center gap-2 sm:gap-4">
                <button 
                  onClick={() => setShowPortfolio(true)}
                  className="px-3 sm:px-4 py-2 border border-green-400/30 rounded-lg hover:bg-green-900/20 transition-colors text-xs sm:text-sm font-medium text-green-100"
                >
                  <span className="hidden sm:inline">Posiciones</span>
                  <span className="sm:hidden">💼</span>
                  {userTrades.length > 0 && (
                    <span className="ml-2 bg-[#1A7A3E] text-white px-2 py-0.5 rounded-full text-xs font-bold">
                      {userTrades.length}
                    </span>
                  )}
                </button>
                <div className="px-3 sm:px-4 py-2 bg-[#1A7A3E] border border-green-400/20 rounded-lg">
                  <span className="text-green-200 text-xs sm:text-sm">💰 </span>
                  <span className="text-green-100 font-bold font-mono text-sm sm:text-base">€{parseFloat(user.balance).toFixed(2)}</span>
                </div>
                <button 
                  onClick={handleLogout}
                  className="text-green-300 hover:text-white text-sm"
                >
                  ✕
                </button>
              </div>
            ) : (
              <button 
                onClick={() => setShowAuth(true)}
                className="px-4 sm:px-6 py-2 bg-[#1A7A3E] hover:bg-[#0D5C2B] rounded-lg font-bold text-sm sm:text-base shadow-lg shadow-green-500/20 border border-green-400/20"
              >
                Empezar
              </button>
            )}
          </div>
        </div>
      </header>

      {/* Hero */}
      <div className="container mx-auto px-4 sm:px-6 py-12 sm:py-20 text-center">
        <div className="max-w-4xl mx-auto">
          <h2 className="text-4xl sm:text-6xl font-bold mb-4 sm:mb-6 leading-tight text-white">
            Apuesta en eventos
            <br />
            <span className="bg-gradient-to-r from-[#1A7A3E] to-[#22C55E] bg-clip-text text-transparent">
              verificables
            </span>
          </h2>
          <p className="text-lg sm:text-xl text-gray-300 mb-6 sm:mb-8 max-w-2xl mx-auto">
            Mercados políticos y de actualidad española. Precios en tiempo real.
          </p>
          {!user && (
            <button 
              onClick={() => setShowAuth(true)}
              className="px-6 sm:px-8 py-3 sm:py-4 bg-[#1A7A3E] hover:bg-[#0D5C2B] rounded-xl font-bold text-base sm:text-lg transition-all hover:scale-105 shadow-xl shadow-green-500/20 border border-green-400/20"
            >
              Empieza con €1,000 gratis
            </button>
          )}
        </div>
      </div>

      {/* Markets Grid */}
      <div className="container mx-auto px-4 sm:px-6 pb-20">
        <div className="flex justify-between items-center mb-8">
          <h3 className="text-2xl sm:text-3xl font-bold">Mercados activos</h3>
          <div className="text-sm text-gray-400">{markets.length} mercados</div>
        </div>
        
        {loading ? (
          <div className="text-center py-20">
            <div className="inline-block w-12 h-12 border-4 border-[#1A7A3E] border-t-transparent rounded-full animate-spin mb-4"></div>
            <div className="text-gray-400">Cargando...</div>
          </div>
        ) : (
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6">
            {markets.map((m) => (
              <div 
                key={m.id}
                onClick={() => openTradeModal(m)}
                className="bg-gradient-to-br from-gray-900 to-gray-800 border border-gray-700 hover:border-[#1A7A3E] rounded-2xl p-4 sm:p-6 transition-all cursor-pointer group"
              >
                <div className="flex justify-between items-start mb-4">
                  <div className="text-xs px-3 py-1 bg-gray-800 text-gray-300 rounded-full font-medium">
                    {m.category}
                  </div>
                  <div className="text-xs text-yellow-400 font-bold">
                    ⏱ {getTimeLeft(m.close_date)}
                  </div>
                </div>
                
                <h4 className="font-bold text-base sm:text-lg mb-4 sm:mb-6 group-hover:text-[#22C55E] transition-colors min-h-[48px]">
                  {m.title}
                </h4>
                
                <div className="flex gap-3 sm:gap-4 mb-4 sm:mb-6">
                  <div className="flex-1 text-center p-3 sm:p-4 bg-[#1A7A3E]/20 border border-[#1A7A3E]/30 rounded-xl">
                    <div className="text-xl sm:text-2xl font-bold text-[#22C55E] mb-1">
                      {m.prices.yes}¢
                    </div>
                    <div className="text-xs text-green-200 font-medium">SÍ</div>
                  </div>
                  <div className="flex-1 text-center p-3 sm:p-4 bg-red-900/20 border border-red-700/30 rounded-xl">
                    <div className="text-xl sm:text-2xl font-bold text-red-400 mb-1">
                      {m.prices.no}¢
                    </div>
                    <div className="text-xs text-red-200 font-medium">NO</div>
                  </div>
                </div>
                
                <div className="text-xs text-gray-500 text-center mb-3">
                  Vol: €{(parseFloat(m.total_volume) / 1000).toFixed(1)}K
                </div>
                
                <button className="w-full py-2.5 sm:py-3 bg-gradient-to-r from-[#1A7A3E] to-[#0D5C2B] hover:from-[#22C55E] hover:to-[#1A7A3E] rounded-xl font-bold transition-all group-hover:scale-105 text-sm sm:text-base border border-green-400/20">
                  Apostar
                </button>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Auth Modal */}
      {showAuth && (
        <div className="fixed inset-0 bg-black/90 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-gradient-to-br from-gray-900 to-gray-800 border border-green-700 rounded-2xl p-6 sm:p-8 max-w-md w-full">
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-xl sm:text-2xl font-bold">Empezar</h2>
              <button onClick={() => setShowAuth(false)} className="text-gray-400 hover:text-white text-2xl">✕</button>
            </div>
            
            <form onSubmit={handleLogin} className="space-y-4">
              <div>
                <label className="block text-sm text-gray-400 mb-2">Email</label>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full bg-black border border-gray-700 rounded-xl px-4 py-3 focus:border-[#1A7A3E] focus:outline-none"
                  placeholder="tu@email.com"
                  required
                />
              </div>
              
              <button 
                type="submit"
                className="w-full bg-[#1A7A3E] hover:bg-[#0D5C2B] text-white font-bold py-4 rounded-xl transition-all border border-green-400/20"
              >
                Empezar con €1,000 gratis
              </button>
            </form>
            
            <div className="mt-6 p-4 bg-[#1A7A3E]/20 border border-[#1A7A3E]/30 rounded-xl">
              <p className="text-xs text-green-200">
                💡 <strong>Dinero virtual.</strong> Practica sin riesgo.
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Trade Modal */}
      {showTradeModal && selectedMarket && (
        <div className="fixed inset-0 bg-black/90 backdrop-blur-sm z-50 flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-gradient-to-br from-gray-900 to-gray-800 border border-green-700 rounded-2xl p-6 sm:p-8 max-w-4xl w-full my-8">
            <div className="flex justify-between items-start mb-6">
              <div>
                <h2 className="text-xl sm:text-2xl font-bold mb-2">{selectedMarket.title}</h2>
                <div className="text-sm text-gray-400">Cierra en {getTimeLeft(selectedMarket.close_date)}</div>
              </div>
              <button onClick={() => setShowTradeModal(false)} className="text-gray-400 hover:text-white text-2xl">✕</button>
            </div>
            
            {/* Gráfico */}
            {priceHistory.length > 1 && (
              <div className="mb-6 bg-black/50 border border-gray-800 rounded-xl p-4 sm:p-6">
                <div className="text-sm text-gray-400 mb-4">Evolución</div>
                <div className="h-32 sm:h-48 relative">
                  <svg className="w-full h-full" viewBox="0 0 100 100" preserveAspectRatio="none">
                    <polyline
                      points={priceHistory.map((p, i) => 
                        `${(i / Math.max(priceHistory.length - 1, 1)) * 100},${100 - parseFloat(p.yes_price)}`
                      ).join(' ')}
                      fill="none"
                      stroke="#1A7A3E"
                      strokeWidth="2"
                      vectorEffect="non-scaling-stroke"
                    />
                  </svg>
                  <div className="absolute top-2 right-2 text-sm">
                    <span className="text-[#22C55E] font-bold">{selectedMarket.prices.yes}%</span>
                    <span className="text-gray-500"> SÍ</span>
                  </div>
                </div>
              </div>
            )}
            
            <div className="grid md:grid-cols-2 gap-6">
              <div>
                <div className="grid grid-cols-2 gap-4 mb-6">
                  <button
                    onClick={() => setTradeSide('YES')}
                    className={`p-4 rounded-xl font-bold transition-all ${
                      tradeSide === 'YES' 
                        ? 'bg-gradient-to-r from-[#1A7A3E] to-[#0D5C2B] text-white shadow-lg shadow-green-500/50 border border-green-400/30' 
                        : 'bg-gray-800 text-gray-400 hover:bg-gray-700'
                    }`}
                  >
                    <div className="text-2xl mb-1">{selectedMarket.prices.yes}¢</div>
                    <div className="text-xs">SÍ</div>
                  </button>
                  <button
                    onClick={() => setTradeSide('NO')}
                    className={`p-4 rounded-xl font-bold transition-all ${
                      tradeSide === 'NO' 
                        ? 'bg-gradient-to-r from-red-700 to-red-900 text-white shadow-lg shadow-red-500/50' 
                        : 'bg-gray-800 text-gray-400 hover:bg-gray-700'
                    }`}
                  >
                    <div className="text-2xl mb-1">{selectedMarket.prices.no}¢</div>
                    <div className="text-xs">NO</div>
                  </button>
                </div>
                
                <div>
                  <label className="block text-sm text-gray-400 mb-2">Cantidad</label>
                  <div className="relative">
                    <span className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 text-lg">€</span>
                    <input
                      type="number"
                      value={tradeAmount}
                      onChange={(e) => setTradeAmount(Math.max(1, Number(e.target.value)))}
                      className="w-full bg-black border border-gray-700 rounded-xl pl-10 pr-4 py-3 text-xl font-mono font-bold focus:border-[#1A7A3E] focus:outline-none"
                      min="1"
                      max={user ? parseFloat(user.balance) : 1000}
                    />
                  </div>
                  <div className="grid grid-cols-4 gap-2 mt-3">
                    {[10, 25, 50, 100].map(v => (
                      <button
                        key={v}
                        onClick={() => setTradeAmount(v)}
                        className="py-2 text-sm bg-gray-800 hover:bg-gray-700 rounded-lg transition-colors font-medium"
                      >
                        €{v}
                      </button>
                    ))}
                  </div>
                </div>
              </div>
              
              <div className="bg-black/50 border border-gray-800 rounded-xl p-6 h-fit">
                <div className="text-xs text-gray-500 uppercase tracking-wider font-semibold mb-4">Resumen</div>
                
                {tradeImpact && tradeImpact.valid ? (
                  <div className="space-y-4">
                    <div className="flex justify-between text-sm">
                      <span className="text-gray-400">Recibes</span>
                      <span className="font-mono font-bold text-lg">{tradeImpact.shares.toFixed(1)} puntos</span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span className="text-gray-400">Precio promedio</span>
                      <span className="font-mono font-bold">€{tradeImpact.avgPrice.toFixed(3)}</span>
                    </div>
                    <div className="border-t border-gray-800 pt-4">
                      <div className="flex justify-between mb-2">
                        <span className="text-gray-400">Si aciertas</span>
                        <span className="font-mono font-bold text-[#22C55E] text-xl">€{tradeImpact.potentialWinnings.toFixed(2)}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="font-semibold">Ganancia</span>
                        <div className="text-right">
                          <div className={`font-mono font-bold text-lg ${tradeImpact.potentialProfit > 0 ? 'text-[#22C55E]' : 'text-red-400'}`}>
                            {tradeImpact.potentialProfit > 0 ? '+' : ''}{tradeImpact.potentialProfit.toFixed(2)}€
                          </div>
                          <div className="text-xs text-gray-400">
                            ({tradeImpact.roi > 0 ? '+' : ''}{tradeImpact.roi.toFixed(0)}%)
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="text-sm text-red-400">{tradeImpact?.error || 'Calculando...'}</div>
                )}
              </div>
            </div>
            
            <button
              onClick={executeTrade}
              disabled={!tradeImpact || !tradeImpact.valid || tradeAmount > parseFloat(user?.balance || 0) || processing}
              className={`w-full mt-6 py-4 rounded-xl font-bold text-lg transition-all ${
                !tradeImpact || !tradeImpact.valid || tradeAmount > parseFloat(user?.balance || 0) || processing
                  ? 'bg-gray-700 text-gray-500 cursor-not-allowed'
                  : tradeSide === 'YES'
                  ? 'bg-gradient-to-r from-[#1A7A3E] to-[#0D5C2B] hover:from-[#22C55E] hover:to-[#1A7A3E] shadow-lg shadow-green-500/30 border border-green-400/20'
                  : 'bg-gradient-to-r from-red-700 to-red-900 hover:from-red-600 hover:to-red-800 shadow-lg shadow-red-500/30'
              }`}
            >
              {processing ? 'Procesando...' : !tradeImpact ? 'Calculando...' : !tradeImpact.valid ? tradeImpact.error : tradeAmount > parseFloat(user?.balance || 0) ? 'Saldo insuficiente' : `Apostar ${tradeSide} — €${tradeAmount}`}
            </button>
          </div>
        </div>
      )}

      {/* Portfolio Modal */}
      {showPortfolio && (
        <div className="fixed inset-0 bg-black/90 backdrop-blur-sm z-50 flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-gradient-to-br from-gray-900 to-gray-800 border border-green-700 rounded-2xl p-6 sm:p-8 max-w-4xl w-full my-8">
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-2xl font-bold">Mis posiciones</h2>
              <button onClick={() => setShowPortfolio(false)} className="text-gray-400 hover:text-white text-2xl">✕</button>
            </div>
            
            {userTrades.length === 0 ? (
              <div className="text-center py-12 text-gray-400">
                No tienes posiciones activas
              </div>
            ) : (
              <div className="space-y-4">
                {userTrades.map((trade) => (
                  <div key={trade.id} className="bg-black/50 border border-gray-800 rounded-xl p-4 sm:p-6">
                    <div className="flex flex-col sm:flex-row sm:justify-between sm:items-start gap-4 mb-4">
                      <div className="flex-1">
                        <h3 className="font-bold mb-2">{trade.markets.title}</h3>
                        <div className="flex flex-wrap gap-2">
                          <span className={`text-xs px-3 py-1 rounded-full font-bold ${
                            trade.side === 'YES' ? 'bg-[#1A7A3E]/30 text-[#22C55E]' : 'bg-red-900/30 text-red-400'
                          }`}>
                            {trade.side} {trade.side === 'YES' ? trade.currentPrice.yes : trade.currentPrice.no}¢
                          </span>
                          <span className="text-xs px-3 py-1 bg-gray-800 text-gray-400 rounded-full">
                            {parseFloat(trade.shares).toFixed(1)} puntos
                          </span>
                        </div>
                      </div>
                      <button 
                        onClick={() => handleSell(trade)}
                        className="px-4 py-2 bg-red-600 hover:bg-red-700 rounded-lg text-sm font-bold transition-colors whitespace-nowrap"
                      >
                        Vender
                      </button>
                    </div>
                    
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 text-sm">
                      <div>
                        <div className="text-gray-500 text-xs mb-1">Invertido</div>
                        <div className="font-mono font-bold">€{parseFloat(trade.amount).toFixed(2)}</div>
                      </div>
                      <div>
                        <div className="text-gray-500 text-xs mb-1">Valor ahora</div>
                        <div className="font-mono font-bold">€{trade.currentValue.toFixed(2)}</div>
                      </div>
                      <div>
                        <div className="text-gray-500 text-xs mb-1">Si ganas</div>
                        <div className="font-mono font-bold text-[#22C55E]">€{parseFloat(trade.potentialPayout).toFixed(2)}</div>
                      </div>
                      <div>
                        <div className="text-gray-500 text-xs mb-1">P/L</div>
                        <div className={`font-mono font-bold ${trade.profit > 0 ? 'text-[#22C55E]' : 'text-red-400'}`}>
                          {trade.profit > 0 ? '+' : ''}€{trade.profit.toFixed(2)}
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  )
}