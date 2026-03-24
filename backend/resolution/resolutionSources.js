// ============================================================
// Resolution Sources — modular oracle implementations
// Each source: async fn(market) → { outcome, source, value, oracleUrl } | null
// ============================================================

// ─── PRICE_THRESHOLD: Yahoo Finance (indices, stocks, commodities) ────────

export async function resolveYahooFinance(symbol, threshold, direction = 'above') {
  try {
    const res = await fetch(
      `https://query1.finance.yahoo.com/v8/finance/chart/${encodeURIComponent(symbol)}?interval=1d&range=2d`,
      { headers: { 'User-Agent': 'Mozilla/5.0' }, signal: AbortSignal.timeout(8000) }
    )
    if (!res.ok) return null
    const data  = await res.json()
    const meta  = data?.chart?.result?.[0]?.meta
    const price = meta?.regularMarketPrice || meta?.previousClose
    if (!price) return null

    const outcome = direction === 'above' ? price > threshold : price < threshold

    return {
      outcome,
      source:    `Yahoo Finance — ${symbol}: ${price.toFixed(2)}. Umbral: ${threshold}. Resultado: ${outcome ? 'SÍ' : 'NO'}.`,
      value:     price,
      oracleUrl: `https://finance.yahoo.com/quote/${symbol}`,
    }
  } catch (err) {
    console.error(`[resolutionSources] Yahoo Finance ${symbol}:`, err.message)
    return null
  }
}

// ─── PRICE_THRESHOLD / PRICE_DIRECTION: CoinGecko ────────────────────────

export async function resolveCoinGecko(coinId, threshold = null) {
  try {
    const res = await fetch(
      `https://api.coingecko.com/api/v3/simple/price?ids=${coinId}&vs_currencies=usd`,
      { headers: { 'User-Agent': 'Mozilla/5.0', 'Accept': 'application/json' }, signal: AbortSignal.timeout(8000) }
    )
    if (!res.ok) return null
    const data  = await res.json()
    const price = data?.[coinId]?.usd
    if (!price) return null

    const outcome = threshold !== null ? price > threshold : null  // direction resolved by caller

    return {
      outcome,
      source:    `CoinGecko — ${coinId}: $${price.toLocaleString('en-US')}${threshold ? `. Umbral: $${threshold.toLocaleString('en-US')}` : ''}.`,
      value:     price,
      oracleUrl: `https://www.coingecko.com/en/coins/${coinId}`,
    }
  } catch (err) {
    console.error(`[resolutionSources] CoinGecko ${coinId}:`, err.message)
    return null
  }
}

// ─── PRICE_THRESHOLD: REE / OMIE (electricity price) ─────────────────────

export async function resolveREEPrice(threshold) {
  const today   = new Date().toISOString().split('T')[0]
  const headers = {
    'User-Agent': 'Mozilla/5.0 (compatible; Forsii/1.0)',
    'Accept':     'application/json',
  }

  try {
    const res = await fetch(
      `https://apidatos.ree.es/es/datos/mercados/precios-mercados-tiempo-real?start_date=${today}T00:00&end_date=${today}T23:59&time_trunc=hour&geo_trunc=electric_system&geo_limit=peninsular&geo_ids=8741`,
      { headers, signal: AbortSignal.timeout(8000) }
    )
    if (res.ok) {
      const data = await res.json()
      for (const dataset of (data?.included || [])) {
        const values = dataset?.attributes?.values
        if (values?.length >= 4) {
          const avg = values.reduce((s, v) => s + v.value, 0) / values.length
          if (avg > 0) {
            return {
              outcome:   avg > threshold,
              source:    `REE apidatos — Precio medio ${today}: ${avg.toFixed(2)} €/MWh. Umbral: ${threshold} €/MWh.`,
              value:     avg,
              oracleUrl: 'https://www.ree.es/es/datos/mercados',
            }
          }
        }
      }
    }
  } catch (e) { /* fallthrough */ }

  // Fallback: preciodelaluz.org
  try {
    const res = await fetch('https://api.preciodelaluz.org/v1/prices/avg?zone=PCB',
      { headers, signal: AbortSignal.timeout(5000) }
    )
    if (res.ok) {
      const data = await res.json()
      const avg  = data?.price
      if (avg !== undefined) {
        return {
          outcome:   avg > threshold,
          source:    `preciodelaluz.org — Precio medio: ${avg.toFixed(2)} €/MWh. Umbral: ${threshold} €/MWh.`,
          value:     avg,
          oracleUrl: 'https://www.preciodelaluz.org',
        }
      }
    }
  } catch (e) { /* ignore */ }

  return null
}

// ─── SPORTS_RESULT: football-data.org ────────────────────────────────────

