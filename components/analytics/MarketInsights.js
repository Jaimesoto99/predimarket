import { useEffect, useState } from 'react'
import { C } from '../../lib/theme'
import MarketScoreIndicator, { ClusterBadge, CalibrationFlagBadge } from './MarketScoreIndicator'
import MarketTrendBadge, { MarketChangePills } from './MarketTrendBadge'
import MarketCard from '../MarketCard'

// ─── Row helper ───────────────────────────────────────────────────────────

function InsightRow({ label, children }) {
  return (
    <div style={{
      display: 'flex', alignItems: 'center', justifyContent: 'space-between',
      padding: '8px 0', borderBottom: `1px solid ${C.divider}`, gap: 8,
    }}>
      <span style={{ fontSize: 11, color: C.textDim, fontWeight: 500, flexShrink: 0 }}>
        {label}
      </span>
      <div style={{ display: 'flex', gap: 5, alignItems: 'center', flexWrap: 'wrap', justifyContent: 'flex-end' }}>
        {children}
      </div>
    </div>
  )
}

// ─── Mini sparkline SVG ───────────────────────────────────────────────────

function Sparkline({ series }) {
  if (!series || series.length < 2) return null
  const W = 260, H = 56
  const values = series.map(s => s.p)
  const min = Math.max(0,  Math.min(...values) - 5)
  const max = Math.min(100, Math.max(...values) + 5)
  const range = max - min || 1
  const pts = series.map((s, i) => {
    const x = (i / (series.length - 1)) * W
    const y = H - ((s.p - min) / range) * H
    return `${x.toFixed(1)},${y.toFixed(1)}`
  }).join(' ')

  const lastP = values[values.length - 1]
  const firstP = values[0]
  const stroke = lastP > firstP ? '#22c55e' : lastP < firstP ? '#ef4444' : C.accent

  return (
    <div style={{ marginBottom: 16 }}>
      <div style={{
        display: 'flex', justifyContent: 'space-between', alignItems: 'center',
        marginBottom: 6,
      }}>
        <span style={{ fontSize: 10, fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase', color: C.textDim }}>
          Historial de probabilidad (7d)
        </span>
        <span style={{ fontSize: 13, fontWeight: 700, color: stroke, fontVariantNumeric: 'tabular-nums' }}>
          {lastP.toFixed(1)}%
        </span>
      </div>
      <svg width={W} height={H} style={{ display: 'block', borderRadius: 4 }}>
        <defs>
          <linearGradient id="sg" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor={stroke} stopOpacity="0.18" />
            <stop offset="100%" stopColor={stroke} stopOpacity="0" />
          </linearGradient>
        </defs>
        {/* fill area */}
        <polygon
          points={`0,${H} ${pts} ${W},${H}`}
          fill="url(#sg)"
        />
        {/* line */}
        <polyline
          points={pts}
          fill="none"
          stroke={stroke}
          strokeWidth="1.5"
          strokeLinejoin="round"
          strokeLinecap="round"
        />
        {/* 50% reference line */}
        {min < 50 && max > 50 && (
          <line
            x1={0} y1={H - ((50 - min) / range) * H}
            x2={W} y2={H - ((50 - min) / range) * H}
            stroke={C.cardBorder} strokeWidth="1" strokeDasharray="3,3"
          />
        )}
      </svg>
      <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 4 }}>
        <span style={{ fontSize: 10, color: C.textDim }}>{firstP.toFixed(1)}%</span>
        <span style={{ fontSize: 10, color: C.textDim }}>
          {series.length} puntos
        </span>
      </div>
    </div>
  )
}

// ─── Signal card ──────────────────────────────────────────────────────────

