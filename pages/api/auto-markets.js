/**
 * /api/auto-markets?key=ADMIN_API_KEY
 *
 * Consulta datos reales (Yahoo Finance, CoinGecko, Open-Meteo, PVPC/REE)
 * y crea mercados diarios con umbrales calibrados a ±1-3% del precio actual.
 * Deduplicación contra mercados activos existentes.
 * Cron: cada día a las 08:00 UTC (09:00 CET).
 */

import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
)

const UA = 'Mozilla/5.0 (compatible; PrediMarket/1.0)'

// ─── Helpers de fecha ─────────────────────────────────────────────────────────

function todayAt(hh, mm, ss = 0) {
  // Construye fecha UTC de hoy a las HH:MM UTC (CET = UTC+1 en marzo)
  const d = new Date()
  d.setUTCHours(hh, mm, ss, 0)
  return d
}

function tomorrowAt(hh, mm, ss = 0) {
  const d = new Date()
  d.setUTCDate(d.getUTCDate() + 1)
  d.setUTCHours(hh, mm, ss, 0)
  return d
}

// Si la hora ya pasó hoy, devuelve mañana a esa hora
function todayOrTomorrow(hh, mm) {
  const t = todayAt(hh, mm)
  if (t < new Date()) return tomorrowAt(hh, mm)
  return t
}

// ─── Fetchers ─────────────────────────────────────────────────────────────────

async function yahooPrice(symbol) {
  const enc = encodeURIComponent(symbol)
  const url = `https://query1.finance.yahoo.com/v8/finance/chart/${enc}?interval=1d&range=1d`
  const r = await fetch(url, { headers: { 'User-Agent': UA } })
  const d = await r.json()
  return d?.chart?.result?.[0]?.meta?.regularMarketPrice ?? null
}

async function cryptoPrices() {
  const r = await fetch(
    'https://api.coingecko.com/api/v3/simple/price?ids=bitcoin,ethereum&vs_currencies=usd',
    { headers: { 'User-Agent': UA } }
  )
  const d = await r.json()
  return { btc: d?.bitcoin?.usd ?? null, eth: d?.ethereum?.usd ?? null }
}

async function openMeteoTemps() {
  // Madrid, Barcelona, Sevilla, Valencia — máxima mañana
  const cities = [
    { name: 'Madrid',    lat: 40.4168, lon: -3.7038 },
    { name: 'Barcelona', lat: 41.3851, lon:  2.1734 },
    { name: 'Sevilla',   lat: 37.3891, lon: -5.9845 },
    { name: 'Valencia',  lat: 39.4699, lon: -0.3763 },
  ]
  const results = {}
  for (const city of cities) {
    try {
      const url = `https://api.open-meteo.com/v1/forecast?latitude=${city.lat}&longitude=${city.lon}&daily=temperature_2m_max&forecast_days=3&timezone=Europe%2FMadrid`
      const r = await fetch(url, { headers: { 'User-Agent': UA } })
      const d = await r.json()
      // Index 1 = mañana (0 = hoy, 1 = mañana, 2 = pasado)
      results[city.name] = d?.daily?.temperature_2m_max?.[1] ?? null
    } catch { results[city.name] = null }
  }
  return results  // { Madrid: 14.1, Barcelona: 17.9, Sevilla: 21.8, Valencia: 18.5 }
}

async function pvpcToday() {
  // REE API — precio medio del pool eléctrico de hoy
  try {
    const now   = new Date()
    const yyyy  = now.getUTCFullYear()
    const mm    = String(now.getUTCMonth() + 1).padStart(2, '0')
    const dd    = String(now.getUTCDate()).padStart(2, '0')
    const start = `${yyyy}-${mm}-${dd}T00:00`
    const end   = `${yyyy}-${mm}-${dd}T23:59`
    const url   = `https://apidatos.ree.es/es/datos/mercados/precios-mercados-tiempo-real?time_trunc=hour&start_date=${start}&end_date=${end}&geo_trunc=electric_system&geo_limit=peninsular&geo_ids=8741`
    const r = await fetch(url, { headers: { 'User-Agent': UA, Accept: 'application/json' } })
    const d = await r.json()
    const pvpcValues = d?.included
      ?.find(i => i.id === '1739' || i.attributes?.title?.includes('PVPC') || i.attributes?.title?.includes('mercado'))
      ?.attributes?.values
    if (pvpcValues && pvpcValues.length > 0) {
      const avg = pvpcValues.reduce((s, v) => s + (v.value ?? 0), 0) / pvpcValues.length
      return Math.round(avg * 10) / 10
    }
  } catch { /* fallback below */ }

  // Fallback: preciodelaluz.org
  try {
    const r = await fetch('https://api.preciodelaluz.org/v1/prices/avg?zone=PCB', {
      headers: { 'User-Agent': UA }
    })
    const d = await r.json()
    return d?.price != null ? Math.round(d.price * 10) / 10 : null
  } catch { return null }
}

