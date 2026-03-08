import MarketFilters from '../MarketFilters'
import MarketGrid from '../MarketGrid'

export default function MarketFeed({
  filtered,
  loading,
  pendingMarkets,
  resolvedMarkets,
  showResolved,
  setShowResolved,
  onOpen,
  filter,
  setFilter,
  catFilter,
  setCatFilter,
  activeMarkets,
}) {
  return (
    <div>
      <MarketFilters
        filter={filter}
        setFilter={setFilter}
        catFilter={catFilter}
        setCatFilter={setCatFilter}
        activeMarkets={activeMarkets}
      />
      <div style={{ marginTop: 16 }}>
        <MarketGrid
          filtered={filtered}
          loading={loading}
          pendingMarkets={pendingMarkets}
          resolvedMarkets={resolvedMarkets}
          showResolved={showResolved}
          setShowResolved={setShowResolved}
          onOpen={onOpen}
        />
      </div>
    </div>
  )
}
