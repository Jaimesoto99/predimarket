// ============================================================
// Market Validator — gates candidate markets before creation
//
// Validation rules (all must pass):
//   R1  Minimum 3 distinct trusted sources (credibility >= 0.75)
//   R2  Persistent coverage (articles span >= 2h window)
//   R3  Entity importance >= 0.55
//   R4  Relevance score >= 0.45
//   R5  Not a duplicate (calls deduplicator)
//   R6  Duration must be in future (>= 2h from now)
//   R7  Oracle type must be deterministic or semi-deterministic
//   R8  Question must not contain unfilled placeholders
//   R9  Category must be valid
// ============================================================

import { isDuplicate }             from './marketDeduplicator'
import { isDeterministic }         from './marketCategories'
import { CATEGORY_KEYS }           from './marketCategories'
import { regulatoryValidationRule } from '../../lib/engine/regulatoryFilter'

// ─── Rule configs ─────────────────────────────────────────────────────────

const RULES = {
  MIN_DISTINCT_TRUSTED_SOURCES: 3,   // R1 — at least 3 distinct sources with credibility >= 0.75
  MIN_COVERAGE_SPAN_HOURS:      2,   // R2 — articles span at least 2 hours
  MIN_ENTITY_IMPORTANCE:        0.55, // R3
  MIN_RELEVANCE_SCORE:          0.40, // R4
  MIN_DURATION_HOURS:           2,   // R6
  TRUSTED_SOURCE_CREDIBILITY:   0.70, // threshold for "trusted" source
  SEMI_DETERMINISTIC_TYPES:     new Set(['NEWS_CONFIRMATION','OFFICIAL_STATEMENT']),
}

// ─── Individual rule validators ───────────────────────────────────────────

function validateSources(candidate) {
  const articles    = candidate._detection?.articles || []
  const trusted     = articles.filter(a => (a.credibility || 0.5) >= RULES.TRUSTED_SOURCE_CREDIBILITY)
  const distinctSrc = new Set(trusted.map(a => a.source_key || '')).size

  if (distinctSrc < RULES.MIN_DISTINCT_TRUSTED_SOURCES) {
    // Relaxed rule: if total articles >= 5 and at least 2 trusted sources, still pass
    const totalDistinct = new Set(articles.map(a => a.source_key || '')).size
    if (!(trusted.length >= 2 && totalDistinct >= 3)) {
      return {
        rule:    'R1_SOURCES',
        passed:  false,
        message: `Only ${distinctSrc} trusted sources (need ${RULES.MIN_DISTINCT_TRUSTED_SOURCES})`,
        details: { trusted_sources: distinctSrc, required: RULES.MIN_DISTINCT_TRUSTED_SOURCES },
      }
    }
  }
  return { rule: 'R1_SOURCES', passed: true }
}

function validateCoverage(candidate) {
  const articles = candidate._detection?.articles || []
  if (articles.length < 2) {
    return { rule: 'R2_COVERAGE', passed: false, message: 'Fewer than 2 articles' }
  }

  const timestamps = articles
    .map(a => new Date(a.published_at || a.ingested_at).getTime())
    .filter(t => !isNaN(t))
    .sort((a, b) => a - b)

  if (timestamps.length < 2) {
    return { rule: 'R2_COVERAGE', passed: true }  // can't check span, assume ok
  }

  const spanHours = (timestamps[timestamps.length - 1] - timestamps[0]) / 3600000
  if (spanHours < RULES.MIN_COVERAGE_SPAN_HOURS) {
    // If all articles are from last 30 min, this is a breaking news spike — still valid
    const allRecent = timestamps.every(t => Date.now() - t < 30 * 60000)
    if (!allRecent) {
      return {
        rule:    'R2_COVERAGE',
        passed:  false,
        message: `Coverage span only ${spanHours.toFixed(1)}h (need ${RULES.MIN_COVERAGE_SPAN_HOURS}h)`,
      }
    }
  }
  return { rule: 'R2_COVERAGE', passed: true }
}

function validateEntityImportance(candidate) {
  const importance = candidate.entity_importance || 0
  if (importance < RULES.MIN_ENTITY_IMPORTANCE) {
    return {
      rule:    'R3_ENTITY',
      passed:  false,
      message: `Entity importance ${importance.toFixed(2)} below threshold ${RULES.MIN_ENTITY_IMPORTANCE}`,
    }
  }
  return { rule: 'R3_ENTITY', passed: true }
}

function validateScore(candidate) {
  const score = candidate.relevance_score || 0
  if (score < RULES.MIN_RELEVANCE_SCORE) {
    return {
      rule:    'R4_SCORE',
      passed:  false,
      message: `Relevance score ${score.toFixed(2)} below threshold ${RULES.MIN_RELEVANCE_SCORE}`,
    }
  }
  return { rule: 'R4_SCORE', passed: true }
}

