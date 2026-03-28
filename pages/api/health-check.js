// GET /api/health-check?key=ADMIN_KEY
//
// Runs a suite of system health checks and sends a report email to jaime@forsii.com.
// Also configured as a Vercel cron at 3:00 AM UTC daily (see vercel.json).

import { createClient } from '@supabase/supabase-js'
import { sendEmail }    from '../../lib/email/sendEmail'

function getSupabase() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY
  )
}

function getSiteUrl() {
  return (process.env.NEXT_PUBLIC_SITE_URL || 'https://forsii.com').replace(/\/$/, '')
}

// ─── Individual checks ────────────────────────────────────────────────────

async function checkDatabaseConnectivity(supabase) {
  try {
    const { error } = await supabase.from('markets').select('id').limit(1)
    if (error) return { ok: false, detail: error.message }
    return { ok: true }
  } catch (e) {
    return { ok: false, detail: e.message }
  }
}

async function checkActiveMarkets(supabase) {
  const { data, error } = await supabase
    .from('markets')
    .select('id', { count: 'exact' })
    .eq('status', 'ACTIVE')
    .eq('review_status', 'approved')

  if (error) return { ok: false, count: 0, detail: error.message }
  const count = data?.length ?? 0
  return {
    ok:     count >= 5,
    count,
    detail: count < 5 ? `Only ${count} active markets (threshold: 5)` : `${count} active markets`,
  }
}

async function checkCronHealth(supabase) {
  const todayStart = new Date()
  todayStart.setUTCHours(0, 0, 0, 0)

  const { data, error } = await supabase
    .from('markets')
    .select('id', { count: 'exact' })
    .gte('created_at', todayStart.toISOString())

  if (error) return { ok: false, detail: error.message }
  const count = data?.length ?? 0
  return {
    ok:     count > 0,
    count,
    detail: count > 0
      ? `${count} market(s) created today (cron ran)`
      : 'No markets created today — cron may not have run',
  }
}

async function checkPendingReviewQueue(supabase) {
  const cutoff = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString()
  const { data, error } = await supabase
    .from('markets')
    .select('id, title, created_at')
    .eq('review_status', 'pending_review')
    .lt('created_at', cutoff)

  if (error) return { ok: false, detail: error.message }
  const stale = data ?? []
  return {
    ok:     stale.length === 0,
    count:  stale.length,
    detail: stale.length === 0
      ? 'No markets stuck in pending_review > 24h'
      : `${stale.length} market(s) stuck in pending_review > 24h`,
    items:  stale.map(m => `#${m.id}: ${m.title}`),
  }
}

async function checkResolutionHealth(supabase) {
  const now = new Date().toISOString()
  const { data, error } = await supabase
    .from('markets')
    .select('id, title, close_date')
    .in('status', ['ACTIVE', 'CLOSED'])
    .lt('close_date', now)
    .not('status', 'eq', 'RESOLVED')

  if (error) return { ok: false, detail: error.message }
  const overdue = data ?? []
  return {
    ok:     overdue.length === 0,
    count:  overdue.length,
    detail: overdue.length === 0
      ? 'No unresolved markets past close date'
      : `${overdue.length} market(s) past close date not yet resolved`,
    items:  overdue.map(m => `#${m.id}: ${m.title} (closed ${m.close_date?.slice(0, 10)})`),
  }
}

async function checkSignalsTable(supabase) {
  try {
    const { error } = await supabase.from('signals').select('id').limit(1)
    if (error && error.code === '42P01') {
      return { ok: false, detail: 'signals table does not exist' }
    }
    if (error) return { ok: false, detail: error.message }
    return { ok: true, detail: 'signals table exists and is reachable' }
  } catch (e) {
    return { ok: false, detail: e.message }
  }
}

async function checkApiEndpoint(url, label) {
  try {
    const controller = new AbortController()
    const timer = setTimeout(() => controller.abort(), 8000)
    const res = await fetch(url, { signal: controller.signal })
    clearTimeout(timer)
    if (res.ok) return { ok: true, status: res.status, detail: `${label} responded ${res.status}` }
    return { ok: false, status: res.status, detail: `${label} responded ${res.status}` }
  } catch (e) {
    return { ok: false, detail: `${label} unreachable: ${e.message}` }
  }
}

// ─── Email template ───────────────────────────────────────────────────────

