import { useState } from 'react'
import { getUserTrades, sellPosition } from '../lib/supabase'
import { previewSellValue, calculatePrices } from '../lib/amm'

export default function useTrades({ user, setUser, onRefreshMarkets }) {
  const [userTrades, setUserTrades] = useState([])

  const openTrades = userTrades.filter(t => t.status === 'OPEN')

  async function loadUserTrades(email) {
    const data = await getUserTrades(email, true)
    setUserTrades(data.map(t => {
      const currentPrice = calculatePrices(parseFloat(t.markets.yes_pool), parseFloat(t.markets.no_pool))
      const currentValue = t.status === 'OPEN'
        ? previewSellValue(t.shares, t.side, parseFloat(t.markets.yes_pool), parseFloat(t.markets.no_pool))
        : (t.sold_price || 0)
      const isExpired = new Date(t.markets.close_date) < new Date()
      return { ...t, currentPrice, currentValue, potentialPayout: t.shares, profit: currentValue - t.amount, isExpired }
    }))
  }

  async function handleSell(trade) {
    if (trade.isExpired) { alert('Mercado expirado — pendiente de resolución.'); return }
    if (!confirm(`¿Vender ${trade.shares.toFixed(1)} contratos ${trade.side} por ~€${trade.currentValue.toFixed(2)}? (Fee 2% incluido)`)) return
    const result = await sellPosition(trade.id, user.email)
    if (result.success) {
      const newUser = { ...user, balance: result.new_balance }
      setUser(newUser)
      localStorage.setItem('predi_user', JSON.stringify(newUser))
      loadUserTrades(user.email)
      onRefreshMarkets?.()
    } else {
      alert(result.error)
    }
  }

  return { userTrades, openTrades, loadUserTrades, handleSell }
}
