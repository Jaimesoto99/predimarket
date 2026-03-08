// ============================================================
// Source Registry — trusted news sources for signal ingestion
// Each source has: key, label, url, type, category, language,
//                  credibility (0-1), refreshMinutes
// ============================================================

export const SOURCES = [
  // ── ECONOMY / FINANCE ───────────────────────────────────────────────────
  {
    key:            'expansion_portada',
    label:          'Expansión',
    url:            'https://e00-expansion.uecdn.es/rss/portada.xml',
    type:           'rss',
    category:       'ECONOMIA',
    language:       'es',
    credibility:    0.90,
    refreshMinutes: 15,
    active:         true,
  },
  {
    key:            'expansion_mercados',
    label:          'Expansión — Mercados',
    url:            'https://e00-expansion.uecdn.es/rss/mercados.xml',
    type:           'rss',
    category:       'ECONOMIA',
    language:       'es',
    credibility:    0.90,
    refreshMinutes: 15,
    active:         true,
  },
  {
    key:            'cincodias',
    label:          'Cinco Días',
    url:            'https://cincodias.elpais.com/seccion/rss/mercados/',
    type:           'rss',
    category:       'ECONOMIA',
    language:       'es',
    credibility:    0.88,
    refreshMinutes: 20,
    active:         true,
  },
  {
    key:            'eleconomista_mercados',
    label:          'El Economista — Mercados',
    url:            'https://www.eleconomista.es/rss/rss-mercados.php',
    type:           'rss',
    category:       'ECONOMIA',
    language:       'es',
    credibility:    0.85,
    refreshMinutes: 20,
    active:         true,
  },
  {
    key:            'elpais_economia',
    label:          'El País — Economía',
    url:            'https://feeds.elpais.com/mrss-s/pages/ep/site/elpais.com/section/economia/portada',
    type:           'rss',
    category:       'ECONOMIA',
    language:       'es',
    credibility:    0.88,
    refreshMinutes: 20,
    active:         true,
  },

  // ── CRYPTO ──────────────────────────────────────────────────────────────
  {
    key:            'coindesk',
    label:          'CoinDesk',
    url:            'https://www.coindesk.com/arc/outboundfeeds/rss/',
    type:           'rss',
    category:       'CRIPTO',
    language:       'en',
    credibility:    0.85,
    refreshMinutes: 10,
    active:         true,
  },
  {
    key:            'cointelegraph',
    label:          'CoinTelegraph',
    url:            'https://cointelegraph.com/rss',
    type:           'rss',
    category:       'CRIPTO',
    language:       'en',
    credibility:    0.80,
    refreshMinutes: 10,
    active:         true,
  },

  // ── SPORTS ──────────────────────────────────────────────────────────────
  {
    key:            'marca_portada',
    label:          'Marca',
    url:            'https://www.marca.com/rss/portada.xml',
    type:           'rss',
    category:       'DEPORTES',
    language:       'es',
    credibility:    0.82,
    refreshMinutes: 20,
    active:         true,
  },
  {
    key:            'as_futbol',
    label:          'AS — Fútbol',
    url:            'https://as.com/rss/tags/noticias.xml',
    type:           'rss',
    category:       'DEPORTES',
    language:       'es',
    credibility:    0.80,
    refreshMinutes: 20,
    active:         true,
  },

  // ── POLITICS ────────────────────────────────────────────────────────────
  {
    key:            'elpais_espana',
    label:          'El País — España',
    url:            'https://feeds.elpais.com/mrss-s/pages/ep/site/elpais.com/section/espana/portada',
    type:           'rss',
    category:       'POLITICA',
    language:       'es',
    credibility:    0.85,
    refreshMinutes: 30,
    active:         true,
  },
  {
    key:            'elmundo_espana',
    label:          'El Mundo — España',
    url:            'https://e00-elmundo.uecdn.es/rss/espana.xml',
    type:           'rss',
    category:       'POLITICA',
    language:       'es',
    credibility:    0.82,
    refreshMinutes: 30,
    active:         true,
  },

  // ── ENERGY ──────────────────────────────────────────────────────────────
  {
    key:            'energynews_es',
    label:          'Energía News España',
    url:            'https://www.energynews.es/feed/',
    type:           'rss',
    category:       'ENERGIA',
    language:       'es',
    credibility:    0.78,
    refreshMinutes: 30,
    active:         true,
  },

  // ── CURRENT AFFAIRS ─────────────────────────────────────────────────────
  {
    key:            'elpais_portada',
    label:          'El País — Portada',
    url:            'https://feeds.elpais.com/mrss-s/pages/ep/site/elpais.com/portada',
    type:           'rss',
    category:       'ACTUALIDAD',
    language:       'es',
    credibility:    0.88,
    refreshMinutes: 15,
    active:         true,
  },
  {
    key:            'boe_leyes',
    label:          'BOE — Leyes y disposiciones',
    url:            'https://www.boe.es/rss/channel.php?c=1',
    type:           'rss',
    category:       'POLITICA',
    language:       'es',
    credibility:    1.00,   // official government source
    refreshMinutes: 60,
    active:         true,
  },
]

// Fast lookup by key
export const SOURCE_MAP = Object.fromEntries(SOURCES.map(s => [s.key, s]))

// Filter active sources by category
export function getSourcesByCategory(category) {
  return SOURCES.filter(s => s.active && s.category === category)
}

// All active sources
export function getActiveSources() {
  return SOURCES.filter(s => s.active)
}
