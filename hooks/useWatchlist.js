import { useState, useEffect, useCallback } from 'react'
import { getWatchlistIds, followMarket, unfollowMarket, getWatchlistMarkets, getAlertMarkets } from '../lib/watchlist'

export default function useWatchlist(user) {
  const [watchlistIds, setWatchlistIds]     = useState(new Set())
  const [watchlistMarkets, setWatchlistMarkets] = useState([])
  const [alertCount, setAlertCount]         = useState(0)
  const [loading, setLoading]               = useState(false)

  const userEmail = user?.email || null

  // Load watched IDs (fast — for rendering heart buttons)
  const loadIds = useCallback(async () => {
    if (!userEmail) { setWatchlistIds(new Set()); return }
    const ids = await getWatchlistIds(userEmail)
    setWatchlistIds(new Set(ids))
  }, [userEmail])

  // Load full markets (slower — for watchlist page)
  const loadMarkets = useCallback(async () => {
    if (!userEmail) { setWatchlistMarkets([]); setAlertCount(0); return }
    setLoading(true)
    const markets = await getWatchlistMarkets(userEmail)
    setWatchlistMarkets(markets)
    setAlertCount(getAlertMarkets(markets).length)
    setLoading(false)
  }, [userEmail])

  useEffect(() => { loadIds() }, [loadIds])

  // Toggle follow/unfollow
  async function toggleWatch(marketId) {
    if (!userEmail) return false

    const wasWatching = watchlistIds.has(marketId)

    // Optimistic update
    setWatchlistIds(prev => {
      const next = new Set(prev)
      if (wasWatching) next.delete(marketId)
      else next.add(marketId)
      return next
    })

    const ok = wasWatching
      ? await unfollowMarket(userEmail, marketId)
      : await followMarket(userEmail, marketId)

    if (!ok) {
      // Rollback on failure
      setWatchlistIds(prev => {
        const next = new Set(prev)
        if (wasWatching) next.add(marketId)
        else next.delete(marketId)
        return next
      })
    }

    return ok
  }

  const isWatching = (marketId) => watchlistIds.has(marketId)

  return {
    watchlistIds,
    watchlistMarkets,
    alertCount,
    loading,
    isWatching,
    toggleWatch,
    loadIds,
    loadMarkets,
  }
}