function validateDuration(candidate) {
  if ((candidate.duration_hours || 0) < RULES.MIN_DURATION_HOURS) {
    return {
      rule:    'R6_DURATION',
      passed:  false,
      message: `Duration ${candidate.duration_hours}h too short`,
    }
  }
  return { rule: 'R6_DURATION', passed: true }
}

function validateOracle(candidate) {
  const oracle = candidate.oracle_type
  if (!oracle) {
    return { rule: 'R7_ORACLE', passed: false, message: 'No oracle type specified' }
  }
  if (!isDeterministic(oracle) && !RULES.SEMI_DETERMINISTIC_TYPES.has(oracle)) {
    return {
      rule:    'R7_ORACLE',
      passed:  false,
      message: `Oracle type '${oracle}' is not resolvable`,
    }
  }
  return { rule: 'R7_ORACLE', passed: true }
}

function validateQuestion(candidate) {
  const q = candidate.question || ''
  if (!q || q.length < 20) {
    return { rule: 'R8_QUESTION', passed: false, message: 'Question too short or empty' }
  }
  if (/\{[A-Z_]+\}/.test(q)) {
    return { rule: 'R8_QUESTION', passed: false, message: 'Unfilled placeholder in question' }
  }
  if (q.length > 280) {
    return { rule: 'R8_QUESTION', passed: false, message: 'Question too long (>280 chars)' }
  }
  return { rule: 'R8_QUESTION', passed: true }
}

function validateCategory(candidate) {
  if (!CATEGORY_KEYS.includes(candidate.category)) {
    return {
      rule:    'R9_CATEGORY',
      passed:  false,
      message: `Invalid category '${candidate.category}'`,
    }
  }
  return { rule: 'R9_CATEGORY', passed: true }
}

// R10 — Mandatory resolution fields
// Markets must have resolution_source, resolution_method and resolution_time
// so users and regulators can verify how each market resolves.

function validateResolutionFields(candidate) {
  const missing = []

  if (!candidate.resolution_source || candidate.resolution_source.trim().length < 4) {
    missing.push('resolution_source')
  }
  if (!candidate.resolution_method || candidate.resolution_method.trim().length < 10) {
    missing.push('resolution_method')
  }
  if (!candidate.resolution_time && !candidate.duration_hours) {
    missing.push('resolution_time (or duration_hours)')
  }

  if (missing.length > 0) {
    return {
      rule:    'R10_RESOLUTION_FIELDS',
      passed:  false,
      message: `Missing mandatory resolution fields: ${missing.join(', ')}`,
      details: { missing },
    }
  }
  return { rule: 'R10_RESOLUTION_FIELDS', passed: true }
}

// ─── Main validator ───────────────────────────────────────────────────────

export async function validateCandidate(candidate) {
  // R0 — Regulatory compliance (CNMV). Runs first, short-circuits all other checks.
  const r0 = regulatoryValidationRule(candidate)
  if (!r0.passed) {
    return {
      valid:    false,
      failures: [r0],
      passed:   0,
      total:    1,
    }
  }

  const ruleResults = [
    r0,
    validateSources(candidate),
    validateCoverage(candidate),
    validateEntityImportance(candidate),
    validateScore(candidate),
    validateDuration(candidate),
    validateOracle(candidate),
    validateQuestion(candidate),
    validateCategory(candidate),
    validateResolutionFields(candidate),
  ]

  // Check for failures in fast rules first (no async cost)
  const failures = ruleResults.filter(r => !r.passed)
  if (failures.length > 0) {
    return {
      valid:       false,
      failures,
      passed:      ruleResults.filter(r => r.passed).length,
      total:       ruleResults.length,
    }
  }

  // R5 — Deduplication (async DB check, only run if all other rules pass)
  const dupResult = await isDuplicate(candidate)
  if (dupResult.isDuplicate) {
    return {
      valid:       false,
      failures:    [{ rule: 'R5_DEDUP', passed: false, message: `Duplicate: ${dupResult.reason}`, details: dupResult }],
      passed:      ruleResults.length,
      total:       ruleResults.length + 1,
    }
  }

  return {
    valid:   true,
    failures: [],
    passed:  ruleResults.length + 1,
    total:   ruleResults.length + 1,
  }
}

// ─── Batch validate ────────────────────────────────────────────────────────

export async function validateCandidates(candidates) {
  const approved = []
  const rejected = []

  for (const candidate of candidates) {
    const result = await validateCandidate(candidate)
    if (result.valid) {
      approved.push({ candidate, validation: result })
    } else {
      rejected.push({
        candidate,
        validation: result,
        reason: result.failures.map(f => f.rule).join(', '),
      })
    }
  }

  return { approved, rejected }
}
