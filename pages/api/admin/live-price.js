// GET /api/admin/live-price?market_id=X&key=Y
//
// Returns the live underlying price, extracted threshold, deviation,
// slider params (min/max/step), and source metadata.
// Used by the admin calibration panel.

import { createClient } from '@supabase/supabase-js'

function getSupabase() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY
  )
}

const UA = { 'User-Agent': 'Mozilla/5.0', 'Accept': 'application/json' }

// ─── Source metadata ────────────────────────────────────────────────────────

const ASSET_META = {
  IBEX:  { sourceName: 'Yahoo Finance',  sourceUrl: 'https://finance.yahoo.com/quote/%5EIBEX',     priceUrl: 'https://finance.yahoo.com/quote/%5EIBEX' },
  BTC:   { sourceName: 'CoinGecko',      sourceUrl: 'https://www.coingecko.com/en/coins/bitcoin',   priceUrl: 'https://www.coingecko.com/en/coins/bitcoin' },
  LUZ:   { sourceName: 'REE apidatos',   sourceUrl: 'https://apidatos.ree.es/es/datos/mercados/precios-mercados-tiempo-real', priceUrl: 'https://www.ree.es/es/apidatos' },
  BRENT: { sourceName: 'Yahoo Finance',  sourceUrl: 'https://finance.yahoo.com/quote/BZ%3DF',      priceUrl: 'https://finance.yahoo.com/quote/BZ%3DF' },
}

// ─── Slider step sizes per asset ────────────────────────────────────────────

const SLIDER_STEP = { IBEX: 50, BTC: 500, LUZ: 5, BRENT: 1 }

function getSliderParams(assetType, currentPrice) {
  const step   = SLIDER_STEP[assetType] ?? 1
  const rawMin = currentPrice * 0.90
  const rawMax = currentPrice * 1.10
  return {
    step,
    sliderMin: Math.floor(rawMin / step) * step,
    sliderMax: Math.ceil(rawMax  / step) * step,
  }
}

// ─── Price fetchers ──────────────────────────────────────────────────────────

async function fetchIBEX() {
  const r = await fetch('https://query1.finance.yahoo.com/v8/finance/chart/%5EIBEX?interval=1d&range=1d', { headers: UA })
  const d = await r.json()
  return d?.chart?.result?.[0]?.meta?.regularMarketPrice ?? null
}

async function fetchBTC() {
  const r = await fetch('https://api.coingecko.com/api/v3/simple/price?ids=bitcoin&vs_currencies=usd', { headers: UA })
  const d = await r.json()
  return d?.bitcoin?.usd ?? null
}

async function fetchBRENT() {
  const r = await fetch('https://query1.finance.yahoo.com/v8/finance/chart/BZ%3DF?interval=1d&range=1d', { headers: UA })
  const d = await r.json()
  return d?.chart?.result?.[0]?.meta?.regularMarketPrice ?? null
}

async function fetchLUZ() {
  // Primary: REE apidatos real-time prices
  try {
    const now   = new Date()
    const pad   = n => String(n).padStart(2, '0')
    const date  = `${now.getUTCFullYear()}-${pad(now.getUTCMonth() + 1)}-${pad(now.getUTCDate())}`
    const start = `${date}T00:00`
    const end   = `${date}T23:59`
    const url   = `https://apidatos.ree.es/es/datos/mercados/precios-mercados-tiempo-real?start_date=${start}&end_date=${end}&time_trunc=hour&geo_limit=peninsular`
    const r = await fetch(url, { headers: { ...UA, 'Accept': 'application/json' } })
    if (r.ok) {
      const d = await r.json()
      const series = d?.included?.[0]?.attributes?.values
      if (Array.isArray(series) && series.length > 0) {
        // Take the most recent non-null value
        const vals = series.filter(v => v.value != null).map(v => v.value)
        if (vals.length > 0) return vals[vals.length - 1]
      }
    }
  } catch (_) {}

  // Fallback: OMIE marginalpdbc file (tab/semicolon-delimited)
  try {
    const r = await fetch(
      'https://www.omie.es/sites/default/files/dados/NUEVA_PROGRAMACION/MARGINALPDBC/marginalpdbc.1',
      { headers: UA }
    )
    if (r.ok) {
      const text = await r.text()
      const lines = text.split('\n').map(l => l.trim()).filter(Boolean)
      // Skip header lines until we hit numeric rows
      const prices = []
      for (const line of lines) {
        const parts = line.split(';')
        // Hour row has numeric first column (1–24) and price in col index 2 or 3
        if (/^\d+$/.test(parts[0]) && parts.length >= 3) {
          const price = parseFloat(parts[2]?.replace(',', '.'))
          if (!isNaN(price) && price > 0) prices.push(price)
        }
      }
      if (prices.length > 0) return prices[prices.length - 1]
    }
  } catch (_) {}

  return null
}

