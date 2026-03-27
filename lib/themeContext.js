import { createContext, useContext, useState, useEffect } from 'react'

export const ThemeContext = createContext({ isDark: false, toggle: () => {} })

export function useTheme() { return useContext(ThemeContext) }

export function ThemeProvider({ children }) {
  const [isDark, setIsDark]   = useState(false)
  const [mounted, setMounted] = useState(false)

  useEffect(() => {
    // Only respect explicit user preference — no auto system dark detection
    // to avoid flash of dark theme on initial load
    const saved = localStorage.getItem('forsii_theme')
    const dark = saved === 'dark'
    setIsDark(dark)
    document.documentElement.setAttribute('data-theme', dark ? 'dark' : '')
    setMounted(true)
  }, [])

  function toggle() {
    const next = !isDark
    setIsDark(next)
    localStorage.setItem('forsii_theme', next ? 'dark' : 'light')
    document.documentElement.setAttribute('data-theme', next ? 'dark' : '')
  }

  return (
    <ThemeContext.Provider value={{ isDark, toggle, mounted }}>
      {children}
    </ThemeContext.Provider>
  )
}
