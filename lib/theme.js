// Shared design tokens, style objects, and pure utility functions
// Import these in any component that needs them

export const C = {
  bg: '#08080a',
  card: '#0f0f11',
  cardAlt: '#111114',
  cardBorder: '#1c1c20',
  cardBorderHover: '#2a2a32',
  accent: '#2563eb',
  accentLight: '#60a5fa',
  yes: '#10b981',
  no: '#ef4444',
  text: '#f4f4f5',
  textMuted: '#a1a1aa',
  textDim: '#4a4a54',
  surface: '#0a0a0c',
  warning: '#d97706',
  divider: '#16161a',
  shadow: '0 1px 3px rgba(0,0,0,0.4), 0 1px 2px rgba(0,0,0,0.3)',
  shadowHover: '0 8px 24px rgba(0,0,0,0.5), 0 2px 8px rgba(0,0,0,0.4)',
}

export const modalStyle = {
  position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.92)',
  backdropFilter: 'blur(20px)', zIndex: 50, overflowY: 'auto',
  WebkitOverflowScrolling: 'touch',
}

export const panelStyle = {
  background: C.card, border: `1px solid ${C.cardBorder}`,
  borderRadius: 12, padding: 24,
}

export const closeBtnStyle = {
  width: 28, height: 28, borderRadius: 6, background: 'transparent',
  border: `1px solid ${C.cardBorder}`, color: C.textDim, cursor: 'pointer',
  fontSize: 14, display: 'flex', alignItems: 'center', justifyContent: 'center',
  flexShrink: 0,
}

export const inputStyle = {
  width: '100%', background: C.surface, border: `1px solid ${C.cardBorder}`,
  borderRadius: 7, padding: '10px 14px', color: C.text, fontSize: 14,
  outline: 'none', boxSizing: 'border-box',
}

export function badge(color) {
  return {
    fontSize: 10, padding: '2px 7px', borderRadius: 4, fontWeight: 600,
    letterSpacing: '0.06em', textTransform: 'uppercase',
    border: `1px solid ${color}35`, color: color, background: `${color}0c`,
    display: 'inline-block',
  }
}

export function neutralBadge() {
  return {
    fontSize: 10, padding: '2px 7px', borderRadius: 4, fontWeight: 400,
    letterSpacing: '0.05em', textTransform: 'uppercase',
    border: `1px solid ${C.cardBorder}`, color: C.textDim, background: 'transparent',
    display: 'inline-block',
  }
}

export function getCategoryColor(cat) {
  const map = {
    ECONOMIA: '#818cf8', POLITICA: '#fbbf24', DEPORTES: '#34d399',
    ENERGIA: '#fb923c', CLIMA: '#38bdf8', ACTUALIDAD: '#a78bfa',
    CRIPTO: '#2dd4bf', GEOPOLITICA: '#f472b6',
  }
  return map[cat] || C.textDim
}

export function getCategoryLabel(cat) {
  const map = {
    ECONOMIA: 'Economía', POLITICA: 'Política', DEPORTES: 'Deportes',
    ENERGIA: 'Energía', CLIMA: 'Clima', ACTUALIDAD: 'Actualidad',
    CRIPTO: 'Cripto', GEOPOLITICA: 'Geopolítica',
  }
  return map[cat] || cat
}

export function getTimeLeft(closeDate) {
  const diff = new Date(closeDate) - new Date()
  if (diff < 0) return 'Expirado'
  const h = Math.floor(diff / 3600000), m = Math.floor((diff % 3600000) / 60000)
  if (h > 24) return `${Math.floor(h / 24)}d ${h % 24}h`
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
  return C.textDim
}

export function getOracleDescription(market) {
  const t = (market.title || '').toLowerCase()
  if (t.includes('ibex')) return { source: 'Yahoo Finance — IBEX 35', url: 'https://finance.yahoo.com/quote/%5EIBEX/', method: 'Se resuelve SÍ si el IBEX 35 supera el umbral o cierra en verde según dato de BME. Verificable tras las 17:35h.' }
  if (t.includes('luz') || t.includes('mwh') || t.includes('pvpc')) return { source: 'OMIE / REE apidatos', url: 'https://www.preciodelaluz.org', method: 'Se resuelve SÍ si el precio medio del pool eléctrico diario supera el umbral indicado (€/MWh). Fuente: REE.' }
  if (t.includes('bitcoin') || t.includes('btc')) return { source: 'CoinGecko API', url: 'https://www.coingecko.com', method: 'Se resuelve SÍ si el precio de Bitcoin supera el umbral indicado en USD a la fecha de cierre. Fuente: CoinGecko.' }
  if (t.includes('euríbor') || t.includes('euribor')) return { source: 'BCE / Banco de España', url: 'https://www.bde.es', method: 'Se resuelve SÍ según el tipo Euríbor 12M publicado por el BCE al cierre del período indicado.' }
  if (t.includes('grados') || t.includes('temperatura') || t.includes('°c')) return { source: 'Open-Meteo (AEMET)', url: 'https://open-meteo.com', method: 'Se resuelve SÍ si la temperatura máxima en alguna capital de provincia española supera el umbral.' }
  if (t.includes('real madrid') || t.includes('barça') || t.includes('barcelona') || t.includes('atlético')) return { source: 'football-data.org', url: 'https://www.football-data.org', method: 'Se resuelve SÍ si el equipo gana su próximo partido oficial. Empate = NO.' }
  if (t.includes('vivienda') || t.includes('idealista')) return { source: 'Idealista / INE', url: 'https://www.idealista.com/informes/', method: 'Se resuelve al publicarse el dato mensual de Idealista o el trimestral del INE.' }
  if (t.includes('ipc') || t.includes('inflación') || t.includes('inflacion')) return { source: 'INE — IPC', url: 'https://www.ine.es', method: 'Se resuelve SÍ según el dato de variación del IPC publicado por el INE para el período indicado.' }
  if (t.includes('paro') || t.includes('desempleo') || t.includes('epa')) return { source: 'INE — EPA', url: 'https://www.ine.es', method: 'Se resuelve SÍ según la tasa de paro publicada por el INE en la Encuesta de Población Activa (EPA).' }
  return { source: 'Fuente verificable', url: '', method: 'Resolución basada en datos oficiales públicos y verificables.' }
}

export function computeAMMBook(yes_pool, no_pool) {
  const yp = parseFloat(yes_pool) || 5000
  const np = parseFloat(no_pool) || 5000
  const k = yp * np
  const cur = np / (yp + np) * 100
  const amts = [50, 200, 500, 2000]
  // ASK: buying YES → NO pool grows → YES price rises
  const asks = amts.map(a => {
    const np2 = np + a, yp2 = k / np2
    return { price: np2 / (yp2 + np2) * 100, amount: a, synthetic: true }
  }).filter(l => l.price > cur + 0.2 && l.price < 99).sort((a, b) => a.price - b.price)
  // BID: buying NO → YES pool grows → YES price falls
  const bids = amts.map(a => {
    const yp2 = yp + a, np2 = k / yp2
    return { price: np2 / (yp2 + np2) * 100, amount: a, synthetic: true }
  }).filter(l => l.price < cur - 0.2 && l.price > 1).sort((a, b) => b.price - a.price)
  return { bids, asks, mid: cur }
}
