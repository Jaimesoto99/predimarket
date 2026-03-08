import { useEffect, useState } from 'react'
import { C } from '../lib/theme'
import { getAlertMarkets } from '../lib/watchlist'
import AppLayout from '@/components/layout/AppLayout'
import MarketCard from '@/components/MarketCard'
import WatchButton from '@/components/WatchButton'
import useWatchlist from '@/hooks/useWatchlist'

export default function WatchlistPage() {
  // Read user from localStorage (same pattern as index.js)
  const [user, setUser] = useState(null)
  useEffect(() => {
    try {
      const saved = localStorage.getItem('predi_user')
      if (saved) setUser(JSON.parse(saved))
    } catch { /* ignore */ }
  }, [])

  const { watchlistMarkets, alertCount, loading, isWatching, toggleWatch, loadMarkets } = useWatchlist(user)

  useEffect(() => { loadMarkets() }, [loadMarkets])

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
        <div style={{ textAlign: 'center', padding: '60px 0', color: C.textDim }}>
          <div style={{ fontSize: 32, marginBottom: 16, opacity: 0.3 }}>♡</div>
          <div style={{ fontSize: 14 }}>Tu watchlist está vacía.</div>
          <div style={{ marginTop: 8, fontSize: 12 }}>
            Pulsa ♡ en cualquier mercado para añadirlo.
          </div>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>

          {/* Alerts section */}
          {alertMarkets.length > 0 && (
            <div>
              <div style={{
                display: 'flex', alignItems: 'center', gap: 8, marginBottom: 12,
              }}>
                <span style={{
                  fontSize: 11, fontWeight: 700, letterSpacing: '0.07em',
                  textTransform: 'uppercase', color: C.warning,
                }}>
                  ⚠ Alertas
                </span>
                <span style={{
                  fontSize: 10, background: `${C.warning}15`,
                  color: C.warning, border: `1px solid ${C.warning}30`,
                  padding: '1px 6px', borderRadius: 4, fontWeight: 600,
                }}>
                  {alertMarkets.length}
                </span>
              </div>
              <div style={{
                padding: '12px 16px', marginBottom: 12,
                background: `${C.warning}08`, border: `1px solid ${C.warning}20`,
                borderRadius: 10, fontSize: 12, color: C.warning,
              }}>
                Los siguientes mercados han variado más de 10 puntos porcentuales en 24h.
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                {alertMarkets.map(market => (
                  <div key={market.id} style={{ position: 'relative' }}>
                    <MarketCard market={market} onOpen={() => {}} />
                    <div style={{ position: 'absolute', top: 10, right: 10, zIndex: 2 }}>
                      <WatchButton
                        marketId={market.id}
                        isWatching={isWatching(market.id)}
                        onToggle={async (id) => { await toggleWatch(id); loadMarkets() }}
                      />
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Normal watchlist */}
          {normalMarkets.length > 0 && (
            <div>
              {alertMarkets.length > 0 && (
                <div style={{
                  fontSize: 11, fontWeight: 600, letterSpacing: '0.07em',
                  textTransform: 'uppercase', color: C.textDim, marginBottom: 12,
                }}>
                  Seguidos
                </div>
              )}
              <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                {normalMarkets.map(market => (
                  <div key={market.id} style={{ position: 'relative' }}>
                    <MarketCard market={market} onOpen={() => {}} />
                    <div style={{ position: 'absolute', top: 10, right: 10, zIndex: 2 }}>
                      <WatchButton
                        marketId={market.id}
                        isWatching={isWatching(market.id)}
                        onToggle={async (id) => { await toggleWatch(id); loadMarkets() }}
                      />
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </AppLayout>
  )
}
