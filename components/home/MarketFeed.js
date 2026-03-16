import MarketFilters from '../MarketFilters'
import MarketGrid from '../MarketGrid'
import HomeSections from './HomeSections'
import MobileMarketFeed from '../mobile/MobileMarketFeed'

export default function MarketFeed({
  filtered,
  loading,
  pendingMarkets,
  resolvedMarkets,
  showResolved,
  setShowResolved,
  onOpen,
  onTrade,
  filter,
  setFilter,
  catFilter,
  setCatFilter,
  activeMarkets,
  markets,
}) {
  // Show sectioned homepage only when no filters are active
  const isUnfiltered = filter === 'ALL' && catFilter === 'ALL'

  return (
    <>
      {/* ── Desktop feed ──────────────────────────────────────────────── */}
      <div className="desktop-feed">
        <MarketFilters
          filter={filter}
          setFilter={setFilter}
          catFilter={catFilter}
          setCatFilter={setCatFilter}
          activeMarkets={activeMarkets}
        />

        <div style={{ marginTop: 20 }}>
          {isUnfiltered && !loading ? (
            <>
              <HomeSections markets={activeMarkets} onOpen={onOpen} onTrade={onTrade} />
              <div style={{
                fontSize: 11, fontWeight: 600, letterSpacing: '0.07em',
                textTransform: 'uppercase', color: 'var(--text-dim)',
                marginBottom: 10, marginTop: 8,
                display: 'flex', alignItems: 'center', gap: 10,
              }}>
                Todos los mercados
                <div style={{ flex: 1, height: 1, background: 'var(--divider)' }} />
              </div>
              <MarketGrid
                filtered={filtered}
                loading={loading}
                pendingMarkets={pendingMarkets}
                resolvedMarkets={resolvedMarkets}
                showResolved={showResolved}
                setShowResolved={setShowResolved}
                onOpen={onOpen}
              />
            </>
          ) : (
            <MarketGrid
              filtered={filtered}
              loading={loading}
              pendingMarkets={pendingMarkets}
              resolvedMarkets={resolvedMarkets}
              showResolved={showResolved}
              setShowResolved={setShowResolved}
              onOpen={onOpen}
            />
          )}
        </div>
      </div>

      {/* ── Mobile immersive feed ─────────────────────────────────────── */}
      <div className="mobile-feed">
        <MobileMarketFeed
          markets={markets || activeMarkets}
          loading={loading}
          catFilter={catFilter}
          setCatFilter={setCatFilter}
          onTrade={onTrade}
          onOpen={onOpen}
        />
      </div>
    </>
  )
}