// ─── Builders de mercados ─────────────────────────────────────────────────────

// Redondeo limpio para umbrales legibles
const round = (n, step) => Math.round(n / step) * step

function makeIbexMarkets(ibex) {
  if (!ibex) return []
  // 1. Mercado binario "verde/rojo" para hoy
  // 2. Mercado de umbral +0.5% para mañana
  const thresh = round(ibex * 1.005, 25)
  const closeToday = todayOrTomorrow(16, 35) // 17:35 CET = 16:35 UTC
  const closeTomorrow = tomorrowAt(16, 35)
  return [
    {
      title: '¿El IBEX 35 cierra en verde hoy?',
      description: `Se resuelve SÍ si el IBEX 35 cierra con variación positiva (>0%) respecto al cierre anterior. Dato actual: ${Math.round(ibex).toLocaleString('es-ES')} pts.`,
      category: 'ECONOMIA', market_type: 'DIARIO',
      close_date: closeToday.toISOString(),
      resolution_source: 'Yahoo Finance · finance.yahoo.com/quote/^IBEX',
      resolution_rules: `Este contrato se resolverá como SÍ si el IBEX 35 cierra con variación positiva (>0%) respecto al cierre del día anterior según Yahoo Finance (^IBEX) a las 17:35h CET. Se resolverá como NO si cierra plano o en negativo (≤0%).`,
    },
    {
      title: `¿El IBEX 35 supera ${thresh.toLocaleString('es-ES')} puntos al cierre mañana?`,
      description: `Umbral calibrado a +0.5% del precio actual (${Math.round(ibex).toLocaleString('es-ES')} pts → ${thresh.toLocaleString('es-ES')} pts).`,
      category: 'ECONOMIA', market_type: 'DIARIO',
      close_date: closeTomorrow.toISOString(),
      resolution_source: 'Yahoo Finance · finance.yahoo.com/quote/^IBEX',
      resolution_rules: `Este contrato se resolverá como SÍ si el IBEX 35 supera ${thresh.toLocaleString('es-ES')} puntos al cierre (17:35h CET) según Yahoo Finance (^IBEX). Se resolverá como NO si cierra en ${thresh.toLocaleString('es-ES')} puntos o menos. Precio actual: ${Math.round(ibex).toLocaleString('es-ES')} pts (umbral +0.5%).`,
    },
  ]
}

function makeBtcMarket(btc) {
  if (!btc) return []
  const thresh = round(btc * 1.015, 500)
  return [{
    title: `¿Bitcoin supera $${thresh.toLocaleString('en-US')} mañana?`,
    description: `Umbral a +1.5% del precio actual ($${Math.round(btc).toLocaleString('en-US')}).`,
    category: 'CRIPTO', market_type: 'DIARIO',
    close_date: tomorrowAt(0, 0).toISOString(),
    resolution_source: 'CoinGecko · coingecko.com/es/monedas/bitcoin',
    resolution_rules: `Este contrato se resolverá como SÍ si el precio de Bitcoin (BTC/USD) supera $${thresh.toLocaleString('en-US')} USD según CoinGecko en cualquier momento antes del cierre. Se resolverá como NO si no alcanza ese nivel. Precio actual: $${Math.round(btc).toLocaleString('en-US')} (umbral +1.5%).`,
  }]
}