function buildHealthReportEmail(results, timestamp, adminKey) {
  const allOk   = results.every(r => r.check.ok)
  const issues  = results.filter(r => !r.check.ok)
  const statusEmoji = allOk ? '✅' : '🚨'
  const statusText  = allOk ? 'ALL HEALTHY' : `ISSUES FOUND (${issues.length})`

  const rowStyle  = 'padding:8px 12px;border-bottom:1px solid #e5e7eb;'
  const okStyle   = 'color:#16a34a;font-weight:600;'
  const failStyle = 'color:#dc2626;font-weight:600;'

  const rows = results.map(({ name, check }) => `
    <tr>
      <td style="${rowStyle}">${name}</td>
      <td style="${rowStyle}${check.ok ? okStyle : failStyle}">${check.ok ? '✅ OK' : '🚨 ALERT'}</td>
      <td style="${rowStyle}color:#6b7280;">${check.detail || ''}</td>
    </tr>`).join('')

  const alertBlocks = issues.flatMap(({ name, check }) => {
    const lines = [check.detail, ...(check.items || [])].filter(Boolean)
    return `
    <div style="background:#fef2f2;border-left:4px solid #dc2626;padding:12px 16px;margin:8px 0;border-radius:4px;">
      <strong style="color:#dc2626;">${name}</strong><br>
      ${lines.map(l => `<span style="color:#374151;">${l}</span>`).join('<br>')}
    </div>`
  })

  return `
<!DOCTYPE html>
<html>
<head><meta charset="utf-8"></head>
<body style="font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;background:#f9fafb;margin:0;padding:24px;">
  <div style="max-width:640px;margin:0 auto;background:#fff;border-radius:8px;overflow:hidden;box-shadow:0 1px 3px rgba(0,0,0,.1);">

    <div style="background:${allOk ? '#16a34a' : '#dc2626'};padding:24px;text-align:center;">
      <h1 style="color:#fff;margin:0;font-size:22px;">${statusEmoji} Forsii Health Check</h1>
      <p style="color:rgba(255,255,255,.85);margin:6px 0 0;">${statusText}</p>
    </div>

    <div style="padding:24px;">
      <p style="color:#6b7280;font-size:13px;margin:0 0 20px;">
        Checked at: <strong>${timestamp}</strong>
      </p>

      <table style="width:100%;border-collapse:collapse;font-size:14px;">
        <thead>
          <tr style="background:#f3f4f6;">
            <th style="padding:8px 12px;text-align:left;color:#374151;">Check</th>
            <th style="padding:8px 12px;text-align:left;color:#374151;">Status</th>
            <th style="padding:8px 12px;text-align:left;color:#374151;">Detail</th>
          </tr>
        </thead>
        <tbody>${rows}</tbody>
      </table>

      ${issues.length > 0 ? `
      <h2 style="color:#dc2626;font-size:16px;margin:24px 0 8px;">Alerts</h2>
      ${alertBlocks.join('')}
      ` : `
      <p style="color:#16a34a;margin-top:20px;">All systems operational. No action required.</p>
      `}
    </div>

    <div style="background:#f3f4f6;padding:16px 24px;text-align:center;">
      <a href="https://forsii.com/admin?key=${adminKey}"
         style="color:#6366f1;font-size:13px;text-decoration:none;">Open Admin Panel</a>
    </div>
  </div>
</body>
</html>`
}

// ─── Handler ──────────────────────────────────────────────────────────────

export default async function handler(req, res) {
  if (req.method !== 'GET') return res.status(405).json({ error: 'Method not allowed' })

  const key      = (req.query.key || req.headers['x-admin-key'] || '').trim()
  const expected = (process.env.ADMIN_API_KEY || '').trim()

  // Allow Vercel cron (no key) OR manual call with admin key
  const isCron   = req.headers['x-vercel-cron'] === '1'
  if (!isCron && (!expected || key !== expected)) {
    return res.status(401).json({ error: 'No autorizado' })
  }

  const siteUrl      = getSiteUrl()
  const supabase     = getSupabase()
  const adminKey     = process.env.ADMIN_API_KEY || ''     // used by resolve-markets
  const autoKey      = process.env.ADMIN_KEY || 'forsii-admin-2026' // used by auto-markets
  const timestamp    = new Date().toUTCString()

  // Run all checks (connectivity first; rest in parallel)
  const dbCheck = await checkDatabaseConnectivity(supabase)

  let results
  if (!dbCheck.ok) {
    results = [
      { name: 'Database connectivity', check: dbCheck },
      { name: 'Active markets',        check: { ok: false, detail: 'Skipped (DB unreachable)' } },
      { name: 'Cron health',           check: { ok: false, detail: 'Skipped (DB unreachable)' } },
      { name: 'Pending review queue',  check: { ok: false, detail: 'Skipped (DB unreachable)' } },
      { name: 'Resolution health',     check: { ok: false, detail: 'Skipped (DB unreachable)' } },
      { name: 'Signals table',         check: { ok: false, detail: 'Skipped (DB unreachable)' } },
      { name: 'API: auto-markets',     check: { ok: false, detail: 'Skipped (DB unreachable)' } },
      { name: 'API: resolve-markets',  check: { ok: false, detail: 'Skipped (DB unreachable)' } },
    ]
  } else {
    const [
      activeMarkets,
      cronHealth,
      pendingQueue,
      resolutionHealth,
      signalsTable,
      autoMarketsApi,
      resolveMarketsApi,
    ] = await Promise.all([
      checkActiveMarkets(supabase),
      checkCronHealth(supabase),
      checkPendingReviewQueue(supabase),
      checkResolutionHealth(supabase),
      checkSignalsTable(supabase),
      checkApiEndpoint(
        `${siteUrl}/api/auto-markets?health=1&key=${autoKey}`,
        'auto-markets'
      ),
      checkApiEndpoint(
        `${siteUrl}/api/resolve-markets?health=1&key=${adminKey}`,
        'resolve-markets'
      ),
    ])

    results = [
      { name: 'Database connectivity', check: dbCheck },
      { name: 'Active markets',        check: activeMarkets },
      { name: 'Cron health',           check: cronHealth },
      { name: 'Pending review queue',  check: pendingQueue },
      { name: 'Resolution health',     check: resolutionHealth },
      { name: 'Signals table',         check: signalsTable },
      { name: 'API: auto-markets',     check: autoMarketsApi },
      { name: 'API: resolve-markets',  check: resolveMarketsApi },
    ]
  }

  const allOk   = results.every(r => r.check.ok)
  const subject = allOk
    ? `✅ Forsii Health Check — All systems OK`
    : `🚨 Forsii Health Check — Issues found`

  const emailResult = await sendEmail({
    to:      'jaime@forsii.com',
    subject,
    html:    buildHealthReportEmail(results, timestamp, adminKey),
  })

  console.log('[health-check] completed. allOk:', allOk, '| email:', emailResult.success ? emailResult.id : emailResult.error)

  return res.status(200).json({
    ok:        allOk,
    timestamp,
    results:   results.map(({ name, check }) => ({ name, ok: check.ok, detail: check.detail })),
    email:     emailResult,
  })
}
