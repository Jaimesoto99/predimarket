import { useEffect, useRef, useState, useCallback } from 'react'
import { getResolvedMarkets } from '../lib/supabase'
import { calculatePrices } from '../lib/amm'
import { HIDDEN_CATEGORIES } from '../lib/theme'

// Fetch via /api/markets (service-role key) instead of anon client to avoid RLS issues
async function fetchMarketsFromApi(options = {}) {
  const params = new URLSearchParams({ status: 'ACTIVE', limit: '100' })
  if (options.catFilter && options.catFilter !== 'ALL') params.set('category', options.catFilter)
  const resp = await fetch(`/api/markets?${params}`)
  if (!resp.ok) throw new Error(`API error ${resp.status}`)
  const json = await resp.json()
  // /api/markets returns { markets: [...] } or just [...]
  return json.markets || json
}

// ─── Placeholder markets shown while loading or as fillers ────────────────────
const now = () => new Date()
const daysFromNow = d => new Date(now().getTime() + d * 86400000).toISOString()
const hoursFromNow = h => new Date(now().getTime() + h * 3600000).toISOString()

const EXAMPLE_PLACEHOLDERS = [
  { id: 'placeholder_0',  title: '¿Habrá elecciones anticipadas en España en 2026?',             category: 'POLITICA',   market_type: 'SEMANAL', close_date: daysFromNow(6),   total_volume: 0, active_traders: 0, prices: { yes: 38, no: 62 }, placeholder: true },
  { id: 'placeholder_1',  title: '¿Cerrará el Bono español 10Y por encima del 3,5% esta semana?',category: 'TIPOS',      market_type: 'SEMANAL', close_date: daysFromNow(5),   total_volume: 0, active_traders: 0, prices: { yes: 57, no: 43 }, placeholder: true },
  { id: 'placeholder_2',  title: '¿Subirá el precio de la gasolina en España en abril de 2026?', category: 'ENERGIA',    market_type: 'MENSUAL', close_date: daysFromNow(29),  total_volume: 0, active_traders: 0, prices: { yes: 55, no: 45 }, placeholder: true },
  { id: 'placeholder_3',  title: '¿Ganará el Real Madrid el próximo Clásico?',                   category: 'DEPORTES',   market_type: 'DIARIO',  close_date: hoursFromNow(5),  total_volume: 0, active_traders: 0, prices: { yes: 52, no: 48 }, placeholder: true },
  { id: 'placeholder_4',  title: '¿Subirá el BCE los tipos en su próxima reunión?',              category: 'TIPOS',      market_type: 'MENSUAL', close_date: daysFromNow(45),  total_volume: 0, active_traders: 0, prices: { yes: 18, no: 82 }, placeholder: true },
  { id: 'placeholder_5',  title: '¿Bajará el Euríbor por debajo del 2% antes de julio?',        category: 'ECONOMIA',   market_type: 'MENSUAL', close_date: daysFromNow(45),  total_volume: 0, active_traders: 0, prices: { yes: 61, no: 39 }, placeholder: true },
  { id: 'placeholder_6',  title: '¿Prima de riesgo España-Alemania supera los 80pb hoy?',       category: 'TIPOS',      market_type: 'DIARIO',  close_date: hoursFromNow(8),  total_volume: 0, active_traders: 0, prices: { yes: 42, no: 58 }, placeholder: true },
  { id: 'placeholder_7',  title: '¿Aprobará el Congreso los PGE en 2026?',                      category: 'POLITICA',   market_type: 'MENSUAL', close_date: daysFromNow(90),  total_volume: 0, active_traders: 0, prices: { yes: 33, no: 67 }, placeholder: true },
  { id: 'placeholder_8',  title: '¿Logrará España clasificarse para el Mundial de 2026?',       category: 'DEPORTES',   market_type: 'MENSUAL', close_date: daysFromNow(60),  total_volume: 0, active_traders: 0, prices: { yes: 87, no: 13 }, placeholder: true },
  { id: 'placeholder_9',  title: '¿Superará la inflación en España el 3% en 2026?',             category: 'ECONOMIA',   market_type: 'SEMANAL', close_date: daysFromNow(12),  total_volume: 0, active_traders: 0, prices: { yes: 42, no: 58 }, placeholder: true },
  { id: 'placeholder_10', title: '¿Habrá un acuerdo de paz en Ucrania antes de 2027?',          category: 'GEOPOLITICA',market_type: 'MENSUAL', close_date: daysFromNow(200), total_volume: 0, active_traders: 0, prices: { yes: 31, no: 69 }, placeholder: true },
  { id: 'placeholder_11', title: '¿Superará el IBEX 35 los 12.000 puntos antes de julio?',      category: 'ECONOMIA',   market_type: 'MENSUAL', close_date: daysFromNow(55),  total_volume: 0, active_traders: 0, prices: { yes: 58, no: 42 }, placeholder: true },
  { id: 'placeholder_12', title: '¿Superará el Brent los $85/barril esta semana?',              category: 'ENERGIA',    market_type: 'SEMANAL', close_date: daysFromNow(5),   total_volume: 0, active_traders: 0, prices: { yes: 44, no: 56 }, placeholder: true },
  { id: 'placeholder_13', title: '¿Producirá España >50% de electricidad con renovables?',      category: 'ENERGIA',    market_type: 'MENSUAL', close_date: daysFromNow(300), total_volume: 0, active_traders: 0, prices: { yes: 72, no: 28 }, placeholder: true },
  { id: 'placeholder_14', title: '¿Ganará el Atlético de Madrid la Liga 2025-26?',              category: 'DEPORTES',   market_type: 'MENSUAL', close_date: daysFromNow(75),  total_volume: 0, active_traders: 0, prices: { yes: 22, no: 78 }, placeholder: true },
]

