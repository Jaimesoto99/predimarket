// ─── Design tokens ────────────────────────────────────────────────────────────
// CSS vars for theme-switchable properties (bg, card, text)
// Hex values for fixed accent/status colors used in alpha concat: ${C.yes}20

export const C = {
  // Theme-switchable via CSS vars
  bg:              'var(--bg)',
  card:            'var(--card)',
  cardAlt:         'var(--card-alt)',
  cardBorder:      'var(--card-border)',
  cardBorderHover: 'var(--card-border-hover)',
  text:            'var(--text)',
  textMuted:       'var(--text-muted)',
  textDim:         'var(--text-dim)',
  surface:         'var(--surface)',
  divider:         'var(--divider)',
  shadow:          'var(--shadow)',
  shadowHover:     'var(--shadow-hover)',
  bgBackdrop:      'var(--bg-backdrop)',

  // Fixed hex — neutral fintech palette
  accent:      '#111111',   // primary: near-black neutral
  accentLight: '#374151',   // secondary neutral
  yes:         '#16A34A',   // success green
  no:          '#DC2626',   // danger red
  warning:     '#F59E0B',   // amber accent
}

// ─── Layer styles ─────────────────────────────────────────────────────────────

export const modalStyle = {
  position: 'fixed', inset: 0,
  background: 'rgba(15,23,42,0.7)',
  backdropFilter: 'blur(12px)',
  WebkitBackdropFilter: 'blur(12px)',
  zIndex: 50, overflowY: 'auto',
  WebkitOverflowScrolling: 'touch',
}

export const panelStyle = {
  background: 'var(--card)',
  border: '1px solid var(--card-border)',
  borderRadius: 16, padding: 28,
}

export const closeBtnStyle = {
  width: 32, height: 32, borderRadius: 8,
  background: 'transparent',
  border: '1px solid var(--card-border)',
  color: 'var(--text-dim)',
  cursor: 'pointer', fontSize: 14,
  display: 'flex', alignItems: 'center', justifyContent: 'center',
  flexShrink: 0, transition: 'all 0.12s ease',
}

export const inputStyle = {
  width: '100%',
  background: 'var(--bg)',
  border: '1px solid var(--card-border)',
  borderRadius: 10, padding: '10px 14px',
  color: 'var(--text)', fontSize: 14,
  outline: 'none', boxSizing: 'border-box',
  transition: 'border-color 0.15s ease',
}

// ─── Badge helpers ─────────────────────────────────────────────────────────────

export function badge(color) {
  return {
    fontSize: 10, padding: '2px 7px', borderRadius: 4, fontWeight: 600,
    letterSpacing: '0.05em', textTransform: 'uppercase',
    border: `1px solid ${color}30`, color, background: `${color}10`,
    display: 'inline-flex', alignItems: 'center',
  }
}

export function neutralBadge() {
  return {
    fontSize: 10, padding: '2px 7px', borderRadius: 4, fontWeight: 500,
    letterSpacing: '0.04em', textTransform: 'uppercase',
    border: '1px solid var(--card-border)', color: 'var(--text-dim)',
    background: 'transparent', display: 'inline-flex', alignItems: 'center',
  }
}

// ─── Category system ──────────────────────────────────────────────────────────

// Categorías ocultas en la vista pública (mercados que existen en DB pero no se muestran)
export const HIDDEN_CATEGORIES = new Set(['CRIPTO', 'CRYPTO'])

export function getCategoryColor(cat) {
  const map = {
    ECONOMIA:    '#6366F1',
    POLITICA:    '#F59E0B',
    DEPORTES:    '#10B981',
    ENERGIA:     '#F97316',
    TIPOS:       '#3B82F6',   // azul — tipos de interés, bonos, prima de riesgo
    CLIMA:       '#38BDF8',
    ACTUALIDAD:  '#A78BFA',
    CRIPTO:      '#14B8A6',
    CRYPTO:      '#14B8A6',
    GEOPOLITICA: '#EC4899',
    TECNOLOGIA:  '#8B5CF6',
    CIENCIA:     '#06B6D4',
    SOCIEDAD:    '#84CC16',
    CULTURA:     '#F472B6',
    INTERNACIONAL: '#FB923C',
    FINANZAS:    '#818CF8',
    VIVIENDA:    '#34D399',
  }
  return map[cat] || '#94A3B8'
}

export function getCategoryLabel(cat) {
  const map = {
    ECONOMIA:      'Economía',
    POLITICA:      'Política',
    DEPORTES:      'Deportes',
    ENERGIA:       'Energía',
    TIPOS:         'Tipos',
    CLIMA:         'Clima',
    ACTUALIDAD:    'Actualidad',
    CRIPTO:        'Cripto',
    CRYPTO:        'Cripto',
    GEOPOLITICA:   'Geopolítica',
    TECNOLOGIA:    'Tecnología',
    CIENCIA:       'Ciencia',
    SOCIEDAD:      'Sociedad',
    CULTURA:       'Cultura',
    INTERNACIONAL: 'Internacional',
    FINANZAS:      'Finanzas',
    VIVIENDA:      'Vivienda',
  }
  return map[cat] || cat
}

// ─── Time helpers ─────────────────────────────────────────────────────────────

// Compact countdown: always Xd Xh Xm
export function getTimeLeft(closeDate) {
  const diff = new Date(closeDate) - new Date()
  if (diff <= 0) return 'Resolviendo...'
  const totalMin = Math.floor(diff / 60000)
  const d = Math.floor(totalMin / 1440)
  const h = Math.floor((totalMin % 1440) / 60)
  const m = totalMin % 60
  return `${d}d ${h}h ${m}m`
}

