/**
 * db-migrate.mjs — Ejecutar migraciones contra Supabase via Management API + REST
 * Uso: node scripts/db-migrate.mjs
 */

const SUPABASE_URL = 'https://mrdkhfbwesehffbystto.supabase.co'
const SERVICE_KEY  = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im1yZGtoZmJ3ZXNlaGZmYnlzdHRvIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3MDY2OTk1MywiZXhwIjoyMDg2MjQ1OTUzfQ.yPlUU55lXEx1EVfXdF58sNjlblsKsXL4iz2eawnewxg'
const PROJECT_REF  = 'mrdkhfbwesehffbystto'
const ADMIN_KEY    = 'predi-admin-2026'

const headers = {
  'Authorization': `Bearer ${SERVICE_KEY}`,
  'apikey': SERVICE_KEY,
  'Content-Type': 'application/json',
}

// ── 1. Execute SQL via Supabase Management API ────────────────────────────────
// Requires a personal access token (PAT), NOT service_role key.
// We'll use an alternative: run SQL via a one-off RPC or via pg_net if available.
// For DDL (CREATE FUNCTION, ALTER TABLE, RLS), we'll try the /pg endpoint.

async function execSQL(sql, label) {
  console.log(`\n── ${label} ──────────────────────────`)
  // Supabase doesn't expose a raw SQL endpoint via service_role in REST API.
  // We call the internal pg endpoint used by the SQL editor (v1 management API).
  // This requires a PAT but let's try the direct postgres REST endpoint.

  // Actually the correct approach for arbitrary SQL is via supabase-js rpc or
  // the pg REST endpoint at /rest/v1/rpc/... but DDL needs special setup.
  //
  // Use the Management API endpoint if we had a PAT.
  // Instead, we'll use the Supabase "sql" endpoint:
  const res = await fetch(`${SUPABASE_URL}/rest/v1/rpc/exec_sql`, {
    method: 'POST',
    headers,
    body: JSON.stringify({ sql }),
  })
  const text = await res.text()
  console.log(`Status: ${res.status}`)
  if (!res.ok) {
    console.log(`Error: ${text.slice(0, 500)}`)
    return false
  }
  console.log(`OK: ${text.slice(0, 200)}`)
  return true
}

// ── 2. UTF-8 Cleanup via JS (no DDL needed, just UPDATE) ──────────────────────
async function cleanUtf8() {
  console.log('\n═══ STEP 1: UTF-8 Cleanup ═══════════════════════════════════════')

  // Fetch all markets
  const res = await fetch(`${SUPABASE_URL}/rest/v1/markets?select=id,title,description,resolution_source&limit=500`, { headers })
  if (!res.ok) { console.log('ERROR fetching markets:', res.status, await res.text()); return }
  const markets = await res.json()
  console.log(`Fetched ${markets.length} markets`)

  function cleanText(s) {
    if (!s) return s
    return s
      .replace(/◆/g, '')
      .replace(/\uFFFD/g, '')   // chr(65533)
      .replace(/\uFEFF/g, '')   // BOM
      .replace(/  +/g, ' ')     // collapse double spaces
      .trim()
  }

  let updated = 0
  for (const m of markets) {
    const newTitle  = cleanText(m.title)
    const newDesc   = cleanText(m.description)
    const newSource = cleanText(m.resolution_source)

    if (newTitle !== m.title || newDesc !== m.description || newSource !== m.resolution_source) {
      const body = {}
      if (newTitle  !== m.title)             body.title            = newTitle
      if (newDesc   !== m.description)       body.description      = newDesc
      if (newSource !== m.resolution_source) body.resolution_source = newSource

      const upRes = await fetch(`${SUPABASE_URL}/rest/v1/markets?id=eq.${m.id}`, {
        method: 'PATCH',
        headers: { ...headers, 'Prefer': 'return=minimal' },
        body: JSON.stringify(body),
      })
      if (!upRes.ok) {
        console.log(`  WARN market ${m.id}: ${upRes.status}`)
      } else {
        updated++
        console.log(`  ✓ cleaned market ${m.id}: "${(newTitle||'').slice(0,60)}"`)
      }
    }
  }
  console.log(`\nUTF-8 cleanup done. Updated ${updated}/${markets.length} markets.`)
}

