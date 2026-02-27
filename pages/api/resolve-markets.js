import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
)

async function checkIBEXVerde() {
  try {
    const res = await fetch(
      'https://query1.finance.yahoo.com/v8/finance/chart/%5EIBEX?interval=1d&range=5d',
      { headers: { 'User-Agent': 'Mozilla/5.0' } }
    )
    const data = await res.json()
    const result = data?.chart?.result?.[0]
    if (!result) return null
    const quotes = result.indicators?.quote?.[0]
    const timestamps = result.timestamp
    if (!quotes || !timestamps || timestamps.length === 0) return null
    const lastIdx = timestamps.length - 1
    const open = quotes.open?.[lastIdx]
    const close = quotes.close?.[lastIdx]
    if (!open || !close) {
      const metaOpen = result.meta?.previousClose
      const metaClose = result.meta?.regularMarketPrice
      if (!metaOpen || !metaClose) return null
      return {
        outcome: metaClose > metaOpen,
        source: `Yahoo Finance — IBEX 35: Apertura ${metaOpen.toFixed(2)}, Cierre ${metaClose.toFixed(2)}. Variacion: ${((metaClose - metaOpen) / metaOpen * 100).toFixed(2)}%`,
        value: metaClose,
        oracleUrl: 'https://finance.yahoo.com/quote/%5EIBEX/'
      }
    }
    return {
      outcome: close > open,
      source: `Yahoo Finance — IBEX 35: Apertura ${open.toFixed(2)}, Cierre ${close.toFixed(2)}. Variacion: ${((close - open) / open * 100).toFixed(2)}%`,
      value: close,
      oracleUrl: 'https://finance.yahoo.com/quote/%5EIBEX/'
    }
  } catch (err) {
    console.error('Error IBEX:', err)
    return null
  }
}

async function checkPrecioLuz(threshold = 100) {
  try {
    const res = await fetch('https://api.preciodelaluz.org/v1/prices/avg?zone=PCB')
    const data = await res.json()
    const avgPrice = data?.price
    if (avgPrice === undefined || avgPrice === null) throw new Error('No data')
    return {
      outcome: avgPrice > threshold,
      source: `preciodelaluz.org — Precio medio pool electrico: ${avgPrice.toFixed(2)} EUR/MWh. Umbral: ${threshold} EUR/MWh.`,
      value: avgPrice,
      oracleUrl: 'https://www.preciodelaluz.org'
    }
  } catch (err) {
    try {
      const today = new Date().toISOString().split('T')[0]
      const res = await fetch(`https://apidatos.ree.es/es/datos/mercados/precios-mercados-tiempo-real?start_date=${today}T00:00&end_date=${today}T23:59&time_trunc=day`)
      const data = await res.json()
      const values = data?.included?.[0]?.attributes?.values
      if (values && values.length > 0) {
        const avg = values.reduce((sum, v) => sum + v.value, 0) / values.length
        return { outcome: avg > threshold, source: `REE — Precio medio: ${avg.toFixed(2)} EUR/MWh.`, value: avg, oracleUrl: 'https://www.ree.es/es/datos/mercados' }
      }
    } catch (e) {}
    return null
  }
}

async function checkTemperatura(threshold = 30) {
  try {
    const ciudades = [
      { name: 'Sevilla', lat: 37.39, lon: -5.98 },
      { name: 'Cordoba', lat: 37.88, lon: -4.77 },
      { name: 'Madrid', lat: 40.42, lon: -3.70 },
      { name: 'Murcia', lat: 37.98, lon: -1.13 },
      { name: 'Zaragoza', lat: 41.65, lon: -0.88 },
      { name: 'Valencia', lat: 39.47, lon: -0.38 },
      { name: 'Badajoz', lat: 38.88, lon: -6.97 },
    ]
    let maxTemp = -Infinity, maxCiudad = ''
    for (const c of ciudades) {
      const res = await fetch(`https://api.open-meteo.com/v1/forecast?latitude=${c.lat}&longitude=${c.lon}&daily=temperature_2m_max&timezone=Europe/Madrid&past_days=1&forecast_days=1`)
      const data = await res.json()
      const temp = data?.daily?.temperature_2m_max?.[0]
      if (temp !== undefined && temp > maxTemp) { maxTemp = temp; maxCiudad = c.name }
    }
    if (maxTemp === -Infinity) return null
    return {
      outcome: maxTemp > threshold,
      source: `Open-Meteo (AEMET) — Maxima: ${maxTemp.toFixed(1)}C en ${maxCiudad}. Umbral: ${threshold}C.`,
      value: maxTemp,
      oracleUrl: 'https://open-meteo.com'
    }
  } catch (err) { return null }
}

