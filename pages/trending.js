import { useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'
import { C, getTimeLeft } from '../lib/theme'
import AppLayout from '@/components/layout/AppLayout'
import MarketCard from '@/components/MarketCard'
import MarketTrendBadge from '@/components/analytics/MarketTrendBadge'
import { calculatePrices } from '../lib/amm'

export default function TrendingPage() {
  const [markets, setMarkets] = useState([])
  const [loading, setLoading] = useState(true)
  const [sort, setSort] = useState('change24h') // 'change24h' | 'score'

  useEffect(() => {
    async function load() {
      setLoading(true)
      const { data, error } = await supabase
        .from('markets')
        .select('id, title, category, yes_pool, no_pool, total_volume, close_date, market_score, cluster_id, trending, prob_change_6h, prob_change_24h, vol_24h, created_at, active_traders')
        .eq('status', 'ACTIVE')
        .eq('trending', true)
        .gt('close_date', new Date().toISOString())
        .order(sort === 'change24h' ? 'prob_change_24h' : 'market_score', { ascending: false })
        .limit(50)

      if (!error && data) {
        setMarkets(data.map(m => ({
          ...m,
          prices: calculatePrices(parseFloat(m.yes_pool), parseFloat(m.no_pool)),
          isExpired: new Date(m.close_date) < new Date(),
        })))
      }
      setLoading(false)
    }
    load()
  }, [sort])

  return (
    <AppLayout>
      <div style={{ marginBottom: 28 }}>
        <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', flexWrap: 'wrap', gap: 12 }}>
          <div>
            <h1 style={{ fontSize: 20, fontWeight: 800, letterSpacing: '-0.04em', color: C.text, marginBottom: 4 }}>
              Trending
            </h1>
            <p style={{ fontSize: 13, color: C.textMuted }}>
              Mercados con mayor movimiento de probabilidad en las últimas 24h.
            </p>
          </div>

          {/* Sort toggle */}
          <div style={{
            display: 'flex', background: C.surface, borderRadius: 8, padding: 3,
            border: `1px solid ${C.cardBorder}`,
          }}>
            {[['change24h', 'Cambio 24h'], ['score', 'Relevancia']].map(([k, label]) => (
              <button key={k} onClick={() => setSort(k)} style={{
                padding: '5px 12px', fontSize: 12, borderRadius: 6, border: 'none',
                cursor: 'pointer', fontFamily: 'inherit', fontWeight: sort === k ? 600 : 400,
                background: sort === k ? C.card : 'transparent',
                color: sort === k ? C.text : C.textMuted,
                boxShadow: sort === k ? C.shadow : 'none',
              }}>
                {label}
              </button>
            ))}
          </div>
        </div>
      </div>

      {loading ? (
        <div style={{ color: C.textDim, fontSize: 13, padding: '40px 0', textAlign: 'center' }}>
          Cargando mercados trending...
        </div>
      ) : markets.length === 0 ? (
        <div style={{ color: C.textDim, fontSize: 13, padding: '60px 0', textAlign: 'center' }}>
          <div style={{ fontSize: 24, marginBottom: 12, opacity: 0.4 }}>📊</div>
          <div>No hay mercados trending ahora mismo.</div>
          <div style={{ marginTop: 6, fontSize: 12 }}>El motor de inteligencia actualiza los trending cada 30 minutos.</div>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
          {markets.map(market => (
            <div key={market.id} style={{ position: 'relative' }}>
              <MarketCard market={market} onOpen={() => {}} />
              {/* Trend overlay badge */}
              <div style={{ position: 'absolute', top: 10, right: 16, zIndex: 2 }}>
                <MarketTrendBadge market={market} size="lg" />
              </div>
            </div>
          ))}
        </div>
      )}
    </AppLayout>
  )
}
