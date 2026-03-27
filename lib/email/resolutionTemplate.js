// ─── Email templates for supervised market resolution ─────────────────────────

/**
 * Build the HTML email for a pending resolution awaiting admin confirmation.
 *
 * @param {{
 *   market: { id: string, title: string, description: string },
 *   oracleType: string,
 *   oracleData: { source: string, value: number|null, oracleUrl: string|null },
 *   suggestedResult: boolean,
 *   confirmUrl: string,
 *   rejectUrl: string,
 *   adminMarketUrl: string,
 * }} params
 */
export function buildPendingResolutionEmail({
  market,
  oracleType,
  oracleData,
  suggestedResult,
  confirmUrl,
  rejectUrl,
  adminMarketUrl,
}) {
  const resultLabel = suggestedResult ? '✅ SÍ' : '❌ NO'
  const resultColor = suggestedResult ? '#16a34a' : '#dc2626'
  const oracleUrl   = oracleData.oracleUrl || '#'

  return `<!DOCTYPE html>
<html lang="es">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>Resolución pendiente — Forsii</title>
</head>
<body style="margin:0;padding:0;background:#f1f5f9;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#f1f5f9;padding:32px 16px;">
    <tr><td align="center">
      <table width="600" cellpadding="0" cellspacing="0" style="background:#ffffff;border-radius:12px;overflow:hidden;box-shadow:0 2px 8px rgba(0,0,0,0.08);">

        <!-- Header -->
        <tr>
          <td style="background:#1e293b;padding:24px 32px;">
            <p style="margin:0;color:#94a3b8;font-size:13px;letter-spacing:0.05em;text-transform:uppercase;">Forsii · Resolución supervisada</p>
            <h1 style="margin:8px 0 0;color:#f8fafc;font-size:22px;font-weight:700;">⏳ Mercado pendiente de resolución</h1>
          </td>
        </tr>

        <!-- Market info -->
        <tr>
          <td style="padding:28px 32px 0;">
            <h2 style="margin:0 0 8px;font-size:18px;color:#0f172a;line-height:1.4;">${escHtml(market.title)}</h2>
            <p style="margin:0;color:#475569;font-size:14px;line-height:1.6;">${escHtml(market.description || '')}</p>
          </td>
        </tr>

        <!-- Divider -->
        <tr><td style="padding:20px 32px;"><hr style="border:none;border-top:1px solid #e2e8f0;margin:0;" /></td></tr>

        <!-- Oracle details -->
        <tr>
          <td style="padding:0 32px;">
            <table width="100%" cellpadding="0" cellspacing="0">
              <tr>
                <td style="padding:0 0 16px;">
                  <p style="margin:0 0 4px;font-size:12px;color:#94a3b8;text-transform:uppercase;letter-spacing:0.05em;">Oráculo utilizado</p>
                  <p style="margin:0;font-size:15px;color:#1e293b;font-weight:600;">${escHtml(oracleType)}</p>
                </td>
              </tr>
              <tr>
                <td style="padding:0 0 16px;">
                  <p style="margin:0 0 4px;font-size:12px;color:#94a3b8;text-transform:uppercase;letter-spacing:0.05em;">Fuente y datos obtenidos</p>
                  <p style="margin:0;font-size:14px;color:#334155;line-height:1.5;">${escHtml(oracleData.source || 'Sin descripción')}</p>
                  ${oracleUrl !== '#' ? `<a href="${oracleUrl}" style="display:inline-block;margin-top:6px;font-size:13px;color:#3b82f6;">🔗 Ver fuente →</a>` : ''}
                </td>
              </tr>
              ${oracleData.value != null ? `
              <tr>
                <td style="padding:0 0 16px;">
                  <p style="margin:0 0 4px;font-size:12px;color:#94a3b8;text-transform:uppercase;letter-spacing:0.05em;">Valor obtenido</p>
                  <p style="margin:0;font-size:20px;color:#1e293b;font-weight:700;">${oracleData.value}</p>
                </td>
              </tr>` : ''}
            </table>
          </td>
        </tr>

        <!-- Suggested result -->
        <tr>
          <td style="padding:0 32px 28px;">
            <div style="background:#f8fafc;border:2px solid ${resultColor};border-radius:10px;padding:18px 20px;">
              <p style="margin:0 0 4px;font-size:12px;color:#94a3b8;text-transform:uppercase;letter-spacing:0.05em;">Resultado sugerido por el oráculo</p>
              <p style="margin:0;font-size:28px;font-weight:800;color:${resultColor};">${resultLabel}</p>
            </div>
          </td>
        </tr>

        <!-- Divider -->
        <tr><td style="padding:0 32px;"><hr style="border:none;border-top:1px solid #e2e8f0;margin:0;" /></td></tr>

        <!-- Action buttons -->
        <tr>
          <td style="padding:28px 32px;">
            <p style="margin:0 0 20px;font-size:15px;color:#334155;font-weight:600;">¿Confirmas esta resolución?</p>
            <table cellpadding="0" cellspacing="0">
              <tr>
                <td style="padding-right:12px;">
                  <a href="${confirmUrl}"
                     style="display:inline-block;background:#16a34a;color:#ffffff;text-decoration:none;padding:14px 24px;border-radius:8px;font-size:15px;font-weight:700;letter-spacing:0.01em;">
                    ✅ CONFIRMAR RESOLUCIÓN
                  </a>
                </td>
                <td>
                  <a href="${rejectUrl}"
                     style="display:inline-block;background:#dc2626;color:#ffffff;text-decoration:none;padding:14px 24px;border-radius:8px;font-size:15px;font-weight:700;letter-spacing:0.01em;">
                    ❌ RECHAZAR / REVISAR
                  </a>
                </td>
              </tr>
            </table>
            <p style="margin:16px 0 0;font-size:12px;color:#94a3b8;">
              ⚠️ Si no confirmas en <strong>24 horas</strong>, todos los participantes recibirán un reembolso automático.
            </p>
          </td>
        </tr>

        <!-- Admin link -->
        <tr>
          <td style="padding:0 32px 28px;">
            <a href="${adminMarketUrl}" style="font-size:13px;color:#6366f1;">🛠 Ver mercado en el panel de administración →</a>
          </td>
        </tr>

        <!-- Footer -->
        <tr>
          <td style="background:#f8fafc;padding:16px 32px;border-top:1px solid #e2e8f0;">
            <p style="margin:0;font-size:12px;color:#94a3b8;">Este email fue generado automáticamente por Forsii. No responder a este mensaje.</p>
          </td>
        </tr>

      </table>
    </td></tr>
  </table>
</body>
</html>`
}