function SignalCard({ signal }) {
  const isBull  = signal.direction === 'UP' || signal.direction === 'BULLISH'
  const isBear  = signal.direction === 'DOWN' || signal.direction === 'BEARISH'
  const pct     = signal.prob_delta != null ? (signal.prob_delta * 100).toFixed(1) : null
  const str     = signal.strength   != null ? Math.round(signal.strength * 100)    : null
  const color   = isBull ? '#22c55e' : isBear ? '#ef4444' : C.textDim
  const arrow   = isBull ? '↑' : isBear ? '↓' : '→'

  return (
    <div style={{
      padding: '10px 12px', borderRadius: 6,
      border: `1px solid ${C.cardBorder}`,
      background: C.bg, display: 'flex', flexDirection: 'column', gap: 5,
    }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
        <span style={{ fontSize: 13, fontWeight: 700, color }}>{arrow}</span>
        <span style={{ fontSize: 12, fontWeight: 600, color: C.text, flex: 1 }}>
          {signal.title || signal.event_type || 'Señal'}
        </span>
        {str != null && (
          <span style={{
            fontSize: 10, fontWeight: 700, color,
            background: `${color}18`, borderRadius: 4, padding: '2px 5px',
          }}>
            {str}%
          </span>
        )}
      </div>
      {signal.description && (
        <p style={{ fontSize: 11, color: C.textDim, margin: 0, lineHeight: 1.4 }}>
          {signal.description.slice(0, 120)}{signal.description.length > 120 ? '…' : ''}
        </p>
      )}
      <div style={{ display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap' }}>
        {signal.source_name && (
          <span style={{ fontSize: 10, color: C.textDim }}>{signal.source_name}</span>
        )}
        {pct && (
          <span style={{ fontSize: 10, color, fontWeight: 600 }}>
            {isBull ? '+' : ''}{pct}pp impacto
          </span>
        )}
      </div>
    </div>
  )
}

// ─── MarketInsights — full insights panel for TradingModal ────────────────

export default function MarketInsights({ market, relatedMarkets = [], onOpenMarket }) {
  const [probHistory, setProbHistory] = useState(null)   // null = loading, [] = empty
  const [signals,     setSignals]     = useState(null)   // null = loading
  const [loadError,   setLoadError]   = useState(false)

  useEffect(() => {
    if (!market?.id) return
    let cancelled = false

    async function load() {
      try {
        const [histRes, sigRes] = await Promise.all([
          fetch(`/api/markets/${market.id}/probability-history?hours=168&maxPoints=60`),
          fetch(`/api/markets/${market.id}/signals?limit=5`),
        ])
        if (cancelled) return

        const histJson = histRes.ok ? await histRes.json() : null
        const sigJson  = sigRes.ok  ? await sigRes.json()  : null

        if (!cancelled) {
          setProbHistory(histJson?.series ?? [])
          setSignals(sigJson?.signals ?? [])
        }
      } catch {
        if (!cancelled) {
          setProbHistory([])
          setSignals([])
          setLoadError(true)
        }
      }
    }

    load()
    return () => { cancelled = true }
  }, [market?.id])

  const hasScore   = market?.market_score   != null
  const hasCluster = !!market?.cluster_id
  const hasTrend   = !!market?.trending || market?.prob_change_24h != null
  const hasVol     = market?.vol_24h != null
  const hasFlag    = !!market?.calibration_flag

  const hasEngineData = hasScore || hasCluster || hasTrend || hasVol || hasFlag
  const hasProbHistory = probHistory != null && probHistory.length > 1
  const hasSignals     = signals     != null && signals.length > 0
  const loading        = probHistory === null && signals === null

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>

      {/* ── Probability sparkline ──────────────────────────────────────── */}
      {hasProbHistory && <Sparkline series={probHistory} />}

      {/* ── Engine metrics ─────────────────────────────────────────────── */}
      <div>
        <div style={{
          fontSize: 10, fontWeight: 700, letterSpacing: '0.08em',
          textTransform: 'uppercase', color: C.textDim, marginBottom: 10,
        }}>
          Análisis del mercado
        </div>

        <div style={{ display: 'flex', flexDirection: 'column' }}>
          {hasScore && (
            <InsightRow label="Relevancia">
              <MarketScoreIndicator market={market} showLabel={false} />
            </InsightRow>
          )}
          {hasCluster && (
            <InsightRow label="Cluster">
              <ClusterBadge clusterId={market.cluster_id} />
            </InsightRow>
          )}
          {hasTrend && (
            <InsightRow label="Tendencia 24h">
              <MarketTrendBadge market={market} size="lg" />
            </InsightRow>
          )}
          {hasTrend && market?.prob_change_6h != null && (
            <InsightRow label="Cambios">
              <MarketChangePills market={market} />
            </InsightRow>
          )}
          {hasVol && (
            <InsightRow label="Volatilidad 24h">
              <span style={{ fontSize: 12, fontWeight: 600, color: C.text, fontVariantNumeric: 'tabular-nums' }}>
                {parseFloat(market.vol_24h).toFixed(2)}pp
              </span>
            </InsightRow>
          )}
          {hasFlag && (
            <InsightRow label="Aviso">
              <CalibrationFlagBadge flag={market.calibration_flag} />
            </InsightRow>
          )}

          {/* Loading state */}
          {loading && (
            <div style={{ padding: '12px 0', fontSize: 12, color: C.textDim }}>
              Cargando análisis…
            </div>
          )}

          {/* Empty state — only show if loaded and nothing to show at all */}
          {!loading && !hasEngineData && !hasProbHistory && !hasSignals && (
            <div style={{ padding: '12px 0', fontSize: 12, color: C.textDim }}>
              {loadError
                ? 'No se pudieron cargar los datos de análisis.'
                : 'Sin datos de análisis aún. Se actualizan cada 30 minutos.'}
            </div>
          )}
        </div>
      </div>

      {/* ── Active signals ─────────────────────────────────────────────── */}
      {hasSignals && (
        <div>
          <div style={{
            fontSize: 10, fontWeight: 700, letterSpacing: '0.08em',
            textTransform: 'uppercase', color: C.textDim, marginBottom: 10,
          }}>
            Señales activas ({signals.length})
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
            {signals.map(s => (
              <SignalCard key={s.id} signal={s} />
            ))}
          </div>
        </div>
      )}

      {/* ── Related markets ─────────────────────────────────────────────── */}
      {relatedMarkets.length > 0 && (
        <div>
          <div style={{
            fontSize: 10, fontWeight: 700, letterSpacing: '0.08em',
            textTransform: 'uppercase', color: C.textDim, marginBottom: 10,
          }}>
            Mercados relacionados
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
            {relatedMarkets.slice(0, 4).map(m => (
              <MarketCard key={m.id} market={m} onOpen={onOpenMarket} />
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
