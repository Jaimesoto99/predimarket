import { useEffect, useState } from 'react'
import { getActiveMarkets } from '../lib/supabase'
import { calculatePrices } from '../lib/amm'

export default function Home() {
  const [markets, setMarkets] = useState([])
  
  useEffect(() => {
    async function load() {
      const data = await getActiveMarkets()
      const withPrices = data.map(m => ({
        ...m,
        prices: calculatePrices(parseFloat(m.yes_pool), parseFloat(m.no_pool))
      }))
      setMarkets(withPrices)
    }
    load()
  }, [])
  
  return (
    <div style={{ padding: '20px', fontFamily: 'Arial' }}>
      <h1>Predimarket MVP</h1>
      <p>Mercados activos: {markets.length}</p>
      
      {markets.map(m => (
        <div key={m.id} style={{ border: '1px solid #ccc', padding: '15px', margin: '10px 0' }}>
          <h3>{m.title}</h3>
          <p>SÍ: {m.prices.yes}% | NO: {m.prices.no}%</p>
          <p>Volumen: €{m.total_volume}</p>
        </div>
      ))}
    </div>
  )
}