function makeEthMarket(eth) {
  if (!eth) return []
  const thresh = round(eth * 1.015, 50)
  return [{
    title: `¿Ethereum supera $${thresh.toLocaleString('en-US')} mañana?`,
    description: `Umbral a +1.5% del precio actual ($${Math.round(eth).toLocaleString('en-US')}).`,
    category: 'CRIPTO', market_type: 'DIARIO',
    close_date: tomorrowAt(0, 0).toISOString(),
    resolution_source: 'CoinGecko · coingecko.com/es/monedas/ethereum',
    resolution_rules: `Este contrato se resolverá como SÍ si el precio de Ethereum (ETH/USD) supera $${thresh.toLocaleString('en-US')} USD según CoinGecko. Se resolverá como NO si no alcanza ese nivel. Precio actual: $${Math.round(eth).toLocaleString('en-US')} (umbral +1.5%).`,
  }]
}

function makeBrentMarket(brent) {
  if (!brent) return []
  const thresh = round(brent * 1.01, 0.5)
  return [{
    title: `¿El Brent supera $${thresh.toFixed(2)} por barril hoy?`,
    description: `Umbral a +1% del precio actual ($${brent.toFixed(2)}).`,
    category: 'ENERGIA', market_type: 'DIARIO',
    close_date: todayOrTomorrow(17, 0).toISOString(),
    resolution_source: 'Yahoo Finance · finance.yahoo.com/quote/BZ=F',
    resolution_rules: `Este contrato se resolverá como SÍ si el precio del barril de petróleo Brent (ICE Brent, BZ=F) supera $${thresh.toFixed(2)} USD según Yahoo Finance. Se resolverá como NO si no supera ese nivel. Precio actual: $${brent.toFixed(2)} (umbral +1%).`,
  }]
}

function makeEurUsdMarket(eurusd) {
  if (!eurusd) return []
  const thresh = (Math.round(eurusd * 1.003 * 1000) / 1000).toFixed(3)
  return [{
    title: `¿El EUR/USD supera ${thresh} al cierre europeo hoy?`,
    description: `Umbral a +0.3% del tipo actual (${eurusd.toFixed(4)}).`,
    category: 'ECONOMIA', market_type: 'DIARIO',
    close_date: todayOrTomorrow(16, 0).toISOString(), // 17:00 CET
    resolution_source: 'Yahoo Finance · finance.yahoo.com/quote/EURUSD=X',
    resolution_rules: `Este contrato se resolverá como SÍ si el tipo de cambio EUR/USD supera ${thresh} según Yahoo Finance (EURUSD=X) al cierre del mercado europeo (17:00 CET). Se resolverá como NO si no supera ese nivel. Tipo actual: ${eurusd.toFixed(4)} (umbral +0.3%).`,
  }]
}

function makeGoldMarket(gold) {
  if (!gold) return []
  const thresh = round(gold * 1.005, 10)
  return [{
    title: `¿El oro supera $${thresh.toLocaleString('en-US')} por onza hoy?`,
    description: `Umbral a +0.5% del precio actual ($${Math.round(gold).toLocaleString('en-US')}/oz).`,
    category: 'ECONOMIA', market_type: 'DIARIO',
    close_date: todayOrTomorrow(18, 30).toISOString(), // COMEX cierre 19:30 CET
    resolution_source: 'Yahoo Finance · finance.yahoo.com/quote/GC=F',
    resolution_rules: `Este contrato se resolverá como SÍ si el precio del oro (COMEX, GC=F) supera $${thresh.toLocaleString('en-US')} USD por onza troy según Yahoo Finance. Se resolverá como NO si cierra por debajo. Precio actual: $${Math.round(gold).toLocaleString('en-US')} (umbral +0.5%).`,
  }]
}

function makeNasdaqMarket(nasdaq) {
  if (!nasdaq) return []
  const thresh = round(nasdaq * 1.005, 50)
  return [{
    title: `¿El Nasdaq 100 supera ${thresh.toLocaleString('en-US')} al cierre hoy?`,
    description: `Umbral a +0.5% del valor actual (${Math.round(nasdaq).toLocaleString('en-US')} pts).`,
    category: 'TECNOLOGIA', market_type: 'DIARIO',
    close_date: todayOrTomorrow(21, 0).toISOString(), // 22:00 CET (Wall St. cierre)
    resolution_source: 'Yahoo Finance · finance.yahoo.com/quote/^IXIC',
    resolution_rules: `Este contrato se resolverá como SÍ si el Nasdaq Composite (^IXIC) supera ${thresh.toLocaleString('en-US')} puntos al cierre de Wall Street (22:00 CET) según Yahoo Finance. Se resolverá como NO si cierra por debajo. Valor actual: ${Math.round(nasdaq).toLocaleString('en-US')} pts (umbral +0.5%).`,
  }]
}

