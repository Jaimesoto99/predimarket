import { C, getOracleDescription, getCloseInfo } from '../../lib/theme'
import ResolutionCountdown from './ResolutionCountdown'

// ─── Generate SÍ/NO condition from title when resolution_rules is missing ──────

function deriveConditions(market) {
  const t = (market?.title || '').toLowerCase()
  const oracle = getOracleDescription(market)

  // Try to parse the resolution_rules field first
  if (market?.resolution_rules) {
    // Rules are stored as full text starting with "Este contrato se resolverá como SÍ si..."
    // Extract the "SÍ si" condition
    const siMatch = market.resolution_rules.match(/se resolverá como SÍ si (.+?)\s+según/i)
      || market.resolution_rules.match(/se resolverá como SÍ si (.+?)\.\s/i)
      || market.resolution_rules.match(/se resolverá como SÍ si (.+)/i)
    const condition = siMatch ? siMatch[1].trim() : null
    if (condition) {
      return {
        si: condition.charAt(0).toUpperCase() + condition.slice(1),
        no: 'No se cumple la condición anterior.',
        source: market.resolution_source || oracle.source,
        method: 'Consulta automática a fuente pública verificable',
      }
    }
  }

  // Dynamic fallback from title
  const titleClean = (market?.title || '').replace(/^¿/, '').replace(/\?$/, '').trim()

  if (t.includes('ibex') && t.includes('verde')) {
    return { si: 'El IBEX 35 cierra con variación positiva (>0%) respecto al cierre anterior.', no: 'El IBEX 35 cierra plano o en negativo (≤0%).', source: 'BME / Yahoo Finance — finance.yahoo.com/quote/^IBEX', method: 'Precio de cierre oficial a las 17:35h CET' }
  }
  if (t.includes('bitcoin') || t.includes('btc')) {
    return { si: 'El precio de Bitcoin supera el umbral indicado.', no: 'El precio de Bitcoin no supera el umbral.', source: 'CoinGecko — coingecko.com/es/monedas/bitcoin', method: 'Precio spot en CoinGecko a la fecha de cierre' }
  }
  if (t.includes('euribor')) {
    return { si: 'El Euríbor 12M publicado cumple la condición del título.', no: 'El Euríbor no cumple la condición.', source: 'Banco de España / BCE', method: 'Publicación oficial del tipo Euríbor' }
  }
  if (t.includes('temperatura') || t.includes('°c') || t.includes('grados')) {
    return { si: 'La temperatura máxima registrada supera el umbral indicado.', no: 'La temperatura no supera el umbral.', source: 'AEMET — aemet.es', method: 'Datos meteorológicos oficiales de AEMET' }
  }
  if (t.includes('real madrid') || t.includes('barcelona') || t.includes('atletico')) {
    return { si: 'El equipo gana el partido o competición mencionada.', no: 'El equipo no gana (empate o derrota).', source: 'LaLiga / UEFA / football-data.org', method: 'Resultado oficial al pitido final' }
  }
  if (t.includes('brent') || t.includes('petróleo') || t.includes('petroleo')) {
    return { si: 'El precio del barril Brent supera el umbral indicado.', no: 'El Brent no supera el umbral.', source: 'Yahoo Finance — finance.yahoo.com/quote/BZ=F', method: 'Precio de cierre del futuro ICE Brent' }
  }
  if (t.includes('pvpc') || t.includes('mwh') || t.includes('luz') || t.includes('electricidad')) {
    return { si: 'El precio medio del pool eléctrico supera el umbral indicado.', no: 'El precio no supera el umbral.', source: 'OMIE — omie.es', method: 'Precio marginal del mercado diario OMIE' }
  }
  if (t.includes('eur/usd') || t.includes('eurusd')) {
    return { si: 'El tipo de cambio EUR/USD supera el umbral a la hora de cierre.', no: 'El EUR/USD no supera el umbral.', source: 'Yahoo Finance — finance.yahoo.com/quote/EURUSD=X', method: 'Cotización en mercado Forex' }
  }

  // Generic fallback
  return {
    si: `Se cumple la condición: "${titleClean}"`,
    no: `No se cumple la condición: "${titleClean}"`,
    source: market?.resolution_source || oracle.source || 'Fuente pública verificable',
    method: 'Resolución automática basada en datos públicos',
  }
}

