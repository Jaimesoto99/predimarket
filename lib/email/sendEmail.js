// ─── Email utility ────────────────────────────────────────────────────────────
//
// Uses Resend (resend.com) in production.
// In development, logs the email to the console instead of sending.
//
// Required env vars:
//   RESEND_API_KEY      — Resend API key (production only)
//   EMAIL_FROM          — Sender address, e.g. "Forsii <noreply@forsii.com>"
//
// Usage:
//   import { sendEmail } from '@/lib/email/sendEmail'
//   await sendEmail({ to: 'admin@example.com', subject: 'Hello', html: '<p>Hi</p>' })

const RESEND_API_URL = 'https://api.resend.com/emails'

/**
 * Send a transactional email.
 * @param {{ to: string, subject: string, html: string }} options
 * @returns {Promise<{ success: boolean, dev?: boolean, id?: string, error?: string }>}
 */
export async function sendEmail({ to, subject, html }) {
  const isDev = process.env.NODE_ENV !== 'production'

  if (isDev) {
    console.log('\n╔══════════════════════════════════════════════════')
    console.log('║ [EMAIL DEV] — would send in production')
    console.log(`║ To:      ${to}`)
    console.log(`║ Subject: ${subject}`)
    console.log('║ HTML body logged below:')
    console.log('╚══════════════════════════════════════════════════')
    // Strip tags for readable console output
    console.log(html.replace(/<[^>]+>/g, ' ').replace(/\s{2,}/g, ' ').trim())
    console.log('══════════════════════════════════════════════════\n')
    return { success: true, dev: true }
  }

  const apiKey = process.env.RESEND_API_KEY
  if (!apiKey) {
    console.error('[EMAIL] RESEND_API_KEY not set — skipping email send')
    return { success: false, error: 'RESEND_API_KEY not configured' }
  }

  const from = process.env.EMAIL_FROM || 'Forsii <noreply@forsii.com>'

  try {
    const res = await fetch(RESEND_API_URL, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ from, to, subject, html }),
    })

    if (!res.ok) {
      const errText = await res.text()
      console.error('[EMAIL] Resend API error:', res.status, errText)
      return { success: false, error: errText }
    }

    const data = await res.json()
    return { success: true, id: data.id }
  } catch (err) {
    console.error('[EMAIL] Network error sending email:', err.message)
    return { success: false, error: err.message }
  }
}
