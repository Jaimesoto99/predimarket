// ============================================================
// Regulatory Filter — CNMV Sandbox Compliance
//
// Blocks market creation for sensitive, controversial or
// legally problematic topics per CNMV regulatory review.
//
// Applied as Rule R0 in marketValidator.js (runs first, before
// any DB calls or scoring) and in spainMarketCreator.js.
//
// ALLOWED categories:
//   ✓ Economic macro indicators (IBEX, CPI, Euribor, GDP)
//   ✓ Energy and climate policy (electricity price, Brent, renewables)
//   ✓ Technology and AI (stock indices, tech companies)
//   ✓ Institutional politics (laws, budget, elections — not vote outcomes)
//   ✓ Society and public policy (employment, housing, education policy)
//   ✓ Large sports tournaments (season champion, national team campaigns)
//   ✓ Cultural mainstream events (Eurovision, film awards, music charts)
//
// BLOCKED categories:
//   ✗ Bullfighting / taurine events
//   ✗ Death, illness, health status of individuals
//   ✗ Natural disasters / tragedies (framed as speculation)
//   ✗ Terrorism, violence, wars framed as bets
//   ✗ Criminal cases / court verdict speculation
//   ✗ Individual sports match results (single game)
//   ✗ Graphic accidents or human suffering
//   ✗ Death of politicians, celebrities or public figures
//   ✗ Highly polarizing cultural conflicts
// ============================================================

// ─── Blocked pattern groups ───────────────────────────────────────────────

const BLOCKED_PATTERNS = [

  // Bullfighting / taurine
  {
    reason: 'BULLFIGHTING',
    label:  'Eventos taurinos',
    test: t => /\b(toro|torero|torear|corrida|plaza\s+de\s+toros|temporada\s+taurina|novillada|matador|faena|lidia|espada\s+de\s+plata)\b/i.test(t),
  },

  // Death / health of individuals
  {
    reason: 'INDIVIDUAL_HEALTH_DEATH',
    label:  'Muerte o salud de personas',
    test: t => /\b(muer(te|a|e)\s+(de|del)\s+\w+|fallec(er|imiento|erá)\s+(el|la|los)?\s*\w+|diagn(ostic|óstic)(ar|ado)\s+con|cáncer\s+de\s+\w+|enfermedad\s+(de|del|grave)\s+\w+|hospitaliz(ado|ar)\s+\w+|pronóstico\s+de\s+vida|esperanza\s+de\s+vida\s+de)\b/i.test(t),
  },

  // Natural disasters / tragedies as speculation
  {
    reason: 'DISASTER_TRAGEDY',
    label:  'Catástrofes o tragedias',
    test: t => /\b(habrá\s+(un\s+)?(terremoto|tsunami|inundaci[oó]n|erupci[oó]n|huracán|tornado|da[ñn]a)\s+(en|de|del)?\s*\w*|muertos\s+(en|del?)\s+\w+|víctimas\s+mortales|catástrofe\s+\w+)\b/i.test(t),
  },

  // Terrorism, political violence
  {
    reason: 'TERRORISM_VIOLENCE',
    label:  'Terrorismo o violencia política',
    test: t => /\b(atentado|terrorista|yihadista|eta\s+|ataque\s+(suicida|terrorista)|bomba(rdeo)?\s+(en|contra)|asesinato\s+(político|de\s+(un\s+)?ministro)|golpe\s+de\s+estado)\b/i.test(t),
  },

  // Criminal cases / court verdicts
  {
    reason: 'CRIMINAL_VERDICT',
    label:  'Casos penales o veredictos judiciales',
    test: t => /\b(culpable\s+o\s+inocente|veredicto\s+(del?\s+)?jurado|condenado\s+(a|por)\s+\w+|absuelto\s+(de|por)|pena\s+(de\s+)?prisi[oó]n\s+(para|de)\s+\w+|sentencia\s+(condenatoria|absolutoria)\s+(para|del?)\s+\w+|juicio\s+oral\s+(contra|de)\s+\w+)\b/i.test(t),
  },

  // Individual sports match results (single game)
  // NOT blocked: season champion, national team campaigns, tournaments
  {
    reason: 'INDIVIDUAL_MATCH_BETTING',
    label:  'Resultado de partido individual',
    test: t => /\b(gana(r[aá]|rá)?\s+(su\s+)?(próximo\s+)?(partido|encuentro|match)\s+(oficial|de\s+\w+)?|vence\s+a\s+\w+\s+en\s+(el\s+)?(partido|encuentro)|resultado\s+(del?\s+)?partido\s+(entre|de)\s+\w+|marcador\s+(final|del\s+partido)|gol\s+(en|ante)\s+\w+\s+(esta\s+semana|mañana|el\s+\w+))\b/i.test(t),
  },

  // Death of public figures as betting topic
  {
    reason: 'PUBLIC_FIGURE_DEATH',
    label:  'Muerte de figura pública',
    test: t => /\b(mori(r[aá]|rá)\s+(el|la|los|este\s+año)|fallecerá\s+(el|la|antes\s+de)|cuándo\s+morirá|esperanza\s+de\s+vida\s+(del?\s+)?president|presidente.*muer|rey\s+.*muer)\b/i.test(t),
  },

  // Human suffering / accidents as speculation
  {
    reason: 'HUMAN_SUFFERING',
    label:  'Sufrimiento humano o accidentes graves',
    test: t => /\b(accidente\s+(aéreo|ferroviario|nuclear|industrial)\s+(en|de)\s+\w+\s+(matr[aá]|causará|dejará)|víctimas\s+(del?\s+)?(accidente|incendio|explosión)|naufragio\s+(causará|dejará|habrá))\b/i.test(t),
  },

  // Highly polarizing cultural conflicts (identity, religion, sexuality framed as bets)
  {
    reason: 'POLARIZING_CULTURAL',
    label:  'Conflictos culturales polarizantes',
    test: t => /\b(el\s+aborto\s+(será|quedará|se\s+ilegaliz)|la\s+iglesia\s+cató(lica)?\s+(obligará|impondrá)|islam\s+(prohibirá|legaliz)|matrimonio\s+gay\s+(se\s+prohibirá|será\s+ilegal)|trans.*prohib(ir|ición)|identidad\s+de\s+género\s+será\s+(ilegal|prohibida))\b/i.test(t),
  },
]

