import { useState } from 'react'
import { getLeaderboard } from '../lib/leaderboard'

export default function useLeaderboard() {
  const [leaderboard, setLeaderboard] = useState([])

  async function loadLeaderboard() {
    const data = await getLeaderboard(50)
    setLeaderboard(data)
  }

  return { leaderboard, loadLeaderboard }
}
