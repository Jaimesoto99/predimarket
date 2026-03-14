// Cleanup: resolve markets without real oracle + update thresholds with live prices
// Live prices (2026-03-14): IBEX=17059, BTC=$70701, Brent=$98.91, EURUSD=1.1423, Madrid_max_mañana=14.1°C

const URL = 'https://mrdkhfbwesehffbystto.supabase.co'
const KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im1yZGtoZmJ3ZXNlaGZmYnlzdHRvIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3MDY2OTk1MywiZXhwIjoyMDg2MjQ1OTUzfQ.yPlUU55lXEx1EVfXdF58sNjlblsKsXL4iz2eawnewxg'
const H = { Authorization: `Bearer ${KEY}`, apikey: KEY, 'Content-Type': 'application/json', Prefer: 'return=minimal' }

const r = await fetch(`${URL}/rest/v1/markets?select=id,title,status,market_type,close_date,category&status=eq.ACTIVE`, { headers: H })
const markets = await r.json()
console.log(`Fetched ${markets.length} active markets\n`)

const now = new Date()
const sixtyDaysOut = new Date(now.getTime() + 60 * 86400000)

// ─── 1. Markets to RESOLVE as false (no real oracle) ─────────────────────────
const BAD_KEYWORDS = [
  'renfe',
  'aena',
  'gasolina',
  'portada',
  'el país',
  'el pais',
  'alquiler turístico',
  'alquiler turistico',
  'restricciones',
]

let resolved = 0
let updated = 0

for (const m of markets) {
  const t = m.title.toLowerCase()

  // Check bad keywords
  const isBad = BAD_KEYWORDS.some(kw => t.includes(kw))

  // Check > 60 days
  const closeDays = (new Date(m.close_date) - now) / 86400000
  const tooLong = closeDays > 60

  if (isBad || tooLong) {
    const reason = isBad ? `keyword match` : `${closeDays.toFixed(0)}d > 60d`
    const res = await fetch(`${URL}/rest/v1/markets?id=eq.${m.id}`, {
      method: 'PATCH', headers: H,
      body: JSON.stringify({ status: 'RESOLVED', resolved_outcome: false }),
    })
    if (res.ok) {
      resolved++
      console.log(`  ✓ RESOLVED [${m.id}] (${reason}) ${m.title.slice(0, 70)}`)
    } else {
      console.log(`  ✗ ERROR [${m.id}] ${await res.text().catch(() => '')}`)
    }
  }
}

console.log(`\nResolved ${resolved} markets without oracle\n`)

// ─── 2. Re-fetch remaining active markets and update thresholds ───────────────
const r2 = await fetch(`${URL}/rest/v1/markets?select=id,title,status,market_type,close_date,category&status=eq.ACTIVE`, { headers: H })
const remaining = await r2.json()
console.log(`${remaining.length} active markets remaining. Checking thresholds...\n`)

// Live prices
const IBEX    = 17059
const BTC     = 70701
const BRENT   = 98.91
const EURUSD  = 1.1423
const MAD_MAX = 14.1  // Madrid mañana max °C

// Threshold generators (±% from live price)
const ibexThreshold  = Math.round(IBEX  * 1.005 / 100) * 100   // +0.5%  → 17100
const btcThreshold   = Math.round(BTC   * 1.015 / 1000) * 1000 // +1.5%  → 71750 → round to 72000
const brentThreshold = Math.round(BRENT * 1.01)                  // +1%   → 100
const eurUsdThresh   = Math.round(EURUSD * 1003) / 1000          // +0.3% → 1.146 → round

