import { C, panelStyle } from '../../lib/theme'

export default function DisclaimerModal({
  showDisclaimer,
  setShowDisclaimer,
  pendingTradeAction,
  setPendingTradeAction,
  onExecuteTrade,
  onLimitOrder,
}) {
  if (!showDisclaimer) return null

  return (
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.95)', backdropFilter: 'blur(20px)', zIndex: 60, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16 }}>
      <div style={{ ...panelStyle, maxWidth: 440, width: '100%' }}>
        <h2 style={{ fontSize: 17, fontWeight: 700, letterSpacing: '-0.025em', marginBottom: 16 }}>
          Antes de tu primera operación
        </h2>
        <div style={{ fontSize: 13, color: C.textMuted, lineHeight: 1.7, marginBottom: 20, padding: '14px 16px', background: C.surface, borderRadius: 7, border: `1px solid ${C.cardBorder}` }}>
          PrediMarket es una plataforma de mercados de predicción con <strong style={{ color: C.text }}>créditos virtuales</strong>. Al operar, aceptas que:
          <ul style={{ marginTop: 10, marginBottom: 0, paddingLeft: 18, display: 'flex', flexDirection: 'column', gap: 6 }}>
            <li>Puedes perder el 100% del crédito invertido en cada operación</li>
            <li>PrediMarket actúa como intermediario tecnológico, no como asesor financiero</li>
            <li>La resolución depende de oráculos externos y datos públicos verificables</li>
            <li>Los créditos son virtuales y no tienen valor monetario real</li>
          </ul>
        </div>
        <label style={{ display: 'flex', alignItems: 'flex-start', gap: 10, cursor: 'pointer', marginBottom: 16 }}>
          <input
            type="checkbox"
            id="disclaimer-check"
            style={{ marginTop: 2, width: 16, height: 16, accentColor: C.accent, flexShrink: 0 }}
            onChange={e => {
              document.getElementById('disclaimer-accept-btn').disabled = !e.target.checked
              document.getElementById('disclaimer-accept-btn').style.opacity = e.target.checked ? '1' : '0.4'
            }}
          />
          <span style={{ fontSize: 13, color: C.text, lineHeight: 1.5 }}>
            Entiendo que puedo perder el 100% de mis créditos y que PrediMarket es un intermediario tecnológico, no un servicio financiero regulado.
          </span>
        </label>
        <div style={{ display: 'flex', gap: 8 }}>
          <button
            onClick={() => { setShowDisclaimer(false); setPendingTradeAction(null) }}
            style={{ flex: 1, padding: '11px 0', borderRadius: 7, border: `1px solid ${C.cardBorder}`, background: 'transparent', color: C.textDim, fontSize: 13, cursor: 'pointer' }}
          >
            Cancelar
          </button>
          <button
            id="disclaimer-accept-btn"
            disabled
            style={{ flex: 2, padding: '11px 0', borderRadius: 7, border: 'none', background: C.accent, color: '#fff', fontSize: 13, fontWeight: 700, cursor: 'pointer', opacity: 0.4, transition: 'opacity 0.15s' }}
            onClick={() => {
              localStorage.setItem('predi_disclaimer_v1', 'accepted')
              setShowDisclaimer(false)
              if (pendingTradeAction === 'MARKET') onExecuteTrade()
              else if (pendingTradeAction === 'LIMIT') onLimitOrder()
              setPendingTradeAction(null)
            }}
          >
            Acepto — Continuar
          </button>
        </div>
      </div>
    </div>
  )
}