async function checkTrendingSpain(keyword) {
  try {
    const res = await fetch(
      `https://news.google.com/rss/search?q=${encodeURIComponent(keyword)}+trending+Espa%C3%B1a&hl=es&gl=ES&ceid=ES:es`,
      { headers: { 'User-Agent': 'Mozilla/5.0' } }
    )
    const text = await res.text()
    const mentionCount = (text.match(new RegExp(keyword, 'gi')) || []).length
    const isTrending = mentionCount >= 5
    return {
      outcome: isTrending,
      source: `Google News RSS — "${keyword}" mencionado ${mentionCount} veces en noticias ES. Umbral: 5.`,
      value: mentionCount,
      oracleUrl: `https://news.google.com/search?q=${encodeURIComponent(keyword)}%20Espa%C3%B1a&hl=es`
    }
  } catch (err) { return null }
}

async function checkFootballResult(teamName) {
  try {
    const teamMap = { 'real madrid': 86, 'barcelona': 81 }
    const teamId = teamMap[teamName.toLowerCase()]
    if (!teamId) return null
    const apiKey = process.env.FOOTBALL_DATA_API_KEY
    if (!apiKey) return null
    const res = await fetch(
      `https://api.football-data.org/v4/teams/${teamId}/matches?status=FINISHED&limit=1`,
      { headers: { 'X-Auth-Token': apiKey } }
    )
    if (!res.ok) return null
    const data = await res.json()
    const match = data?.matches?.[0]
    if (!match) return null
    const isHome = match.homeTeam.id === teamId
    const teamScore = isHome ? match.score.fullTime.home : match.score.fullTime.away
    const oppScore = isHome ? match.score.fullTime.away : match.score.fullTime.home
    const opponent = isHome ? match.awayTeam.name : match.homeTeam.name
    const won = teamScore > oppScore
    return {
      outcome: won,
      source: `football-data.org — ${teamName} ${teamScore}-${oppScore} ${opponent} (${match.competition.name}). ${won ? 'Victoria.' : teamScore === oppScore ? 'Empate.' : 'Derrota.'}`,
      value: teamScore,
      oracleUrl: 'https://www.football-data.org'
    }
  } catch (err) { return null }
}

async function checkMinistroControversia() {
  try {
    const res = await fetch(
      `https://news.google.com/rss/search?q=ministro+pol%C3%A9mica+Espa%C3%B1a&hl=es&gl=ES&ceid=ES:es`,
      { headers: { 'User-Agent': 'Mozilla/5.0' } }
    )
    const text = await res.text()
    const items = (text.match(/<item>/g) || []).length
    const isControversy = items >= 3
    return {
      outcome: isControversy,
      source: `Google News RSS — ${items} noticias sobre polemicas ministeriales. Umbral: 3.`,
      value: items,
      oracleUrl: 'https://news.google.com/search?q=ministro%20pol%C3%A9mica%20Espa%C3%B1a&hl=es'
    }
  } catch (err) { return null }
}

