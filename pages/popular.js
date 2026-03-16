import { useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'
import { C } from '../lib/theme'
import { calculatePrices } from '../lib/amm'
import AppLayout from '@/components/layout/AppLayout'
import MarketCard from '@/components/MarketCard'

const SORTS = [
  { key: 'total_volume', label: 'Volumen' },
  { key: 'created_at',   label: 'Recientes' },
]

export default function PopularPage() {
  const [markets, setMarkets] = useState([])
  const [loading, setLoading] = useState(true)
  const [sort, setSort]       = useState('total_volume')

  useEffect(() => {
    async function load() {
      setLoading(true)
      const { data, error } = await supabase
        .from('markets')
        .select('id, title, category, yes_pool, no_pool, total_volume, close_date, created_at, resolution_time')
        .eq('status', 'ACTIVE')
        .in('category', ['ECONOMIA', 'TIPOS', 'ENERGIA'])
        .gt('close_date', new Date().toISOString())
        .order(sort, { ascending: false })
        .limit(50)

      if (error) {
        console.error('[popular] supabase error:', error.message)
      }
      if (data) {
        setMarkets(data.map(m => ({
          ...m,
          prices: calculatePrices(parseFloat(m.yes_pool), parseFloat(m.no_pool)),
          isExpired: false,
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
              Más populares
            </h1>
            <p style={{ fontSize: 13, color: C.textMuted }}>
              Mercados ordenados por volumen, traders y seguidores.
            </p>
          </div>

          {/* Sort toggle */}
          <div className="no-scrollbar" style={{
            display: 'flex', background: C.surface, borderRadius: 8, padding: 3,
            border: `1px solid ${C.cardBorder}`, overflowX: 'auto', flexShrink: 0,
          }}>
            {SORTS.map(({ key, label }) => (
              <button key={key} onClick={() => setSort(key)} style={{
                padding: '5px 10px', fontSize: 11, borderRadius: 6, border: 'none',
                cursor: 'pointer', fontFamily: 'inherit', fontWeight: sort === key ? 600 : 400,
                background: sort === key ? C.card : 'transparent',
                color: sort === key ? C.text : C.textMuted,
                boxShadow: sort === key ? C.shadow : 'none',
                whiteSpace: 'nowrap',
              }}>
                {label}
              </button>
            ))}
          </div>
        </div>
      </div>

      {loading ? (
        <div style={{ color: C.textDim, fontSize: 13, padding: '40px 0', textAlign: 'center' }}>
          Cargando...
        </div>
      ) : markets.length === 0 ? (
        <div style={{ color: C.textDim, fontSize: 13, padding: '60px 0', textAlign: 'center' }}>
          <div style={{ fontSize: 24, marginBottom: 12, opacity: 0.4 }}>📊</div>
          <div>No hay mercados activos ahora mismo.</div>
          <div style={{ marginTop: 6, fontSize: 12 }}>Pronto habrá nuevos mercados disponibles.</div>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
          {markets.map((market, idx) => (
            <div key={market.id} style={{ display: 'flex', alignItems: 'stretch', gap: 10 }}>
              {/* Rank number */}
              <div style={{
                flexShrink: 0, width: 28, display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontSize: 11, fontWeight: 700, color: idx < 3 ? C.warning : C.textDim,
                fontVariantNumeric: 'tabular-nums',
              }}>
                {idx + 1}
              </div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <MarketCard market={market} onOpen={() => {}} />
              </div>
            </div>
          ))}
        </div>
      )}
    </AppLayout>
  )
}
