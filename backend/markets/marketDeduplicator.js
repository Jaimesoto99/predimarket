// ============================================================
// Market Deduplicator — prevents creation of duplicate markets
//
// Three dedup layers:
//   1. Entity-based  — same entity + same oracle_type in last 7d
//   2. Semantic      — title word overlap >= threshold
//   3. Time-window   — same template + entity created in last 48h
// ============================================================

import { createClient } from '@supabase/supabase-js'

function getSupabase() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY
  )
}

// ─── Text normalization ───────────────────────────────────────────────────

function norm(str) {
  return (str || '')
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')        // strip accents
    .replace(/[¿?¡!.,;:()\[\]{}'"]/g, ' ')  // strip punctuation
    .replace(/\s+/g, ' ')
    .trim()
}

// Extract significant words (length > 3, not stopwords)
const STOPWORDS = new Set([
  'que', 'los', 'las', 'del', 'por', 'con', 'para', 'una', 'este', 'esta',
  'como', 'son', 'mas', 'esta', 'ser', 'sus', 'hay', 'todo', 'pero', 'muy',
  'sin', 'sobre', 'hasta', 'desde', 'entre', 'cuando', 'tiene', 'cada',
  'will', 'the', 'and', 'for', 'are', 'its', 'this', 'that', 'with',
])

function significantWords(str) {
  return norm(str)
    .split(' ')
    .filter(w => w.length > 3 && !STOPWORDS.has(w))
}

// ─── Semantic similarity ──────────────────────────────────────────────────

function semanticSimilarity(titleA, titleB) {
  const wordsA = new Set(significantWords(titleA))
  const wordsB = new Set(significantWords(titleB))

  if (wordsA.size === 0 || wordsB.size === 0) return 0

  // Check numbers: titles with same structure but different thresholds are NOT duplicates
  const numbersA = (titleA.match(/[\d.,]+/g) || []).map(n => parseFloat(n.replace(/\./g,'').replace(',','.')))
  const numbersB = (titleB.match(/[\d.,]+/g) || []).map(n => parseFloat(n.replace(/\./g,'').replace(',','.')))

  const hasSignificantNumbers = numbersA.some(n => n > 100) && numbersB.some(n => n > 100)
  if (hasSignificantNumbers) {
    const numMatch = numbersA.some(a => numbersB.some(b => Math.abs(a - b) / Math.max(a, b) < 0.02))
    if (!numMatch) return 0  // Different thresholds → distinct markets
  }

  // Jaccard-like word overlap
  let overlap = 0
  for (const w of wordsA) {
    if (wordsB.has(w)) overlap++
  }
  return overlap / Math.max(wordsA.size, wordsB.size)
}

const SEMANTIC_THRESHOLD = 0.45  // 45% word overlap = duplicate

// ─── Entity-based dedup ────────────────────────────────────────────────────

function entityKey(entityNames, oracle_type) {
  return [...entityNames].sort().join('|') + ':' + oracle_type
}

// ─── Main deduplication check ────────────────────────────────────────────

export async function isDuplicate(candidate) {
  const supabase = getSupabase()
  const since7d  = new Date(Date.now() - 7 * 24 * 3600000).toISOString()

  // Fetch active/candidate markets from last 7 days
  const { data: existingMarkets } = await supabase
    .from('markets')
    .select('id, title, category, status')
    .in('status', ['CANDIDATE','ACTIVE','CLOSED'])
    .gte('open_date', since7d)

  const { data: existingCandidates } = await supabase
    .from('market_candidates')
    .select('id, question, entities, oracle_type, template_id, created_at')
    .in('status', ['PENDING','APPROVED','CREATED'])
    .gte('created_at', since7d)

  const allTitles = [
    ...(existingMarkets || []).map(m => m.title),
    ...(existingCandidates || []).map(c => c.question),
  ]

  // Layer 1: semantic similarity against existing titles
  for (const existing of allTitles) {
    const sim = semanticSimilarity(candidate.question, existing)
    if (sim >= SEMANTIC_THRESHOLD) {
      return {
        isDuplicate: true,
        reason:      'semantic_match',
        similarity:  sim,
        matchedTitle: existing,
      }
    }
  }

  // Layer 2: entity + oracle_type match (same entity, same question type)
  const candidateEntityNames = Object.keys(candidate.entities || {})
  const candidateKey = entityKey(candidateEntityNames, candidate.oracle_type)

  for (const c of (existingCandidates || [])) {
    const existingNames = Object.keys(c.entities || {})
    const existingKey   = entityKey(existingNames, c.oracle_type)

    if (candidateKey === existingKey) {
      // Same entity set + same oracle type = duplicate
      const ageHours = (Date.now() - new Date(c.created_at).getTime()) / 3600000
      if (ageHours < 48) {
        return {
          isDuplicate:    true,
          reason:         'entity_oracle_match',
          matchedTitle:   c.question,
          existingId:     c.id,
        }
      }
    }
  }

  // Layer 3: template + primary entity match within 48h
  for (const c of (existingCandidates || [])) {
    if (c.template_id !== candidate.templateId) continue
    const existingNames = Object.keys(c.entities || {})
    const shared = candidateEntityNames.filter(n => existingNames.includes(n))
    if (shared.length > 0) {
      const ageHours = (Date.now() - new Date(c.created_at).getTime()) / 3600000
      if (ageHours < 48) {
        return {
          isDuplicate:    true,
          reason:         'template_entity_match',
          matchedTitle:   c.question,
          sharedEntities: shared,
        }
      }
    }
  }

  return { isDuplicate: false }
}

// ─── Batch dedup: filter a list of candidates against each other + DB ────

export async function deduplicateCandidates(candidates) {
  const kept     = []
  const rejected = []
  const seenKeys = new Set()

  for (const candidate of candidates) {
    // Check within-batch dedup first (fast, no DB)
    const batchKey = candidate.question.toLowerCase().slice(0, 60)
    if (seenKeys.has(batchKey)) {
      rejected.push({ candidate, reason: 'batch_duplicate' })
      continue
    }

    // DB check
    const result = await isDuplicate(candidate)
    if (result.isDuplicate) {
      rejected.push({ candidate, reason: result.reason, match: result.matchedTitle })
    } else {
      kept.push(candidate)
      seenKeys.add(batchKey)
    }
  }

  return { kept, rejected }
}
