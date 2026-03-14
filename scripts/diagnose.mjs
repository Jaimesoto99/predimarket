const URL = 'https://mrdkhfbwesehffbystto.supabase.co'
const KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im1yZGtoZmJ3ZXNlaGZmYnlzdHRvIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3MDY2OTk1MywiZXhwIjoyMDg2MjQ1OTUzfQ.yPlUU55lXEx1EVfXdF58sNjlblsKsXL4iz2eawnewxg'
const H = { Authorization: `Bearer ${KEY}`, apikey: KEY }

const r = await fetch(`${URL}/rest/v1/markets?select=id,title,status,market_type,close_date,yes_pool,no_pool&status=in.(ACTIVE,CLOSED)&order=close_date.asc&limit=100`, { headers: H })
const markets = await r.json()

const now = new Date()
console.log(`\nTotal ACTIVE/CLOSED: ${markets.length}`)

let active = 0, expired = 0
for (const m of markets) {
  const isExpired = new Date(m.close_date) < now
  const yp = parseFloat(m.yes_pool), np = parseFloat(m.no_pool)
  const hasValidPools = yp > 0 && np > 0
  if (!isExpired) active++; else expired++
  if (!hasValidPools) console.log(`  ⚠ BAD POOLS [${m.id}] yes=${m.yes_pool} no=${m.no_pool}: ${m.title.slice(0,50)}`)
  if (m.id >= 241) console.log(`  [${m.id}] ${m.status} | ${m.market_type} | exp=${isExpired} | ${new Date(m.close_date).toISOString().slice(0,16)} | ${m.title.slice(0,55)}`)
}
console.log(`\nNon-expired (would show): ${active}`)
console.log(`Expired (would show as pending): ${expired}`)

// Simulate exact getActiveMarkets + index.js filter
const enriched = markets.map(m => ({
  ...m,
  isExpired: new Date(m.close_date) < now,
}))
const activeMarkets = enriched.filter(m => !m.isExpired)
const pendingMarkets = enriched.filter(m => m.isExpired && m.status !== 'RESOLVED')
console.log(`\nAfter isExpired filter → activeMarkets: ${activeMarkets.length}, pendingMarkets: ${pendingMarkets.length}`)
if (activeMarkets.length === 0) {
  console.log('\n🚨 PROBLEM: All markets are expired! close_dates are in the past.')
  console.log('Sample close_dates:')
  markets.slice(0, 5).forEach(m => console.log(`  [${m.id}] ${m.close_date} → ${m.title.slice(0,50)}`))
} else {
  console.log('✓ Markets available for display.')
}
