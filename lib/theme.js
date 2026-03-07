// Shared design tokens, style objects, and pure utility functions
// CSS variables for layout/bg/text (theme-switchable)
// Hex values for accent/yes/no/warning (used in alpha concatenation: ${C.yes}30)

export const C = {
  // Theme-switchable via CSS vars
  bg: 'var(--bg)',
  card: 'var(--card)',
  cardAlt: 'var(--card-alt)',
  cardBorder: 'var(--card-border)',
  cardBorderHover: 'var(--card-border-hover)',
  text: 'var(--text)',
  textMuted: 'var(--text-muted)',
  textDim: 'var(--text-dim)',
  surface: 'var(--surface)',
  divider: 'var(--divider)',
  shadow: 'var(--shadow)',
  shadowHover: 'var(--shadow-hover)',
  bgBackdrop: 'var(--bg-backdrop)',

  // Fixed hex (used in alpha concat like ${C.yes}30 — must stay as hex)
  accent: '#2563eb',
  accentLight: '#60a5fa',
  yes: '#10b981',
  no: '#ef4444',
  warning: '#f59e0b',
}

export const modalStyle = {
  position: 'fixed', inset: 0,
  background: 'rgba(0,0,0,0.88)',
  backdropFilter: 'blur(20px)',
  WebkitBackdropFilter: 'blur(20px)',
  zIndex: 50, overflowY: 'auto',
  WebkitOverflowScrolling: 'touch',
}

export const panelStyle = {
  background: 'var(--card)',
  border: '1px solid var(--card-border)',
  borderRadius: 14, padding: 24,
}

export const closeBtnStyle = {
  width: 30, height: 30, borderRadius: 8, background: 'transparent',
  border: '1px solid var(--card-border)', color: 'var(--text-dim)',
  cursor: 'pointer', fontSize: 14,
  display: 'flex', alignItems: 'center', justifyContent: 'center',
  flexShrink: 0,
}

export const inputStyle = {
  width: '100%', background: 'var(--surface)',
  border: '1px solid var(--card-border)',
  borderRadius: 8, padding: '11px 14px',
  color: 'var(--text)', fontSize: 14,
  outline: 'none', boxSizing: 'border-box',
}

export function badge(color) {
  return {
    fontSize: 10, padding: '2px 7px', borderRadius: 4, fontWeight: 600,
    letterSpacing: '0.06em', textTransform: 'uppercase',
    border: `1px solid ${color}35`, color, background: `${color}0c`,
    display: 'inline-block',
  }
}

export function neutralBadge() {
  return {
    fontSize: 10, padding: '2px 7px', borderRadius: 4, fontWeight: 400,
    letterSpacing: '0.05em', textTransform: 'uppercase',
    border: '1px solid var(--card-border)', color: 'var(--text-dim)',
    background: 'transparent', display: 'inline-block',
  }
}

export function getCategoryColor(cat) {
  const map = {
    ECONOMIA: '#818cf8', POLITICA: '#fbbf24', DEPORTES: '#34d399',
    ENERGIA: '#fb923c', CLIMA: '#38bdf8', ACTUALIDAD: '#a78bfa',
    CRIPTO: '#2dd4bf', GEOPOLITICA: '#f472b6', TECNOLOGIA: '#e879f9',
  }
  return map[cat] || '#6b7280'
}

export function getCategoryLabel(cat) {
  const map = {
    ECONOMIA: 'Economia', POLITICA: 'Politica', DEPORTES: 'Deportes',
    ENERGIA: 'Energia', CLIMA: 'Clima', ACTUALIDAD: 'Actualidad',
    CRIPTO: 'Cripto', GEOPOLITICA: 'Geopolitica', TECNOLOGIA: 'Tecnologia',
  }
  return map[cat] || cat
}

export function getTimeLeft(closeDate) {
  const diff = new Date(closeDate) - new Date()
  if (diff < 0) return 'Expirado'
  const h = Math.floor(diff / 3600000), m = Math.floor((diff % 3600000) / 60000)
  if (h > 48) return `${Math.floor(h / 24)}d`
  if (h > 0) return `${h}h ${m}m`
  return `${m}m`
}

export function isExpiredDate(d) { return new Date(d) < new Date() }

