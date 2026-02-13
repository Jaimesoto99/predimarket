import { useEffect, useState } from 'react'
import { getActiveMarkets } from '../lib/supabase'
import { calculatePrices } from '../lib/amm'

export default function Home() {
  const [markets, setMarkets] = useState([])
  const [loading, setLoading] = useState(true)
  
  useEffect(() => {
    loadMarkets()
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
  
  return (
    <div className="min-h-screen bg-black text-white">
      {/* Header */}
      <header className="border-b border-gray-800 bg-black/50 backdrop-blur-xl sticky top-0 z-50">
        <div className="container mx-auto px-6 py-4">
          <div className="flex justify-between items-center">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-gradient-to-br from-blue-500 to-purple-600 rounded-xl flex items-center justify-center text-xl font-bold">
                PM
              </div>
              <h1 className="text-2xl font-bold bg-gradient-to-r from-blue-400 to-purple-500 bg-clip-text text-transparent">
                PrediMarket
              </h1>
            </div>
            <nav className="hidden md:flex gap-6 text-sm">
              <a href="#" className="text-gray-400 hover:text-white transition-colors">Mercados</a>
              <a href="#" className="text-gray-400 hover:text-white transition-colors">Portfolio</a>
              <a href="#" className="text-gray-400 hover:text-white transition-colors">Estadísticas</a>
            </nav>
            <div className="flex gap-3">
              <button className="px-4 py-2 border border-gray-700 rounded-lg hover:bg-gray-900 transition-colors text-sm font-medium">
                Conectar
              </button>
              <button className="px-5 py-2 bg-blue-600 hover:bg-blue-700 rounded-lg transition-colors text-sm font-bold">
                Registrarse
              </button>
            </div>
          </div>
        </div>
      </header>

      {/* Hero */}
      <div className="container mx-auto px-6 py-20 text-center">
        <div className="max-w-4xl mx-auto">
          <h2 className="text-6xl font-bold mb-6 leading-tight">
            Mercados de predicción
            <br />
            <span className="bg-gradient-to-r from-blue-400 via-purple-500 to-pink-500 bg-clip-text text-transparent">
              para España
            </span>
          </h2>
          <p className="text-xl text-gray-400 mb-8 max-w-2xl mx-auto">
            Tradea sobre índices económicos y eventos verificables. Datos reales, mercados transparentes.
          </p>
          <div className="flex gap-4 justify-center">
            <button className="px-8 py-4 bg-blue-600 hover:bg-blue-700 rounded-xl font-bold text-lg transition-all hover:scale-105">
              Explorar mercados
            </button>
            <button className="px-8 py-4 border border-gray-700 hover:bg-gray-900 rounded-xl font-medium text-lg transition-all">
              Cómo funciona
            </button>
          </div>
        </div>
      </div>

      {/* Stats */}
      <div className="container mx-auto px-6 mb-16">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
          {[
            { label: 'Volumen 24h', value: '€247,832', change: '+12%', positive: true },
            { label: 'Traders activos', value: '1,284', change: '+8%', positive: true },
            { label: 'Mercados activos', value: markets.length, change: '+5 hoy', positive: true },
            { label: 'Precisión promedio', value: '89.2%', change: '+2%', positive: true }
          ].map((stat, i) => (
            <div 
              key={i} 
              className="bg-gradient-to-br from-gray-900 to-gray-800 border border-gray-800 rounded-2xl p-6 hover:border-gray-700 transition-all"
            >
              <div className="text-gray-400 text-sm mb-2 font-medium">{stat.label}</div>
              <div className="text-3xl font-bold mb-2">{stat.value}</div>
              <div className={`text-sm font-semibold flex items-center gap-1 ${stat.positive ? 'text-green-400' : 'text-red-400'}`}>
                <span>{stat.positive ? '↗' : '↘'}</span>
                <span>{stat.change}</span>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Trending */}
      <div className="container mx-auto px-6 mb-16">
        <div className="flex items-center gap-3 mb-8">
          <span className="text-3xl">🔥</span>
          <h3 className="text-3xl font-bold">Trending ahora</h3>
        </div>
        
        <div className="grid md:grid-cols-3 gap-6">
          {markets.slice(0, 3).map((m, i) => (
            <div 
              key={m.id}
              className="bg-gradient-to-br from-gray-900 to-gray-800 border border-gray-800 rounded-2xl p-6 hover:border-blue-500/50 transition-all cursor-pointer group"
            >
              <div className="flex justify-between items-start mb-4">
                <div className="text-xs px-3 py-1 bg-gray-800 text-gray-400 rounded-full font-medium">
                  {m.category}
                </div>
                <div className="text-xs text-green-400 font-bold flex items-center gap-1">
                  <span>↗</span>
                  <span>+{15 + i * 5}%</span>
                </div>
              </div>
              
              <h4 className="font-bold text-lg mb-4 group-hover:text-blue-400 transition-colors">
                {m.title}
              </h4>
              
              <div className="text-sm text-gray-400 mb-6">
                €{(m.total_volume / 1000).toFixed(1)}K volumen · {m.total_traders || 124} traders
              </div>
              
              <div className="flex gap-4 mb-6">
                <div className="flex-1 text-center">
                  <div className="text-3xl font-bold text-blue-400 mb-1">
                    {m.prices.yes}¢
                  </div>
                  <div className="text-xs text-gray-500 font-medium">SÍ</div>
                </div>
                <div className="w-px bg-gray-800"></div>
                <div className="flex-1 text-center">
                  <div className="text-3xl font-bold text-pink-400 mb-1">
                    {m.prices.no}¢
                  </div>
                  <div className="text-xs text-gray-500 font-medium">NO</div>
                </div>
              </div>
              
              <button className="w-full py-3 bg-blue-600 hover:bg-blue-700 rounded-xl font-bold transition-all group-hover:scale-105">
                Ver detalles →
              </button>
            </div>
          ))}
        </div>
      </div>

      {/* Categories */}
      <div className="container mx-auto px-6 mb-12">
        <div className="flex gap-3 overflow-x-auto pb-2">
          {[
            { icon: '📊', label: 'Economía', count: 12 },
            { icon: '💻', label: 'Tech', count: 8 },
            { icon: '🌡️', label: 'Clima', count: 5 },
            { icon: '🏢', label: 'Empresas', count: 15 },
            { icon: '⚽', label: 'Deportes', count: 6 }
          ].map((cat, i) => (
            <button 
              key={i}
              className="px-6 py-3 bg-gradient-to-br from-blue-600 to-purple-600 hover:from-blue-500 hover:to-purple-500 rounded-full whitespace-nowrap font-bold transition-all hover:scale-105 flex items-center gap-2"
            >
              <span>{cat.icon}</span>
              <span>{cat.label}</span>
              <span className="text-xs bg-white/20 px-2 py-0.5 rounded-full">{cat.count}</span>
            </button>
          ))}
        </div>
      </div>

      {/* All Markets */}
      <div className="container mx-auto px-6 pb-20">
        <h3 className="text-3xl font-bold mb-8">Todos los mercados</h3>
        
        {loading ? (
          <div className="text-center py-20">
            <div className="inline-block w-12 h-12 border-4 border-blue-500 border-t-transparent rounded-full animate-spin mb-4"></div>
            <div className="text-gray-400">Cargando mercados...</div>
          </div>
        ) : (
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
            {markets.map((m) => (
              <div 
                key={m.id}
                className="bg-gradient-to-br from-gray-900 to-gray-800 border border-gray-800 rounded-2xl p-6 hover:border-blue-500/50 transition-all cursor-pointer group"
              >
                <div className="text-xs px-3 py-1 bg-gray-800 text-gray-400 rounded-full font-medium mb-4 inline-block">
                  {m.category}
                </div>
                
                <h4 className="font-bold text-lg mb-6 group-hover:text-blue-400 transition-colors min-h-[56px]">
                  {m.title}
                </h4>
                
                <div className="flex gap-4 mb-6">
                  <div className="flex-1 text-center p-4 bg-blue-500/10 border border-blue-500/20 rounded-xl">
                    <div className="text-2xl font-bold text-blue-400 mb-1">
                      {m.prices.yes}¢
                    </div>
                    <div className="text-xs text-gray-400 font-medium">SÍ</div>
                  </div>
                  <div className="flex-1 text-center p-4 bg-pink-500/10 border border-pink-500/20 rounded-xl">
                    <div className="text-2xl font-bold text-pink-400 mb-1">
                      {m.prices.no}¢
                    </div>
                    <div className="text-xs text-gray-400 font-medium">NO</div>
                  </div>
                </div>
                
                <div className="flex justify-between text-sm text-gray-400 mb-4">
                  <span>Vol: €{(m.total_volume / 1000).toFixed(1)}K</span>
                  <span>Traders: {m.total_traders || 124}</span>
                </div>
                
                <button className="w-full py-3 bg-blue-600 hover:bg-blue-700 rounded-xl font-bold transition-all group-hover:scale-105">
                  Tradear
                </button>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Footer */}
      <footer className="border-t border-gray-800 py-12 bg-gray-900/50">
        <div className="container mx-auto px-6">
          <div className="flex flex-col md:flex-row justify-between items-center gap-6">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 bg-gradient-to-br from-blue-500 to-purple-600 rounded-lg flex items-center justify-center text-sm font-bold">
                PM
              </div>
              <span className="font-bold">PrediMarket</span>
            </div>
            
            <div className="flex gap-8 text-sm text-gray-400">
              <a href="#" className="hover:text-white transition-colors">Términos</a>
              <a href="#" className="hover:text-white transition-colors">Privacidad</a>
              <a href="#" className="hover:text-white transition-colors">Soporte</a>
              <a href="#" className="hover:text-white transition-colors">Docs</a>
            </div>
            
            <div className="text-sm text-gray-500">
              © 2026 PrediMarket. Versión Beta.
            </div>
          </div>
        </div>
      </footer>
    </div>
  )
}