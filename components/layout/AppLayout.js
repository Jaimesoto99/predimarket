import { useState, useEffect } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/router'
import { C, getCategoryColor, getCategoryLabel, getCloseInfo } from '../../lib/theme'
import { useTheme } from '../../lib/themeContext'
import useTick from '../../hooks/useTick'
import { supabase } from '../../lib/supabase'
import { calculatePrices } from '../../lib/amm'

const ALL_CATS = [
  'ECONOMIA', 'TIPOS', 'ENERGIA', 'POLITICA', 'DEPORTES',
  'ACTUALIDAD', 'GEOPOLITICA', 'CLIMA', 'TECNOLOGIA',
  'CIENCIA', 'SOCIEDAD', 'CULTURA', 'INTERNACIONAL',
]

const NAV_ITEMS = [
  { href: '/',           label: 'Mercados' },
  { href: '/trending',   label: 'Trending' },
  { href: '/popular',    label: 'Popular' },
  { href: '/watchlist',  label: 'Watchlist' },
  { href: '/topics',     label: 'Temas' },
  { href: '/clusters',   label: 'Clusters' },
  { href: '/stats',      label: 'Estadísticas' },
]

// ─── TikTok-style Discover card ───────────────────────────────────────────

function DiscoverCard({ market, onOpen }) {
  useTick()
  const yesP      = parseFloat(market.prices?.yes || 50)
  const noP       = parseFloat(market.prices?.no  || 50)
  const catColor  = getCategoryColor(market.category)
  const { countdown, isUrgent, isExpired } = getCloseInfo(market.resolution_time || market.close_date)
  const probColor = yesP > 60 ? C.yes : yesP < 40 ? C.no : C.warning

  return (
    <div style={{
      height: 'calc(100dvh - 48px)',
      scrollSnapAlign: 'start',
      scrollSnapStop: 'always',
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'center',
      padding: '32px 24px',
      gap: 20,
      borderBottom: `1px solid ${C.cardBorder}`,
      background: C.bg,
    }}>

      {/* Category */}
      <span style={{
        fontSize: 10, fontWeight: 700, letterSpacing: '0.1em',
        textTransform: 'uppercase', color: catColor,
        background: `${catColor}15`, padding: '4px 10px', borderRadius: 20,
      }}>
        {getCategoryLabel(market.category)}
      </span>

      {/* Title */}
      <h2 style={{
        fontSize: 20, fontWeight: 800, letterSpacing: '-0.03em',
        color: C.text, lineHeight: 1.35, textAlign: 'center', margin: 0,
        maxWidth: 340,
      }}>
        {market.title}
      </h2>

      {/* Big probability */}
      <div style={{
        fontSize: 72, fontWeight: 900, letterSpacing: '-0.05em',
        color: probColor, lineHeight: 1, fontVariantNumeric: 'tabular-nums',
      }}>
        {yesP.toFixed(0)}%
      </div>

      {/* Prob bar */}
      <div style={{ width: '100%', maxWidth: 280, height: 4, background: C.cardBorder, borderRadius: 2, overflow: 'hidden' }}>
        <div style={{ width: `${yesP}%`, height: '100%', background: probColor, borderRadius: 2 }} />
      </div>

      {/* YES / NO prices */}
      <div style={{ display: 'flex', gap: 32, alignItems: 'center' }}>
        <div style={{ textAlign: 'center' }}>
          <div style={{ fontSize: 10, color: C.textDim, marginBottom: 2, fontWeight: 600 }}>SÍ</div>
          <div style={{ fontSize: 18, fontWeight: 700, color: C.yes, fontVariantNumeric: 'tabular-nums' }}>{yesP.toFixed(0)}¢</div>
        </div>
        <div style={{ width: 1, height: 32, background: C.cardBorder }} />
        <div style={{ textAlign: 'center' }}>
          <div style={{ fontSize: 10, color: C.textDim, marginBottom: 2, fontWeight: 600 }}>NO</div>
          <div style={{ fontSize: 18, fontWeight: 700, color: C.no, fontVariantNumeric: 'tabular-nums' }}>{noP.toFixed(0)}¢</div>
        </div>
      </div>

      {/* Countdown */}
      <div style={{
        fontSize: 12, color: isUrgent ? C.no : C.textDim,
        fontWeight: isUrgent ? 700 : 400,
      }}>
        {isExpired ? 'Resolviendo' : `Cierra ${countdown}`}
      </div>

      {/* CTA buttons */}
      <div style={{ display: 'flex', gap: 10, width: '100%', maxWidth: 280 }}>
        <button
          onClick={() => onOpen(market)}
          style={{
            flex: 1, padding: '14px 0', background: C.yes, border: 'none', borderRadius: 12,
            color: '#fff', fontSize: 15, fontWeight: 700, cursor: 'pointer', fontFamily: 'inherit',
          }}
        >
          Comprar SÍ
        </button>
        <button
          onClick={() => onOpen(market)}
          style={{
            flex: 1, padding: '14px 0', background: C.no, border: 'none', borderRadius: 12,
            color: '#fff', fontSize: 15, fontWeight: 700, cursor: 'pointer', fontFamily: 'inherit',
          }}
        >
          Comprar NO
        </button>
      </div>
    </div>
  )
}

