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
      <span style={{
        fontSize: 11, color: C.textDim, fontWeight: 500, flexShrink: 0,
      }}>
        {label}
      </span>
      <div style={{ display: 'flex', gap: 5, alignItems: 'center', flexWrap: 'wrap', justifyContent: 'flex-end' }}>
        {children}
      </div>
    </div>
  )
}

// ─── MarketInsights — full insights panel for TradingModal ────────────────

export default function MarketInsights({ market, relatedMarkets = [], onOpenMarket }) {
  const hasScore    = market?.market_score != null
  const hasCluster  = !!market?.cluster_id
  const hasTrend    = !!market?.trending || market?.prob_change_24h != null
  const hasVol      = market?.vol_24h != null
  const hasFlag     = !!market?.calibration_flag

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>

      {/* ── Metrics ─────────────────────────────────────────────────────── */}
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
              <span style={{
                fontSize: 12, fontWeight: 600, color: C.text,
                fontVariantNumeric: 'tabular-nums',
              }}>
                {parseFloat(market.vol_24h).toFixed(2)}pp
              </span>
            </InsightRow>
          )}

          {hasFlag && (
            <InsightRow label="Aviso">
              <CalibrationFlagBadge flag={market.calibration_flag} />
            </InsightRow>
          )}

          {!hasScore && !hasCluster && !hasTrend && !hasVol && (
            <div style={{ padding: '12px 0', fontSize: 12, color: C.textDim }}>
              Sin datos de análisis aún. Se actualizan cada 30 minutos.
            </div>
          )}
        </div>
      </div>

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