/**
 * Build the HTML alert email for a rejected/expired resolution.
 */
export function buildAlertEmail({ market, reason, details }) {
  return `<!DOCTYPE html>
<html lang="es">
<head><meta charset="UTF-8" /><title>Alerta — Forsii</title></head>
<body style="margin:0;padding:32px 16px;background:#f1f5f9;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0">
    <tr><td align="center">
      <table width="600" cellpadding="0" cellspacing="0" style="background:#fff;border-radius:12px;overflow:hidden;box-shadow:0 2px 8px rgba(0,0,0,0.08);">
        <tr>
          <td style="background:#7c3aed;padding:24px 32px;">
            <h1 style="margin:0;color:#fff;font-size:20px;">⚠️ Alerta de resolución — Forsii</h1>
          </td>
        </tr>
        <tr>
          <td style="padding:28px 32px;">
            <p style="margin:0 0 12px;font-size:15px;color:#334155;"><strong>Motivo:</strong> ${escHtml(reason)}</p>
            <p style="margin:0 0 12px;font-size:15px;color:#334155;"><strong>Mercado:</strong> ${escHtml(market?.title || 'Desconocido')}</p>
            ${details ? `<p style="margin:0;font-size:14px;color:#64748b;">${escHtml(String(details))}</p>` : ''}
          </td>
        </tr>
        <tr>
          <td style="background:#f8fafc;padding:16px 32px;border-top:1px solid #e2e8f0;">
            <p style="margin:0;font-size:12px;color:#94a3b8;">Email automático de Forsii.</p>
          </td>
        </tr>
      </table>
    </td></tr>
  </table>
</body>
</html>`
}

function escHtml(str) {
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
}
