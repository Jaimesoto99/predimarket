// ============================================================
// Resolution Engine — routes CLOSING markets to the correct oracle
//
// Extends the existing oracle system in resolve-markets.js:
//   - Uses oracle_type field set during auto-creation
//   - Falls back to title-based routing for legacy markets
//   - Calls distribute_winnings() after successful resolution
// ============================================================

import { createClient } from '@supabase/supabase-js'
import {
  resolveYahooFinance,
  resolveCoinGecko,
  resolveREEPrice,
  resolveFootball,
  resolveINEData,
  resolveBOEPublication,
} from './resolutionSources'
import { transitionMarket } from '../markets/marketLifecycle'

function getSupabase() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY
  )
}

// ─── Entity → resolution config map ──────────────────────────────────────

const ENTITY_RESOLUTION = {
  IBEX_35:      () => resolveYahooFinance('%5EIBEX',    null,   'direction'),
  SP500:        () => resolveYahooFinance('%5EGSPC',    null,   'direction'),
  NASDAQ:       () => resolveYahooFinance('%5EIXIC',    null,   'direction'),
  BRENT:        () => resolveYahooFinance('BZ%3DF',     null,   'direction'),
  ORO:          () => resolveYahooFinance('GC%3DF',     null,   'direction'),
  BITCOIN:      () => resolveCoinGecko('bitcoin',       null),
  ETHEREUM:     () => resolveCoinGecko('ethereum',      null),
  LUZ_PVPC:     (thr) => resolveREEPrice(thr),
  REAL_MADRID:  () => resolveFootball(86,  'Real Madrid'),
  FC_BARCELONA: () => resolveFootball(81,  'FC Barcelona'),
  ATLETICO:     () => resolveFootball(78,  'Atlético de Madrid'),
  SEVILLA_FC:   () => resolveFootball(559, 'Sevilla FC'),
  IPC_ES:       (thr) => resolveINEData('IPC', thr),
  CONGRESO:     () => resolveBOEPublication(['ley', 'decreto', 'disposición']),
}

// ─── Extract threshold from market title ─────────────────────────────────

function extractThreshold(title) {
  const matches = title.match(/[\d.,]+/g) || []
  const nums    = matches
    .map(n => parseFloat(n.replace(/\./g, '').replace(',', '.')))
    .filter(n => !isNaN(n) && n > 0)
    .sort((a, b) => b - a)  // largest first (usually the threshold)
  return nums[0] || null
}

// ─── Route by oracle_type + entities ─────────────────────────────────────

async function routeToOracle(market) {
  const t          = market.title.toLowerCase()
  const oracleType = market.oracle_type || ''
  const entities   = market.entities || {}
  const threshold  = extractThreshold(market.title)

  // ── PRICE_THRESHOLD ─────────────────────────────────────────────────────
  if (oracleType === 'PRICE_THRESHOLD' || oracleType === 'PRICE_DIRECTION') {
    // Detect asset from entities or title
    if ('IBEX_35' in entities || t.includes('ibex')) {
      return resolveYahooFinance('%5EIBEX', threshold)
    }
    if ('BITCOIN' in entities || t.includes('bitcoin') || t.includes('btc')) {
      return resolveCoinGecko('bitcoin', threshold)
    }
    if ('ETHEREUM' in entities || t.includes('ethereum') || t.includes('eth')) {
      return resolveCoinGecko('ethereum', threshold)
    }
    if ('BRENT' in entities || t.includes('brent')) {
      return resolveYahooFinance('BZ%3DF', threshold)
    }
    if ('LUZ_PVPC' in entities || t.includes('luz') || t.includes('pvpc') || t.includes('mwh')) {
      return resolveREEPrice(threshold || 80)
    }
    if ('SP500' in entities || t.includes('s&p')) {
      return resolveYahooFinance('%5EGSPC', threshold)
    }
  }

  // ── SPORTS_RESULT ────────────────────────────────────────────────────────
  if (oracleType === 'SPORTS_RESULT' || t.includes('gana') || t.includes('victoria')) {
    if ('REAL_MADRID' in entities || t.includes('real madrid')) {
      return resolveFootball(86, 'Real Madrid')
    }
    if ('FC_BARCELONA' in entities || t.includes('barcelona') || t.includes('barça')) {
      return resolveFootball(81, 'FC Barcelona')
    }
    if ('ATLETICO' in entities || t.includes('atlético') || t.includes('atletico')) {
      return resolveFootball(78, 'Atlético de Madrid')
    }
    if ('SEVILLA_FC' in entities || t.includes('sevilla')) {
      return resolveFootball(559, 'Sevilla FC')
    }
  }

  // ── DATA_RELEASE ─────────────────────────────────────────────────────────
  if (oracleType === 'DATA_RELEASE') {
    if ('IPC_ES' in entities || t.includes('ipc') || t.includes('inflación')) {
      return resolveINEData('IPC', threshold || 3)
    }
  }

  // ── BOE_PUBLICATION ──────────────────────────────────────────────────────
  if (oracleType === 'BOE_PUBLICATION' || t.includes('congreso') || t.includes('ley')) {
    return resolveBOEPublication(['ley', 'decreto', 'real decreto'])
  }

  return null
}

