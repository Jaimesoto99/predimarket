// ============================================================
// Spain Event Detector — classifies news items into Spanish event types
//
// Event types:
//   POLITICA_ES   — Spanish politics (laws, elections, government)
//   ECONOMIA_ES   — Spanish economy (INE data, BOE, financial)
//   DEPORTE_ES    — Spanish sports (La Liga, Champions, tennis, F1)
//   CULTURA_ES    — Culture & society (music, cinema, TV, social)
//   LA_PLAZA      — Public square: strikes, accidents, disasters, viral
//   INTERNACIONAL_ES — Spain's international role (NATO, EU, diplomacy)
// ============================================================

export const SPAIN_EVENT_TYPES = {
  POLITICA_ES:      'POLITICA_ES',
  ECONOMIA_ES:      'ECONOMIA_ES',
  DEPORTE_ES:       'DEPORTE_ES',
  CULTURA_ES:       'CULTURA_ES',
  LA_PLAZA:         'LA_PLAZA',
  INTERNACIONAL_ES: 'INTERNACIONAL_ES',
  IRRELEVANT:       'IRRELEVANT',
}

// ─── Detection rules (ordered: first match wins) ──────────────────────────

const DETECTION_RULES = [
  {
    type: SPAIN_EVENT_TYPES.POLITICA_ES,
    test: text => /gobierno\s+espa|congreso.*diputados|psoe|partido popular|vox|sánchez|sanchez|elecciones.*espa|moción.*censura|boe\s+public|decreto.*consejo|senado\s+esp|parlament|generalitat|xunta|junta\s+de|comunidad.*autónom|presupuestos.*estado|ley\s+orgánica/i.test(text),
  },
  {
    type: SPAIN_EVENT_TYPES.ECONOMIA_ES,
    test: text => /ibex\s*35|bolsa.*madrid|precio.*luz|pvpc|ree\s+|red eléctrica|ipc.*espa|inflaci[oó]n.*espa|ine.*publica|euríbor.*baja|banco\s+de\s+espa|desempleo.*espa|paro.*espa|pib.*espa|salario\s+m[ií]nimo|smi|erte|hacienda\s+espa|agencia\s+tributaria/i.test(text),
  },
  {
    type: SPAIN_EVENT_TYPES.DEPORTE_ES,
    test: text => /real\s+madrid|fc\s+barcelona|barça|atlético|atletico\s+de\s+madrid|sevilla\s+fc|laliga|la\s+liga\s+esp|copa\s+del\s+rey|champions.*madrid|champions.*barça|selección\s+espa|roja\s+espa|tennis.*espa|carlos\s+alcaraz|nadal|motogp.*espa|gp\s+espa|formula\s+1.*circuit/i.test(text),
  },
  {
    type: SPAIN_EVENT_TYPES.CULTURA_ES,
    test: text => /eurovision|rosalía|rosalia|c\.tangana|bad\s+gyal|bizarrap|festival\s+de\s+|premios\s+goya|premios\s+feroz|oscar.*espa|cinema\s+esp|serie\s+espa|netflix.*espa|movistar.*serie|toros|corrida|flamenco|feria.*sevilla|san\s+fermín|semana\s+santa|fallas|romerías|carnaval.*esp/i.test(text),
  },
  {
    type: SPAIN_EVENT_TYPES.LA_PLAZA,
    test: text => /huelga\s+(general|de\s+transporte|taxi|sanidad|educac)|manifestaci[oó]n\s+en\s+madrid|protesta.*españa|incendio.*españa|inundaci[oó]n.*españa|dana|terremoto.*espa|accidente.*muerte|emergencia.*espa|alerta.*roja.*espa|calima|ola\s+de\s+calor|temperatura.*récord.*espa/i.test(text),
  },
  {
    type: SPAIN_EVENT_TYPES.INTERNACIONAL_ES,
    test: text => /espa[nñ]a.*otan|espa[nñ]a.*nato|espa[nñ]a.*ue\b|espa[nñ]a.*uni[oó]n.*europea|sánchez.*europa|gobierno.*europa|espa[nñ]a.*marruecos|espa[nñ]a.*estados\s+unidos/i.test(text),
  },
]

// ─── Confidence scoring ───────────────────────────────────────────────────

const CONFIDENCE_BOOSTERS = {
  POLITICA_ES:      ['congreso', 'senado', 'ley', 'decreto', 'gobierno', 'ministro', 'partido'],
  ECONOMIA_ES:      ['ibex', 'precio', 'inflacion', 'ipc', 'paro', 'pib', 'hacienda'],
  DEPORTE_ES:       ['gol', 'partido', 'liga', 'champions', 'entrenador', 'jugador', 'victoria'],
  CULTURA_ES:       ['cancion', 'pelicula', 'serie', 'festival', 'premio', 'artista'],
  LA_PLAZA:         ['muerto', 'herido', 'huelga', 'manifestacion', 'emergencia', 'alerta'],
  INTERNACIONAL_ES: ['cumbre', 'acuerdo', 'reunion', 'diplomacia', 'embajada'],
}

function computeConfidence(type, text) {
  const boosters = CONFIDENCE_BOOSTERS[type] || []
  const lower    = text.toLowerCase()
  const hits     = boosters.filter(b => lower.includes(b)).length
  return Math.min(1, 0.6 + hits * 0.08)
}

// ─── Main classifier ──────────────────────────────────────────────────────

export function classifySpainEvent(article) {
  const text = `${article.title || ''} ${article.description || ''}`.slice(0, 600)

  for (const rule of DETECTION_RULES) {
    if (rule.test(text)) {
      return {
        event_type:    rule.type,
        confidence:    computeConfidence(rule.type, text),
        spain_relevant: true,
      }
    }
  }

  // Check if article is Spain-related at all
  const isSpainRelated = /espa[nñ]|madrid|barcelona|sevilla|valencia|bilbao|catalans|español/i.test(text)

  return {
    event_type:     SPAIN_EVENT_TYPES.IRRELEVANT,
    confidence:     0,
    spain_relevant: isSpainRelated,
  }
}

// ─── Batch classify ───────────────────────────────────────────────────────

export function classifySpainArticles(articles) {
  return articles.map(article => {
    const classification = classifySpainEvent(article)
    return {
      ...article,
      spain_event_type: classification.event_type,
      spain_confidence: classification.confidence,
      spain_relevant:   classification.spain_relevant,
    }
  }).filter(a => a.spain_event_type !== SPAIN_EVENT_TYPES.IRRELEVANT)
}

// ─── Resolution source for each category ─────────────────────────────────

export const SPAIN_RESOLUTION_SOURCES = {
  POLITICA_ES:      { source: 'BOE / Congreso de los Diputados', method: 'Resolución oficial publicada en BOE o comunicado del Congreso.' },
  ECONOMIA_ES:      { source: 'INE / Banco de España / REE',     method: 'Dato publicado por el Instituto Nacional de Estadística, Banco de España o Red Eléctrica de España.' },
  DEPORTE_ES:       { source: 'La Liga / UEFA / RFEF',            method: 'Resultado oficial publicado por el organismo deportivo correspondiente.' },
  CULTURA_ES:       { source: 'Fuente oficial del evento',        method: 'Resultado o anuncio oficial del evento cultural o artístico.' },
  LA_PLAZA:         { source: 'Medios nacionales verificados',    method: 'Confirmación por al menos 3 medios de comunicación nacionales verificados.' },
  INTERNACIONAL_ES: { source: 'Gobierno de España / MAEC',       method: 'Comunicado oficial del Ministerio de Asuntos Exteriores o del Gobierno de España.' },
}