// Wrap fetch with a hard 6s timeout so loading never hangs forever
async function fetchWithTimeout(options) {
  const timeoutPromise = new Promise((_, reject) =>
    setTimeout(() => reject(new Error('timeout')), 6000)
  )
  return Promise.race([fetchMarketsFromApi(options), timeoutPromise])
}

export default function useMarkets(catFilter = 'ALL', typeFilter = 'ALL') {
  const [markets, setMarkets]               = useState([])
  const [resolvedMarkets, setResolvedMarkets] = useState([])
  const [loading, setLoading]               = useState(true)
  // Track in-flight fetch so stale calls don't overwrite fresher ones
  const fetchIdRef = useRef(0)

  const loadMarkets = useCallback(async () => {
    const fetchId = ++fetchIdRef.current
    setLoading(true)

    try {
      const options = {}
      if (catFilter !== 'ALL')  options.catFilter  = catFilter
      if (typeFilter !== 'ALL') options.typeFilter = typeFilter

      const data = await fetchWithTimeout(options)

      // Abort if a newer fetch already started
      if (fetchId !== fetchIdRef.current) return

      const CNMV_CATS = new Set(['ECONOMIA', 'TIPOS', 'ENERGIA'])

      const enriched = (data || [])
        .filter(m => !HIDDEN_CATEGORIES.has(m.category) && CNMV_CATS.has(m.category))
        .map(m => ({
          ...m,
          prices:    m.prices || calculatePrices(parseFloat(m.yes_pool), parseFloat(m.no_pool)),
          isExpired: new Date(m.close_date) < new Date(),
        }))

      const nonExpiredCount = enriched.filter(m => !m.isExpired).length
      const fillerCount     = Math.max(0, 15 - nonExpiredCount)
      const fillers         = EXAMPLE_PLACEHOLDERS.filter(p => CNMV_CATS.has(p.category)).slice(0, fillerCount)

      setMarkets([...enriched, ...fillers])
    } catch (err) {
      console.error('[useMarkets] error:', err?.message || err)
      if (fetchId !== fetchIdRef.current) return
      setMarkets(EXAMPLE_PLACEHOLDERS.slice(0, 15))
    } finally {
      if (fetchId === fetchIdRef.current) setLoading(false)
    }
  }, [catFilter, typeFilter])

  useEffect(() => {
    loadMarkets()
    // Safety: if loading gets stuck (e.g. React Compiler memoization edge case),
    // force it off after 6s so the UI never shows skeleton indefinitely
    const fallback = setTimeout(() => setLoading(false), 6000)
    return () => clearTimeout(fallback)
  }, [loadMarkets])

  useEffect(() => {
    const CNMV_CATS = new Set(['ECONOMIA', 'TIPOS', 'ENERGIA'])
    getResolvedMarkets(50)
      .then(data => {
        const filtered = (data || []).filter(m => CNMV_CATS.has(m.category))
        setResolvedMarkets(filtered)
      })
      .catch(() => {})
  }, [])

  return { markets, resolvedMarkets, loading, loadMarkets }
}
