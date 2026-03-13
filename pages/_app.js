import "@/styles/globals.css"
import { Component } from 'react'
import { Inter } from 'next/font/google'
import { ThemeProvider } from "../lib/themeContext"

const inter = Inter({ subsets: ['latin'], weight: ['400', '500', '600', '700'] })

class ErrorBoundary extends Component {
  state = { hasError: false }
  static getDerivedStateFromError() { return { hasError: true } }
  render() {
    if (this.state.hasError) return (
      <div style={{ padding: 40, textAlign: 'center' }}>
        <h2>Algo salió mal</h2>
        <button onClick={() => this.setState({ hasError: false })}>Reintentar</button>
      </div>
    )
    return this.props.children
  }
}

export default function App({ Component, pageProps }) {
  return (
    <ErrorBoundary>
      <ThemeProvider>
        <div className={inter.className}>
          <Component {...pageProps} />
        </div>
      </ThemeProvider>
    </ErrorBoundary>
  )
}