async function fetchLivePrice(assetType) {
  try {
    if (assetType === 'IBEX')  return await fetchIBEX()
    if (assetType === 'BTC')   return await fetchBTC()
    if (assetType === 'LUZ')   return await fetchLUZ()
    if (assetType === 'BRENT') return await fetchBRENT()
  } catch (_) {}
  return null
}

// ─── Detection & extraction ─────────────────────────────────────────────────

function detectAsset(title) {
  const t = title.toLowerCase()
  if (t.includes('ibex'))                                               return { type: 'IBEX',  unit: 'puntos' }
  if (t.includes('bitcoin') || t.includes('btc'))                      return { type: 'BTC',   unit: 'USD' }
  if (t.includes('luz') || t.includes('mwh') || t.includes('pvpc') || t.includes('electrici') || t.includes('eléctric'))
                                                                        return { type: 'LUZ',   unit: '€/MWh' }
  if (t.includes('brent'))                                             return { type: 'BRENT', unit: 'USD/barril' }
  return null
}

function extractThreshold(title) {
  const m1 = title.match(/(?:encima\s+de|superar[áa]?\s+(?:los?\s+)?|supera\s+(?:los?\s+)?)([\d.,]+)/i)
  if (m1) return parseFloat(m1[1].replace(/\./g, '').replace(',', '.'))
  const m2 = title.match(/\$\s*([\d.,]+)/) || title.match(/([\d.,]+)\s*€/)
  if (m2) return parseFloat(m2[1].replace(/\./g, '').replace(',', '.'))
  return null
}

function formatSpanish(n, decimals = 0) {
  return n.toLocaleString('es-ES', { minimumFractionDigits: decimals, maximumFractionDigits: decimals })
}

// ─── Handler ────────────────────────────────────────────────────────────────

export default async function handler(req, res) {
  if (req.method !== 'GET') return res.status(405).json({ error: 'Method not allowed' })

  const key      = (req.query.key || req.headers['x-admin-key'] || '').trim()
  const expected = (process.env.ADMIN_API_KEY || '').trim()
  if (!expected || key !== expected) return res.status(401).json({ error: 'No autorizado' })

  const { market_id } = req.query
  if (!market_id) return res.status(400).json({ error: 'market_id requerido' })

  const supabase = getSupabase()
  const { data: market } = await supabase
    .from('markets')
    .select('id, title, description')
    .eq('id', market_id)
    .single()

  if (!market) return res.status(404).json({ error: 'Mercado no encontrado' })

  const asset = detectAsset(market.title)
  if (!asset) {
    return res.status(200).json({ asset: null, currentPrice: null, threshold: null, deviation: null })
  }

  const [currentPrice, threshold] = await Promise.all([
    fetchLivePrice(asset.type),
    Promise.resolve(extractThreshold(market.title)),
  ])

  const deviation = (currentPrice && threshold)
    ? ((threshold - currentPrice) / currentPrice * 100).toFixed(1)
    : null

  const slider = currentPrice ? getSliderParams(asset.type, currentPrice) : null
  const meta   = ASSET_META[asset.type] ?? {}

  return res.status(200).json({
    market_id:            market.id,
    title:                market.title,
    asset:                asset.type,
    unit:                 asset.unit,
    sourceName:           meta.sourceName  ?? null,
    sourceUrl:            meta.sourceUrl   ?? null,
    priceUrl:             meta.priceUrl    ?? null,
    currentPrice,
    currentPriceFormatted: currentPrice ? formatSpanish(currentPrice, asset.type === 'LUZ' ? 2 : 0) : null,
    threshold,
    thresholdFormatted:   threshold ? formatSpanish(threshold, 0) : null,
    deviation,
    sliderMin:  slider?.sliderMin  ?? null,
    sliderMax:  slider?.sliderMax  ?? null,
    sliderStep: slider?.step       ?? null,
  })
}
