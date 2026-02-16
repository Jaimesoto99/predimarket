import { useEffect, useState } from 'react'
import { getActiveMarkets, getOrCreateUser, createTrade } from '../lib/supabase'
import { calculatePrices } from '../lib/amm'

export default function Home() {
  const [markets, setMarkets] = useState([])
  const [loading, setLoading] = useState(true)
  const [user, setUser] = useState(null)
  const [showAuth, setShowAuth] = useState(false)
  const [email, setEmail] = useState('')
  const [selectedMarket, setSelectedMarket] = useState(null)
  const [tradeSide, setTradeSide] = useState('YES')
  const [tradeAmount, setTradeAmount] = useState(100)
  const [showTradeModal, setShowTradeModal] = useState(false)
  
  useEffect(() => {
    loadMarkets()
    const savedUser = localStorage.getItem('predi_user')
    if (savedUser) {
      setUser(JSON.parse(savedUser))
    }
  }, [])
  
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
  
  async function handleLogin(e) {
    e.preventDefault()
    if (!email) return
    
    const userData = await getOrCreateUser(email)
    setUser(userData)
    localStorage.setItem('predi_user', JSON.stringify(userData))
    setShowAuth(false)
    setEmail('')
  }
  
  function handleLogout() {
    setUser(null)
    localStorage.removeItem('predi_user')
  }
  
  function openTradeModal(market) {
    if (!user) {
      setShowAuth(true)
      return
    }
    setSelectedMarket(market)
    setShowTradeModal(true)
  }
  
  async function executeTrade() {
    if (!user || !selectedMarket) return
    
    const price = tradeSide === 'YES' 
      ? selectedMarket.prices.yes / 100 
      : selectedMarket.prices.no / 100
    
    const shares = tradeAmount / price
    
    const result = await createTrade(
      user.email,
      selectedMarket.id,
      tradeSide,
      shares,
      price,
      tradeAmount
    )
    
    if (result.success) {
      setUser({ ...user, balance: result.newBalance })
      localStorage.setItem('predi_user', JSON.stringify({ ...user, balance: result.newBalance }))
      
      alert(`✅ Trade ejecutado!\n\nCompraste ${shares.toFixed(1)} acciones ${tradeSide}\nCosto: €${tradeAmount}\nNuevo balance: €${result.newBalance.toFixed(2)}`)
      
      setShowTradeModal(false)
      setTradeAmount(100)
    } else {
      alert(`❌ Error: ${result.error}`)
    }
  }
  
  const tradePrice = selectedMarket 
    ? (tradeSide === 'YES' ? selectedMarket.prices.yes : selectedMarket.prices.no) / 100
    : 0.5
  const tradeShares = tradeAmount / tradePrice
  const tradePayout = tradeShares
  const tradeProfit = tradePayout - tradeAmount
  const tradeROI = (tradeProfit / tradeAmount) * 100
  
  return (
    <div className="min-h-screen bg-black text-white">
      <header className="border-b border-gray-800 bg-black/50 backdrop-blur-xl sticky top-0 z-50">
        <div className="container mx-auto px-6 py-4">
          <div className="flex justify-between items-center">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-gradient-to-br from-blue-500 to-purple-600 rounded-xl flex items-center justify-center text-xl font-bold">PM</div>
              <h1 className="text-2xl font-bold bg-gradient-to-r from-blue-400 to-purple-500 bg-clip-text text-transparent">PrediMarket</h1>
            </div>
            
            {user ? (
              <div className="flex items-center gap-4">
                <div className="px-4 py-2 bg-gray-900 border border-gray-800 rounded-lg">
                  <span className="text-gray-400 text-sm">Balance: </span>
                  <span className="text-green-400 font-bold font-mono">€{user.balance.toFixed(2)}</span>
                </div>
                <button onClick={handleLogout} className="px-4 py-2 border border-gray-700 rounded-lg hover:bg-gray-900 transition-colors text-sm">Salir</button>
              </div>
            ) : (
              <div className="flex gap-3">
                <button onClick={() => setShowAuth(true)} className="px-4 py-2 border border-gray-700 rounded-lg hover:bg-gray-900 transition-colors text-sm font-medium">Conectar</button>
                <button onClick={() => setShowAuth(true)} className="px-5 py-2 bg-blue-600 hover:bg-blue-700 rounded-lg transition-colors text-sm font-bold">Registrarse</button>
              </div>
            )}
          </div>
        </div>
      </header>

      <div className="container mx-auto px-6 py-20 text-center">
        <div className="max-w-4xl mx-auto">
          <h2 className="text-6xl font-bold mb-6 leading-tight">
            Mercados de predicción<br />
            <span className="bg-gradient-to-r from-blue-400 via-purple-500 to-pink-500 bg-clip-text text-transparent">para España</span>
          </h2>
          <p className="text-xl text-gray-400 mb-8 max-w-2xl mx-auto">Tradea sobre índices económicos y eventos verificables. Datos reales, mercados transparentes.</p>
          {!user && (
            <button onClick={() => setShowAuth(true)} className="px-8 py-4 bg-blue-600 hover:bg-blue-700 rounded-xl font-bold text-lg transition-all hover:scale-105">
              Empezar con €1,000 gratis
            </button>
          )}
        </div>
      </div>

      <div className="container mx-auto px-6 pb-20">
        <h3 className="text-3xl font-bold mb-8">Mercados activos</h3>
        
        {loading ? (
          <div className="text-center py-20">
            <div className="inline-block w-12 h-12 border-4 border-blue-500 border-t-transparent rounded-full animate-spin mb-4"></div>
            <div className="text-gray-400">Cargando mercados...</div>
          </div>
        ) : (
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
            {markets.map((m) => (
              <div key={m.id} className="bg-gradient-to-br from-gray-900 to-gray-800 border border-gray-800 rounded-2xl p-6 hover:border-blue-500/50 transition-all">
                <div className="text-xs px-3 py-1 bg-gray-800 text-gray-400 rounded-full font-medium mb-4 inline-block">{m.category}</div>
                <h4 className="font-bold text-lg mb-6">{m.title}</h4>
                
                <div className="flex gap-4 mb-6">
                  <div className="flex-1 text-center p-4 bg-blue-500/10 border border-blue-500/20 rounded-xl">
                    <div className="text-2xl font-bold text-blue-400 mb-1">{m.prices.yes}¢</div>
                    <div className="text-xs text-gray-400 font-medium">SÍ</div>
                  </div>
                  <div className="flex-1 text-center p-4 bg-pink-500/10 border border-pink-500/20 rounded-xl">
                    <div className="text-2xl font-bold text-pink-400 mb-1">{m.prices.no}¢</div>
                    <div className="text-xs text-gray-400 font-medium">NO</div>
                  </div>
                </div>
                
                <button onClick={() => openTradeModal(m)} className="w-full py-3 bg-blue-600 hover:bg-blue-700 rounded-xl font-bold transition-all">
                  Tradear
                </button>
              </div>
            ))}
          </div>
        )}
      </div>

      {showAuth && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-gray-900 border border-gray-800 rounded-2xl p-8 max-w-md w-full">
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-2xl font-bold">Empezar a tradear</h2>
              <button onClick={() => setShowAuth(false)} className="text-gray-400 hover:text-white text-2xl">✕</button>
            </div>
            
            <form onSubmit={handleLogin} className="space-y-4">
              <div>
                <label className="block text-sm text-gray-400 mb-2">Email</label>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full bg-black border border-gray-800 rounded-xl px-4 py-3 focus:border-blue-500 focus:outline-none"
                  placeholder="tu@email.com"
                  required
                />
              </div>
              
              <button type="submit" className="w-full bg-blue-600 hover:bg-blue-700 text-white font-bold py-4 rounded-xl transition-all">
                Empezar con €1,000 gratis
              </button>
            </form>
            
            <div className="mt-6 p-4 bg-blue-500/10 border border-blue-500/20 rounded-xl">
              <p className="text-xs text-blue-400">💡 <strong>Modo demo:</strong> Recibirás €1,000 virtuales para practicar sin riesgo.</p>
            </div>
          </div>
        </div>
      )}

      {showTradeModal && selectedMarket && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-gray-900 border border-gray-800 rounded-2xl p-8 max-w-lg w-full">
            <div className="flex justify-between items-start mb-6">
              <div>
                <h2 className="text-2xl font-bold mb-2">Tradear</h2>
                <p className="text-sm text-gray-400">{selectedMarket.title}</p>
              </div>
              <button onClick={() => setShowTradeModal(false)} className="text-gray-400 hover:text-white text-2xl">✕</button>
            </div>
            
            <div className="grid grid-cols-2 gap-4 mb-6">
              <button
                onClick={() => setTradeSide('YES')}
                className={`p-4 rounded-xl font-bold transition-all ${
                  tradeSide === 'YES' ? 'bg-blue-600 text-white' : 'bg-gray-800 text-gray-400 hover:bg-gray-700'
                }`}
              >
                SÍ {selectedMarket.prices.yes}¢
              </button>
              <button
                onClick={() => setTradeSide('NO')}
                className={`p-4 rounded-xl font-bold transition-all ${
                  tradeSide === 'NO' ? 'bg-pink-600 text-white' : 'bg-gray-800 text-gray-400 hover:bg-gray-700'
                }`}
              >
                NO {selectedMarket.prices.no}¢
              </button>
            </div>
            
            <div className="mb-6">
              <label className="block text-sm text-gray-400 mb-2">Cantidad a invertir</label>
              <div className="relative">
                <span className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400">€</span>
                <input
                  type="number"
                  value={tradeAmount}
                  onChange={(e) => setTradeAmount(Math.max(1, Number(e.target.value)))}
                  className="w-full bg-black border border-gray-800 rounded-xl pl-10 pr-4 py-3 text-xl font-mono font-bold focus:border-blue-500 focus:outline-none"
                  min="1"
                  max={user?.balance || 1000}
                />
              </div>
              <div className="flex gap-2 mt-3">
                {[10, 25, 50, 100].map(v => (
                  <button
                    key={v}
                    onClick={() => setTradeAmount(v)}
                    className="flex-1 py-2 text-sm bg-gray-800 hover:bg-gray-700 rounded-lg transition-colors"
                  >
                    €{v}
                  </button>
                ))}
              </div>
            </div>
            
            <div className="bg-black border border-gray-800 rounded-xl p-4 mb-6 space-y-3">
              <div className="flex justify-between text-sm">
                <span className="text-gray-400">Precio por acción</span>
                <span className="font-mono font-bold">€{tradePrice.toFixed(2)}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-gray-400">Acciones</span>
                <span className="font-mono font-bold">{tradeShares.toFixed(2)}</span>
              </div>
              <div className="flex justify-between text-sm pt-3 border-t border-gray-800">
                <span className="text-gray-400">Si ganas</span>
                <span className="font-mono font-bold text-green-400">€{tradePayout.toFixed(2)}</span>
              </div>
              <div className="flex justify-between pt-3 border-t border-gray-800">
                <span className="font-semibold">Ganancia potencial</span>
                <div className="text-right">
                  <div className={`font-mono font-bold ${tradeProfit > 0 ? 'text-green-400' : 'text-red-400'}`}>
                    {tradeProfit > 0 ? '+' : ''}{tradeProfit.toFixed(2)}€
                  </div>
                  <div className="text-xs text-gray-400">({tradeROI.toFixed(0)}% ROI)</div>
                </div>
              </div>
            </div>
            
            <button
              onClick={executeTrade}
              disabled={tradeAmount > (user?.balance || 0)}
              className={`w-full py-4 rounded-xl font-bold text-lg transition-all ${
                tradeAmount > (user?.balance || 0)
                  ? 'bg-gray-700 text-gray-500 cursor-not-allowed'
                  : tradeSide === 'YES'
                  ? 'bg-blue-600 hover:bg-blue-700'
                  : 'bg-pink-600 hover:bg-pink-700'
              }`}
            >
              {tradeAmount > (user?.balance || 0) ? 'Saldo insuficiente' : `Comprar ${tradeSide} — €${tradeAmount}`}
            </button>
          </div>
        </div>
      )}
    </div>
  )
}