// Returns { dateStr, countdown, isUrgent, isExpired }
// dateStr: "vie 14 mar 18:00"
// countdown: "Xd Xh Xm" always, or "¡Última hora!" (<60min), or "Resolviendo..."
export function getCloseInfo(closeDate) {
  if (!closeDate) return { dateStr: '', countdown: '', isUrgent: false, isExpired: false }
  const target = new Date(closeDate)
  const now    = new Date()
  const diff   = target - now

  const DAYS = ['dom', 'lun', 'mar', 'mié', 'jue', 'vie', 'sáb']
  const MONTHS = ['ene', 'feb', 'mar', 'abr', 'may', 'jun', 'jul', 'ago', 'sep', 'oct', 'nov', 'dic']
  const hh = target.getHours().toString().padStart(2, '0')
  const mm = target.getMinutes().toString().padStart(2, '0')
  const dateStr = `${DAYS[target.getDay()]} ${target.getDate()} ${MONTHS[target.getMonth()]} ${hh}:${mm}`

  if (diff <= 0) return { dateStr, countdown: 'Resolviendo...', isUrgent: false, isExpired: true }

  const totalMin = Math.floor(diff / 60000)
  const d = Math.floor(totalMin / 1440)
  const h = Math.floor((totalMin % 1440) / 60)
  const m = totalMin % 60

  if (totalMin < 60) return { dateStr, countdown: `¡Última hora! ${m}m`, isUrgent: true, isExpired: false }

  const countdown = `${d}d ${h}h ${m}m`
  const isUrgent = diff < 6 * 3600000
  return { dateStr, countdown, isUrgent, isExpired: false }
}

export function isExpiredDate(d) { return new Date(d) < new Date() }

export function getTypeLabel(m) {
  const t = m.market_type
  if (t === 'FLASH')                       return 'Flash'
  if (t === 'DIARIO')                      return 'Diario'
  if (t === 'SHORT' || t === 'SEMANAL')    return 'Semanal'
  if (t === 'LONG'  || t === 'MENSUAL')    return 'Mensual'
  if (t === 'LARGO_PLAZO')                 return 'Largo plazo'
  // Infer from close_date if market_type missing
  if (m.close_date) {
    const daysLeft = (new Date(m.close_date) - new Date()) / 86400000
    if (daysLeft < 1)   return 'Flash'
    if (daysLeft < 2)   return 'Diario'
    if (daysLeft < 14)  return 'Semanal'
    if (daysLeft < 60)  return 'Mensual'
    return 'Largo plazo'
  }
  return t || ''
}

// ─── Trade status ─────────────────────────────────────────────────────────────

export function getTradeStatusLabel(status) {
  return { OPEN: 'Abierto', WON: 'Ganado', LOST: 'Perdido', SOLD: 'Vendido' }[status] || status
}

export function getTradeStatusColor(status) {
  if (status === 'WON')  return C.yes
  if (status === 'LOST') return C.no
  if (status === 'SOLD') return C.accentLight
  return 'var(--text-dim)'
}

// ─── Oracle descriptions ──────────────────────────────────────────────────────

export function getOracleDescription(market) {
  const t = (market.title || '').toLowerCase()
  if (t.includes('ibex'))                                   return { source: 'Yahoo Finance · IBEX 35', url: '', method: 'Resuelve SÍ si el IBEX 35 supera el umbral o cierra en verde. Verificable tras las 17:35h.' }
  if (t.includes('luz') || t.includes('mwh') || t.includes('pvpc')) return { source: 'OMIE / REE', url: '', method: 'Resuelve SÍ si el precio medio del pool eléctrico diario supera el umbral indicado.' }
  if (t.includes('bitcoin') || t.includes('btc'))          return { source: 'CoinGecko', url: '', method: 'Resuelve SÍ si el precio de Bitcoin supera el umbral a la fecha de cierre.' }
  if (t.includes('ethereum') || t.includes('eth'))         return { source: 'CoinGecko', url: '', method: 'Resuelve SÍ si el precio de Ethereum supera el umbral indicado.' }
  if (t.includes('euribor'))                               return { source: 'BCE / Banco de España', url: '', method: 'Resuelve SÍ según el tipo Euribor 12M publicado por el BCE.' }
  if (t.includes('real madrid') || t.includes('barcelona') || t.includes('atletico')) return { source: 'football-data.org', url: '', method: 'Resuelve SÍ si el equipo gana su próximo partido oficial.' }
  if (t.includes('ipc') || t.includes('inflacion'))        return { source: 'INE · IPC', url: '', method: 'Resuelve SÍ según el dato de variación del IPC publicado por el INE.' }
  if (t.includes('s&p') || t.includes('sp500') || t.includes('nasdaq')) return { source: 'Yahoo Finance', url: '', method: 'Resuelve SÍ según el dato oficial de cierre del índice.' }
  if (t.includes('brent') || t.includes('petroleo'))       return { source: 'Yahoo Finance · BZ=F', url: '', method: 'Resuelve SÍ si el precio del Brent supera el umbral.' }
  return { source: 'Fuente oficial pública', url: '', method: 'Resolución basada en datos oficiales públicos y verificables.' }
}

// ─── AMM order book (synthetic) ──────────────────────────────────────────────

export function computeAMMBook(yes_pool, no_pool) {
  const yp  = parseFloat(yes_pool)  || 5000
  const np  = parseFloat(no_pool)   || 5000
  const k   = yp * np
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
