import { C, getOracleDescription } from '../../lib/theme'
import SectionTitle from './SectionTitle'

export default function ResolutionInfo({ market }) {
  const oracle = getOracleDescription(market)
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
      <div style={{ padding: '14px 16px', background: C.surface, border: `1px solid ${C.cardBorder}`, borderRadius: 10 }}>
        <SectionTitle>Oráculo</SectionTitle>
        <div style={{ fontSize: 13, fontWeight: 600, color: C.accentLight, marginBottom: 6 }}>{oracle.source}</div>
        <div style={{ fontSize: 12, color: C.textMuted, lineHeight: 1.65 }}>{oracle.method}</div>
      </div>
      <div style={{ padding: '12px 16px', background: `${C.warning}06`, border: `1px solid ${C.warning}15`, borderRadius: 10 }}>
        <div style={{ fontSize: 11, color: C.warning, fontWeight: 600, marginBottom: 4 }}>Aviso de riesgo</div>
        <div style={{ fontSize: 11, color: C.textDim, lineHeight: 1.6 }}>
          PrediMarket es un mercado de predicción con créditos virtuales. No constituye asesoramiento financiero. Riesgo de pérdida total.
        </div>
      </div>
    </div>
  )
}