export async function resolveFootball(teamId, teamName) {
  const apiKey = process.env.FOOTBALL_DATA_API_KEY
  if (!apiKey) return null

  try {
    const res = await fetch(
      `https://api.football-data.org/v4/teams/${teamId}/matches?status=FINISHED&limit=1`,
      { headers: { 'X-Auth-Token': apiKey }, signal: AbortSignal.timeout(8000) }
    )
    if (!res.ok) return null
    const data  = await res.json()
    const match = data?.matches?.[0]
    if (!match) return null

    const isHome   = match.homeTeam.id === teamId
    const teamScore = isHome ? match.score.fullTime.home : match.score.fullTime.away
    const oppScore  = isHome ? match.score.fullTime.away : match.score.fullTime.home
    const opponent  = isHome ? match.awayTeam.name : match.homeTeam.name
    const won       = teamScore > oppScore

    return {
      outcome:   won,
      source:    `football-data.org — ${teamName} ${teamScore}–${oppScore} ${opponent} (${match.competition.name}). ${won ? 'Victoria' : teamScore === oppScore ? 'Empate' : 'Derrota'}.`,
      value:     teamScore,
      oracleUrl: 'https://www.football-data.org',
    }
  } catch (err) {
    console.error(`[resolutionSources] football ${teamId}:`, err.message)
    return null
  }
}

// ─── DATA_RELEASE: INE (IPC) ──────────────────────────────────────────────

export async function resolveINEData(indicator, threshold) {
  // INE publishes data as HTML/JSON — attempt to fetch from API
  try {
    // INE open data API: IPC general Spain
    const res = await fetch(
      'https://servicios.ine.es/wstempus/js/ES/DATOS_SERIE/IPC251856?nult=1&det=0&tip=AM',
      { headers: { 'Accept': 'application/json' }, signal: AbortSignal.timeout(8000) }
    )
    if (!res.ok) return null
    const data  = await res.json()
    const serie = data?.Data?.[0]
    if (!serie?.Valor) return null
    const value   = parseFloat(serie.Valor)
    return {
      outcome:   value > threshold,
      source:    `INE — ${indicator}: ${value}%. Umbral: ${threshold}%.`,
      value,
      oracleUrl: 'https://www.ine.es/jaxiT3/Tabla.htm?t=50902',
    }
  } catch (err) {
    console.error(`[resolutionSources] INE ${indicator}:`, err.message)
    return null
  }
}

// ─── BOE_PUBLICATION: BOE RSS ─────────────────────────────────────────────

export async function resolveBOEPublication(keywords) {
  try {
    const res = await fetch('https://www.boe.es/rss/channel.php?c=1',
      { headers: { 'Accept': 'application/rss+xml' }, signal: AbortSignal.timeout(8000) }
    )
    if (!res.ok) return null
    const xml    = await res.text()
    const today  = new Date().toISOString().split('T')[0]
    const titles = [...xml.matchAll(/<title>(?:<!\[CDATA\[)?([^<\]]+)(?:\]\]>)?<\/title>/gi)]
      .map(m => m[1].trim().toLowerCase())

    // Check if any BOE item today mentions the keywords
    const hit = titles.some(title =>
      keywords.some(kw => title.includes(kw.toLowerCase()))
    )

    return {
      outcome:   hit,
      source:    `BOE — ${hit ? 'Se encontró publicación relacionada' : 'Sin publicación encontrada'} para: ${keywords.join(', ')}`,
      value:     hit ? 1 : 0,
      oracleUrl: 'https://www.boe.es',
    }
  } catch (err) {
    console.error('[resolutionSources] BOE:', err.message)
    return null
  }
}

// ─── Oracle credibility scores (0–1) ─────────────────────────────────────
// Used by the trust threshold check before a market is resolved.
// A market only resolves if its oracle credibility ≥ MIN_ORACLE_CREDIBILITY.

export const ORACLE_CREDIBILITY = {
  'Yahoo Finance':        0.95,
  'CoinGecko':            0.90,
  'REE apidatos':         1.00,
  'preciodelaluz.org':    0.85,
  'football-data.org':    0.90,
  'INE':                  1.00,
  'BOE':                  1.00,
  'ECB':                  1.00,
  'Banco de España':      1.00,
  'AEMET':                0.95,
  'default':              0.70,
}

export function getOracleCredibility(source) {
  if (!source) return ORACLE_CREDIBILITY.default
  for (const [key, score] of Object.entries(ORACLE_CREDIBILITY)) {
    if (key === 'default') continue
    if (source.toLowerCase().includes(key.toLowerCase())) return score
  }
  return ORACLE_CREDIBILITY.default
}

// ─── Source registry by oracle_type ──────────────────────────────────────

export const RESOLUTION_SOURCES = {
  PRICE_THRESHOLD: {
    label:       'Price Threshold',
    description: 'Resolves based on asset price crossing a threshold',
  },
  PRICE_DIRECTION: {
    label:       'Price Direction',
    description: 'Resolves based on asset price direction (up/down)',
  },
  SPORTS_RESULT: {
    label:       'Sports Result',
    description: 'Resolves based on official match result',
    source:      'football-data.org',
  },
  DATA_RELEASE: {
    label:       'Official Data Release',
    description: 'Resolves based on official government/central bank data',
    source:      'INE / BCE / REE',
  },
  RATE_CHANGE: {
    label:       'Interest Rate',
    description: 'Resolves based on central bank rate decisions',
    source:      'BCE / Banco de España',
  },
  BOE_PUBLICATION: {
    label:       'BOE Publication',
    description: 'Resolves based on Boletín Oficial del Estado',
    source:      'boe.es',
  },
  ELECTORAL_RESULT: {
    label:       'Electoral Result',
    description: 'Resolves based on official election results',
    source:      'resultados.elecciones.gob.es',
  },
}
