// ============================================================
// Scheduler Runner — executes jobs with DB-based locking
//
// Prevents concurrent execution (Vercel cron can overlap).
// Uses scheduler_jobs table for state management.
//
// Usage:
//   const result = await runJob('ingest')
//   const result = await runAllDueJobs()
// ============================================================

import { createClient } from '@supabase/supabase-js'
import { JOBS }         from './jobs'

function getSupabase() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY
  )
}

const LOCK_TIMEOUT_MINUTES = 10  // stale lock after 10min

// ─── Check if a job is due ────────────────────────────────────────────────

function isDue(jobRow, intervalMinutes) {
  if (!jobRow?.last_run) return true
  const elapsed = (Date.now() - new Date(jobRow.last_run).getTime()) / 60000
  return elapsed >= intervalMinutes
}

// ─── Acquire lock ─────────────────────────────────────────────────────────
// Returns true if lock acquired, false if already locked by another process.

async function acquireLock(supabase, jobName) {
  const lockExpiry = new Date(Date.now() - LOCK_TIMEOUT_MINUTES * 60000).toISOString()

  // Try to set status='running' only if status is 'idle' or lock is stale
  const { data, error } = await supabase
    .from('scheduler_jobs')
    .update({ status: 'running', locked_at: new Date().toISOString() })
    .eq('job_name', jobName)
    .in('status', ['idle', 'failed'])
    .or(`locked_at.is.null,locked_at.lt.${lockExpiry}`)
    .select('job_name')

  if (error) {
    console.error('[runner] acquireLock error:', error.message)
    return false
  }
  return (data?.length ?? 0) > 0
}

// ─── Release lock ─────────────────────────────────────────────────────────

async function releaseLock(supabase, jobName, result, success) {
  const now = new Date().toISOString()

  const { error } = await supabase
    .from('scheduler_jobs')
    .update({
      status:      success ? 'idle' : 'failed',
      last_run:    now,
      locked_at:   null,
      last_result: result,
      run_count:   supabase.rpc ? undefined : undefined,  // incremented below
    })
    .eq('job_name', jobName)

  // Increment run_count or error_count
  await supabase.rpc('increment_job_counter', {
    p_job_name:  jobName,
    p_success:   success,
  }).catch(() => {})  // best-effort, counter is non-critical

  if (error) {
    console.error('[runner] releaseLock error:', error.message)
  }
}

// ─── Run a single job by name ─────────────────────────────────────────────

export async function runJob(jobName, force = false) {
  const job = JOBS[jobName]
  if (!job) {
    return { ok: false, job: jobName, error: 'Unknown job' }
  }

  const supabase = getSupabase()

  // Check if job exists in DB
  const { data: jobRow } = await supabase
    .from('scheduler_jobs')
    .select('*')
    .eq('job_name', jobName)
    .single()

  // Upsert row if missing
  if (!jobRow) {
    await supabase
      .from('scheduler_jobs')
      .upsert({ job_name: jobName, status: 'idle' }, { onConflict: 'job_name' })
  }

  // Skip if not due (unless forced)
  if (!force && !isDue(jobRow, job.intervalMinutes)) {
    const nextRun = jobRow?.last_run
      ? new Date(new Date(jobRow.last_run).getTime() + job.intervalMinutes * 60000).toISOString()
      : null
    return { ok: true, job: jobName, status: 'skipped', reason: 'not_due', next_run: nextRun }
  }

  // Skip disabled jobs
  if (jobRow?.status === 'disabled') {
    return { ok: true, job: jobName, status: 'skipped', reason: 'disabled' }
  }

  // Acquire lock
  const locked = await acquireLock(supabase, jobName)
  if (!locked) {
    return { ok: true, job: jobName, status: 'skipped', reason: 'locked' }
  }

  const startedAt = Date.now()
  let result = null
  let success = false

  try {
    result  = await job.fn()
    success = true
  } catch (err) {
    console.error(`[runner] job ${jobName} error:`, err)
    result = { error: err.message }
  } finally {
    await releaseLock(supabase, jobName, result, success)
  }

  const durationMs = Date.now() - startedAt

  return {
    ok:         success,
    job:        jobName,
    status:     success ? 'completed' : 'failed',
    durationMs,
    result,
  }
}

// ─── Run all jobs that are due ────────────────────────────────────────────

export async function runAllDueJobs() {
  const supabase = getSupabase()

  // Load all job rows
  const { data: rows } = await supabase
    .from('scheduler_jobs')
    .select('*')

  const rowMap = Object.fromEntries((rows || []).map(r => [r.job_name, r]))

  // Run jobs in dependency order
  const ORDER = ['ingest', 'detect', 'signals', 'create_markets', 'resolve', 'probability', 'activity', 'trust', 'graph']
  const results = []

  for (const jobName of ORDER) {
    const job    = JOBS[jobName]
    const jobRow = rowMap[jobName]

    if (isDue(jobRow, job.intervalMinutes)) {
      const result = await runJob(jobName)
      results.push(result)
    } else {
      results.push({ job: jobName, status: 'skipped', reason: 'not_due' })
    }
  }

  return results
}

// ─── Get scheduler status ─────────────────────────────────────────────────

export async function getSchedulerStatus() {
  const supabase = getSupabase()

  const { data: rows, error } = await supabase
    .from('scheduler_jobs')
    .select('*')
    .order('job_name')

  if (error) return []

  return (rows || []).map(row => {
    const job     = JOBS[row.job_name]
    const due     = job ? isDue(row, job.intervalMinutes) : false
    const nextRun = row.last_run && job
      ? new Date(new Date(row.last_run).getTime() + job.intervalMinutes * 60000).toISOString()
      : null

    return {
      ...row,
      description:      job?.description,
      interval_minutes: job?.intervalMinutes,
      is_due:           due,
      next_run:         nextRun,
    }
  })
}
