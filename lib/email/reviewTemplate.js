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
  rating,           // optional: { score, breakdown, trending_matches, engagement, quality, viral }
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

              ${market.resolution_source ? `
              <tr>
                <td colspan="2" style="padding:0 0 16px;vertical-align:top;">
                  <p style="margin:0 0 4px;font-size:12px;color:#94a3b8;text-transform:uppercase;letter-spacing:0.05em;">Fuente de resolución</p>
                  <p style="margin:0;font-size:14px;color:#334155;word-break:break-all;">${escHtml(market.resolution_source)}</p>
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

        ${buildPriceSourceSection(market)}

        ${rating ? buildRatingSection(rating) : ''}

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

// ─── Source link detection ────────────────────────────────────────────────────

const PRICE_SOURCES = [
  {
    test:    t => t.includes('ibex'),
    name:    'Yahoo Finance — IBEX 35',
    url:     'https://finance.yahoo.com/quote/%5EIBEX',
    label:   'Precio en tiempo real del IBEX 35',
    icon:    '📈',
  },
  {
    test:    t => t.includes('bitcoin') || t.includes('btc'),
    name:    'CoinGecko — Bitcoin',
    url:     'https://www.coingecko.com/en/coins/bitcoin',
    label:   'Precio en tiempo real de Bitcoin',
    icon:    '₿',
  },
  {
    test:    t => t.includes('ethereum') || t.includes('eth'),
    name:    'CoinGecko — Ethereum',
    url:     'https://www.coingecko.com/en/coins/ethereum',
    label:   'Precio en tiempo real de Ethereum',
    icon:    '⬡',
  },
  {
    test:    t => t.includes('luz') || t.includes('mwh') || t.includes('pvpc'),
    name:    'REE apidatos',
    url:     'https://apidatos.ree.es/es/datos/mercados/precios-mercados-tiempo-real',
    label:   'Precio mayorista de electricidad en España',
    icon:    '⚡',
  },
  {
    test:    t => t.includes('brent'),
    name:    'Yahoo Finance — Brent Crude',
    url:     'https://finance.yahoo.com/quote/BZ%3DF',
    label:   'Precio del petróleo Brent',
    icon:    '🛢',
  },
  {
    test:    t => t.includes('eurusd') || t.includes('eur/usd'),
    name:    'Yahoo Finance — EUR/USD',
    url:     'https://finance.yahoo.com/quote/EURUSD%3DX',
    label:   'Tipo de cambio EUR/USD',
    icon:    '💱',
  },
]

function buildPriceSourceSection(market) {
  const t = (market.title + ' ' + (market.description || '')).toLowerCase()
  const sources = PRICE_SOURCES.filter(s => s.test(t))
  if (sources.length === 0) return ''

  const rows = sources.map(s => `
    <tr>
      <td style="padding:6px 0;">
        <table cellpadding="0" cellspacing="0" width="100%">
          <tr>
            <td style="width:28px;font-size:16px;vertical-align:middle;">${s.icon}</td>
            <td style="vertical-align:middle;">
              <p style="margin:0;font-size:13px;color:#334155;">${escHtml(s.label)}</p>
            </td>
            <td style="text-align:right;vertical-align:middle;">
              <a href="${s.url}" style="display:inline-block;padding:5px 12px;background:#6366f1;color:#fff;text-decoration:none;border-radius:6px;font-size:12px;font-weight:700;white-space:nowrap;">
                ${escHtml(s.name)} ↗
              </a>
            </td>
          </tr>
        </table>
      </td>
    </tr>`).join('')

  return `
        <!-- Price sources -->
        <tr>
          <td style="padding:20px 32px 0;">
            <p style="margin:0 0 10px;font-size:12px;color:#94a3b8;text-transform:uppercase;letter-spacing:0.05em;">Consultar precio antes de aprobar</p>
            <table width="100%" cellpadding="0" cellspacing="0" style="border:1px solid #e2e8f0;border-radius:8px;overflow:hidden;background:#f8fafc;">
              <tbody style="display:table;width:100%;padding:8px 14px;">
                ${rows}
              </tbody>
            </table>
          </td>
        </tr>

        <!-- Divider -->
        <tr><td style="padding:20px 32px 0;"><hr style="border:none;border-top:1px solid #e2e8f0;margin:0;" /></td></tr>`
}

function buildRatingSection(rating) {
  const score = rating.score
  const badge = score >= 9  ? { color: '#92400e', bg: '#fef3c7', text: '🥇 Excelente' }
              : score >= 7  ? { color: '#14532d', bg: '#dcfce7', text: '✅ Bueno' }
              : score >= 4  ? { color: '#92400e', bg: '#fffbeb', text: '⚠️ Aceptable' }
              :               { color: '#991b1b', bg: '#fee2e2', text: '❌ Bajo' }

  const bd = rating.breakdown || {}

  // All sub-scores sorted for top/bottom display
  const subScores = [
    { name: 'Relevancia noticias',     val: bd.NEWS_RELEVANCE       ?? 0 },
    { name: 'Polarización',            val: bd.POLARIZATION         ?? 0 },
    { name: 'Conexión emocional',      val: bd.EMOTIONAL_CONNECTION ?? 0 },
    { name: 'Resolución objetiva',     val: bd.OBJECTIVE_RESOLUTION ?? 0 },
    { name: 'Plazo',                   val: bd.TIMEFRAME            ?? 0 },
    { name: 'Calibración',             val: bd.CALIBRATION          ?? 0 },
    { name: 'Simplicidad',             val: bd.SIMPLICITY           ?? 0 },
    { name: 'Factor viral',            val: bd.BAR_FACTOR           ?? 0 },
    { name: 'Popularidad categoría',   val: bd.CATEGORY_POPULARITY  ?? 0 },
    { name: 'Actualidad/temporada',    val: bd.SEASONALITY          ?? 0 },
  ].sort((a, b) => b.val - a.val)

  const top3    = subScores.slice(0, 3)
  const bottom3 = subScores.slice(-3).reverse()

  const scoreBarWidth = Math.round(score / 10 * 100)

  const trendingRows = (rating.trending_matches || []).map(m =>
    `<li style="margin:4px 0;font-size:13px;color:#475569;">📰 <em>${escHtml(m.title)}</em> <span style="color:#94a3b8;">(${escHtml(m.source)})</span></li>`
  ).join('')

  return `
        <!-- Oracle Rating Section -->
        <tr>
          <td style="padding:20px 32px 28px;">
            <div style="background:#f8fafc;border:1px solid #e2e8f0;border-radius:10px;padding:20px 24px;">

              <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:16px;gap:12px;">
                <div>
                  <p style="margin:0 0 2px;font-size:11px;color:#94a3b8;text-transform:uppercase;letter-spacing:.05em;">Puntuación Oracle</p>
                  <p style="margin:0;font-size:32px;font-weight:800;color:#0f172a;line-height:1;">${score}<span style="font-size:16px;font-weight:400;color:#94a3b8;">/10</span></p>
                </div>
                <span style="display:inline-block;padding:6px 14px;background:${badge.bg};color:${badge.color};border-radius:20px;font-size:14px;font-weight:700;">
                  ${badge.text}
                </span>
              </div>

              <!-- Score bar -->
              <div style="background:#e2e8f0;border-radius:4px;height:8px;margin-bottom:16px;overflow:hidden;">
                <div style="background:${score >= 7 ? '#16a34a' : score >= 4 ? '#f59e0b' : '#dc2626'};width:${scoreBarWidth}%;height:100%;border-radius:4px;"></div>
              </div>

              <!-- Engagement / Quality / Viral -->
              <table width="100%" cellpadding="0" cellspacing="0" style="margin-bottom:16px;">
                <tr>
                  <td style="width:33%;text-align:center;padding:8px 4px;background:#fff;border-radius:6px;border:1px solid #e2e8f0;">
                    <p style="margin:0 0 2px;font-size:10px;color:#94a3b8;text-transform:uppercase;">Engagement</p>
                    <p style="margin:0;font-size:18px;font-weight:700;color:#6366f1;">${rating.engagement ?? '—'}</p>
                    <p style="margin:0;font-size:10px;color:#94a3b8;">×40%</p>
                  </td>
                  <td style="width:4%;"></td>
                  <td style="width:33%;text-align:center;padding:8px 4px;background:#fff;border-radius:6px;border:1px solid #e2e8f0;">
                    <p style="margin:0 0 2px;font-size:10px;color:#94a3b8;text-transform:uppercase;">Calidad</p>
                    <p style="margin:0;font-size:18px;font-weight:700;color:#0ea5e9;">${rating.quality ?? '—'}</p>
                    <p style="margin:0;font-size:10px;color:#94a3b8;">×35%</p>
                  </td>
                  <td style="width:4%;"></td>
                  <td style="width:33%;text-align:center;padding:8px 4px;background:#fff;border-radius:6px;border:1px solid #e2e8f0;">
                    <p style="margin:0 0 2px;font-size:10px;color:#94a3b8;text-transform:uppercase;">Viral</p>
                    <p style="margin:0;font-size:18px;font-weight:700;color:#8b5cf6;">${rating.viral ?? '—'}</p>
                    <p style="margin:0;font-size:10px;color:#94a3b8;">×25%</p>
                  </td>
                </tr>
              </table>

              <!-- Top 3 / Bottom 3 -->
              <table width="100%" cellpadding="0" cellspacing="0">
                <tr>
                  <td style="width:48%;vertical-align:top;">
                    <p style="margin:0 0 6px;font-size:11px;color:#16a34a;font-weight:700;text-transform:uppercase;">↑ Más altos</p>
                    ${top3.map(s => `
                    <div style="display:flex;justify-content:space-between;margin-bottom:3px;">
                      <span style="font-size:12px;color:#374151;">${escHtml(s.name)}</span>
                      <span style="font-size:12px;font-weight:700;color:#16a34a;">${s.val}</span>
                    </div>`).join('')}
                  </td>
                  <td style="width:4%;"></td>
                  <td style="width:48%;vertical-align:top;">
                    <p style="margin:0 0 6px;font-size:11px;color:#dc2626;font-weight:700;text-transform:uppercase;">↓ Más bajos</p>
                    ${bottom3.map(s => `
                    <div style="display:flex;justify-content:space-between;margin-bottom:3px;">
                      <span style="font-size:12px;color:#374151;">${escHtml(s.name)}</span>
                      <span style="font-size:12px;font-weight:700;color:#dc2626;">${s.val}</span>
                    </div>`).join('')}
                  </td>
                </tr>
              </table>

              ${trendingRows ? `
              <div style="margin-top:14px;padding-top:12px;border-top:1px solid #e2e8f0;">
                <p style="margin:0 0 6px;font-size:11px;color:#94a3b8;text-transform:uppercase;letter-spacing:.05em;">Titulares coincidentes</p>
                <ul style="margin:0;padding:0 0 0 4px;list-style:none;">${trendingRows}</ul>
              </div>` : ''}

            </div>
          </td>
        </tr>`
}

function escHtml(str) {
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
}
