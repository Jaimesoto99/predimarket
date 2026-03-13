// POST/GET /api/engine/run
// Triggers the data pipeline. Protected by ADMIN_API_KEY.
//
// Query params:
//   job   = ingest | detect | signals | probability | activity | all (default)
//   force = true — bypass interval check and run immediately
//
// Called by:
//   - Vercel Cron (vercel.json: { "crons": [{ "path": "/api/engine/run", "schedule": "*/15 * * * *" }] })
//   - GitHub Actions workflow
//   - Manual: curl /api/engine/run?key=ADMIN_KEY&job=all

import { runJob, runAllDueJobs, getSchedulerStatus } from '../../../lib/engine/scheduler/runner'

export default async function handler(req, res) {
  // Auth — same pattern as create-markets and resolve-markets
  const key      = (req.query.key || req.headers['x-admin-key'] || '').trim()
  const expected = (process.env.ADMIN_API_KEY || '').trim()

  if (!expected || key !== expected) {
    return res.status(401).json({ error: 'No autorizado' })
  }

  // GET with no job param → return scheduler status
  if (req.method === 'GET' && !req.query.job) {
    const status = await getSchedulerStatus()
    return res.status(200).json({ status })
  }

  const jobName = req.query.job || 'all'
  const force   = req.query.force === 'true'

  const startedAt = Date.now()

  const TIMEOUT = 50000
  const timeoutPromise = new Promise((_, reject) =>
    setTimeout(() => reject(new Error('Engine timeout')), TIMEOUT)
  )

  try {
    let result

    if (jobName === 'all') {
      result = await Promise.race([runAllDueJobs(), timeoutPromise])
    } else {
      const single = await Promise.race([runJob(jobName, force), timeoutPromise])
      result = [single]
    }

    const totalMs  = Date.now() - startedAt
    const ran      = result.filter(r => r.status === 'completed')
    const failed   = result.filter(r => r.status === 'failed')
    const skipped  = result.filter(r => r.status === 'skipped')

    return res.status(200).json({
      timestamp:  new Date().toISOString(),
      duration_ms: totalMs,
      ran:        ran.length,
      failed:     failed.length,
      skipped:    skipped.length,
      results:    result,
    })
  } catch (err) {
    console.error('[/api/engine/run] error:', err)
    return res.status(500).json({
      error:   err.message,
      job:     jobName,
      elapsed: Date.now() - startedAt,
    })
  }
}
