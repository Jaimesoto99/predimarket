import { useEffect, useRef, useState, useCallback } from 'react'
import { getActiveMarkets, getResolvedMarkets } from '../lib/supabase'
import { calculatePrices } from '../lib/amm'

// ─── Placeholder markets shown while loading or as fillers ────────────────────
const now = () => new Date()
const daysFromNow = d => new Date(now().getTime() + d * 86400000).toISOString()
const hoursFromNow = h => new Date(now().getTime() + h * 3600000).toISOString()

const EXAMPLE_PLACEHOLDERS = [
  { id: 'placeholder_0',  title: '¿Habrá elecciones anticipadas en España en 2026?',             category: 'POLITICA',   market_type: 'SEMANAL',     close_date: daysFromNow(6),   total_volume: 0, active_traders: 0, prices: { yes: 38, no: 62 }, placeholder: true },
  { id: 'placeholder_1',  title: '¿Superará NVIDIA los $1.000 por acción en 2026?',              category: 'TECNOLOGIA', market_type: 'MENSUAL',     close_date: daysFromNow(21),  total_volume: 0, active_traders: 0, prices: { yes: 64, no: 36 }, placeholder: true },
  { id: 'placeholder_2',  title: '¿Subirá el precio de la gasolina en España en abril de 2026?', category: 'ENERGIA',    market_type: 'MENSUAL',     close_date: daysFromNow(29),  total_volume: 0, active_traders: 0, prices: { yes: 55, no: 45 }, placeholder: true },
  { id: 'placeholder_3',  title: '¿Ganará el Real Madrid el próximo Clásico?',                   category: 'DEPORTES',   market_type: 'DIARIO',      close_date: hoursFromNow(5),  total_volume: 0, active_traders: 0, prices: { yes: 52, no: 48 }, placeholder: true },
  { id: 'placeholder_4',  title: '¿Habrá un nuevo fármaco aprobado para el Alzheimer en 2026?', category: 'CIENCIA',    market_type: 'MENSUAL',     close_date: daysFromNow(180), total_volume: 0, active_traders: 0, prices: { yes: 29, no: 71 }, placeholder: true },
  { id: 'placeholder_5',  title: '¿Bajará el Euríbor por debajo del 2% antes de julio?',        category: 'ECONOMIA',   market_type: 'MENSUAL',     close_date: daysFromNow(45),  total_volume: 0, active_traders: 0, prices: { yes: 61, no: 39 }, placeholder: true },
  { id: 'placeholder_6',  title: '¿Alcanzará el Bitcoin los $100.000 en 2026?',                 category: 'CRIPTO',     market_type: 'MENSUAL',     close_date: daysFromNow(120), total_volume: 0, active_traders: 0, prices: { yes: 47, no: 53 }, placeholder: true },
  { id: 'placeholder_7',  title: '¿Aprobará el Congreso los PGE en 2026?',                      category: 'POLITICA',   market_type: 'MENSUAL',     close_date: daysFromNow(90),  total_volume: 0, active_traders: 0, prices: { yes: 33, no: 67 }, placeholder: true },
  { id: 'placeholder_8',  title: '¿Logrará España clasificarse para el Mundial de 2026?',       category: 'DEPORTES',   market_type: 'MENSUAL',     close_date: daysFromNow(60),  total_volume: 0, active_traders: 0, prices: { yes: 87, no: 13 }, placeholder: true },
  { id: 'placeholder_9',  title: '¿Superará la inflación en España el 3% en 2026?',             category: 'ECONOMIA',   market_type: 'SEMANAL',     close_date: daysFromNow(12),  total_volume: 0, active_traders: 0, prices: { yes: 42, no: 58 }, placeholder: true },
  { id: 'placeholder_10', title: '¿Habrá un acuerdo de paz en Ucrania antes de 2027?',          category: 'GEOPOLITICA',market_type: 'MENSUAL',     close_date: daysFromNow(200), total_volume: 0, active_traders: 0, prices: { yes: 31, no: 69 }, placeholder: true },
  { id: 'placeholder_11', title: '¿Superará el IBEX 35 los 12.000 puntos antes de julio?',      category: 'ECONOMIA',   market_type: 'MENSUAL',     close_date: daysFromNow(55),  total_volume: 0, active_traders: 0, prices: { yes: 58, no: 42 }, placeholder: true },
  { id: 'placeholder_12', title: '¿Lanzará Apple un nuevo iPhone plegable en 2026?',            category: 'TECNOLOGIA', market_type: 'MENSUAL',     close_date: daysFromNow(150), total_volume: 0, active_traders: 0, prices: { yes: 44, no: 56 }, placeholder: true },
  { id: 'placeholder_13', title: '¿Producirá España >50% de electricidad con renovables?',      category: 'ENERGIA',    market_type: 'MENSUAL',     close_date: daysFromNow(300), total_volume: 0, active_traders: 0, prices: { yes: 72, no: 28 }, placeholder: true },
  { id: 'placeholder_14', title: '¿Ganará el Atlético de Madrid la Liga 2025-26?',              category: 'DEPORTES',   market_type: 'MENSUAL',     close_date: daysFromNow(75),  total_volume: 0, active_traders: 0, prices: { yes: 22, no: 78 }, placeholder: true },
]

// Wrap getActiveMarkets with a hard 8s timeout so loading never hangs forever
async function fetchWithTimeout(options) {
  const timeoutPromise = new Promise((_, reject) =>
    setTimeout(() => reject(new Error('timeout')), 8000)
  )
  return Promise.race([getActiveMarkets(options), timeoutPromise])
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
    console.log(`[useMarkets] loading started (id=${fetchId}, cat=${catFilter}, type=${typeFilter})`)

    try {
      const options = {}
      if (catFilter !== 'ALL')  options.catFilter  = catFilter
      if (typeFilter !== 'ALL') options.typeFilter = typeFilter

      const data = await fetchWithTimeout(options)
      console.log(`[useMarkets] got ${data?.length ?? 0} markets (id=${fetchId})`)

      // Abort if a newer fetch already started
      if (fetchId !== fetchIdRef.current) {
        console.log(`[useMarkets] stale fetch ignored (id=${fetchId})`)
        return
      }

      const enriched = (data || []).map(m => ({
        ...m,
        prices:    calculatePrices(parseFloat(m.yes_pool), parseFloat(m.no_pool)),
        isExpired: new Date(m.close_date) < new Date(),
      }))

      const nonExpiredCount = enriched.filter(m => !m.isExpired).length
      const fillerCount     = Math.max(0, 15 - nonExpiredCount)
      const fillers         = EXAMPLE_PLACEHOLDERS.slice(0, fillerCount)

      setMarkets([...enriched, ...fillers])
      console.log(`[useMarkets] setMarkets: ${enriched.length} real + ${fillers.length} placeholders`)
    } catch (err) {
      console.error('[useMarkets] error:', err?.message || err)
      if (fetchId !== fetchIdRef.current) return
      // Show placeholders on any error so loading always ends
      setMarkets(EXAMPLE_PLACEHOLDERS.slice(0, 15))
    } finally {
      // Always clear loading — even if this fetch was superseded
      if (fetchId === fetchIdRef.current) {
        setLoading(false)
        console.log(`[useMarkets] loading done (id=${fetchId})`)
      }
    }
  }, [catFilter, typeFilter])

  useEffect(() => {
    loadMarkets()
  }, [loadMarkets])

  useEffect(() => {
    getResolvedMarkets(10)
      .then(data => setResolvedMarkets(data || []))
      .catch(() => {})
  }, [])

  return { markets, resolvedMarkets, loading, loadMarkets }
}
