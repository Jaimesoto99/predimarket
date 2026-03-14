const URL = 'https://mrdkhfbwesehffbystto.supabase.co'
const KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im1yZGtoZmJ3ZXNlaGZmYnlzdHRvIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3MDY2OTk1MywiZXhwIjoyMDg2MjQ1OTUzfQ.yPlUU55lXEx1EVfXdF58sNjlblsKsXL4iz2eawnewxg'
const H = { 'Authorization': `Bearer ${KEY}`, 'apikey': KEY, 'Content-Type': 'application/json', 'Prefer': 'return=representation' }

const markets = [
  {
    title: '¿Más de 50 vuelos cancelados o retrasados >2h en Barajas hoy?',
    description: 'Mercado sobre incidencias en el aeropuerto de Madrid-Barajas (MAD) durante el sábado 14 de marzo de 2026, contabilizando cancelaciones y retrasos superiores a 2 horas según AENA o Flightradar24.',
    category: 'SOCIEDAD', market_type: 'DIARIO', close_date: '2026-03-14T23:59:00+01:00',
    resolution_source: 'AENA / Flightradar24',
    resolution_rules: 'Este contrato se resolverá como SÍ si el número de vuelos cancelados o con retraso superior a 2 horas en Madrid-Barajas (MAD) durante el sábado 14 de marzo de 2026 supera los 50, según datos de AENA (https://www.aena.es/) o Flightradar24. Se resolverá como NO en caso contrario. Fecha de resolución: sábado 14 de marzo de 2026 a las 23:59.',
    status: 'ACTIVE', yes_pool: 5000, no_pool: 5000, liquidity_param: 100,
    total_volume: 0, total_traders: 0, reference_price: 0.5,
    created_at: new Date().toISOString(),
  },
  {
    title: '¿Más de 3 noticias sobre inmigración en portada de El País hoy?',
    description: 'Mercado sobre la cobertura mediática de la inmigración en la portada digital de El País durante el sábado 14 de marzo de 2026. Se cuentan noticias principales sobre inmigración visible en portada.',
    category: 'ACTUALIDAD', market_type: 'DIARIO', close_date: '2026-03-14T23:59:00+01:00',
    resolution_source: 'El País (elpais.com)',
    resolution_rules: 'Este contrato se resolverá como SÍ si la portada digital de El País (https://www.elpais.com/) muestra más de 3 noticias distintas cuyo tema principal sea la inmigración en algún momento durante el sábado 14 de marzo de 2026. Se resolverá como NO en caso contrario. Fecha de resolución: sábado 14 de marzo de 2026 a las 23:59.',
    status: 'ACTIVE', yes_pool: 5000, no_pool: 5000, liquidity_param: 100,
    total_volume: 0, total_traders: 0, reference_price: 0.5,
    created_at: new Date().toISOString(),
  },
]

for (const body of markets) {
  const r = await fetch(`${URL}/rest/v1/markets`, { method: 'POST', headers: H, body: JSON.stringify(body) })
  const d = await r.json()
  if (r.ok) console.log(`✓ Created [${(Array.isArray(d)?d[0]:d)?.id}]: ${body.title}`)
  else console.log(`✗ FAILED: ${JSON.stringify(d).slice(0,300)}`)
}
