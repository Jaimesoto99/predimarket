import Link from 'next/link'
import { useRouter } from 'next/router'
import { useState, useEffect } from 'react'
import { C } from '../lib/theme'
import { useTheme } from '../lib/themeContext'

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
  const { isDark, toggle } = useTheme()
  const [drawerOpen, setDrawerOpen] = useState(false)
  const router = useRouter()

  useEffect(() => { setDrawerOpen(false) }, [router.pathname])

  // Prevent body scroll when drawer is open
  useEffect(() => {
    if (drawerOpen) document.body.style.overflow = 'hidden'
    else document.body.style.overflow = ''
    return () => { document.body.style.overflow = '' }
  }, [drawerOpen])

  return (
    <>
      <header style={{
        height: 56,
        borderBottom: `1px solid ${C.cardBorder}`,
        background: C.bgBackdrop,
        position: 'sticky', top: 0, zIndex: 40,
        backdropFilter: 'blur(20px)',
        WebkitBackdropFilter: 'blur(20px)',
      }}>
        <div style={{
          maxWidth: 1200, margin: '0 auto',
          padding: '0 16px', height: '100%',
          display: 'flex', justifyContent: 'space-between', alignItems: 'center',
          gap: 12,
        }}>

          {/* Logo */}
          <Link href="/" style={{ display: 'flex', alignItems: 'center', gap: 8, textDecoration: 'none', flexShrink: 0 }}>
            <div style={{
              width: 28, height: 28, background: C.accent, borderRadius: 7,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontSize: 13, fontWeight: 800, color: '#fff', letterSpacing: '-0.02em',
            }}>P</div>
            <span style={{ fontSize: 15, fontWeight: 700, letterSpacing: '-0.03em', color: C.text }}>
              PrediMarket
            </span>
            <span style={{
              fontSize: 8, fontWeight: 700, letterSpacing: '0.1em',
              color: C.accent, background: `${C.accent}18`,
              border: `1px solid ${C.accent}35`,
              padding: '2px 5px', borderRadius: 3, flexShrink: 0,
            }}>BETA</span>
          </Link>

          {/* Desktop nav links */}
          <nav style={{ display: 'flex', gap: 2, alignItems: 'center', flex: 1, justifyContent: 'center' }}
            className="desktop-nav">
            {NAV_LINKS.map(({ href, label }) => {
              const isActive = router.pathname === href
              return (
                <Link key={href} href={href} style={{
                  padding: '5px 10px', borderRadius: 6, fontSize: 13,
                  fontWeight: isActive ? 600 : 400,
                  color: isActive ? C.text : C.textMuted,
                  background: isActive ? `${C.accent}12` : 'transparent',
                  textDecoration: 'none', transition: 'all 0.15s',
                }}>
                  {label}
                </Link>
              )
            })}
          </nav>

          {/* Right side */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexShrink: 0 }}>

            {/* Balance pill */}
            {user && (
              <div style={{
                padding: '5px 12px',
                background: `${C.accent}12`,
                border: `1px solid ${C.accent}28`,
                borderRadius: 20,
              }}>
                <span style={{
                  fontSize: 13, fontWeight: 700,
                  fontFamily: 'ui-monospace, monospace',
                  color: C.accent,
                }}>
                  €{parseFloat(user.balance).toFixed(0)}
                </span>
              </div>
            )}

            {/* Auth button (no user, desktop) */}
            {!user && (
              <button
                onClick={onShowAuth}
                style={{
                  padding: '7px 16px', background: C.accent, borderRadius: 20,
                  fontWeight: 600, fontSize: 13, color: '#fff', border: 'none',
                  cursor: 'pointer',
                }}>
                Empezar
              </button>
            )}

            {/* Hamburger */}
            <button
              onClick={() => setDrawerOpen(true)}
              aria-label="Abrir menu"
              style={{
                width: 36, height: 36, borderRadius: 8,
                background: 'transparent',
                border: `1px solid ${C.cardBorder}`,
                cursor: 'pointer', color: C.text,
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                flexDirection: 'column', gap: 4.5, padding: 0, flexShrink: 0,
              }}>
              <div style={{ width: 15, height: 1.5, background: C.text, borderRadius: 1 }} />
              <div style={{ width: 10, height: 1.5, background: C.text, borderRadius: 1 }} />
              <div style={{ width: 12, height: 1.5, background: C.text, borderRadius: 1 }} />
            </button>
          </div>
        </div>
      </header>

      {/* Drawer overlay */}
      {drawerOpen && (
        <div
          onClick={() => setDrawerOpen(false)}
          style={{
            position: 'fixed', inset: 0,
            background: 'rgba(0,0,0,0.55)',
            backdropFilter: 'blur(4px)',
            WebkitBackdropFilter: 'blur(4px)',
            zIndex: 100,
          }}>
          {/* Drawer panel */}
          <div
            onClick={e => e.stopPropagation()}
            className="drawer-panel no-transition"
            style={{
              position: 'absolute', right: 0, top: 0, bottom: 0,
              width: 300, maxWidth: '88vw',
              background: C.card,
              borderLeft: `1px solid ${C.cardBorder}`,
              display: 'flex', flexDirection: 'column',
              overflowY: 'auto',
            }}>

            {/* Drawer header */}
            <div style={{
              height: 56, borderBottom: `1px solid ${C.cardBorder}`,
              display: 'flex', alignItems: 'center', justifyContent: 'space-between',
              padding: '0 20px', flexShrink: 0,
            }}>
              <span style={{ fontSize: 14, fontWeight: 700, color: C.text }}>Menu</span>
              <button
                onClick={() => setDrawerOpen(false)}
                style={{
                  width: 30, height: 30, borderRadius: 6, background: 'transparent',
                  border: `1px solid ${C.cardBorder}`, color: C.textDim,
                  cursor: 'pointer', fontSize: 14,
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                }}>
                x
              </button>
            </div>

            {/* User info section */}
            {user ? (
              <div style={{ padding: '16px 20px', borderBottom: `1px solid ${C.cardBorder}` }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 12 }}>
                  <div style={{
                    width: 36, height: 36, borderRadius: 10,
                    background: `${C.accent}18`, border: `1px solid ${C.accent}30`,
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    fontSize: 14, fontWeight: 700, color: C.accent, flexShrink: 0,
                  }}>
                    {(user.display_name || user.email || '?')[0].toUpperCase()}
                  </div>
                  <div style={{ minWidth: 0 }}>
                    <div style={{ fontSize: 13, fontWeight: 600, color: C.text, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      {user.display_name || user.email.split('@')[0]}
                    </div>
                    <div style={{ fontSize: 11, color: C.textDim, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      {user.email}
                    </div>
                  </div>
                </div>
                <div style={{
                  padding: '10px 14px',
                  background: `${C.accent}0d`,
                  border: `1px solid ${C.accent}22`,
                  borderRadius: 8, display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                }}>
                  <span style={{ fontSize: 12, color: C.textMuted }}>Saldo disponible</span>
                  <span style={{ fontSize: 16, fontWeight: 700, color: C.accent, fontFamily: 'ui-monospace, monospace' }}>
                    €{parseFloat(user.balance).toFixed(0)}
                  </span>
                </div>
              </div>
            ) : (
              <div style={{ padding: '20px', borderBottom: `1px solid ${C.cardBorder}` }}>
                <button
                  onClick={() => { onShowAuth(); setDrawerOpen(false) }}
                  style={{
                    width: '100%', padding: '11px 0', borderRadius: 8,
                    background: C.accent, border: 'none',
                    color: '#fff', fontSize: 14, fontWeight: 600, cursor: 'pointer',
                  }}>
                  Empezar gratis — 1.000 creditos
                </button>
                <div style={{ fontSize: 11, color: C.textDim, textAlign: 'center', marginTop: 8 }}>
                  Sin datos bancarios, sin riesgo real
                </div>
              </div>
            )}

            {/* Navigation */}
            <nav style={{ padding: '8px 12px', borderBottom: `1px solid ${C.cardBorder}` }}>
              <div style={{ fontSize: 10, fontWeight: 600, letterSpacing: '0.08em', color: C.textDim, padding: '8px 8px 4px', textTransform: 'uppercase' }}>
                Plataforma
              </div>
              {NAV_LINKS.map(({ href, label }) => {
                const isActive = router.pathname === href
                return (
                  <Link key={href} href={href} style={{
                    display: 'flex', alignItems: 'center', gap: 12,
                    padding: '10px 12px', borderRadius: 8,
                    color: isActive ? C.text : C.textMuted,
                    background: isActive ? `${C.accent}10` : 'transparent',
                    fontWeight: isActive ? 600 : 400,
                    fontSize: 14, textDecoration: 'none', marginBottom: 2,
                  }}>
                    {label}
                    {isActive && (
                      <div style={{ marginLeft: 'auto', width: 5, height: 5, borderRadius: 3, background: C.accent }} />
                    )}
                  </Link>
                )
              })}
            </nav>

            {/* User actions */}
            {user && (
              <nav style={{ padding: '8px 12px', borderBottom: `1px solid ${C.cardBorder}` }}>
                <div style={{ fontSize: 10, fontWeight: 600, letterSpacing: '0.08em', color: C.textDim, padding: '8px 8px 4px', textTransform: 'uppercase' }}>
                  Mi cuenta
                </div>
                {[
                  { label: 'Posiciones abiertas', badge: openTradesCount, action: onShowPortfolio },
                  { label: 'Portfolio', action: onShowPortfolio },
                  { label: 'Ranking', action: onShowLeaderboard },
                  { label: 'Perfil', action: onShowProfile },
                ].map(({ label, badge: badgeCount, action }) => (
                  <button key={label} onClick={() => { action(); setDrawerOpen(false) }} style={{
                    width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                    padding: '10px 12px', borderRadius: 8, background: 'transparent',
                    border: 'none', cursor: 'pointer', color: C.textMuted, fontSize: 14,
                    textAlign: 'left', marginBottom: 2,
                  }}>
                    {label}
                    {badgeCount > 0 && (
                      <span style={{
                        width: 20, height: 20, borderRadius: 10, background: C.accent,
                        fontSize: 9, fontWeight: 700, color: '#fff',
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        flexShrink: 0,
                      }}>{badgeCount}</span>
                    )}
                  </button>
                ))}
              </nav>
            )}

            {/* Bottom: theme toggle + logout */}
            <div style={{ padding: '16px 20px', marginTop: 'auto' }}>
              {/* Theme toggle */}
              <div style={{
                display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                padding: '10px 0', marginBottom: 12,
              }}>
                <span style={{ fontSize: 13, color: C.textMuted }}>
                  {isDark ? 'Modo oscuro' : 'Modo claro'}
                </span>
                <button
                  onClick={toggle}
                  className="no-transition"
                  style={{
                    width: 42, height: 24, borderRadius: 12, cursor: 'pointer', border: 'none',
                    background: isDark ? C.accent : C.cardBorder,
                    position: 'relative', padding: 0, flexShrink: 0,
                  }}>
                  <div style={{
                    position: 'absolute', top: 3, left: isDark ? 21 : 3,
                    width: 18, height: 18, borderRadius: 9, background: '#fff',
                    transition: 'left 0.2s',
                  }} />
                </button>
              </div>

              {user && (
                <button
                  onClick={() => { onLogout(); setDrawerOpen(false) }}
                  style={{
                    width: '100%', padding: '10px 0', borderRadius: 8,
                    background: 'transparent', border: `1px solid ${C.no}35`,
                    color: C.no, fontSize: 13, cursor: 'pointer', fontWeight: 500,
                  }}>
                  Cerrar sesion
                </button>
              )}
            </div>
          </div>
        </div>
      )}

      <style>{`
        @media (max-width: 640px) {
          .desktop-nav { display: none !important }
        }
      `}</style>
    </>
  )
}
