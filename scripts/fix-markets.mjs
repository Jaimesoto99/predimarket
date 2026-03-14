/**
 * fix-markets.mjs — Fix close_dates, market_types, resolution_rules; create 10 short-term markets
 * node scripts/fix-markets.mjs
 */

const URL  = 'https://mrdkhfbwesehffbystto.supabase.co'
const KEY  = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im1yZGtoZmJ3ZXNlaGZmYnlzdHRvIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3MDY2OTk1MywiZXhwIjoyMDg2MjQ1OTUzfQ.yPlUU55lXEx1EVfXdF58sNjlblsKsXL4iz2eawnewxg'
const H    = { 'Authorization': `Bearer ${KEY}`, 'apikey': KEY, 'Content-Type': 'application/json', 'Prefer': 'return=representation' }

// ── Date helpers ───────────────────────────────────────────────────────────────
// Today = 2026-03-14 (Saturday), Spain = UTC+1 (CET, not yet CEST)
const NOW = new Date()

function toISO(d) { return d.toISOString() }

// Tomorrow 00:00 CET = 2026-03-14T23:00Z
function tomorrow00() {
  const d = new Date(NOW)
  d.setDate(d.getDate() + 1)
  d.setHours(0, 0, 0, 0)
  // Adjust for CET (UTC+1): local midnight = UTC 23:00 prev day
  // We'll use the raw local Date and Supabase stores UTC
  // Just use ISO string as-is (script runs in local tz or UTC — use explicit UTC offsets)
  return `2026-03-15T00:00:00+01:00`
}

// Next Sunday 23:59 CET (today is Saturday 2026-03-14, next Sunday = 2026-03-15)
function nextSunday2359() { return `2026-03-15T23:59:00+01:00` }

// End of current month 23:59 CET
function endOfMonth2359() { return `2026-03-31T23:59:00+01:00` }

// Today 23:59 CET
function today2359() { return `2026-03-14T23:59:00+01:00` }

// Tomorrow 23:59
function tomorrow2359() { return `2026-03-15T23:59:00+01:00` }

// Monday 18:00 (next trading day for financial markets)
function monday1800() { return `2026-03-16T18:00:00+01:00` }
function monday1900() { return `2026-03-16T19:00:00+01:00` }

