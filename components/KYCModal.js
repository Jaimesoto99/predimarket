import { useState } from 'react'
import { C, modalStyle, panelStyle, closeBtnStyle } from '../lib/theme'

const STEPS = [
  {
    n: 1,
    title: 'Datos personales',
    desc: 'Introduce tu nombre completo, DNI/NIE y fecha de nacimiento para verificar tu identidad.',
    fields: [
      { label: 'Nombre completo', placeholder: 'Nombre y apellidos' },
      { label: 'DNI / NIE', placeholder: 'Ej: 12345678A' },
      { label: 'Fecha de nacimiento', placeholder: 'DD/MM/AAAA' },
    ],
  },
  {
    n: 2,
    title: 'Foto del documento',
    desc: 'Sube una foto del anverso y reverso de tu documento de identidad. La imagen debe ser nítida y sin reflejos.',
    upload: true,
    uploadLabel: 'Subir foto del DNI/NIE',
  },
  {
    n: 3,
    title: 'Selfie de verificación',
    desc: 'Realiza una selfie sosteniendo tu documento de identidad junto a tu cara. Esto confirma que eres el titular del documento.',
    upload: true,
    uploadLabel: 'Subir selfie con documento',
  },
  {
    n: 4,
    title: 'Verificación completada',
    desc: '¡Tu identidad ha sido verificada! Ya puedes operar con fondos reales en PrediMarket.',
    done: true,
  },
]

export default function KYCModal({ onClose }) {
  const [step, setStep] = useState(1)

  const current = STEPS[step - 1]
  const isLast = step === STEPS.length

  function handleNext() {
    if (isLast) {
      try { localStorage.setItem('kycCompleted', 'true') } catch {}
      onClose()
    } else {
      setStep(s => s + 1)
    }
  }

  return (
    <div style={{ ...modalStyle, zIndex: 60, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16 }}>
      <div style={{ ...panelStyle, maxWidth: 480, width: '100%' }}>
        {/* Header */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 }}>
          <div>
            <h2 style={{ fontSize: 16, fontWeight: 700, letterSpacing: '-0.025em', marginBottom: 2 }}>Verificación de identidad (KYC)</h2>
            <div style={{ fontSize: 11, color: C.textDim }}>Requerida para operar con fondos reales</div>
          </div>
          <button onClick={onClose} style={closeBtnStyle}>✕</button>
        </div>

        {/* Progress bar */}
        <div style={{ marginBottom: 24 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8 }}>
            {STEPS.map(s => (
              <div key={s.n} style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                <div style={{
                  width: 24, height: 24, borderRadius: 12,
                  background: step > s.n ? C.yes : step === s.n ? C.accent : C.surface,
                  border: `1px solid ${step > s.n ? C.yes : step === s.n ? C.accent : C.cardBorder}`,
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  fontSize: 10, fontWeight: 700,
                  color: step >= s.n ? '#fff' : C.textDim,
                  transition: 'all 0.3s ease',
                }}>
                  {step > s.n ? '✓' : s.n}
                </div>
              </div>
            ))}
          </div>
          <div style={{ height: 3, background: C.divider, borderRadius: 2, overflow: 'hidden' }}>
            <div style={{
              height: '100%', borderRadius: 2,
              background: `linear-gradient(to right, ${C.accent}, ${C.accentLight})`,
              width: `${((step - 1) / (STEPS.length - 1)) * 100}%`,
              transition: 'width 0.4s ease',
            }} />
          </div>
        </div>

        {/* Step content */}
        <div style={{ padding: '20px 0' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 16 }}>
            <div style={{
              width: 36, height: 36, borderRadius: 8,
              background: current.done ? `${C.yes}15` : `${C.accent}15`,
              border: `1px solid ${current.done ? C.yes : C.accent}25`,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontSize: 16,
            }}>
              {current.done ? '✓' : current.n}
            </div>
            <div>
              <div style={{ fontSize: 15, fontWeight: 600, color: C.text }}>{current.title}</div>
              <div style={{ fontSize: 11, color: C.textDim }}>Paso {current.n} de {STEPS.length}</div>
            </div>
          </div>

          <p style={{ fontSize: 13, color: C.textMuted, lineHeight: 1.6, marginBottom: 20 }}>{current.desc}</p>

          {current.fields && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 12, marginBottom: 20 }}>
              {current.fields.map(f => (
                <div key={f.label}>
                  <label style={{ fontSize: 10, fontWeight: 600, letterSpacing: '0.08em', textTransform: 'uppercase', color: C.textDim, display: 'block', marginBottom: 6 }}>
                    {f.label}
                  </label>
                  <input
                    placeholder={f.placeholder}
                    style={{
                      width: '100%', background: C.surface, border: `1px solid ${C.cardBorder}`,
                      borderRadius: 7, padding: '10px 14px', color: C.text, fontSize: 14,
                      outline: 'none', boxSizing: 'border-box',
                    }}
                  />
                </div>
              ))}
            </div>
          )}

          {current.upload && (
            <div style={{
              border: `2px dashed ${C.cardBorder}`, borderRadius: 8, padding: '28px 16px',
              textAlign: 'center', marginBottom: 20, cursor: 'pointer',
              transition: 'border-color 0.2s',
            }}
              onMouseEnter={e => e.currentTarget.style.borderColor = C.accent}
              onMouseLeave={e => e.currentTarget.style.borderColor = C.cardBorder}>
              <div style={{ fontSize: 24, marginBottom: 8 }}>📎</div>
              <div style={{ fontSize: 13, color: C.textMuted, fontWeight: 500 }}>{current.uploadLabel}</div>
              <div style={{ fontSize: 11, color: C.textDim, marginTop: 4 }}>JPG, PNG o PDF — máx. 10MB</div>
            </div>
          )}

          {current.done && (
            <div style={{ padding: '16px', background: `${C.yes}08`, border: `1px solid ${C.yes}25`, borderRadius: 8, marginBottom: 20 }}>
              <div style={{ fontSize: 13, color: C.yes, fontWeight: 600, marginBottom: 4 }}>Identidad verificada</div>
              <div style={{ fontSize: 12, color: C.textMuted, lineHeight: 1.5 }}>
                Tu cuenta está verificada. Ahora puedes depositar fondos reales y operar sin restricciones dentro de los límites regulatorios aplicables.
              </div>
            </div>
          )}
        </div>

        {/* Actions */}
        <div style={{ display: 'flex', gap: 10 }}>
          {step > 1 && !current.done && (
            <button
              onClick={() => setStep(s => s - 1)}
              style={{ flex: 1, padding: '11px 0', borderRadius: 7, border: `1px solid ${C.cardBorder}`, background: 'transparent', color: C.textDim, fontSize: 13, cursor: 'pointer' }}>
              ← Anterior
            </button>
          )}
          <button
            onClick={handleNext}
            style={{ flex: 2, padding: '11px 0', borderRadius: 7, border: 'none', background: current.done ? C.yes : C.accent, color: '#fff', fontSize: 13, fontWeight: 700, cursor: 'pointer' }}>
            {isLast ? 'Completar verificación ✓' : 'Siguiente →'}
          </button>
        </div>

        <p style={{ fontSize: 11, color: C.textDim, marginTop: 12, textAlign: 'center', lineHeight: 1.5 }}>
          Tus datos se almacenan cifrados y solo se usan para verificación de identidad según la Ley 10/2010 PBC/FT.
        </p>
      </div>
    </div>
  )
}
