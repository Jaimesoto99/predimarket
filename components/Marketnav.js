// Marketnav.js — vertical sidebar navigation
// The full sidebar shell is handled by components/layout/AppLayout.js
// This file exports the navigation link list used across the app.

export const NAV_LINKS = [
  { href: '/',      label: 'Mercados' },
  { href: '/stats', label: 'Stats' },
  { href: '/demo',  label: 'Demo' },
  { href: '/about', label: 'Nosotros' },
]

// Default export kept for backward compatibility.
// In index.js, use AppLayout instead of MarketNav.
export default function MarketNav() {
  return null
}
