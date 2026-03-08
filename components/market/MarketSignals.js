import { C, getOracleDescription } from '../../lib/theme'
import { sp } from '../../lib/ds'
import Signal from '../ui/Signal'

// Derive contextual signals from market data — no extra API calls
function inferSignals(market) {
  const signals = []
  const title = (market.title || '').toLowerCase()
  const vol = parseFloat(market.total_volume) || 0
  const traders = market.active_traders || market.total_traders || 0
  const yesP = parseFloat(market.prices?.yes || 50)
  const oracleInfo = getOracleDescription(market)

  // Oracle source signal (always present)
  signals.push({
    type: 'oracle',
    text: oracleInfo.source,
  })

  // Volume spike signal
  if (vol > 2000) {
    signals.push({ type: 'volume', text: `Volumen elevado — ${(vol / 1000).toFixed(1)}K` })
  }

  // High conviction signal
  if (yesP >= 72 || yesP <= 28) {
    signals.push({
      type: 'movement',
      text: yesP >= 72
        ? `Consenso alto: SI ${yesP.toFixed(0)}%`
        : `Consenso alto: NO ${(100 - yesP).toFixed(0)}%`,
    })
  }

  // Active community
  if (traders >= 10) {
    signals.push({ type: 'data', text: `${traders} analistas activos` })
  }

  // Category-specific source signals
  if (title.includes('ibex') || title.includes('s&p') || title.includes('nasdaq')) {
    signals.push({ type: 'source', text: 'Yahoo Finance feed activo' })
  } else if (title.includes('bitcoin') || title.includes('btc') || title.includes('ethereum')) {
    signals.push({ type: 'source', text: 'CoinGecko price feed activo' })
  } else if (title.includes('luz') || title.includes('pvpc') || title.includes('mwh')) {
    signals.push({ type: 'source', text: 'REE apidatos verificado' })
  } else if (title.includes('ipc') || title.includes('inflacion') || title.includes('ine')) {
    signals.push({ type: 'source', text: 'INE datos programados' })
  } else if (title.includes('real madrid') || title.includes('barcelona') || title.includes('futbol')) {
    signals.push({ type: 'source', text: 'football-data.org activo' })
  }

  // New market signal
  if (market.isNew) {
    signals.push({ type: 'news', text: 'Nuevo en las ultimas 48h' })
  }

  return signals.slice(0, 3) // max 3 signals displayed
}

export default function MarketSignals({ market, compact = true, style }) {
  const signals = inferSignals(market)
  return (
    <div style={{
      display: 'flex', flexWrap: 'wrap', gap: sp.xs,
      ...style,
    }}>
      {signals.map((sig, i) => (
        <Signal key={i} type={sig.type} text={sig.text} compact={compact} />
      ))}
    </div>
  )
}
