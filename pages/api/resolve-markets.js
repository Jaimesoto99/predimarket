import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
)

async function checkIBEXVerde() {
  try {
    const res = await fetch(
      'https://query1.finance.yahoo.com/v8/finance/chart/%5EIBEX?interval=1d&range=1d',
      { headers: { 'User-Agent': 'Mozilla/5.0' } }
    )
    const data = await res.json()
    const result = data?.chart?.result?.[0]
    if (!result) return null
    const open = result.meta?.previousClose || result.meta?.chartPreviousClose
    const close = result.meta?.regularMarketPrice
    if (!open || !close) return null
    return {
      outcome: close > open,
      source: `Yahoo Finance IBEX 35: Apertura ${open.toFixed(2)}, Cierre ${close.toFixed(2)}`,
      value: close
    }
  } catch (err) {
    console.error('Error IBEX oracle:', err)
    return null
  }
}

async function checkPrecioLuz(threshold = 100) {
  try {
    const res = await fetch('https://api.preciodelaluz.org/v1/prices/avg?zone=PCB')
    const data = await res.json()
    const avgPrice = data?.price
    if (avgPrice === undefined || avgPrice === null) return null
    return {
      outcome: avgPrice > threshold,
      source: `preciodelaluz.org Precio medio: ${avgPrice.toFixed(2)} EUR/MWh (umbral: ${threshold})`,
      value: avgPrice
    }
  } catch (err) {
    console.error('Error precio luz oracle:', err)
    try {
      const today = new Date().toISOString().split('T')[0]
      const res = await fetch(
        `https://apidatos.ree.es/es/datos/mercados/precios-mercados-tiempo-real?start_date=${today}T00:00&end_date=${today}T23:59&time_trunc=day`
      )
      const data = await res.json()
      const values = data?.included?.[0]?.attributes?.values
      if (values && values.length > 0) {
        const avg = values.reduce((sum, v) => sum + v.value, 0) / values.length
        return {
          outcome: avg > threshold,
          source: `REE Precio medio: ${avg.toFixed(2)} EUR/MWh`,
          value: avg
        }
      }
    } catch (err2) {
      console.error('Error REE fallback:', err2)
    }
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
    ]
    let maxTemp = -Infinity
    let maxCiudad = ''
    for (const c of ciudades) {
      const res = await fetch(
        `https://api.open-meteo.com/v1/forecast?latitude=${c.lat}&longitude=${c.lon}&daily=temperature_2m_max&timezone=Europe/Madrid&forecast_days=1`
      )
      const data = await res.json()
      const temp = data?.daily?.temperature_2m_max?.[0]
      if (temp !== undefined && temp > maxTemp) {
        maxTemp = temp
        maxCiudad = c.name
      }
    }
    if (maxTemp === -Infinity) return null
    return {
      outcome: maxTemp > threshold,
      source: `Open-Meteo Maxima: ${maxTemp.toFixed(1)}C en ${maxCiudad} (umbral: ${threshold}C)`,
      value: maxTemp
    }
  } catch (err) {
    console.error('Error temperatura oracle:', err)
    return null
  }
}

function getOracleForMarket(market) {
  const title = market.title.toLowerCase()
  if (title.includes('ibex') && (title.includes('verde') || title.includes('positivo') || title.includes('cierra'))) {
    return { fn: checkIBEXVerde, type: 'IBEX' }
  }
  if (title.includes('luz') || title.includes('mwh') || title.includes('electricidad')) {
    const match = title.match(/>(\d+)/)
    const threshold = match ? parseInt(match[1]) : 100
    return { fn: () => checkPrecioLuz(threshold), type: 'ELECTRICIDAD' }
  }
  if (title.includes('c ') || title.includes('grados') || title.includes('temperatura')) {
    const match = title.match(/>?(\d+)/)
    const threshold = match ? parseInt(match[1]) : 30
    return { fn: () => checkTemperatura(threshold), type: 'TEMPERATURA' }
  }
  return null
}

export default async function handler(req, res) {
  console.log('Iniciando resolucion automatica...')

  try {
    const { data: expiredMarkets, error: fetchError } = await supabase
      .from('markets')
      .select('*')
      .eq('status', 'ACTIVE')
      .lt('close_date', new Date().toISOString())

    if (fetchError) {
      console.error('Error buscando mercados:', fetchError)
      return res.status(500).json({ error: fetchError.message })
    }

    if (!expiredMarkets || expiredMarkets.length === 0) {
      return res.status(200).json({ message: 'No hay mercados pendientes', resolved: 0 })
    }

    const results = []

    for (const market of expiredMarkets) {
      const oracle = getOracleForMarket(market)

      if (!oracle) {
        results.push({ id: market.id, title: market.title, status: 'MANUAL_REQUIRED' })
        continue
      }

      const oracleResult = await oracle.fn()

      if (!oracleResult) {
        results.push({ id: market.id, title: market.title, status: 'ORACLE_FAILED' })
        continue
      }

      const { data: resolveData, error: resolveError } = await supabase
        .rpc('resolve_market_manual', {
          p_market_id: market.id,
          p_outcome: oracleResult.outcome,
          p_source: oracleResult.source
        })

      if (resolveError) {
        results.push({ id: market.id, title: market.title, status: 'ERROR', error: resolveError.message })
      } else {
        results.push({
          id: market.id,
          title: market.title,
          status: 'RESOLVED',
          outcome: oracleResult.outcome,
          source: oracleResult.source
        })
      }
    }

    const resolved = results.filter(r => r.status === 'RESOLVED').length
    return res.status(200).json({ resolved, total: expiredMarkets.length, details: results })

  } catch (err) {
    console.error('Error general:', err)
    return res.status(500).json({ error: err.message })
  }
}