function makeTempMarkets(temps) {
  const out = []
  const cityData = [
    { name: 'Madrid',    key: 'Madrid',    category: 'CLIMA' },
    { name: 'Barcelona', key: 'Barcelona', category: 'CLIMA' },
    { name: 'Sevilla',   key: 'Sevilla',   category: 'CLIMA' },
    { name: 'Valencia',  key: 'Valencia',  category: 'CLIMA' },
  ]
  for (const city of cityData) {
    const forecast = temps[city.key]
    if (forecast == null) continue
    const thresh = Math.ceil(forecast) + 2  // umbral = previsión + 2°C
    out.push({
      title: `¿La temperatura máxima en ${city.name} supera ${thresh}°C mañana?`,
      description: `Previsión Open-Meteo para mañana: ${forecast.toFixed(1)}°C. Umbral: ${thresh}°C (+2°C sobre la previsión).`,
      category: city.category, market_type: 'DIARIO',
      close_date: tomorrowAt(22, 59).toISOString(), // 23:59 CET
      resolution_source: 'Open-Meteo / AEMET · open-meteo.com',
      resolution_rules: `Este contrato se resolverá como SÍ si la temperatura máxima registrada en ${city.name} supera ${thresh}°C mañana según Open-Meteo (verificable en AEMET). Se resolverá como NO si la máxima es ${thresh}°C o inferior. Previsión actual: ${forecast.toFixed(1)}°C (umbral +2°C).`,
    })
  }
  return out
}

function makePvpcMarket(pvpc) {
  if (!pvpc || pvpc <= 0) return []
  // Umbral al +10% del precio medio de hoy para mañana
  const thresh = round(pvpc * 1.10, 5)
  return [{
    title: `¿El precio medio del PVPC supera ${thresh} €/MWh mañana?`,
    description: `Precio medio PVPC hoy: ${pvpc} €/MWh. Umbral mañana: ${thresh} €/MWh (+10%).`,
    category: 'ENERGIA', market_type: 'DIARIO',
    close_date: tomorrowAt(22, 0).toISOString(), // 23:00 CET
    resolution_source: 'OMIE / REE · omie.es · apidatos.ree.es',
    resolution_rules: `Este contrato se resolverá como SÍ si el precio medio del pool eléctrico diario (PVPC) supera ${thresh} €/MWh mañana según OMIE (omie.es) o REE (apidatos.ree.es). Se resolverá como NO si el precio medio es ${thresh} €/MWh o inferior. Precio medio hoy: ${pvpc} €/MWh (umbral +10%).`,
  }]
}

// ─── Deduplicación ────────────────────────────────────────────────────────────

function normalize(s) {
  return s.toLowerCase()
    .replace(/[¿?!¡]/g, '')
    .replace(/[^a-záéíóúüñ0-9]/gi, ' ')
    .replace(/\s+/g, ' ')
    .trim()
}

function isSimilarTitle(a, b) {
  const na = normalize(a)
  const nb = normalize(b)

  // If both have large numbers (>100) and they differ >2%, NOT a duplicate
  const nums = s => (s.match(/[\d]+/g) || []).map(Number).filter(n => n > 100)
  const na_nums = nums(na), nb_nums = nums(nb)
  if (na_nums.length > 0 && nb_nums.length > 0) {
    const allMatch = na_nums.every(na => nb_nums.some(nb => Math.abs(na - nb) / Math.max(na, nb) < 0.03))
    if (!allMatch) return false
  }

  // Word overlap ≥ 50% of shorter title
  const wordsA = na.split(' ').filter(w => w.length > 3)
  const wordsB = nb.split(' ').filter(w => w.length > 3)
  const shorter = Math.min(wordsA.length, wordsB.length)
  if (shorter === 0) return false
  const overlap = wordsA.filter(w => wordsB.includes(w)).length
  return overlap >= Math.max(3, Math.floor(shorter * 0.5))
}

// ─── Crear mercados en Supabase ────────────────────────────────────────────────

