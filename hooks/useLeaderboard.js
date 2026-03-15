import { useState } from 'react'
import { getLeaderboard } from '../lib/leaderboard'

export default function useLeaderboard() {
  const [leaderboard, setLeaderboard] = useState([])
  const [loading, setLoading] = useState(false)

  async function loadLeaderboard() {
    setLoading(true)
    try {
      const data = await getLeaderboard(50)
      setLeaderboard(data || [])
    } catch (_) {
      setLeaderboard([])
    } finally {
      setLoading(false)
    }
  }

  return { leaderboard, loading, loadLeaderboard }
}