export function getTypeLabel(m) {
  const t = m.market_type
  if (t === 'FLASH' || t === 'DIARIO') return 'Diario'
  if (t === 'SHORT' || t === 'SEMANAL') return 'Semanal'
  if (t === 'LONG' || t === 'MENSUAL') return 'Mensual'
  return t || ''
}

export function getTradeStatusLabel(status) {
  const map = { OPEN: 'Abierto', WON: 'Ganado', LOST: 'Perdido', SOLD: 'Vendido' }
  return map[status] || status
}

export function getTradeStatusColor(status) {
  if (status === 'WON') return C.yes
  if (status === 'LOST') return C.no
  if (status === 'SOLD') return C.accentLight
  return 'var(--text-dim)'
}

export function getOracleDescription(market) {
  const t = (market.title || '').toLowerCase()
  if (t.includes('ibex')) return { source: 'Yahoo Finance — IBEX 35', url: '', method: 'Se resuelve SI si el IBEX 35 supera el umbral o cierra en verde. Verificable tras las 17:35h.' }
  if (t.includes('luz') || t.includes('mwh') || t.includes('pvpc')) return { source: 'OMIE / REE', url: '', method: 'Se resuelve SI si el precio medio del pool electrico diario supera el umbral indicado.' }
  if (t.includes('bitcoin') || t.includes('btc')) return { source: 'CoinGecko API', url: '', method: 'Se resuelve SI si el precio de Bitcoin supera el umbral indicado a la fecha de cierre.' }
  if (t.includes('ethereum') || t.includes('eth')) return { source: 'CoinGecko API', url: '', method: 'Se resuelve SI si el precio de Ethereum supera el umbral indicado.' }
  if (t.includes('euribor') || t.includes('euribor')) return { source: 'BCE / Banco de Espana', url: '', method: 'Se resuelve SI segun el tipo Euribor 12M publicado por el BCE.' }
  if (t.includes('temperatura') || t.includes('grados') || t.includes('celsius')) return { source: 'Open-Meteo / AEMET', url: '', method: 'Se resuelve SI si la temperatura maxima supera el umbral.' }
  if (t.includes('real madrid') || t.includes('barcelona') || t.includes('atletico')) return { source: 'football-data.org', url: '', method: 'Se resuelve SI si el equipo gana su proximo partido oficial.' }
  if (t.includes('vivienda') || t.includes('idealista')) return { source: 'Idealista / INE', url: '', method: 'Se resuelve al publicarse el dato mensual de Idealista o el trimestral del INE.' }
  if (t.includes('ipc') || t.includes('inflacion')) return { source: 'INE — IPC', url: '', method: 'Se resuelve SI segun el dato de variacion del IPC publicado por el INE.' }
  if (t.includes('nvidia') || t.includes('apple') || t.includes('microsoft')) return { source: 'Yahoo Finance', url: '', method: 'Se resuelve SI segun el precio de cierre de la accion o el dato de resultados trimestrales.' }
  if (t.includes('s&p') || t.includes('sp500') || t.includes('nasdaq')) return { source: 'Yahoo Finance', url: '', method: 'Se resuelve SI segun el dato oficial de cierre del indice.' }
  if (t.includes('brent') || t.includes('petroleo')) return { source: 'Yahoo Finance (BZ=F)', url: '', method: 'Se resuelve SI si el precio del Brent supera el umbral.' }
  return { source: 'Fuente oficial publica', url: '', method: 'Resolucion basada en datos oficiales publicos y verificables.' }
}

export function computeAMMBook(yes_pool, no_pool) {
  const yp = parseFloat(yes_pool) || 5000
  const np = parseFloat(no_pool) || 5000
  const k = yp * np
  const cur = np / (yp + np) * 100
  const amts = [50, 200, 500, 2000]
  const asks = amts.map(a => {
    const np2 = np + a, yp2 = k / np2
    return { price: np2 / (yp2 + np2) * 100, amount: a, synthetic: true }
  }).filter(l => l.price > cur + 0.2 && l.price < 99).sort((a, b) => a.price - b.price)
  const bids = amts.map(a => {
    const yp2 = yp + a, np2 = k / yp2
    return { price: np2 / (yp2 + np2) * 100, amount: a, synthetic: true }
  }).filter(l => l.price < cur - 0.2 && l.price > 1).sort((a, b) => b.price - a.price)
  return { bids, asks, mid: cur }
}