// ── 3. Add reference_price column (idempotent) ─────────────────────────────────
async function addReferencePrice() {
  console.log('\n═══ STEP 2: reference_price column ══════════════════════════════')
  // Try via exec_sql RPC if it exists, otherwise skip (needs SQL editor)
  const res = await fetch(`${SUPABASE_URL}/rest/v1/rpc/exec_sql`, {
    method: 'POST',
    headers,
    body: JSON.stringify({ query: 'ALTER TABLE markets ADD COLUMN IF NOT EXISTS reference_price NUMERIC(5,4) DEFAULT 0.5;' }),
  })
  if (res.ok) {
    console.log('reference_price column added (or already exists)')
  } else {
    console.log(`SKIP (exec_sql not available): Add manually in SQL editor:`)
    console.log('  ALTER TABLE markets ADD COLUMN IF NOT EXISTS reference_price NUMERIC(5,4) DEFAULT 0.5;')
  }
}

// ── 4. Verify markets ──────────────────────────────────────────────────────────
async function verifyMarkets() {
  console.log('\n═══ STEP 3: Verify getActiveMarkets() ════════════════════════════')
  const res = await fetch(
    `${SUPABASE_URL}/rest/v1/markets?select=id,title,status,category,yes_pool,no_pool,close_date&status=in.(ACTIVE,CLOSED)&order=close_date.asc&limit=50`,
    { headers }
  )
  if (!res.ok) { console.log('ERROR:', res.status, await res.text()); return }
  const markets = await res.json()
  console.log(`\nTotal markets (ACTIVE/CLOSED): ${markets.length}`)

  const byStatus = {}
  const byCategory = {}
  for (const m of markets) {
    byStatus[m.status]   = (byStatus[m.status]   || 0) + 1
    byCategory[m.category] = (byCategory[m.category] || 0) + 1
  }
  console.log('By status:  ', JSON.stringify(byStatus))
  console.log('By category:', JSON.stringify(byCategory))

  if (markets.length > 0) {
    console.log('\nFirst 5 markets:')
    markets.slice(0, 5).forEach(m => {
      const yesP = m.no_pool / (parseFloat(m.yes_pool) + parseFloat(m.no_pool)) * 100
      console.log(`  [${m.id}] ${m.status} | ${m.category} | ${yesP.toFixed(0)}% | "${m.title.slice(0,60)}"`)
    })
  } else {
    console.log('WARNING: No markets found!')
  }
}

// ── 5. Create markets via API ──────────────────────────────────────────────────
async function createMarkets() {
  console.log('\n═══ STEP 4: Create markets (objective mode) ══════════════════════')

  // Try calling the Vercel deployment
  const urls = [
    `https://forsii.com/api/create-markets?mode=objective&key=${ADMIN_KEY}`,
    `http://localhost:3000/api/create-markets?mode=objective&key=${ADMIN_KEY}`,
  ]

  for (const url of urls) {
    try {
      console.log(`Trying: ${url.split('?')[0]}...`)
      const controller = new AbortController()
      const timeout = setTimeout(() => controller.abort(), 15000)
      const res = await fetch(url, { signal: controller.signal })
      clearTimeout(timeout)
      if (res.ok) {
        const data = await res.json()
        console.log(`✓ Created: ${JSON.stringify(data).slice(0, 300)}`)
        return
      } else {
        console.log(`  Status ${res.status}: ${(await res.text()).slice(0, 200)}`)
      }
    } catch (e) {
      console.log(`  Failed: ${e.message}`)
    }
  }
  console.log('NOTE: Run create-markets manually: npm run dev → GET /api/create-markets?mode=objective&key=predi-admin-2026')
}

// ── 6. Print DDL that needs manual execution ───────────────────────────────────
function printManualSQL() {
  console.log(`
═══ MANUAL SQL (paste in Supabase SQL Editor) ════════════════════════════════

-- Run these in https://supabase.com/dashboard/project/mrdkhfbwesehffbystto/sql/new

-- 1. reference_price column
ALTER TABLE markets ADD COLUMN IF NOT EXISTS reference_price NUMERIC(5,4) DEFAULT 0.5;

-- 2. RLS (check if already enabled first)
ALTER TABLE trades        ENABLE ROW LEVEL SECURITY;
ALTER TABLE limit_orders  ENABLE ROW LEVEL SECURITY;
ALTER TABLE comments      ENABLE ROW LEVEL SECURITY;
ALTER TABLE markets       ENABLE ROW LEVEL SECURITY;
ALTER TABLE price_history ENABLE ROW LEVEL SECURITY;

-- See supabase-migrations-pending.sql for full policy definitions and match_orders RPC.

═══════════════════════════════════════════════════════════════════════════════
`)
}

// ── Main ───────────────────────────────────────────────────────────────────────
async function main() {
  console.log('Forsii DB Migration Script')
  console.log('================================')

  await cleanUtf8()
  await addReferencePrice()
  await verifyMarkets()
  await createMarkets()
  printManualSQL()

  console.log('\n✓ Script complete.')
}

main().catch(console.error)
