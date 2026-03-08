import Head from 'next/head'
import Link from 'next/link'
import { createClient } from '@supabase/supabase-js'
import { C, getCategoryLabel, getTimeLeft } from '../../lib/theme'
import { slugify } from '../../lib/watchlist'
import { calculatePrices } from '../../lib/amm'

// ─── Server-side: fetch market by slug or id fallback ────────────────────

export async function getServerSideProps({ params }) {
  const slug = params?.slug

  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
  )

  // Try slug match first, then fallback to id
  let { data: market } = await supabase
    .from('markets')
    .select('id, title, description, category, status, close_date, yes_pool, no_pool, total_volume, active_traders, prob_change_24h, market_score, cluster_id')
    .eq('slug', slug)
    .single()

  // Fallback: try matching as UUID (for direct ID links)
  if (!market && slug?.match(/^[0-9a-f-]{36}$/i)) {
    const { data } = await supabase
      .from('markets')
      .select('id, title, description, category, status, close_date, yes_pool, no_pool, total_volume, active_traders, prob_change_24h, market_score, cluster_id')
      .eq('id', slug)
      .single()
    market = data
  }

  if (!market) return { notFound: true }

  const prices = calculatePrices(parseFloat(market.yes_pool), parseFloat(market.no_pool))

  return {
    props: {
      market: {
        ...market,
        prices,
        slugified: slugify(market.title),
      },
    },
  }
}

// ─── Share page ───────────────────────────────────────────────────────────

