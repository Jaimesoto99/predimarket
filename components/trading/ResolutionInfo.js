import { C, getOracleDescription, getCloseInfo } from '../../lib/theme'
import ResolutionCountdown from './ResolutionCountdown'

// ─── Parse or derive SÍ/NO conditions ────────────────────────────────────────

function deriveConditions(market) {
  const t     = (market?.title || '').toLowerCase()
  const oracle = getOracleDescription(market)

  // 1. Parse resolution_rules field
  if (market?.resolution_rules) {
    const siMatch =
      market.resolution_rules.match(/se resolverá como SÍ si (.+?)\s+según/i) ||
      market.resolution_rules.match(/se resolverá como SÍ si (.+?)\.\s/i) ||
      market.resolution_rules.match(/se resolverá como SÍ si (.+)/i)
    const condition = siMatch ? siMatch[1].trim() : null
    if (condition) {
      const cap = s => s.charAt(0).toUpperCase() + s.slice(1)
      return {
        si:     cap(condition),
        no:     'No se cumple la condición anterior.',
        source: market.resolution_source || oracle.source,
        url:    market.resolution_url    || '',
        method: oracle.method || 'Consulta automática a fuente pública verificable',
      }
    }
  }

  // 2. Dynamic from title — numeric threshold pattern: "¿X > Y?" / "¿X supera Y?"
  const numMatch = (market?.title || '').match(/([^¿?<>]+?)\s+(supera|por encima de|>|≥|mayor que)\s+([^?]+)/i)
  if (numMatch) {
    const subject   = numMatch[1].replace(/^¿/, '').trim()
    const threshold = numMatch[3].replace(/\?$/, '').trim()
    return {
      si:     `${subject} supera ${threshold}`,
      no:     `${subject} no supera ${threshold} (igual o inferior)`,
      source: market.resolution_source || oracle.source,
      url:    '',
      method: oracle.method,
    }
  }

  // 3. Keyword fallback by asset
  const titleClean = (market?.title || '').replace(/^¿/, '').replace(/\?$/, '').trim()

  if (t.includes('ibex') && t.includes('verde')) {
    return { si: 'El IBEX 35 cierra con variación positiva (>0%) respecto al cierre anterior.', no: 'El IBEX 35 cierra plano o en negativo (≤0%).', source: 'BME / Yahoo Finance', url: 'finance.yahoo.com/quote/^IBEX', method: 'Precio de cierre oficial a las 17:35h CET' }
  }
  if (t.includes('ibex')) {
    const umbralMatch = (market?.title || '').match(/([\d.,]+)\s*(punto|pts)?/i)
    const umbral = umbralMatch ? umbralMatch[1] : '—'
    return { si: `El IBEX 35 supera ${umbral} puntos al cierre.`, no: `El IBEX 35 cierra en ${umbral} puntos o menos.`, source: 'BME / Yahoo Finance', url: 'finance.yahoo.com/quote/^IBEX', method: 'Precio de cierre oficial a las 17:35h CET' }
  }
  if (t.includes('bitcoin') || t.includes('btc')) {
    return { si: 'El precio de Bitcoin supera el umbral indicado en el título.', no: 'El precio de Bitcoin no supera el umbral.', source: 'CoinGecko', url: 'coingecko.com/es/monedas/bitcoin', method: 'Precio spot en CoinGecko a la fecha de cierre' }
  }
  if (t.includes('ethereum') || t.includes('eth')) {
    return { si: 'El precio de Ethereum supera el umbral indicado.', no: 'El precio de Ethereum no supera el umbral.', source: 'CoinGecko', url: 'coingecko.com/es/monedas/ethereum', method: 'Precio spot en CoinGecko a la fecha de cierre' }
  }
  if (t.includes('euribor')) {
    return { si: 'El Euríbor 12M publicado cumple la condición del título.', no: 'El Euríbor no cumple la condición.', source: 'BCE / Banco de España', url: 'bde.es/es/estadisticas/tipos-de-interes-y-tipos-de-cambio', method: 'Publicación oficial del tipo Euríbor' }
  }
  if (t.includes('prima de riesgo') || (t.includes('prima') && t.includes('riesgo'))) {
    return { si: 'El diferencial bono España 10Y – Bund alemán 10Y supera el umbral indicado al cierre de la sesión.', no: 'El diferencial cierra en el umbral o por debajo.', source: 'Banco de España / Investing.com', url: 'investing.com/rates-bonds/spain-10-year-bond-yield', method: 'Diferencial de rendimientos al cierre de sesión bursátil (17:35h CET)' }
  }
  if (t.includes('bono') && (t.includes('10 año') || t.includes('10y') || t.includes('diez año'))) {
    return { si: 'El rendimiento del Bono del Estado español a 10 años supera el umbral indicado al cierre.', no: 'El Bono español cierra en el umbral o por debajo.', source: 'Bolsa de Madrid / Banco de España', url: 'bde.es/es/estadisticas/tipos-de-interes-y-tipos-de-cambio', method: 'Rendimiento oficial del Bono del Estado a 10 años al cierre de sesión' }
  }
  if ((t.includes('bce') || t.includes('banco central europeo')) && (t.includes('tipo') || t.includes('interés'))) {
    return { si: 'El BCE sube el tipo de interés de referencia de la facilidad de depósito en la reunión indicada.', no: 'El BCE mantiene o baja los tipos en esa reunión.', source: 'Banco Central Europeo', url: 'ecb.europa.eu/press/pr/date', method: 'Comunicado oficial del Consejo de Gobierno del BCE el día de la reunión de política monetaria' }
  }
  if (t.includes('temperatura') || t.includes('°c') || t.includes('grados')) {
    return { si: 'La temperatura máxima registrada supera el umbral indicado.', no: 'La temperatura no supera el umbral.', source: 'AEMET / Open-Meteo', url: 'open-meteo.com', method: 'Datos meteorológicos de Open-Meteo y verificación AEMET' }
  }
  if (t.includes('real madrid') || t.includes('barcelona') || t.includes('atletico') || t.includes('atlético')) {
    return { si: 'El equipo gana el partido o competición mencionada.', no: 'El equipo no gana (empate o derrota cuenta como NO).', source: 'football-data.org', url: 'football-data.org', method: 'Resultado oficial al pitido final' }
  }
  if (t.includes('brent') || t.includes('petróleo') || t.includes('petroleo')) {
    return { si: 'El precio del barril Brent supera el umbral indicado.', no: 'El Brent no supera el umbral.', source: 'Yahoo Finance', url: 'finance.yahoo.com/quote/BZ=F', method: 'Precio de cierre del futuro ICE Brent' }
  }
  if (t.includes('pvpc') || t.includes('mwh') || t.includes('luz') || t.includes('electricidad')) {
    return { si: 'El precio medio del pool eléctrico supera el umbral indicado.', no: 'El precio no supera el umbral.', source: 'OMIE', url: 'omie.es', method: 'Precio marginal del mercado diario OMIE' }
  }
  if (t.includes('eur/usd') || t.includes('eurusd')) {
    return { si: 'El tipo de cambio EUR/USD supera el umbral a la hora de cierre.', no: 'El EUR/USD no supera el umbral.', source: 'Yahoo Finance', url: 'finance.yahoo.com/quote/EURUSD=X', method: 'Cotización en mercado Forex' }
  }
  if (t.includes('ipc') || t.includes('inflaci')) {
    return { si: 'El dato del IPC publicado cumple la condición del título.', no: 'El IPC no cumple la condición.', source: 'INE', url: 'ine.es/es/estadistica/ficha/ipc.htm', method: 'Publicación oficial del INE' }
  }
  if (t.includes('paro') || t.includes('desempleo') || t.includes('epa')) {
    return { si: 'La EPA publicada cumple la condición del título.', no: 'La EPA no cumple la condición.', source: 'INE', url: 'ine.es/es/estadistica/ficha/epa.htm', method: 'Publicación oficial de la Encuesta de Población Activa' }
  }

  // 4. Generic
  return {
    si:     `Se cumple: "${titleClean}"`,
    no:     `No se cumple: "${titleClean}"`,
    source: market?.resolution_source || oracle.source || 'Fuente pública verificable',
    url:    '',
    method: oracle.method || 'Resolución automática basada en datos públicos',
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
  const resolveDate   = market?.resolution_time || market?.close_date
  const cond          = deriveConditions(market)
  const formattedDate = formatDate(resolveDate)

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>

      {/* ── Main resolution block ─────────────────────────────────────────── */}
      <div style={{ borderRadius: 10, overflow: 'hidden', border: `1px solid ${C.cardBorder}` }}>

        {/* Header */}
        <div style={{
          padding: '10px 16px',
          background: C.card, borderBottom: `1px solid ${C.divider}`,
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        }}>
          <span style={{ fontSize: 10, fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase', color: C.textDim }}>
            Cómo se resuelve este contrato
          </span>
          <ResolutionCountdown market={market} size="sm" />
        </div>

        <div style={{ background: C.surface, padding: '14px 16px', display: 'flex', flexDirection: 'column', gap: 10 }}>

          {/* SÍ */}
          <div style={{ padding: '10px 14px', borderRadius: 8, background: `${C.yes}08`, border: `1px solid ${C.yes}25` }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 6 }}>
              <span style={{
                fontSize: 10, fontWeight: 800, letterSpacing: '0.06em',
                background: C.yes, color: '#fff',
                padding: '1px 6px', borderRadius: 3,
              }}>SÍ</span>
              <span style={{ fontSize: 9, fontWeight: 600, letterSpacing: '0.06em', textTransform: 'uppercase', color: C.yes }}>
                Se resuelve SÍ si:
              </span>
            </div>
            <div style={{ fontSize: 13, color: C.text, lineHeight: 1.6, fontWeight: 500 }}>
              {cond.si}
            </div>
          </div>

          {/* NO */}
          <div style={{ padding: '10px 14px', borderRadius: 8, background: `${C.no}06`, border: `1px solid ${C.no}20` }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 6 }}>
              <span style={{
                fontSize: 10, fontWeight: 800, letterSpacing: '0.06em',
                background: C.no, color: '#fff',
                padding: '1px 6px', borderRadius: 3,
              }}>NO</span>
              <span style={{ fontSize: 9, fontWeight: 600, letterSpacing: '0.06em', textTransform: 'uppercase', color: C.no }}>
                Se resuelve NO si:
              </span>
            </div>
            <div style={{ fontSize: 13, color: C.text, lineHeight: 1.6, fontWeight: 500 }}>
              {cond.no}
            </div>
          </div>

          {/* Meta: source + url + method + date */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 7, paddingTop: 2 }}>
            <MetaRow icon="📊" label="Fuente">
              <span style={{ color: C.accentLight, fontWeight: 600 }}>{cond.source}</span>
            </MetaRow>
            {cond.url && (
              <MetaRow icon="🔗" label="URL">
                <span style={{ color: C.accentLight, fontFamily: 'ui-monospace, monospace', fontSize: 10 }}>{cond.url}</span>
              </MetaRow>
            )}
            {formattedDate && (
              <MetaRow icon="📅" label="Resolución">
                {formattedDate}
              </MetaRow>
            )}
            <MetaRow icon="⚙️" label="Método">
              {cond.method}
            </MetaRow>
          </div>
        </div>

        {/* Footer disclaimer */}
        <div style={{
          padding: '8px 16px',
          background: C.card,
          borderTop: `1px solid ${C.divider}`,
          fontSize: 11, color: C.textDim, lineHeight: 1.5,
          textAlign: 'center',
        }}>
          PrediMarket actúa como intermediario tecnológico. No emite opinión sobre el resultado.{' '}
          <a href="/metodologia" style={{ color: C.textDim, textDecoration: 'underline' }}>Ver metodología</a>
        </div>
      </div>

      {/* ── Risk disclaimer ───────────────────────────────────────────────── */}
      <div style={{
        padding: '10px 14px',
        background: `${C.warning}06`,
        border: `1px solid ${C.warning}15`,
        borderRadius: 10,
      }}>
        <div style={{ fontSize: 11, color: C.warning, fontWeight: 600, marginBottom: 3 }}>Aviso de riesgo</div>
        <div style={{ fontSize: 11, color: C.textDim, lineHeight: 1.6 }}>
          PrediMarket opera con créditos virtuales. No constituye asesoramiento financiero.
          La resolución se basa en fuentes públicas verificables.
        </div>
      </div>

    </div>
  )
}

function MetaRow({ icon, label, children }) {
  return (
    <div style={{ display: 'flex', gap: 8, alignItems: 'flex-start' }}>
      <span style={{ fontSize: 11, flexShrink: 0 }}>{icon}</span>
      <span style={{ fontSize: 10, color: C.textDim, flexShrink: 0, minWidth: 60, fontWeight: 600 }}>{label}:</span>
      <span style={{ fontSize: 11, color: C.textMuted }}>{children}</span>
    </div>
  )
}
