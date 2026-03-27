// ─── Email template for new market review notification ────────────────────────

/**
 * Build the HTML email sent to admin when a new market is created.
 *
 * @param {{
 *   market: {
 *     id: number|string,
 *     title: string,
 *     description: string,
 *     category: string,
 *     close_date: string|null,
 *     oracle_type: string|null,
 *     resolution_source: string|null,
 *   },
 *   probability: number,        // 0-1, current implied probability
 *   approveUrl: string,         // GET link to approve (token-based)
 *   withdrawUrl: string,        // GET link to withdraw (token-based)
 *   adminMarketUrl: string,     // Direct link to admin panel for this market
 * }} params
 */
export function buildMarketReviewEmail({
  market,
  probability,
  approveUrl,
  withdrawUrl,
  adminMarketUrl,
}) {
  const probPercent = probability != null ? Math.round(probability * 100) : 50
  const closeDate = market.close_date
    ? new Date(market.close_date).toLocaleString('es-ES', {
        day: 'numeric', month: 'long', year: 'numeric',
        hour: '2-digit', minute: '2-digit', timeZone: 'Europe/Madrid',
      })
    : 'No especificada'

  return `<!DOCTYPE html>
<html lang="es">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>Nuevo mercado pendiente de revisión — Forsii</title>
</head>
<body style="margin:0;padding:0;background:#f1f5f9;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#f1f5f9;padding:32px 16px;">
    <tr><td align="center">
      <table width="600" cellpadding="0" cellspacing="0" style="background:#ffffff;border-radius:12px;overflow:hidden;box-shadow:0 2px 8px rgba(0,0,0,0.08);">

        <!-- Header -->
        <tr>
          <td style="background:#1e293b;padding:24px 32px;">
            <p style="margin:0;color:#94a3b8;font-size:13px;letter-spacing:0.05em;text-transform:uppercase;">Forsii · Revisión de mercado</p>
            <h1 style="margin:8px 0 0;color:#f8fafc;font-size:22px;font-weight:700;">🆕 Nuevo mercado pendiente de revisión</h1>
          </td>
        </tr>

        <!-- Market title & description -->
        <tr>
          <td style="padding:28px 32px 0;">
            <h2 style="margin:0 0 8px;font-size:18px;color:#0f172a;line-height:1.4;">${escHtml(market.title)}</h2>
            <p style="margin:0;color:#475569;font-size:14px;line-height:1.6;">${escHtml(market.description || '')}</p>
          </td>
        </tr>

        <!-- Divider -->
        <tr><td style="padding:20px 32px;"><hr style="border:none;border-top:1px solid #e2e8f0;margin:0;" /></td></tr>

        <!-- Market details grid -->
        <tr>
          <td style="padding:0 32px;">
            <table width="100%" cellpadding="0" cellspacing="0">

              <tr>
                <td style="padding:0 16px 16px 0;width:50%;vertical-align:top;">
                  <p style="margin:0 0 4px;font-size:12px;color:#94a3b8;text-transform:uppercase;letter-spacing:0.05em;">Categoría</p>
                  <p style="margin:0;font-size:15px;color:#1e293b;font-weight:600;">${escHtml(market.category || 'N/A')}</p>
                </td>
                <td style="padding:0 0 16px;width:50%;vertical-align:top;">
                  <p style="margin:0 0 4px;font-size:12px;color:#94a3b8;text-transform:uppercase;letter-spacing:0.05em;">Fecha de resolución</p>
                  <p style="margin:0;font-size:15px;color:#1e293b;font-weight:600;">${escHtml(closeDate)}</p>
                </td>
              </tr>

              ${market.oracle_type ? `
              <tr>
                <td style="padding:0 16px 16px 0;width:50%;vertical-align:top;">
                  <p style="margin:0 0 4px;font-size:12px;color:#94a3b8;text-transform:uppercase;letter-spacing:0.05em;">Tipo de oráculo</p>
                  <p style="margin:0;font-size:15px;color:#1e293b;font-weight:600;">${escHtml(market.oracle_type)}</p>
                </td>
                <td style="padding:0 0 16px;width:50%;vertical-align:top;">
                  ${market.resolution_source ? `
                  <p style="margin:0 0 4px;font-size:12px;color:#94a3b8;text-transform:uppercase;letter-spacing:0.05em;">Fuente (oracle URL)</p>
                  <a href="${escHtml(market.resolution_source)}" style="font-size:14px;color:#3b82f6;word-break:break-all;">🔗 Ver fuente →</a>
                  ` : ''}
                </td>
              </tr>` : ''}

            </table>
          </td>
        </tr>

        <!-- Implied probability -->
        <tr>
          <td style="padding:0 32px 28px;">
            <div style="background:#f8fafc;border:2px solid #6366f1;border-radius:10px;padding:18px 20px;">
              <p style="margin:0 0 4px;font-size:12px;color:#94a3b8;text-transform:uppercase;letter-spacing:0.05em;">Probabilidad implícita actual (calibración)</p>
              <p style="margin:0;font-size:32px;font-weight:800;color:#6366f1;">${probPercent}%</p>
              <p style="margin:4px 0 0;font-size:13px;color:#64748b;">Basada en los pools iniciales del mercado.</p>
            </div>
          </td>
        </tr>

        <!-- Divider -->
        <tr><td style="padding:0 32px;"><hr style="border:none;border-top:1px solid #e2e8f0;margin:0;" /></td></tr>

        <!-- Action buttons -->
        <tr>
          <td style="padding:28px 32px;">
            <p style="margin:0 0 20px;font-size:15px;color:#334155;font-weight:600;">¿Aprobar este mercado para publicación pública?</p>
            <table cellpadding="0" cellspacing="0">
              <tr>
                <td style="padding-right:12px;">
                  <a href="${approveUrl}"
                     style="display:inline-block;background:#16a34a;color:#ffffff;text-decoration:none;padding:14px 24px;border-radius:8px;font-size:15px;font-weight:700;letter-spacing:0.01em;">
                    ✅ APROBAR MERCADO
                  </a>
                </td>
                <td>
                  <a href="${withdrawUrl}"
                     style="display:inline-block;background:#dc2626;color:#ffffff;text-decoration:none;padding:14px 24px;border-radius:8px;font-size:15px;font-weight:700;letter-spacing:0.01em;">
                    ❌ RETIRAR MERCADO
                  </a>
                </td>
              </tr>
            </table>
            <p style="margin:16px 0 0;font-size:12px;color:#94a3b8;">
              ⚠️ Si no tomas acción en <strong>24 horas</strong>, el mercado será aprobado automáticamente y pasará a ser visible para los usuarios.
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

function escHtml(str) {
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
}
