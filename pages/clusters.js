import { useEffect, useState } from 'react'
import { useRouter } from 'next/router'
import { supabase } from '../lib/supabase'
import { C } from '../lib/theme'
import AppLayout from '@/components/layout/AppLayout'
import MarketCard from '@/components/MarketCard'
import { ClusterBadge } from '@/components/analytics/MarketScoreIndicator'
import { calculatePrices } from '../lib/amm'

// ─── All known clusters ───────────────────────────────────────────────────

const CLUSTERS = [
  { id: 'CRYPTO_MARKETS',    label: 'Criptomonedas',     icon: '₿' },
  { id: 'STOCK_INDICES',     label: 'Índices bursátiles', icon: '📈' },
  { id: 'EU_ECONOMY',        label: 'Economía UE',        icon: '🇪🇺' },
  { id: 'RATES_INFLATION',   label: 'Tipos e Inflación',  icon: '🏦' },
  { id: 'COMMODITIES',       label: 'Materias primas',    icon: '🛢' },
  { id: 'SPANISH_FOOTBALL',  label: 'Fútbol español',     icon: '⚽' },
  { id: 'CHAMPIONS_LEAGUE',  label: 'Champions League',   icon: '🏆' },
  { id: 'LA_LIGA',           label: 'La Liga',            icon: '⚽' },
  { id: 'ES_POLITICS',       label: 'Política española',  icon: '🏛' },
  { id: 'EU_POLITICS',       label: 'Política europea',   icon: '🇪🇺' },
  { id: 'AI_TECH',           label: 'IA & Tecnología',    icon: '🤖' },
  { id: 'BIG_TECH',          label: 'Big Tech',           icon: '💻' },
  { id: 'ELECTRICITY',       label: 'Electricidad',       icon: '⚡' },
  { id: 'OIL_GAS',           label: 'Petróleo & Gas',     icon: '🛢' },
  { id: 'WAR_CONFLICT',      label: 'Conflictos',         icon: '🌍' },
  { id: 'TRADE_GEOPOLITICS', label: 'Geopolítica',        icon: '🌐' },
]

export default function ClustersPage() {
  const router                          = useRouter()
  const [activeCluster, setActiveCluster] = useState(null)
  const [clusterMarkets, setClusterMarkets] = useState([])
  const [clusterCounts, setClusterCounts]   = useState({})
  const [loading, setLoading]               = useState(false)

  // Load market counts per cluster on mount
  useEffect(() => {
    async function loadCounts() {
      const { data } = await supabase
        .from('markets')
        .select('cluster_id')
        .eq('status', 'ACTIVE')
        .gt('close_date', new Date().toISOString())
        .not('cluster_id', 'is', null)

      if (data) {
        const counts = {}
        for (const m of data) {
          counts[m.cluster_id] = (counts[m.cluster_id] || 0) + 1
        }
        setClusterCounts(counts)
      }
    }
    loadCounts()
  }, [])

  // Handle ?cluster= query param
  useEffect(() => {
    if (router.query.cluster) selectCluster(router.query.cluster)
  }, [router.query.cluster])

  async function selectCluster(clusterId) {
    setActiveCluster(clusterId)
    setLoading(true)

    const { data, error } = await supabase
      .from('markets')
      .select('id, title, category, yes_pool, no_pool, total_volume, close_date, market_score, cluster_id, trending, prob_change_6h, prob_change_24h, created_at, active_traders')
      .eq('status', 'ACTIVE')
      .eq('cluster_id', clusterId)
      .gt('close_date', new Date().toISOString())
      .order('market_score', { ascending: false })
      .limit(30)

    if (!error && data) {
      setClusterMarkets(data.map(m => ({
        ...m,
        prices: calculatePrices(parseFloat(m.yes_pool), parseFloat(m.no_pool)),
        isExpired: false,
      })))
    }
    setLoading(false)
  }

  const visibleClusters = CLUSTERS.filter(c => (clusterCounts[c.id] || 0) > 0)
  const allClusters     = visibleClusters.length > 0 ? visibleClusters : CLUSTERS

  return (
    <AppLayout>
      <div style={{ marginBottom: 24 }}>
        <h1 style={{ fontSize: 20, fontWeight: 800, letterSpacing: '-0.04em', color: C.text, marginBottom: 4 }}>
          Clusters de mercados
        </h1>
        <p style={{ fontSize: 13, color: C.textMuted }}>
          Mercados agrupados por tema. Selecciona un cluster para explorar.
        </p>
      </div>

      {/* Cluster grid */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fill, minmax(160px, 1fr))',
        gap: 8, marginBottom: 32,
      }}>
        {allClusters.map(cluster => {
          const count  = clusterCounts[cluster.id] || 0
          const active = activeCluster === cluster.id

          return (
            <button
              key={cluster.id}
              onClick={() => selectCluster(cluster.id)}
              style={{
                padding: '14px 16px', textAlign: 'left',
                background: active ? C.card : C.surface,
                border: `1px solid ${active ? C.accent : C.cardBorder}`,
                borderRadius: 10, cursor: 'pointer',
                fontFamily: 'inherit',
                transition: 'all 0.12s',
                boxShadow: active ? C.shadow : 'none',
              }}
            >
              <div style={{ fontSize: 18, marginBottom: 6 }}>{cluster.icon}</div>
              <div style={{ fontSize: 12, fontWeight: 600, color: C.text, marginBottom: 3 }}>
                {cluster.label}
              </div>
              <div style={{ fontSize: 10, color: C.textDim }}>
                {count > 0 ? `${count} mercado${count !== 1 ? 's' : ''}` : 'Sin mercados'}
              </div>
            </button>
          )
        })}
      </div>

      {/* Markets in selected cluster */}
      {activeCluster && (
        <div>
          <div style={{
            display: 'flex', alignItems: 'center', gap: 10, marginBottom: 16,
          }}>
            <span style={{
              fontSize: 11, fontWeight: 600, letterSpacing: '0.07em',
              textTransform: 'uppercase', color: C.textDim,
            }}>
              Mercados en
            </span>
            <ClusterBadge clusterId={activeCluster} />
          </div>

          {loading ? (
            <div style={{ color: C.textDim, fontSize: 13, padding: '24px 0' }}>
              Cargando...
            </div>
          ) : clusterMarkets.length === 0 ? (
            <div style={{ color: C.textDim, fontSize: 13, padding: '32px 0', textAlign: 'center' }}>
              Sin mercados activos en este cluster todavía.
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
              {clusterMarkets.map(market => (
                <MarketCard key={market.id} market={market} onOpen={() => {}} />
              ))}
            </div>
          )}
        </div>
      )}
    </AppLayout>
  )
}