function formatDate(isoString) {
  if (!isoString) return null
  try {
    return new Date(isoString).toLocaleString('es-ES', {
      weekday: 'long', day: 'numeric', month: 'long', year: 'numeric',
      hour: '2-digit', minute: '2-digit',
    })
  } catch { return null }
}

// ─── Main component ───────────────────────────────────────────────────────────

export default function ResolutionInfo({ market }) {
  const resolveDate = market?.resolution_time || market?.close_date
  const cond = deriveConditions(market)
  const formattedDate = formatDate(resolveDate)

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>

      {/* ── SÍ / NO block ──────────────────────────────────────────────────── */}
      <div style={{
        borderRadius: 10, overflow: 'hidden',
        border: `1px solid ${C.cardBorder}`,
      }}>
        {/* Header */}
        <div style={{
          padding: '10px 16px',
          background: C.card, borderBottom: `1px solid ${C.divider}`,
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        }}>
          <span style={{ fontSize: 10, fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase', color: C.textDim }}>
            Condiciones de resolución
          </span>
          <ResolutionCountdown market={market} size="sm" />
        </div>

        <div style={{ background: C.surface, padding: '14px 16px', display: 'flex', flexDirection: 'column', gap: 10 }}>

          {/* SÍ */}
          <div style={{
            padding: '10px 14px', borderRadius: 8,
            background: `${C.yes}08`, border: `1px solid ${C.yes}25`,
          }}>
            <div style={{ fontSize: 9, fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase', color: C.yes, marginBottom: 4 }}>
              Se resuelve SÍ si:
            </div>
            <div style={{ fontSize: 12, color: C.text, lineHeight: 1.6 }}>
              {cond.si}
            </div>
          </div>

          {/* NO */}
          <div style={{
            padding: '10px 14px', borderRadius: 8,
            background: `${C.no}06`, border: `1px solid ${C.no}20`,
          }}>
            <div style={{ fontSize: 9, fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase', color: C.no, marginBottom: 4 }}>
              Se resuelve NO si:
            </div>
            <div style={{ fontSize: 12, color: C.text, lineHeight: 1.6 }}>
              {cond.no}
            </div>
          </div>

          {/* Source + method + date */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8, paddingTop: 4 }}>
            <div style={{ display: 'flex', gap: 8, alignItems: 'flex-start' }}>
              <span style={{ fontSize: 10, color: C.textDim, flexShrink: 0, minWidth: 50, fontWeight: 600 }}>Fuente:</span>
              <span style={{ fontSize: 11, color: C.accentLight, fontWeight: 600 }}>{cond.source}</span>
            </div>
            <div style={{ display: 'flex', gap: 8, alignItems: 'flex-start' }}>
              <span style={{ fontSize: 10, color: C.textDim, flexShrink: 0, minWidth: 50, fontWeight: 600 }}>Método:</span>
              <span style={{ fontSize: 11, color: C.textMuted }}>{cond.method}</span>
            </div>
            {formattedDate && (
              <div style={{ display: 'flex', gap: 8, alignItems: 'flex-start' }}>
                <span style={{ fontSize: 10, color: C.textDim, flexShrink: 0, minWidth: 50, fontWeight: 600 }}>Fecha:</span>
                <span style={{ fontSize: 11, color: C.textMuted }}>{formattedDate}</span>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* ── Risk disclaimer ─────────────────────────────────────────────────── */}
      <div style={{
        padding: '10px 14px',
        background: `${C.warning}06`,
        border: `1px solid ${C.warning}15`,
        borderRadius: 10,
      }}>
        <div style={{ fontSize: 11, color: C.warning, fontWeight: 600, marginBottom: 3 }}>Aviso de riesgo</div>
        <div style={{ fontSize: 11, color: C.textDim, lineHeight: 1.6 }}>
          PrediMarket opera con créditos virtuales. No constituye asesoramiento financiero.
          La resolución se basa en fuentes públicas verificables.{' '}
          <a href="/metodologia" style={{ color: C.textDim, textDecoration: 'underline' }}>Ver metodología</a>
        </div>
      </div>
    </div>
  )
}