export default function MarketSharePage({ market }) {
  const yesP     = parseFloat(market.prices?.yes || 50)
  const noP      = 100 - yesP
  const expired  = new Date(market.close_date) < new Date()
  const catLabel = getCategoryLabel(market.category)
  const timeLeft = getTimeLeft(market.close_date)
  const probColor = yesP > 60 ? '#16A34A' : yesP < 40 ? '#DC2626' : '#F59E0B'

  const ogTitle = `${market.title} — ${yesP.toFixed(0)}% probabilidad | Predimarket`
  const ogDesc  = `El mercado colectivo estima un ${yesP.toFixed(0)}% de probabilidad de que ocurra este evento. ${market.description || ''}`
  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || 'https://predimarket.vercel.app'
  const shareUrl = `${siteUrl}/prediccion/${market.slugified || market.id}`

  return (
    <>
      <Head>
        <title>{ogTitle}</title>
        <meta name="description" content={ogDesc} />

        {/* OpenGraph */}
        <meta property="og:title"       content={ogTitle} />
        <meta property="og:description" content={ogDesc} />
        <meta property="og:type"        content="article" />
        <meta property="og:url"         content={shareUrl} />
        <meta property="og:site_name"   content="Predimarket" />

        {/* Twitter */}
        <meta name="twitter:card"        content="summary" />
        <meta name="twitter:title"       content={ogTitle} />
        <meta name="twitter:description" content={ogDesc} />

        {/* Canonical */}
        <link rel="canonical" href={shareUrl} />
      </Head>

      <div style={{
        minHeight: '100vh', background: '#FAFAFA',
        fontFamily: 'Inter, -apple-system, sans-serif',
        display: 'flex', flexDirection: 'column', alignItems: 'center',
        padding: '48px 16px 80px',
      }}>
        <div style={{ width: '100%', maxWidth: 600 }}>

          {/* Back */}
          <Link href="/" style={{
            fontSize: 13, color: '#6B7280', textDecoration: 'none',
            display: 'inline-flex', alignItems: 'center', gap: 6, marginBottom: 32,
          }}>
            ← Volver a mercados
          </Link>

          {/* Market card */}
          <div style={{
            background: '#fff', border: '1px solid #E5E7EB',
            borderRadius: 16, overflow: 'hidden',
            boxShadow: '0 4px 24px rgba(0,0,0,0.07)',
          }}>
            {/* Category strip */}
            <div style={{ height: 4, background: probColor }} />

            <div style={{ padding: '28px 32px' }}>
              {/* Meta */}
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 14, flexWrap: 'wrap' }}>
                <span style={{
                  fontSize: 10, fontWeight: 700, letterSpacing: '0.07em',
                  textTransform: 'uppercase', color: probColor,
                }}>
                  {catLabel}
                </span>
                <span style={{ fontSize: 10, color: '#9CA3AF' }}>·</span>
                <span style={{ fontSize: 10, color: '#9CA3AF' }}>
                  {expired ? 'Cerrado' : `Cierra en ${timeLeft}`}
                </span>
                {market.status === 'RESOLVED' && (
                  <>
                    <span style={{ fontSize: 10, color: '#9CA3AF' }}>·</span>
                    <span style={{
                      fontSize: 9, fontWeight: 700, padding: '1px 6px', borderRadius: 4,
                      background: '#F3F4F6', color: '#6B7280', textTransform: 'uppercase',
                    }}>Resuelto</span>
                  </>
                )}
              </div>

              {/* Question */}
              <h1 style={{
                fontSize: 20, fontWeight: 700, lineHeight: 1.35,
                letterSpacing: '-0.025em', color: '#111827', marginBottom: 28,
              }}>
                {market.title}
              </h1>

              {/* Probability display */}
              <div style={{ display: 'flex', gap: 16, marginBottom: 24 }}>
                <div style={{
                  flex: 1, textAlign: 'center', padding: '20px 16px',
                  borderRadius: 10, background: `${probColor}08`,
                  border: `2px solid ${probColor}`,
                }}>
                  <div style={{ fontSize: 10, fontWeight: 600, letterSpacing: '0.08em', textTransform: 'uppercase', color: '#6B7280', marginBottom: 6 }}>
                    SÍ
                  </div>
                  <div style={{ fontSize: 36, fontWeight: 800, letterSpacing: '-0.04em', color: probColor, lineHeight: 1 }}>
                    {yesP.toFixed(0)}%
                  </div>
                </div>
                <div style={{
                  flex: 1, textAlign: 'center', padding: '20px 16px',
                  borderRadius: 10, background: '#F9FAFB', border: '1px solid #E5E7EB',
                }}>
                  <div style={{ fontSize: 10, fontWeight: 600, letterSpacing: '0.08em', textTransform: 'uppercase', color: '#6B7280', marginBottom: 6 }}>
                    NO
                  </div>
                  <div style={{ fontSize: 36, fontWeight: 800, letterSpacing: '-0.04em', color: '#374151', lineHeight: 1 }}>
                    {noP.toFixed(0)}%
                  </div>
                </div>
              </div>

              {/* Probability bar */}
              <div style={{ height: 6, borderRadius: 3, background: '#DC262620', overflow: 'hidden', marginBottom: 20 }}>
                <div style={{ height: '100%', width: `${yesP}%`, background: probColor, borderRadius: 3 }} />
              </div>

              {/* Stats row */}
              <div style={{ display: 'flex', gap: 20, marginBottom: 28, flexWrap: 'wrap' }}>
                {[
                  ['Volumen', `€${((market.total_volume || 0) / 1000).toFixed(1)}K`],
                  ['Traders', market.active_traders || '—'],
                  market.prob_change_24h != null && ['Δ 24h', `${parseFloat(market.prob_change_24h) > 0 ? '+' : ''}${parseFloat(market.prob_change_24h).toFixed(1)}pp`],
                ].filter(Boolean).map(([k, v]) => (
                  <div key={k}>
                    <div style={{ fontSize: 9, fontWeight: 600, letterSpacing: '0.08em', textTransform: 'uppercase', color: '#9CA3AF', marginBottom: 3 }}>{k}</div>
                    <div style={{ fontSize: 15, fontWeight: 700, color: '#111827', fontVariantNumeric: 'tabular-nums' }}>{v}</div>
                  </div>
                ))}
              </div>

              {/* CTA */}
              <Link href="/" style={{
                display: 'block', textAlign: 'center', padding: '14px 0',
                background: '#111111', color: '#fff', borderRadius: 10,
                fontSize: 14, fontWeight: 600, textDecoration: 'none',
                letterSpacing: '-0.01em',
              }}>
                Participar en Predimarket →
              </Link>
            </div>
          </div>

          {/* Attribution */}
          <p style={{ fontSize: 11, color: '#9CA3AF', textAlign: 'center', marginTop: 20, lineHeight: 1.6 }}>
            Los precios reflejan la probabilidad colectiva. No son asesoramiento financiero.<br />
            Créditos virtuales — sin dinero real.
          </p>
        </div>
      </div>
    </>
  )
}