// Format date for resolution_rules
function fmtDate(iso) {
  return new Date(iso).toLocaleDateString('es-ES', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric', hour: '2-digit', minute: '2-digit' })
}

// ── Patch a market ─────────────────────────────────────────────────────────────
async function patch(id, body) {
  // Remove unknown columns
  const safe = Object.fromEntries(Object.entries(body).filter(([k]) => k !== 'updated_at'))
  const r = await fetch(`${URL}/rest/v1/markets?id=eq.${id}`, { method: 'PATCH', headers: { ...H, 'Prefer': 'return=minimal' }, body: JSON.stringify(safe) })
  if (!r.ok) {
    const data = await r.json().catch(() => ({}))
    console.log(`  ✗ ${id}: ${JSON.stringify(data).slice(0,200)}`)
    return false
  }
  return true
}

// ── Create a market via RPC ────────────────────────────────────────────────────
async function createMarket({ title, description, category, market_type, close_date, resolution_source, resolution_rules, yes_pool, no_pool }) {
  // Insert directly via REST since RPC create_market might not accept all fields
  const body = {
    title, description, category, market_type,
    close_date,
    resolution_source: resolution_source || '',
    resolution_rules:  resolution_rules || '',
    status: 'ACTIVE',
    yes_pool:       yes_pool || 5000,
    no_pool:        no_pool  || 5000,
    liquidity_param: 100,
    total_volume:   0,
    total_traders:  0,
    reference_price: 0.5,
    created_at: new Date().toISOString(),
  }
  const r = await fetch(`${URL}/rest/v1/markets`, { method: 'POST', headers: { ...H, 'Prefer': 'return=representation' }, body: JSON.stringify(body) })
  const data = await r.json()
  if (!r.ok) { console.log(`  ✗ CREATE ${title.slice(0,50)}: ${JSON.stringify(data).slice(0,200)}`); return null }
  const m = Array.isArray(data) ? data[0] : data
  console.log(`  ✓ Created [${m?.id}]: ${title.slice(0,60)}`)
  return m
}

// ── 1. Fix close_dates and market_types ───────────────────────────────────────
async function fixDatesAndTypes() {
  console.log('\n═══ STEP 1: Fix close_dates & market_types ══════════════════════')

  const r = await fetch(`${URL}/rest/v1/markets?select=id,title,status,market_type,close_date&status=eq.ACTIVE`, { headers: H })
  const markets = await r.json()

  const fixes = [
    // Market 224: DIARIO but about "abril 2026" → MENSUAL, close end of April
    { id: 224, market_type: 'MENSUAL', close_date: '2026-04-30T23:59:00+02:00', reason: 'Título dice "abril 2026" → MENSUAL' },
    // Market 227: SEMANAL but close_date is July → MENSUAL
    { id: 227, market_type: 'MENSUAL', close_date: '2026-07-05T23:59:00+02:00', reason: 'LaLiga dura hasta julio → MENSUAL' },
    // SEMANAL markets: fix close_date to next Sunday 23:59
    { id: 239, market_type: 'SEMANAL', close_date: nextSunday2359(), reason: 'SEMANAL → próximo domingo' },
    { id: 240, market_type: 'SEMANAL', close_date: nextSunday2359(), reason: 'SEMANAL → próximo domingo' },
    // MENSUAL markets with correct type: ensure close_date = end of relevant month
    { id: 216, market_type: 'MENSUAL', close_date: endOfMonth2359(), reason: 'MENSUAL → fin de mes' },
    { id: 217, market_type: 'MENSUAL', close_date: endOfMonth2359(), reason: 'MENSUAL → fin de mes' },
    { id: 218, market_type: 'MENSUAL', close_date: endOfMonth2359(), reason: 'MENSUAL → fin de mes' },
    { id: 238, market_type: 'MENSUAL', close_date: endOfMonth2359(), reason: 'MENSUAL → fin de mes' },
  ]

  for (const f of fixes) {
    const m = markets.find(x => x.id === f.id)
    if (!m) { console.log(`  SKIP ${f.id}: not found`); continue }
    const ok = await patch(f.id, { market_type: f.market_type, close_date: f.close_date })
    console.log(`  ${ok ? '✓' : '✗'} [${f.id}] ${f.reason}: ${m.title.slice(0,50)}`)
  }
}

// ── 2. Fill resolution_rules ──────────────────────────────────────────────────
async function fillResolutionRules() {
  console.log('\n═══ STEP 2: Fill resolution_rules ═══════════════════════════════')

  const r = await fetch(`${URL}/rest/v1/markets?select=id,title,status,close_date,resolution_source,market_type&status=eq.ACTIVE&limit=100`, { headers: H })
  const markets = await r.json()

  const rules = {
    216: { src: 'Banco de España / euribor-rates.eu', url: 'https://www.euribor-rates.eu/es/tipos-de-interes-euribor-actuales/2/tipo-de-interes-euribor-a-12-meses.aspx', cond: 'el Euríbor a 12 meses cierre por debajo del 2,40% en la publicación oficial del Banco de España correspondiente a marzo 2026' },
    217: { src: 'INE (Instituto Nacional de Estadística)', url: 'https://www.ine.es/daco/daco42/daco4218/ipc0325.pdf', cond: 'el IPC interanual publicado por el INE para marzo 2026 supera el 3,0%' },
    218: { src: 'Idealista Sala de Prensa', url: 'https://www.idealista.com/sala-de-prensa/', cond: 'el informe de precios de Idealista publicado para febrero/marzo 2026 refleja una subida del precio medio de la vivienda en España respecto al mes anterior' },
    222: { src: 'Yahoo Finance / BME', url: 'https://finance.yahoo.com/quote/%5EIBEX/', cond: 'el índice IBEX 35 supera los 13.000 puntos en algún cierre oficial durante 2026' },
    223: { src: 'Yahoo Finance (ICE Brent)', url: 'https://finance.yahoo.com/quote/BZ%3DF/', cond: 'el precio del barril de petróleo Brent (futuro ICE) supera los 120 USD en algún momento durante 2026' },
    224: { src: 'Ministerio para la Transición Ecológica / geoportalgasolineras.es', url: 'https://geoportalgasolineras.es/', cond: 'el precio medio de la gasolina 95 en España publica un valor superior al de marzo 2026 en el informe mensual del Ministerio para abril 2026' },
    225: { src: 'BOE / Moncloa.gob.es', url: 'https://www.moncloa.gob.es/', cond: 'el presidente del Gobierno Pedro Sánchez anuncia públicamente la convocatoria de elecciones generales antes del 31 de diciembre de 2026' },
    226: { src: 'BOE / Moncloa.gob.es', url: 'https://www.moncloa.gob.es/', cond: 'se produce un cambio de gobierno en España (nuevo presidente del Gobierno o gobierno de distinto partido) antes del 31 de diciembre de 2026' },
    227: { src: 'LaLiga / Marca.com', url: 'https://www.laliga.com/laliga-ea-sports/clasificacion', cond: 'el Real Madrid FC termina en primera posición en la clasificación final de LaLiga EA Sports 2025-2026' },
    228: { src: 'UEFA / Marca.com', url: 'https://www.uefa.com/uefachampionsleague/', cond: 'el FC Barcelona gana la final de la UEFA Champions League antes del 31 de diciembre de 2026' },
    229: { src: 'Yahoo Finance / BME', url: 'https://finance.yahoo.com/quote/%5EIBEX/', cond: 'el índice IBEX 35 supera los 13.000 puntos en algún cierre oficial durante 2026' },
    230: { src: 'INE / SEPE', url: 'https://www.ine.es/dyngs/INEbase/es/operacion.htm?c=Estadistica_C&cid=1254736176918&menu=resultados&idp=1254735976595', cond: 'la tasa de paro publicada por el INE en la EPA supera el 13,0% en algún trimestre de 2026' },
    231: { src: 'Medios de comunicación nacionales (El País, El Mundo, Expansión)', url: 'https://www.elpais.com', cond: 'se convoca oficialmente una huelga general en España con paro en múltiples sectores antes del 31 de diciembre de 2026' },
    232: { src: 'BOE / Ministerio de Trabajo', url: 'https://www.boe.es/', cond: 'el Gobierno de España aprueba una subida del Salario Mínimo Interprofesional (SMI) para 2026 publicada en el BOE' },
    233: { src: 'BOE / Ministerio de Vivienda', url: 'https://www.boe.es/', cond: 'se aprueba y publica en el BOE alguna norma nueva que restrinja o limite el alquiler turístico en España (de ámbito estatal o autonómico relevante) antes del 31 de diciembre de 2026' },
    234: { src: 'CoinGecko / Coinbase', url: 'https://www.coingecko.com/es/monedas/bitcoin', cond: 'el precio de Bitcoin (BTC) en euros supera los 100.000 EUR en algún momento durante 2026 según CoinGecko' },
    235: { src: 'Comité Olímpico Español / Marca.com', url: 'https://www.coe.es/', cond: 'la selección española de fútbol masculino o femenino gana una medalla (oro, plata o bronce) en los Juegos Olímpicos de Los Ángeles 2028 — NOTE: Resolución pendiente según calendario olímpico' },
    236: { src: 'BOE / Ministerio de Hacienda', url: 'https://www.boe.es/', cond: 'el Gobierno de España aprueba y publica en el BOE una subida de impuestos (IRPF, Sociedades, IVA u otros) antes del 31 de diciembre de 2026' },
    237: { src: 'INE / Idealista Sala de Prensa', url: 'https://www.ine.es/', cond: 'los índices de precios de vivienda (IPV del INE o informe Idealista) para el segundo trimestre de 2026 reflejan una subida interanual del precio de la vivienda en España' },
    238: { src: 'SEPE (Servicio Público de Empleo Estatal)', url: 'https://www.sepe.es/HomeSepe/que-es-el-sepe/estadisticas/datos-estadisticos/paro-registrado.html', cond: 'el dato mensual de paro registrado publicado por el SEPE en marzo 2026 es inferior al dato de febrero 2026' },
    239: { src: 'AEMET (Agencia Estatal de Meteorología)', url: 'https://www.aemet.es/es/eltiempo/prediccion/municipios', cond: 'se registra una temperatura máxima superior a 38°C en alguna capital de provincia española durante la semana del 14 al 15 de marzo de 2026, según datos de AEMET' },
    240: { src: 'Renfe / Adif', url: 'https://www.renfe.com/es/es/viajar/informacion-util/estado-del-servicio.html', cond: 'Renfe publica o informa de más de 50 trenes con retraso superior a 15 minutos durante la semana del 14 al 15 de marzo de 2026' },
  }

  let count = 0
  for (const [sid, info] of Object.entries(rules)) {
    const id = parseInt(sid)
    const m = markets.find(x => x.id === id)
    if (!m) continue
    const closeStr = fmtDate(m.close_date)
    const rr = `Este contrato se resolverá como SÍ si ${info.cond} según los datos publicados por ${info.src} (${info.url}). Se resolverá como NO en caso contrario. Fecha límite de resolución: ${closeStr}. La resolución se basa en datos públicos verificables. PrediMarket actúa como intermediario tecnológico y no es parte del contrato.`
    const ok = await patch(id, { resolution_rules: rr, resolution_source: info.src })
    if (ok) { count++; console.log(`  ✓ [${id}] ${m.title.slice(0,55)}`) }
    else console.log(`  ✗ [${id}]`)
  }
  console.log(`\nFilled ${count} resolution_rules.`)
}

// ── 3. Create 10 short-term markets ───────────────────────────────────────────
async function createShortTermMarkets() {
  console.log('\n═══ STEP 3: Create 10 short-term markets ════════════════════════')

  // Check for existing duplicates first
  const r = await fetch(`${URL}/rest/v1/markets?select=id,title&status=eq.ACTIVE`, { headers: H })
  const existing = await r.json()
  const titles = existing.map(m => m.title.toLowerCase())

  const markets = [
    {
      title: '¿El precio medio del PVPC supera 70 €/MWh mañana?',
      description: 'El PVPC (Precio Voluntario al Pequeño Consumidor) es la tarifa regulada de electricidad en España. Este mercado resuelve SÍ si el precio medio del día siguiente supera los 70 €/MWh según OMIE.',
      category: 'ENERGIA',
      market_type: 'DIARIO',
      close_date: tomorrow2359(),
      resolution_source: 'OMIE (Operador del Mercado Ibérico de Energía)',
      resolution_rules: `Este contrato se resolverá como SÍ si el precio medio del PVPC publicado por OMIE para el día 15 de marzo de 2026 supera los 70,00 €/MWh según los datos publicados por OMIE (https://www.omie.es/es/spot-hoy). Se resolverá como NO en caso contrario. Fecha de resolución: domingo 15 de marzo de 2026 a las 23:59. Resolución automática basada en datos públicos verificables.`,
    },
    {
      title: '¿El IBEX 35 cierra en verde el lunes?',
      description: 'El IBEX 35 es el principal índice bursátil español. Este mercado resuelve SÍ si el índice cierra el lunes 16 de marzo con un valor superior al cierre del viernes 13 de marzo.',
      category: 'ECONOMIA',
      market_type: 'DIARIO',
      close_date: monday1900(),
      resolution_source: 'Yahoo Finance / BME (Bolsa y Mercados Españoles)',
      resolution_rules: `Este contrato se resolverá como SÍ si el IBEX 35 cierra el lunes 16 de marzo de 2026 con un valor superior al cierre oficial del viernes 13 de marzo de 2026, según datos de Yahoo Finance (https://finance.yahoo.com/quote/%5EIBEX/) o BME. Se resolverá como NO si cierra igual o en negativo. Fecha de resolución: lunes 16 de marzo de 2026 a las 19:00.`,
    },
    {
      title: '¿La temperatura máxima en Madrid supera 25°C mañana?',
      description: 'Mercado sobre la temperatura máxima registrada en la estación meteorológica de Madrid (Retiro) el domingo 15 de marzo de 2026 según AEMET.',
      category: 'SOCIEDAD',
      market_type: 'DIARIO',
      close_date: tomorrow2359(),
      resolution_source: 'AEMET (Agencia Estatal de Meteorología)',
      resolution_rules: `Este contrato se resolverá como SÍ si la temperatura máxima registrada por AEMET en la estación de Madrid (Retiro) el domingo 15 de marzo de 2026 supera los 25,0°C según los datos publicados en https://www.aemet.es/. Se resolverá como NO en caso contrario. Fecha de resolución: domingo 15 de marzo de 2026 a las 23:59.`,
    },
    {
      title: '¿Más de 50 vuelos cancelados o retrasados >2h en Barajas hoy?',
      description: 'Mercado sobre incidencias en el aeropuerto de Madrid-Barajas (LEMD/MAD) durante el sábado 14 de marzo de 2026, contabilizando cancelaciones y retrasos superiores a 2 horas.',
      category: 'SOCIEDAD',
      market_type: 'FLASH',
      close_date: today2359(),
      resolution_source: 'AENA / Flightradar24',
      resolution_rules: `Este contrato se resolverá como SÍ si el número de vuelos cancelados o con retraso superior a 2 horas en el aeropuerto Madrid-Barajas (MAD) durante el sábado 14 de marzo de 2026 supera los 50, según datos de AENA (https://www.aena.es/) o Flightradar24. Se resolverá como NO en caso contrario. Fecha de resolución: sábado 14 de marzo de 2026 a las 23:59.`,
    },
    {
      title: '¿El Bitcoin sube más de un 2% en las próximas 24 horas?',
      description: 'Este mercado resuelve SÍ si el precio de Bitcoin (BTC/USD) a las 23:59 del domingo 15 de marzo de 2026 es al menos un 2% superior al precio registrado a las 23:59 del sábado 14 de marzo de 2026.',
      category: 'CRYPTO',
      market_type: 'DIARIO',
      close_date: tomorrow2359(),
      resolution_source: 'CoinGecko',
      resolution_rules: `Este contrato se resolverá como SÍ si el precio de Bitcoin (BTC/USD) a las 23:59 del domingo 15 de marzo de 2026 es un 2% o más superior al precio de las 23:59 del sábado 14 de marzo de 2026, según CoinGecko (https://www.coingecko.com/es/monedas/bitcoin). Se resolverá como NO en caso contrario. Fecha de resolución: domingo 15 de marzo de 2026 a las 23:59.`,
    },
    {
      title: '¿El Brent supera los 74 $ por barril el lunes?',
      description: 'El petróleo Brent es el referente mundial del crudo. Este mercado resuelve SÍ si el precio de cierre del futuro de Brent (ICE) supera los 74,00 USD/barril el lunes 16 de marzo de 2026.',
      category: 'ECONOMIA',
      market_type: 'DIARIO',
      close_date: monday1800(),
      resolution_source: 'Yahoo Finance (ICE Brent Futures)',
      resolution_rules: `Este contrato se resolverá como SÍ si el precio de cierre del futuro de petróleo Brent (ICE, símbolo BZ=F) supera los 74,00 USD por barril el lunes 16 de marzo de 2026, según Yahoo Finance (https://finance.yahoo.com/quote/BZ%3DF/). Se resolverá como NO en caso contrario. Fecha de resolución: lunes 16 de marzo de 2026 a las 18:00.`,
    },
    {
      title: '¿Renfe registra algún retraso AVE superior a 30 min hoy?',
      description: 'Mercado sobre incidencias en la red de Alta Velocidad de Renfe (AVE) durante el sábado 14 de marzo de 2026. Resuelve SÍ si se reporta al menos 1 tren AVE con retraso superior a 30 minutos.',
      category: 'SOCIEDAD',
      market_type: 'FLASH',
      close_date: today2359(),
      resolution_source: 'Renfe / Adif',
      resolution_rules: `Este contrato se resolverá como SÍ si Renfe o Adif informa de al menos un servicio AVE con retraso superior a 30 minutos durante el sábado 14 de marzo de 2026, según los datos publicados en https://www.renfe.com/es/es/viajar/informacion-util/estado-del-servicio.html. Se resolverá como NO si no se registra ningún retraso AVE superior a 30 minutos. Fecha de resolución: sábado 14 de marzo de 2026 a las 23:59.`,
    },
    {
      title: '¿El EUR/USD cierra por encima de 1,085 el lunes?',
      description: 'El tipo de cambio EUR/USD refleja cuántos dólares vale un euro. Este mercado resuelve SÍ si el precio de cierre del EUR/USD supera 1,085 el lunes 16 de marzo de 2026.',
      category: 'ECONOMIA',
      market_type: 'DIARIO',
      close_date: monday1800(),
      resolution_source: 'Yahoo Finance (EUR/USD)',
      resolution_rules: `Este contrato se resolverá como SÍ si el tipo de cambio EUR/USD cierra por encima de 1,0850 el lunes 16 de marzo de 2026, según datos de Yahoo Finance (https://finance.yahoo.com/quote/EURUSD%3DX/). Se resolverá como NO si cierra en 1,0850 o por debajo. Fecha de resolución: lunes 16 de marzo de 2026 a las 18:00.`,
    },
    {
      title: '¿Más de 3 noticias sobre inmigración en portada de El País hoy?',
      description: 'Mercado sobre la cobertura mediática de la inmigración en la portada digital de El País durante el sábado 14 de marzo de 2026. Se cuentan noticias principales (no relacionadas) sobre inmigración visible en portada.',
      category: 'POLITICA',
      market_type: 'FLASH',
      close_date: today2359(),
      resolution_source: 'El País (elpais.com)',
      resolution_rules: `Este contrato se resolverá como SÍ si la portada digital de El País (https://www.elpais.com/) muestra más de 3 noticias distintas cuyo tema principal sea la inmigración en algún momento durante el sábado 14 de marzo de 2026. Se resolverá como NO en caso contrario. Fecha de resolución: sábado 14 de marzo de 2026 a las 23:59.`,
    },
    {
      title: '¿La temperatura máxima en Sevilla supera 30°C mañana?',
      description: 'Mercado sobre la temperatura máxima registrada en la estación meteorológica de Sevilla el domingo 15 de marzo de 2026 según AEMET. En marzo, Sevilla puede superar los 25°C pero los 30°C son inusuales.',
      category: 'SOCIEDAD',
      market_type: 'DIARIO',
      close_date: tomorrow2359(),
      resolution_source: 'AEMET (Agencia Estatal de Meteorología)',
      resolution_rules: `Este contrato se resolverá como SÍ si la temperatura máxima registrada por AEMET en la estación de Sevilla el domingo 15 de marzo de 2026 supera los 30,0°C según los datos publicados en https://www.aemet.es/. Se resolverá como NO en caso contrario. Fecha de resolución: domingo 15 de marzo de 2026 a las 23:59.`,
    },
  ]

  let created = 0
  for (const m of markets) {
    const dup = titles.some(t => {
      const words = m.title.toLowerCase().split(' ').filter(w => w.length > 4)
      const matches = words.filter(w => t.includes(w))
      return matches.length >= 3
    })
    if (dup) { console.log(`  SKIP (similar exists): ${m.title.slice(0,60)}`); continue }
    const result = await createMarket(m)
    if (result) created++
  }
  console.log(`\nCreated ${created}/10 short-term markets.`)
}

// ── Main ───────────────────────────────────────────────────────────────────────
async function main() {
  console.log('PrediMarket Market Fix Script — 2026-03-14')
  console.log('===========================================')
  await fixDatesAndTypes()
  await fillResolutionRules()
  await createShortTermMarkets()
  console.log('\n✓ All done. Run git push to deploy.')
}

main().catch(console.error)