function getOracleForMarket(market) {
  const t = market.title.toLowerCase()
  if (t.includes('ibex') && (t.includes('verde') || t.includes('cierra'))) return { fn: checkIBEXVerde, type: 'IBEX' }
  if (t.includes('luz') || t.includes('mwh')) { const m = t.match(/>(\d+)/); return { fn: () => checkPrecioLuz(m ? parseInt(m[1]) : 100), type: 'LUZ' } }
  if (t.includes('grados') || t.includes('temperatura') || t.includes('30°') || t.includes('30 c')) { const m = t.match(/>?(\d+)/); return { fn: () => checkTemperatura(m ? parseInt(m[1]) : 30), type: 'TEMP' } }
  if (t.includes('trending') || t.includes('topic')) { const kw = t.includes('nchez') ? 'Sánchez' : 'España'; return { fn: () => checkTrendingSpain(kw), type: 'TRENDING' } }
  if (t.includes('real madrid') && t.includes('gana')) return { fn: () => checkFootballResult('Real Madrid'), type: 'FUTBOL' }
  if ((t.includes('barça') || t.includes('barcelona')) && t.includes('gana')) return { fn: () => checkFootballResult('Barcelona'), type: 'FUTBOL' }
  if (t.includes('ministro') && (t.includes('polémica') || t.includes('polemica'))) return { fn: checkMinistroControversia, type: 'NOTICIAS' }
  if (t.includes('vivienda') || t.includes('idealista')) return { fn: async () => null, type: 'VIVIENDA_PENDIENTE' }
  return null
}

async function createRecurringMarkets() {
  const now = new Date()
  const day = now.getUTCDay()
  if (day === 0 || day === 6) return [{ action: 'SKIP', reason: 'Fin de semana' }]
  const results = []
  const todayStart = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate())).toISOString()
  const todayEnd = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate() + 1)).toISOString()

  const { data: existingIbex } = await supabase.from('markets').select('id').ilike('title', '%IBEX%verde%').gte('open_date', todayStart).lt('open_date', todayEnd)
  if (!existingIbex || existingIbex.length === 0) {
    const hoursUntilClose = Math.max(1, Math.ceil((new Date(todayStart).getTime() + 16 * 3600000 - now.getTime()) / 3600000))
    if (hoursUntilClose > 1) {
      const { data, error } = await supabase.rpc('create_market', {
        p_title: '¿El IBEX 35 cierra en verde hoy?',
        p_description: 'El IBEX 35 cierra con variacion positiva. Resolucion: Yahoo Finance tras cierre BME 17:35. Fuente: finance.yahoo.com/quote/%5EIBEX/',
        p_category: 'ECONOMIA', p_market_type: 'DIARIO', p_duration_hours: hoursUntilClose, p_initial_pool: 5000
      })
      results.push(error ? { action: 'ERROR', market: 'IBEX', error: error.message } : { action: 'CREATED', market: 'IBEX diario' })
    }
  } else { results.push({ action: 'EXISTS', market: 'IBEX' }) }

  return results
}

export default async function handler(req, res) {
  try {
    const { data: pendingMarkets, error } = await supabase
      .from('markets').select('*').in('status', ['CLOSED', 'ACTIVE']).lt('close_date', new Date().toISOString())
    if (error) return res.status(500).json({ error: error.message })

    const results = []
    for (const market of (pendingMarkets || [])) {
      if (market.resolved_outcome !== null) continue
      const oracle = getOracleForMarket(market)
      if (!oracle) { results.push({ id: market.id, title: market.title, status: 'NO_ORACLE' }); continue }
      const oracleResult = await oracle.fn()
      if (!oracleResult) { results.push({ id: market.id, title: market.title, status: 'ORACLE_UNAVAILABLE', type: oracle.type }); continue }
      const { error: rErr } = await supabase.rpc('resolve_market_manual', { p_market_id: market.id, p_outcome: oracleResult.outcome, p_source: oracleResult.source })
      results.push(rErr
        ? { id: market.id, title: market.title, status: 'ERROR', error: rErr.message }
        : { id: market.id, title: market.title, status: 'RESOLVED', outcome: oracleResult.outcome, source: oracleResult.source })
    }

    const recurring = await createRecurringMarkets()
    return res.status(200).json({
      timestamp: new Date().toISOString(),
      resolved: results.filter(r => r.status === 'RESOLVED').length,
      pending: results.filter(r => r.status !== 'RESOLVED').length,
      details: results,
      recurring
    })
  } catch (err) {
    return res.status(500).json({ error: err.message })
  }
}