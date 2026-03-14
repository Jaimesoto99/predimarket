// Fix market_type to match actual close_date duration
const URL = 'https://mrdkhfbwesehffbystto.supabase.co'
const KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im1yZGtoZmJ3ZXNlaGZmYnlzdHRvIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3MDY2OTk1MywiZXhwIjoyMDg2MjQ1OTUzfQ.yPlUU55lXEx1EVfXdF58sNjlblsKsXL4iz2eawnewxg'
const H = { Authorization: `Bearer ${KEY}`, apikey: KEY, 'Content-Type': 'application/json', Prefer: 'return=minimal' }

const r = await fetch(`${URL}/rest/v1/markets?select=id,title,status,market_type,close_date,created_at&status=eq.ACTIVE`, { headers: H })
const markets = await r.json()
console.log(`Fetched ${markets.length} active markets`)

const now = new Date()
let fixed = 0

for (const m of markets) {
  const closeMs    = new Date(m.close_date) - now
  const closeDays  = closeMs / 86400000

  // DB only allows: DIARIO, SEMANAL, MENSUAL
  let correctType
  if (closeDays <= 2)        correctType = 'DIARIO'
  else if (closeDays <= 10)  correctType = 'SEMANAL'
  else                       correctType = 'MENSUAL'

  const current = m.market_type
  const isWrong = (
    (current === 'DIARIO'  && closeDays > 2)   ||
    (current === 'SEMANAL' && closeDays > 10)  ||
    (current === 'FLASH')                        // FLASH not valid in DB
  )

  if (isWrong) {
    const res = await fetch(`${URL}/rest/v1/markets?id=eq.${m.id}`, {
      method: 'PATCH', headers: H,
      body: JSON.stringify({ market_type: correctType }),
    })
    if (res.ok) {
      fixed++
      console.log(`  ✓ [${m.id}] ${current} → ${correctType} (${closeDays.toFixed(1)}d) ${m.title.slice(0,50)}`)
    } else {
      const err = await res.json().catch(() => ({}))
      console.log(`  ✗ [${m.id}] ${JSON.stringify(err).slice(0,100)}`)
    }
  }
}
console.log(`\nFixed ${fixed} market_type mismatches.`)

// Verify IDs 241-251
console.log('\n─── Verify short-term markets (241-251) ───')
const r2 = await fetch(`${URL}/rest/v1/markets?select=id,title,status,market_type,close_date&id=gte.241&id=lte.251`, { headers: H })
const newMarkets = await r2.json()
for (const m of newMarkets) {
  const exp = new Date(m.close_date) < now
  console.log(`  [${m.id}] ${m.status} | ${m.market_type} | exp=${exp} | ${m.title.slice(0,55)}`)
}