function SidebarInner({
  router, isDark, toggle,
  user, openTradesCount,
  onShowPortfolio, onShowLeaderboard, onShowProfile, onShowAuth, onLogout,
  filter, setFilter, catFilter, setCatFilter,
  activeMarkets, timeFilters, activeCats,
  onClose, onOpenDiscover,
}) {
  const showFilters = router.pathname === '/' && typeof setFilter === 'function'

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%', overflowY: 'auto' }}>

      {/* Logo */}
      <div style={{
        padding: '18px 16px',
        borderBottom: '1px solid var(--card-border)',
        flexShrink: 0,
      }}>
        <Link
          href="/"
          onClick={onClose}
          style={{ display: 'flex', alignItems: 'center', gap: 8, textDecoration: 'none' }}
        >
          <div style={{
            width: 26, height: 26, background: C.accent, borderRadius: 7,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontSize: 12, fontWeight: 800, color: '#fff', flexShrink: 0,
          }}>P</div>
          <span style={{ fontSize: 14, fontWeight: 700, letterSpacing: '-0.03em', color: C.text }}>
            PrediMarket
          </span>
          <span style={{
            fontSize: 8, fontWeight: 700, letterSpacing: '0.1em', textTransform: 'uppercase',
            color: C.textDim, border: '1px solid var(--card-border)',
            padding: '1px 5px', borderRadius: 3, flexShrink: 0,
          }}>BETA</span>
        </Link>
      </div>

      {/* Navigation */}
      <nav style={{ padding: '10px 8px', flexShrink: 0 }}>
        <div style={{
          fontSize: 9, fontWeight: 600, letterSpacing: '0.09em', textTransform: 'uppercase',
          color: C.textDim, padding: '4px 8px 8px',
        }}>
          Plataforma
        </div>
        {NAV_ITEMS.map(({ href, label }) => {
          const isActive = router.pathname === href
          return (
            <Link
              key={href}
              href={href}
              onClick={onClose}
              style={{
                display: 'flex', alignItems: 'center', gap: 10,
                padding: '7px 10px', borderRadius: 7, marginBottom: 1,
                fontSize: 13, fontWeight: isActive ? 600 : 400,
                color: isActive ? C.text : C.textMuted,
                background: isActive ? 'var(--surface)' : 'transparent',
                textDecoration: 'none',
                position: 'relative',
              }}
            >
              {isActive && (
                <div style={{
                  position: 'absolute', left: 0, top: '50%',
                  transform: 'translateY(-50%)',
                  width: 2, height: 16, background: C.accent, borderRadius: 1,
                }} />
              )}
              {label}
            </Link>
          )
        })}

        {/* Discover — TikTok-style fullscreen */}
        <button
          onClick={() => { onOpenDiscover?.(); onClose?.() }}
          style={{
            display: 'flex', alignItems: 'center', gap: 10,
            padding: '7px 10px', borderRadius: 7, marginBottom: 1,
            fontSize: 13, fontWeight: 400,
            color: C.textMuted,
            background: 'transparent',
            border: 'none', cursor: 'pointer',
            width: '100%', textAlign: 'left', fontFamily: 'inherit',
            position: 'relative',
          }}
        >
          Discover
        </button>
      </nav>

      {/* Filters — only on home page */}
      {showFilters && (
        <div style={{
          padding: '0 8px 12px',
          borderTop: '1px solid var(--divider)',
          flexShrink: 0,
        }}>
          <div style={{
            fontSize: 9, fontWeight: 600, letterSpacing: '0.09em', textTransform: 'uppercase',
            color: C.textDim, padding: '12px 8px 8px',
          }}>
            Período
          </div>
          {timeFilters.map(({ f, label, count }) => {
            const isActive = filter === f
            return (
              <button key={f} onClick={() => setFilter(f)} style={{
                display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                padding: '6px 10px', borderRadius: 6, width: '100%',
                background: isActive ? 'var(--surface)' : 'transparent',
                border: 'none', cursor: 'pointer',
                color: isActive ? C.text : C.textMuted,
                fontWeight: isActive ? 600 : 400,
                fontSize: 12, textAlign: 'left',
                fontFamily: 'inherit',
              }}>
                {label}
                {count > 0 && (
                  <span style={{ fontSize: 10, color: C.textDim, fontVariantNumeric: 'tabular-nums' }}>
                    {count}
                  </span>
                )}
              </button>
            )
          })}

          <div style={{
            fontSize: 9, fontWeight: 600, letterSpacing: '0.09em', textTransform: 'uppercase',
            color: C.textDim, padding: '12px 8px 8px',
          }}>
            Categoría
          </div>
          <button onClick={() => setCatFilter('ALL')} style={{
            display: 'flex', alignItems: 'center', gap: 8,
            padding: '6px 10px', borderRadius: 6, width: '100%',
            background: catFilter === 'ALL' ? 'var(--surface)' : 'transparent',
            border: 'none', cursor: 'pointer',
            color: catFilter === 'ALL' ? C.text : C.textMuted,
            fontWeight: catFilter === 'ALL' ? 600 : 400,
            fontSize: 12, textAlign: 'left', fontFamily: 'inherit',
          }}>
            <span style={{
              width: 5, height: 5, borderRadius: '50%', flexShrink: 0,
              background: catFilter === 'ALL' ? C.text : C.textDim,
            }} />
            Todas
          </button>
          {ALL_CATS.filter(cat => activeCats.has(cat)).map(cat => {
            const isActive = catFilter === cat
            const catColor = getCategoryColor(cat)
            return (
              <button key={cat} onClick={() => setCatFilter(cat)} style={{
                display: 'flex', alignItems: 'center', gap: 8,
                padding: '6px 10px', borderRadius: 6, width: '100%',
                background: isActive ? `${catColor}12` : 'transparent',
                border: 'none', cursor: 'pointer',
                color: isActive ? catColor : C.textMuted,
                fontWeight: isActive ? 600 : 400,
                fontSize: 12, textAlign: 'left', fontFamily: 'inherit',
              }}>
                <span style={{
                  width: 5, height: 5, borderRadius: '50%', flexShrink: 0,
                  background: isActive ? catColor : C.textDim,
                }} />
                {getCategoryLabel(cat)}
              </button>
            )
          })}
        </div>
      )}

      {/* Spacer */}
      <div style={{ flex: 1 }} />

      {/* User section */}
      <div style={{
        borderTop: '1px solid var(--card-border)',
        padding: '10px 8px',
        flexShrink: 0,
      }}>
        {user ? (
          <>
            <button onClick={() => { onShowPortfolio?.(); onClose?.() }} style={{
              width: '100%', display: 'flex', alignItems: 'center', gap: 8,
              padding: '8px 10px', borderRadius: 7, marginBottom: 1,
              background: 'transparent', border: 'none', cursor: 'pointer',
              fontFamily: 'inherit',
            }}>
              <div style={{
                width: 26, height: 26, borderRadius: 7, background: 'var(--surface)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontSize: 11, fontWeight: 700, color: C.textMuted, flexShrink: 0,
              }}>
                {(user.display_name || user.email || '?')[0].toUpperCase()}
              </div>
              <div style={{ flex: 1, minWidth: 0, textAlign: 'left' }}>
                <div style={{
                  fontSize: 12, fontWeight: 600, color: C.text,
                  overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
                }}>
                  {user.display_name || user.email.split('@')[0]}
                </div>
                <div style={{ fontSize: 10, color: C.textDim, fontFamily: 'ui-monospace, monospace' }}>
                  €{parseFloat(user.balance).toFixed(0)}
                </div>
              </div>
              {openTradesCount > 0 && (
                <span style={{
                  width: 18, height: 18, borderRadius: 9, background: C.accent,
                  color: '#fff', fontSize: 9, fontWeight: 700, flexShrink: 0,
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                }}>{openTradesCount}</span>
              )}
            </button>

            {[
              { label: 'Posiciones', action: () => { onShowPortfolio?.(); onClose?.() } },
              { label: 'Ranking',    action: () => { onShowLeaderboard?.(); onClose?.() } },
              { label: 'Perfil',     action: () => { onShowProfile?.(); onClose?.() } },
            ].map(({ label, action }) => (
              <button key={label} onClick={action} style={{
                width: '100%', padding: '7px 10px', borderRadius: 6,
                background: 'transparent', border: 'none', cursor: 'pointer',
                color: C.textMuted, fontSize: 12, textAlign: 'left',
                display: 'block', fontFamily: 'inherit',
              }}>
                {label}
              </button>
            ))}
          </>
        ) : (
          <button onClick={() => { onShowAuth?.(); onClose?.() }} style={{
            width: '100%', padding: '9px 0', borderRadius: 7,
            background: C.accent, border: 'none',
            color: '#fff', fontSize: 13, fontWeight: 600,
            cursor: 'pointer', marginBottom: 8, fontFamily: 'inherit',
          }}>
            Empezar gratis
          </button>
        )}

        {/* Theme toggle + logout */}
        <div style={{
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          padding: '8px 10px', marginTop: 4,
        }}>
          <span style={{ fontSize: 11, color: C.textDim }}>{isDark ? 'Oscuro' : 'Claro'}</span>
          <button onClick={toggle} className="no-transition" style={{
            width: 36, height: 20, borderRadius: 10, cursor: 'pointer',
            border: 'none', background: isDark ? '#374151' : 'var(--card-border)',
            position: 'relative', padding: 0, flexShrink: 0,
          }}>
            <div style={{
              position: 'absolute', top: 2, left: isDark ? 18 : 2,
              width: 16, height: 16, borderRadius: 8, background: '#fff',
              transition: 'left 0.2s',
            }} />
          </button>
        </div>

        {user && (
          <button onClick={() => { onLogout?.(); onClose?.() }} style={{
            width: '100%', padding: '7px 10px', borderRadius: 6,
            background: 'transparent', border: 'none', cursor: 'pointer',
            color: C.textDim, fontSize: 11, textAlign: 'left', fontFamily: 'inherit',
          }}>
            Cerrar sesión
          </button>
        )}
      </div>
    </div>
  )
}

