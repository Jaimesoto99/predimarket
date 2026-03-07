import { createContext, useContext, useState, useEffect } from 'react'

export const ThemeContext = createContext({ isDark: true, toggle: () => {} })

export function useTheme() { return useContext(ThemeContext) }

export function ThemeProvider({ children }) {
  const [isDark, setIsDark] = useState(true)
  const [mounted, setMounted] = useState(false)

  useEffect(() => {
    const saved = localStorage.getItem('predi_theme')
    let dark = true
    if (saved) {
      dark = saved === 'dark'
    } else {
      dark = window.matchMedia('(prefers-color-scheme: dark)').matches
    }
    setIsDark(dark)
    document.documentElement.setAttribute('data-theme', dark ? '' : 'light')
    setMounted(true)
  }, [])

  function toggle() {
    const next = !isDark
    setIsDark(next)
    localStorage.setItem('predi_theme', next ? 'dark' : 'light')
    document.documentElement.setAttribute('data-theme', next ? '' : 'light')
  }

  return (
    <ThemeContext.Provider value={{ isDark, toggle, mounted }}>
      {children}
    </ThemeContext.Provider>
  )
}