async function createMarkets(markets) {
  // Fetch existing active/closed titles for dedup
  const { data: existing } = await supabase
    .from('markets')
    .select('title, close_date')
    .in('status', ['ACTIVE', 'CLOSED'])

  const existingTitles = (existing || []).map(m => m.title)
  const created = []
  const skipped = []

  for (const m of markets) {
    // Skip if close_date is in the past
    if (new Date(m.close_date) <= new Date()) {
      skipped.push({ title: m.title, reason: 'close_date ya pasó' })
      continue
    }

    // Dedup
    const dup = existingTitles.find(et => isSimilarTitle(m.title, et))
    if (dup) {
      skipped.push({ title: m.title, reason: `Duplicado de: "${dup.slice(0, 60)}"` })
      continue
    }

    const { data, error } = await supabase
      .from('markets')
      .insert({
        title:            m.title,
        description:      m.description,
        category:         m.category,
        market_type:      m.market_type,
        status:           'ACTIVE',
        yes_pool:         5000,
        no_pool:          5000,
        liquidity_param:  5000,
        close_date:       m.close_date,
        resolution_source: m.resolution_source,
        resolution_rules: m.resolution_rules,
      })
      .select('id')
      .single()

    if (error) {
      skipped.push({ title: m.title, reason: error.message })
    } else {
      created.push({ id: data.id, title: m.title, category: m.category, market_type: m.market_type, close_date: m.close_date })
      existingTitles.push(m.title)
    }
  }

  return { created, skipped }
}

// ─── Handler principal ─────────────────────────────────────────────────────────

export default async function handler(req, res) {
  // Auth — acepta query key=ADMIN_API_KEY o Vercel cron header Authorization: Bearer CRON_SECRET
  const queryKey   = (req.query.key || req.headers['x-admin-key'] || '').trim()
  const cronHeader = (req.headers['authorization'] || '').replace('Bearer ', '').trim()
  const adminKey   = (process.env.ADMIN_API_KEY   || '').trim()
  const cronSecret = (process.env.CRON_SECRET     || '').trim()

  const validAdmin = adminKey && queryKey === adminKey
  const validCron  = cronSecret && cronHeader === cronSecret
  if (!validAdmin && !validCron) {
    return res.status(401).json({ error: 'No autorizado' })
  }

  const t0 = Date.now()

  // ── 1. Fetch all live data in parallel ──────────────────────────────────
  const [
    ibex,
    brent,
    eurusd,
    gold,
    nasdaq,
    crypto,
    temps,
    pvpc,
  ] = await Promise.allSettled([
    yahooPrice('^IBEX'),
    yahooPrice('BZ=F'),
    yahooPrice('EURUSD=X'),
    yahooPrice('GC=F'),
    yahooPrice('^IXIC'),
    cryptoPrices(),
    openMeteoTemps(),
    pvpcToday(),
  ]).then(results => results.map(r => r.status === 'fulfilled' ? r.value : null))

  const data = {
    ibex:       ibex,
    brent:      brent,
    eurusd:     eurusd,
    gold:       gold,
    nasdaq:     nasdaq,
    btc:        crypto?.btc ?? null,
    eth:        crypto?.eth ?? null,
    temps:      temps ?? {},
    pvpc:       pvpc,
    fetchedAt:  new Date().toISOString(),
  }

  // ── 2. Build candidate markets ──────────────────────────────────────────
  const candidates = [
    ...makeIbexMarkets(data.ibex),
    ...makeBtcMarket(data.btc),
    ...makeEthMarket(data.eth),
    ...makeBrentMarket(data.brent),
    ...makeEurUsdMarket(data.eurusd),
    ...makeGoldMarket(data.gold),
    ...makeNasdaqMarket(data.nasdaq),
    ...makeTempMarkets(data.temps),
    ...makePvpcMarket(data.pvpc),
  ]

  // ── 3. Dedup + create ────────────────────────────────────────────────────
  const { created, skipped } = await createMarkets(candidates)

  const elapsed = Date.now() - t0

  return res.status(200).json({
    ok:       true,
    created:  created.length,
    skipped:  skipped.length,
    markets:  created,
    skipped_detail: skipped,
    data,
    elapsed_ms: elapsed,
  })
}