const THRESHOLD_UPDATES = [
  // IBEX markets → update title to use current threshold
  {
    match: t => t.includes('ibex') && (t.includes('>') || t.includes('supera') || t.includes('verde')),
    makeTitle: m => {
      const t = m.title.toLowerCase()
      if (t.includes('verde') || t.includes('sube') || t.includes('positivo')) {
        return { title: '¿El IBEX 35 cierra en verde hoy?', resolution_rules: `Este contrato se resolverá como SÍ si el IBEX 35 cierra con variación positiva (>0%) respecto al cierre del día anterior según Yahoo Finance (^IBEX) a las 17:35h CET.` }
      }
      return { title: `¿El IBEX 35 supera ${ibexThreshold.toLocaleString('es-ES')} puntos al cierre?`, resolution_rules: `Este contrato se resolverá como SÍ si el IBEX 35 cierra por encima de ${ibexThreshold} puntos según Yahoo Finance (^IBEX) a las 17:35h CET.` }
    },
  },
  // Bitcoin markets
  {
    match: t => (t.includes('bitcoin') || t.includes('btc')) && (t.includes('>') || t.includes('supera') || t.includes('$')),
    makeTitle: () => ({ title: `¿Bitcoin supera $${(Math.round(BTC * 1.015 / 1000) * 1000).toLocaleString('es-ES')} esta semana?`, resolution_rules: `Este contrato se resolverá como SÍ si el precio de Bitcoin supera $${Math.round(BTC * 1.015 / 1000) * 1000} USD según CoinGecko a la fecha de cierre del mercado.` }),
  },
  // Brent markets
  {
    match: t => t.includes('brent') && (t.includes('>') || t.includes('supera') || t.includes('$') || t.includes('€')),
    makeTitle: () => ({ title: `¿El Brent supera $${brentThreshold} por barril?`, resolution_rules: `Este contrato se resolverá como SÍ si el precio del barril Brent (ICE) supera $${brentThreshold} USD según Yahoo Finance (BZ=F) a la fecha de cierre.` }),
  },
  // EUR/USD markets
  {
    match: t => t.includes('eur/usd') || t.includes('eurusd') || t.includes('euro') && t.includes('dólar'),
    makeTitle: () => ({ title: `¿El EUR/USD supera ${eurUsdThresh.toFixed(3)}?`, resolution_rules: `Este contrato se resolverá como SÍ si el tipo de cambio EUR/USD supera ${eurUsdThresh.toFixed(3)} según Yahoo Finance (EURUSD=X) a la fecha de cierre.` }),
  },
  // Temperature Madrid
  {
    match: t => t.includes('temperatura') && t.includes('madrid'),
    makeTitle: () => {
      const threshold = Math.round(MAD_MAX + 2)
      return { title: `¿La temperatura máxima en Madrid supera ${threshold}°C mañana?`, resolution_rules: `Este contrato se resolverá como SÍ si la temperatura máxima registrada en Madrid supera ${threshold}°C el día de cierre del mercado según datos de Open-Meteo/AEMET.` }
    },
  },
]

for (const m of remaining) {
  const t = m.title.toLowerCase()
  for (const rule of THRESHOLD_UPDATES) {
    if (rule.match(t)) {
      const patch = rule.makeTitle(m)
      const res = await fetch(`${URL}/rest/v1/markets?id=eq.${m.id}`, {
        method: 'PATCH', headers: H,
        body: JSON.stringify(patch),
      })
      if (res.ok) {
        updated++
        console.log(`  ↺ UPDATED [${m.id}] → "${patch.title}"`)
      } else {
        console.log(`  ✗ PATCH ERROR [${m.id}] ${await res.text().catch(() => '')}`)
      }
      break
    }
  }
}

console.log(`\nUpdated ${updated} market thresholds.`)

// ─── 3. Final summary ─────────────────────────────────────────────────────────
const r3 = await fetch(`${URL}/rest/v1/markets?select=id,title,status,market_type,close_date&status=eq.ACTIVE`, { headers: H })
const final = await r3.json()
console.log(`\n─── Final active markets: ${final.length} ───`)
for (const m of final) {
  const days = ((new Date(m.close_date) - now) / 86400000).toFixed(1)
  console.log(`  [${m.id}] ${m.market_type} | ${days}d | ${m.title.slice(0, 70)}`)
}