// ─── Resolve a single market ──────────────────────────────────────────────

export async function resolveMarket(market) {
  const supabase = getSupabase()

  const oracleResult = await routeToOracle(market)

  if (!oracleResult) {
    return {
      marketId: market.id,
      title:    market.title,
      status:   'ORACLE_UNAVAILABLE',
    }
  }

  // Call existing resolve_market_manual RPC
  const { error: rErr } = await supabase.rpc('resolve_market_manual', {
    p_market_id: market.id,
    p_outcome:   oracleResult.outcome,
    p_source:    oracleResult.source,
  })

  if (rErr) {
    return { marketId: market.id, status: 'ERROR', error: rErr.message }
  }

  // Distribute winnings
  try {
    await supabase.rpc('distribute_winnings', { p_market_id: market.id })
  } catch (e) {
    console.error('[resolutionEngine] distribute_winnings error:', e.message)
  }

  // Lifecycle: CLOSING → RESOLVED
  await transitionMarket(market.id, 'RESOLVED', {
    triggeredBy: 'oracle',
    reason:      `Oracle: ${oracleResult.source.slice(0, 100)}`,
    metadata:    { outcome: oracleResult.outcome, value: oracleResult.value },
  })

  return {
    marketId:  market.id,
    title:     market.title,
    status:    'RESOLVED',
    outcome:   oracleResult.outcome,
    source:    oracleResult.source,
    value:     oracleResult.value,
  }
}

// ─── Resolve all CLOSING markets ─────────────────────────────────────────

export async function resolveClosingMarkets() {
  const supabase = getSupabase()

  // Fetch markets that are CLOSING or ACTIVE+expired
  const { data: markets, error } = await supabase
    .from('markets')
    .select('id, title, status, close_date, oracle_type, entities: source_candidate_id(*)')
    .in('status', ['CLOSING', 'ACTIVE', 'CLOSED'])
    .lt('close_date', new Date().toISOString())
    .is('resolved_outcome', null)

  if (error || !markets?.length) return { resolved: 0, pending: 0 }

  const results   = []
  const refunded  = []
  const unavailable = []

  for (const market of markets) {
    // Flatten entities from candidate record if available
    const enriched = {
      ...market,
      entities: market.entities?.entities || {},
    }

    const result = await resolveMarket(enriched)
    results.push(result)

    if (result.status === 'RESOLVED') {
      // nothing extra needed
    } else if (result.status === 'ORACLE_UNAVAILABLE') {
      // Auto-refund if market has been expired > 24h
      const expiredHours = (Date.now() - new Date(market.close_date).getTime()) / 3600000
      if (expiredHours > 24) {
        try {
          await supabase.rpc('refund_market', { p_market_id: market.id })
          await transitionMarket(market.id, 'ARCHIVED', {
            triggeredBy: 'scheduler',
            reason:      'Oracle unavailable after 24h — refunded',
          })
          refunded.push(market.id)
        } catch (e) {
          console.error('[resolutionEngine] refund error:', e.message)
        }
      } else {
        unavailable.push(market.id)
      }
    }
  }

  return {
    resolved:    results.filter(r => r.status === 'RESOLVED').length,
    refunded:    refunded.length,
    unavailable: unavailable.length,
    details:     results,
  }
}

// ─── Inject oracle result from external source (GitHub Actions / cron) ────

export async function injectOracleResult(marketId, { outcome, source, value }) {
  const supabase = getSupabase()

  const { error: rErr } = await supabase.rpc('resolve_market_manual', {
    p_market_id: marketId,
    p_outcome:   outcome,
    p_source:    source,
  })

  if (rErr) return { success: false, error: rErr.message }

  try {
    await supabase.rpc('distribute_winnings', { p_market_id: marketId })
  } catch (e) { /* non-critical */ }

  await transitionMarket(marketId, 'RESOLVED', {
    triggeredBy: 'injected',
    reason:      source,
    metadata:    { outcome, value },
  })

  return { success: true, marketId, outcome, source }
}
