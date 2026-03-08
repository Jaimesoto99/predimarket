import { C, getOracleDescription } from '../../lib/theme'
import SectionTitle from './SectionTitle'
import ResolutionCountdown from './ResolutionCountdown'

// ─── Format resolution timestamp ─────────────────────────────────────────

function formatResolutionTime(isoString) {
  if (!isoString) return null
  try {
    return new Date(isoString).toLocaleString('es-ES', {
      day:    'numeric',
      month:  'long',
      year:   'numeric',
      hour:   '2-digit',
      minute: '2-digit',
      timeZoneName: 'short',
    })
  } catch {
    return null
  }
}

// ─── Row helper ───────────────────────────────────────────────────────────

function InfoRow({ icon, label, children }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
      <div style={{
        fontSize: 9, fontWeight: 700, letterSpacing: '0.08em',
        textTransform: 'uppercase', color: C.textDim,
        display: 'flex', alignItems: 'center', gap: 5,
      }}>
        <span>{icon}</span> {label}
      </div>
      <div style={{ fontSize: 13, color: C.text, lineHeight: 1.55 }}>
        {children}
      </div>
    </div>
  )
}

// ─── Main component ───────────────────────────────────────────────────────

export default function ResolutionInfo({ market }) {
  // Prefer explicit fields set by new pipeline; fall back to oracle description for legacy markets
  const oracle  = getOracleDescription(market)
  const source  = market?.resolution_source  || oracle.source
  const method  = market?.resolution_method  || oracle.method
  const resolveDate = market?.resolution_time || market?.close_date

  const formattedTime = formatResolutionTime(resolveDate)

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>

      {/* ── Main resolution block ───────────────────────────────────────── */}
      <div style={{
        background: C.surface, border: `1px solid ${C.cardBorder}`,
        borderRadius: 10, overflow: 'hidden',
      }}>
        {/* Header */}
        <div style={{
          padding: '10px 16px',
          background: C.card, borderBottom: `1px solid ${C.divider}`,
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        }}>
          <span style={{
            fontSize: 10, fontWeight: 700, letterSpacing: '0.08em',
            textTransform: 'uppercase', color: C.textDim,
          }}>
            Resolución
          </span>
          <ResolutionCountdown market={market} size="sm" />
        </div>

        {/* Fields */}
        <div style={{ padding: '14px 16px', display: 'flex', flexDirection: 'column', gap: 16 }}>

          {/* Resolution time */}
          {formattedTime && (
            <InfoRow icon="🕐" label="Fecha de resolución">
              <span style={{ fontWeight: 600 }}>{formattedTime}</span>
            </InfoRow>
          )}

          {/* Source */}
          {source && (
            <InfoRow icon="📡" label="Fuente de datos">
              <span style={{ fontWeight: 600, color: C.accentLight }}>{source}</span>
            </InfoRow>
          )}

          {/* Method */}
          {method && (
            <InfoRow icon="📋" label="Criterio de resolución">
              <span style={{ color: C.textMuted, fontSize: 12, lineHeight: 1.65 }}>{method}</span>
            </InfoRow>
          )}
        </div>
      </div>

      {/* ── Risk disclaimer ─────────────────────────────────────────────── */}
      <div style={{
        padding: '10px 14px',
        background: `${C.warning}06`,
        border: `1px solid ${C.warning}15`,
        borderRadius: 10,
      }}>
        <div style={{ fontSize: 11, color: C.warning, fontWeight: 600, marginBottom: 3 }}>
          Aviso de riesgo
        </div>
        <div style={{ fontSize: 11, color: C.textDim, lineHeight: 1.6 }}>
          PrediMarket opera con créditos virtuales. No constituye asesoramiento financiero.
          La resolución se basa en fuentes públicas verificables.{' '}
          <a href="/metodologia" style={{ color: C.textDim, textDecoration: 'underline' }}>
            Ver metodología
          </a>
        </div>
      </div>
    </div>
  )
}