// ─── Blocked Spain event types (from spainEventDetector.js) ──────────────

const BLOCKED_SPAIN_EVENT_TYPES = new Set([
  // None of the 6 Spain event types are fully blocked, but
  // individual matches within DEPORTE_ES are blocked via text patterns above.
])

// ─── Allowed sports scope (explicit allowlist) ────────────────────────────
// When a market is sports-related, it MUST match one of these to be allowed.

const ALLOWED_SPORTS_PATTERNS = [
  // Tournament/season outcomes
  /\b(temporada|campe[oó]n|t[íi]tulo|gana\s+(la\s+liga|la\s+champions|la\s+copa|el\s+mundial|el\s+torneo|la\s+liga\s+de\s+naciones)|liga\s+2[0-9]{3,4}|clasificar(se)?\s+(para|al)\s+(mundial|eurocopa|olimpiadas))\b/i,
  // National team campaigns
  /\b(selecci[oó]n\s+(espa[nñ]ola|nacional)|espa[nñ]a\s+(en\s+)?(el\s+)?mundial|eurocopa|nations\s+league|liga\s+de\s+naciones)\b/i,
  // Cultural sports events explicitly allowed
  /\b(eurovision|eurovisión|premios\s+goya|oscar|bafta|globo\s+de\s+oro)\b/i,
  // Tour de France, Grand Slam (tournament-level)
  /\b(tour\s+de\s+france|grand\s+slam|wimbledon|roland\s+garros|us\s+open|australian\s+open|masters\s+de\s+)\b/i,
  // Formula 1 constructor championship, season standings
  /\b(campeonato\s+(mundial\s+)?(de\s+)?(f[oó]rmula\s+1|f1|motogp)|temporada\s+(f1|motogp|formula))\b/i,
]

// ─── Core check function ──────────────────────────────────────────────────

/**
 * Checks if a market title/question violates regulatory rules.
 *
 * @param {string} question  — market title or question text
 * @param {object} opts
 * @param {string} opts.category  — market category key (e.g. 'DEPORTES')
 * @param {string} opts.spainEventType — Spain event type if applicable
 * @returns {{ blocked: boolean, reason: string|null, label: string|null }}
 */
export function checkRegulatory(question, { category = '', spainEventType = '' } = {}) {
  const text = (question || '').toLowerCase()

  // Check each blocked pattern
  for (const pattern of BLOCKED_PATTERNS) {
    if (pattern.test(question)) {
      return {
        blocked: true,
        reason:  pattern.reason,
        label:   pattern.label,
      }
    }
  }

  // Sports markets: require allowlist match
  const isSports = category === 'DEPORTES' || /\bdeport(es|ivo)|fútbol|tenis|baloncesto|atletismo\b/i.test(text)
  if (isSports) {
    const isAllowed = ALLOWED_SPORTS_PATTERNS.some(p => p.test(question))
    if (!isAllowed) {
      return {
        blocked: true,
        reason:  'SPORTS_NOT_TOURNAMENT_LEVEL',
        label:   'Mercado deportivo fuera del alcance permitido (solo torneos, selección, campeonatos)',
      }
    }
  }

  return { blocked: false, reason: null, label: null }
}

/**
 * Validate a market candidate object (compatible with marketValidator.js interface).
 * Returns a rule result object: { rule, passed, message? }
 */
export function regulatoryValidationRule(candidate) {
  const question = candidate.question || candidate.title || ''
  const category = candidate.category || ''
  const spainEventType = candidate.spain_event_type || candidate.spain_category || ''

  const result = checkRegulatory(question, { category, spainEventType })

  if (result.blocked) {
    return {
      rule:    'R0_REGULATORY',
      passed:  false,
      message: `Bloqueado por cumplimiento regulatorio (CNMV): ${result.label}`,
      details: { reason: result.reason },
    }
  }

  return { rule: 'R0_REGULATORY', passed: true }
}

/**
 * Quick boolean check — use in Spain pipeline before template building.
 */
export function isRegulatoryAllowed(question, opts) {
  return !checkRegulatory(question, opts).blocked
}

// ─── Log blocked attempt ──────────────────────────────────────────────────

export function logBlocked(question, result) {
  console.log(`[regulatory] BLOCKED — ${result.reason}: "${(question || '').slice(0, 80)}"`)
}
