import Link from 'next/link'
import { useRouter } from 'next/router'
import { C } from '../lib/theme'

const NAV_LINKS = [
  { href: '/', label: 'Mercados' },
  { href: '/demo', label: 'Demo' },
  { href: '/stats', label: 'Stats' },
  { href: '/about', label: 'Nosotros' },
]

export default function MarketNav({
  user,
  openTradesCount,
  onShowLeaderboard,
  onShowPortfolio,
  onShowProfile,
  onShowAuth,
  onLogout,
}) {
  const router = useRouter()

  return (
    <header style={{
      borderBottom: `1px solid ${C.divider}`,
      background: `${C.bg}e8`,
      position: 'sticky', top: 0, zIndex: 40,
      backdropFilter: 'blur(24px)', WebkitBackdropFilter: 'blur(24px)',
    }}>
      <div style={{
        maxWidth: 1200, margin: '0 auto', padding: '0 24px',
        height: 52, display: 'flex', justifyContent: 'space-between', alignItems: 'center',
      }}>
        {/* Logo + site nav */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 20 }}>
          <Link href="/" style={{ display: 'flex', alignItems: 'center', gap: 8, textDecoration: 'none' }}>
            <div style={{
              width: 26, height: 26, background: C.accent, borderRadius: 6,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontSize: 12, fontWeight: 700, color: '#fff', letterSpacing: '-0.02em',
            }}>P</div>
            <span style={{ fontSize: 14, fontWeight: 700, letterSpacing: '-0.02em', color: C.text }}>PrediMarket</span>
            <span style={{
              fontSize: 9, fontWeight: 500, letterSpacing: '0.08em', color: C.textDim,
              border: `1px solid ${C.cardBorder}`, padding: '1px 5px', borderRadius: 3,
            }}>BETA</span>
          </Link>

          {/* Site navigation links */}
          <nav style={{ display: 'flex', gap: 2, alignItems: 'center' }}>
            {NAV_LINKS.map(({ href, label }) => {
              const isActive = router.pathname === href
              return (
                <Link key={href} href={href} style={{
                  padding: '5px 10px', borderRadius: 5, fontSize: 12, fontWeight: isActive ? 600 : 400,
                  color: isActive ? C.text : C.textDim,
                  textDecoration: 'none',
                  background: isActive ? C.cardBorder : 'transparent',
                  transition: 'all 0.15s',
                }}>
                  {label}
                </Link>
              )
            })}
          </nav>
        </div>

        {/* Right side: user actions */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
          {user ? (
            <>
              <button
                onClick={onShowLeaderboard}
                style={{
                  padding: '5px 10px', borderRadius: 6, background: 'transparent',
                  border: `1px solid ${C.cardBorder}`, color: C.textDim,
                  cursor: 'pointer', fontSize: 12, fontWeight: 500,
                }}>
                Ranking
              </button>
              <button
                onClick={onShowPortfolio}
                style={{
                  padding: '5px 10px', borderRadius: 6, background: 'transparent',
                  border: `1px solid ${C.cardBorder}`, color: C.textDim,
                  cursor: 'pointer', fontSize: 12, fontWeight: 500, position: 'relative',
                }}>
                Posiciones
                {openTradesCount > 0 && (
                  <span style={{
                    position: 'absolute', top: -5, right: -5, width: 14, height: 14,
                    background: C.accent, borderRadius: 7, fontSize: 8, fontWeight: 700,
                    color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center',
                  }}>
                    {openTradesCount}
                  </span>
                )}
              </button>
              <button
                onClick={onShowProfile}
                style={{
                  padding: '5px 10px', borderRadius: 6, background: 'transparent',
                  border: `1px solid ${C.cardBorder}`, color: C.textDim,
                  cursor: 'pointer', fontSize: 12, fontWeight: 500,
                }}>
                Perfil
              </button>
              <div style={{
                padding: '5px 12px',
                background: `${C.accent}0a`,
                border: `1px solid ${C.accent}20`,
                borderRadius: 6,
              }}>
                <span style={{ fontSize: 13, fontWeight: 700, fontFamily: 'ui-monospace, monospace', color: C.accentLight }}>
                  €{parseFloat(user.balance).toFixed(0)}
                </span>
              </div>
              <button
                onClick={onLogout}
                style={{
                  padding: '5px 8px', borderRadius: 6, background: 'transparent',
                  border: 'none', color: C.textDim, cursor: 'pointer', fontSize: 14, lineHeight: 1,
                }}>
                ✕
              </button>
            </>
          ) : (
            <button
              onClick={onShowAuth}
              style={{
                padding: '7px 16px', background: C.accent, borderRadius: 6,
                fontWeight: 600, fontSize: 13, color: '#fff', border: 'none', cursor: 'pointer',
              }}>
              Empezar
            </button>
          )}
        </div>
      </div>
    </header>
  )
}
