import { C } from '../../lib/theme'

// ─── Score bar + label ────────────────────────────────────────────────────

function scoreColor(score) {
  if (score >= 0.7) return C.yes
  if (score >= 0.4) return C.warning
  return C.textDim
}

export default function MarketScoreIndicator({ market, showLabel = true }) {
  const score = parseFloat(market?.market_score)
  if (isNaN(score)) return null

  const pct   = Math.round(score * 100)
  const color = scoreColor(score)

  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
      {showLabel && (
        <span style={{
          fontSize: 9, fontWeight: 600, letterSpacing: '0.08em',
          textTransform: 'uppercase', color: C.textDim,
          whiteSpace: 'nowrap',
        }}>
          Score
        </span>
      )}
      <div style={{
        flex: 1, height: 4, borderRadius: 2,
        background: C.cardBorder, overflow: 'hidden', minWidth: 40,
      }}>
        <div style={{
          width: `${pct}%`, height: '100%',
          background: color, borderRadius: 2,
          transition: 'width 0.4s ease',
        }} />
      </div>
      <span style={{
        fontSize: 10, fontWeight: 700, color,
        fontVariantNumeric: 'tabular-nums', minWidth: 28,
      }}>
        {pct}
      </span>
    </div>
  )
}

// ─── ClusterBadge ─────────────────────────────────────────────────────────

const CLUSTER_COLORS = {
  CRYPTO_MARKETS:    '#14B8A6',
  EU_ECONOMY:        '#6366F1',
  STOCK_INDICES:     '#6366F1',
  RATES_INFLATION:   '#F59E0B',
  COMMODITIES:       '#F97316',
  SPANISH_FOOTBALL:  '#10B981',
  CHAMPIONS_LEAGUE:  '#10B981',
  LA_LIGA:           '#10B981',
  AI_TECH:           '#8B5CF6',
  BIG_TECH:          '#8B5CF6',
  ELECTRICITY:       '#F97316',
  OIL_GAS:           '#F97316',
  ES_POLITICS:       '#F59E0B',
  EU_POLITICS:       '#EC4899',
  WAR_CONFLICT:      '#EF4444',
  TRADE_GEOPOLITICS: '#FB923C',
}

const CLUSTER_LABELS = {
  CRYPTO_MARKETS:    'Cripto',
  EU_ECONOMY:        'Eco. UE',
  STOCK_INDICES:     'Índices',
  RATES_INFLATION:   'Tipos/IPC',
  COMMODITIES:       'Materias P.',
  SPANISH_FOOTBALL:  'Fútbol ES',
  CHAMPIONS_LEAGUE:  'Champions',
  LA_LIGA:           'La Liga',
  AI_TECH:           'IA & Tech',
  BIG_TECH:          'Big Tech',
  ELECTRICITY:       'Electricidad',
  OIL_GAS:           'Petróleo/Gas',
  ES_POLITICS:       'Política ES',
  EU_POLITICS:       'UE Política',
  WAR_CONFLICT:      'Conflictos',
  TRADE_GEOPOLITICS: 'Comercio',
}

export function ClusterBadge({ clusterId }) {
  if (!clusterId) return null
  const color = CLUSTER_COLORS[clusterId] || C.textDim
  const label = CLUSTER_LABELS[clusterId] || clusterId.replace(/_/g, ' ')

  return (
    <span style={{
      fontSize: 9, fontWeight: 600, padding: '1px 6px', borderRadius: 4,
      letterSpacing: '0.05em', textTransform: 'uppercase',
      color, background: `${color}12`, border: `1px solid ${color}25`,
      display: 'inline-block', whiteSpace: 'nowrap',
    }}>
      {label}
    </span>
  )
}

// ─── CalibrationFlagBadge ─────────────────────────────────────────────────

const FLAG_META = {
  STALE:     { label: 'Sin actividad', color: C.textDim },
  MISPRICED: { label: 'Precio incierto', color: '#F59E0B' },
  LOPSIDED:  { label: 'Asimétrico', color: '#6366F1' },
  EXPIRING:  { label: 'Cierra pronto', color: '#EF4444' },
}

export function CalibrationFlagBadge({ flag }) {
  if (!flag || !FLAG_META[flag]) return null
  const { label, color } = FLAG_META[flag]

  return (
    <span style={{
      fontSize: 9, fontWeight: 600, padding: '1px 6px', borderRadius: 4,
      color, background: `${color}10`, border: `1px solid ${color}20`,
      display: 'inline-block',
    }}>
      {label}
    </span>
  )
}