function useDesktopForce() {
  const router = useRouter()
  useEffect(() => {
    const stored = typeof localStorage !== 'undefined' && localStorage.getItem('predi_force_desktop') === '1'
    if (stored || router.query?.desktop === '1') {
      document.documentElement.setAttribute('data-force-desktop', '1')
      if (router.query?.desktop === '1') localStorage.setItem('predi_force_desktop', '1')
    }
  }, [router.query?.desktop])
}

export default function AppLayout({
  user,
  openTradesCount = 0,
  onShowLeaderboard,
  onShowPortfolio,
  onShowProfile,
  onShowAuth,
  onLogout,
  onOpenMarket,
  filter,
  setFilter,
  catFilter,
  setCatFilter,
  activeMarkets = [],
  children,
}) {
  const { isDark, toggle } = useTheme()
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const [discoverOpen, setDiscoverOpen] = useState(false)
  const [fetchedMarkets, setFetchedMarkets] = useState([])
  const [discoverLoading, setDiscoverLoading] = useState(false)
  const router = useRouter()
  useDesktopForce()

  const activeCats = new Set(activeMarkets.map(m => m.category).filter(Boolean))
  const allCount = activeMarkets.length
  const timeFilters = [
    { f: 'ALL',     label: 'Todos',   count: allCount },
    { f: 'DIARIO',  label: 'Diario',  count: activeMarkets.filter(m => m.market_type === 'FLASH'  || m.market_type === 'DIARIO').length },
    { f: 'SEMANAL', label: 'Semanal', count: activeMarkets.filter(m => m.market_type === 'SHORT'  || m.market_type === 'SEMANAL').length },
    { f: 'MENSUAL', label: 'Mensual', count: activeMarkets.filter(m => m.market_type === 'LONG'   || m.market_type === 'MENSUAL').length },
  ]

  useEffect(() => { setSidebarOpen(false) }, [router.pathname])
  useEffect(() => {
    document.body.style.overflow = sidebarOpen ? 'hidden' : ''
    return () => { document.body.style.overflow = '' }
  }, [sidebarOpen])

  const propsMarkets = activeMarkets.filter(m => !m.isExpired && !m.placeholder)

  // Fetch markets independently when Discover opens and props are empty
  useEffect(() => {
    if (!discoverOpen) return
    if (propsMarkets.length > 0) return
    setDiscoverLoading(true)
    supabase
      .from('markets')
      .select('id, title, category, yes_pool, no_pool, total_volume, close_date, created_at')
      .eq('status', 'ACTIVE')
      .gt('close_date', new Date().toISOString())
      .order('total_volume', { ascending: false })
      .limit(20)
      .then(({ data }) => {
        if (data) {
          setFetchedMarkets(data.map(m => ({
            ...m,
            prices: calculatePrices(parseFloat(m.yes_pool), parseFloat(m.no_pool)),
            isExpired: false,
          })))
        }
        setDiscoverLoading(false)
      })
  }, [discoverOpen, propsMarkets.length])

  const discoverMarkets = propsMarkets.length > 0 ? propsMarkets : fetchedMarkets

  const sharedProps = {
    router, isDark, toggle,
    user, openTradesCount,
    onShowPortfolio, onShowLeaderboard, onShowProfile, onShowAuth, onLogout,
    filter, setFilter, catFilter, setCatFilter,
    activeMarkets, timeFilters, activeCats,
    onOpenDiscover: () => setDiscoverOpen(true),
  }

  return (
    <div className="app-layout">

      {/* Desktop sidebar */}
      <aside className="app-sidebar">
        <SidebarInner {...sharedProps} onClose={null} />
      </aside>

      {/* Mobile sidebar overlay */}
      {sidebarOpen && (
        <div
          onClick={() => setSidebarOpen(false)}
          style={{
            position: 'fixed', inset: 0,
            background: 'rgba(0,0,0,0.5)',
            backdropFilter: 'blur(4px)',
            WebkitBackdropFilter: 'blur(4px)',
            zIndex: 1000,
          }}
        >
          <aside
            onClick={e => e.stopPropagation()}
            className="no-transition"
            style={{
              position: 'absolute', left: 0, top: 0, bottom: 0,
              width: 260, maxWidth: '85vw',
              background: 'var(--card)',
              borderRight: '1px solid var(--card-border)',
              overflowY: 'auto',
            }}
          >
            <SidebarInner {...sharedProps} onClose={() => setSidebarOpen(false)} />
          </aside>
        </div>
      )}

      {/* Main area */}
      <div className="app-main">

        {/* Mobile top bar */}
        <div className="app-topbar">
          <button
            onClick={() => setSidebarOpen(true)}
            aria-label="Menú"
            style={{
              width: 36, height: 36, borderRadius: 8,
              background: 'transparent', border: '1px solid var(--card-border)',
              cursor: 'pointer', display: 'flex', flexDirection: 'column',
              alignItems: 'center', justifyContent: 'center', gap: 4, padding: 0,
            }}
          >
            <div style={{ width: 14, height: 1.5, background: C.textMuted, borderRadius: 1 }} />
            <div style={{ width: 10, height: 1.5, background: C.textMuted, borderRadius: 1 }} />
            <div style={{ width: 12, height: 1.5, background: C.textMuted, borderRadius: 1 }} />
          </button>

          <Link href="/" style={{ display: 'flex', alignItems: 'center', gap: 7, textDecoration: 'none' }}>
            <div style={{
              width: 22, height: 22, background: C.accent, borderRadius: 6,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontSize: 11, fontWeight: 800, color: '#fff',
            }}>P</div>
            <span style={{ fontSize: 13, fontWeight: 700, letterSpacing: '-0.03em', color: C.text }}>
              PrediMarket
            </span>
          </Link>

          {user ? (
            <button
              onClick={() => onShowPortfolio?.()}
              style={{
                padding: '5px 12px', borderRadius: 7,
                background: 'var(--surface)', border: '1px solid var(--card-border)',
                color: C.text, fontWeight: 600, fontSize: 12,
                fontFamily: 'ui-monospace, monospace',
                cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 5,
              }}
            >
              €{parseFloat(user.balance).toFixed(0)}
              {openTradesCount > 0 && (
                <span style={{
                  width: 16, height: 16, borderRadius: 8, background: C.accent,
                  color: '#fff', fontSize: 8, fontWeight: 700,
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                }}>{openTradesCount}</span>
              )}
            </button>
          ) : (
            <button
              onClick={() => onShowAuth?.()}
              style={{
                padding: '6px 14px', borderRadius: 7, background: C.accent,
                border: 'none', color: '#fff', fontSize: 12, fontWeight: 600,
                cursor: 'pointer',
              }}
            >
              Empezar
            </button>
          )}
        </div>

        {/* Page content */}
        <main className="app-content">
          {children}
        </main>

        {/* Ver versión completa — only on mobile */}
        <a
          href="?desktop=1"
          className="app-desktop-link"
          style={{
            position: 'fixed', bottom: 16, right: 16,
            zIndex: 90,
            padding: '6px 12px', borderRadius: 20,
            background: 'var(--card)', border: '1px solid var(--card-border)',
            boxShadow: '0 2px 8px rgba(0,0,0,0.12)',
            fontSize: 11, color: 'var(--text-muted)', fontWeight: 500,
            textDecoration: 'none', display: 'none',
            WebkitTapHighlightColor: 'transparent',
          }}
        >
          🖥 Versión completa
        </a>
      </div>

      {/* ─── Discover — TikTok fullscreen modal ─────────────────────────── */}
      {discoverOpen && (
        <div style={{
          position: 'fixed', inset: 0, zIndex: 1100,
          background: 'var(--bg)', overflow: 'hidden',
          display: 'flex', flexDirection: 'column',
        }}>
          {/* Header */}
          <div style={{
            height: 48, flexShrink: 0,
            display: 'flex', alignItems: 'center',
            padding: '0 16px', gap: 12,
            background: 'var(--bg-backdrop)',
            backdropFilter: 'blur(16px)',
            WebkitBackdropFilter: 'blur(16px)',
            borderBottom: '1px solid var(--card-border)',
            zIndex: 1110,
          }}>
            <button
              onClick={() => setDiscoverOpen(false)}
              style={{
                display: 'flex', alignItems: 'center', gap: 6,
                background: 'none', border: 'none', cursor: 'pointer',
                fontSize: 13, color: C.textMuted, fontFamily: 'inherit', padding: '4px 0',
              }}
            >
              ← Volver
            </button>
            <span style={{ fontSize: 14, fontWeight: 700, color: C.text, letterSpacing: '-0.02em' }}>
              Discover
            </span>
          </div>

          {/* Snap-scroll cards */}
          <div
            className="no-scrollbar"
            style={{
              flex: 1,
              overflowY: 'scroll',
              scrollSnapType: 'y mandatory',
              WebkitOverflowScrolling: 'touch',
            }}
          >
            {discoverLoading ? (
              <div style={{
                height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center',
                color: C.textDim, fontSize: 14,
              }}>
                Cargando mercados…
              </div>
            ) : discoverMarkets.length === 0 ? (
              <div style={{
                height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center',
                color: C.textDim, fontSize: 14,
              }}>
                No hay mercados disponibles
              </div>
            ) : (
              discoverMarkets.map(market => (
                <DiscoverCard
                  key={market.id}
                  market={market}
                  onOpen={(m) => { onOpenMarket?.(m) }}
                />
              ))
            )}
          </div>
        </div>
      )}
    </div>
  )
}
