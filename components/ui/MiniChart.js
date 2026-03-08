import { C } from '../../lib/theme'

// Deterministic pseudo-random sparkline — consistent per market, no extra API calls
function generateSparkline(marketId, targetProb, poolBias, width, height) {
  const seed = String(marketId || 'x')
    .split('').reduce((a, c, i) => a + c.charCodeAt(0) * (i * 7 + 11), 0)

  const N = 28
  const pts = []

  // Start from a plausible earlier state (±10 from current)
  let v = targetProb - ((seed % 20) - 10)

  for (let i = 0; i < N; i++) {
    const t = i / (N - 1)
    // Blend toward current prob as we approach present
    const pull = (targetProb - v) * (0.08 + t * 0.12)
    const wave = Math.sin((seed * 0.003 + t * 4.2)) * 3.5
              + Math.cos((seed * 0.007 + t * 2.8)) * 2
    const noise = (((seed * (i + 3) * 2147483647) >>> 0) % 100) / 100 * 2 - 1
    v = Math.max(3, Math.min(97, v + pull + wave * 0.3 + noise))
    pts.push(v)
  }
  pts[pts.length - 1] = targetProb // anchor end to current

  // Normalize to SVG coords
  const pad = 2
  const minV = Math.min(...pts), maxV = Math.max(...pts)
  const range = Math.max(maxV - minV, 4)

  const coords = pts.map((p, i) => ({
    x: (i / (N - 1)) * width,
    y: pad + (1 - (p - minV) / range) * (height - pad * 2),
  }))

  // Smooth cubic bezier path (Catmull-Rom)
  const path = coords.reduce((acc, p, i) => {
    if (i === 0) return `M${p.x.toFixed(1)},${p.y.toFixed(1)}`
    const p0 = coords[Math.max(0, i - 2)]
    const p1 = coords[i - 1]
    const p2 = p
    const p3 = coords[Math.min(N - 1, i + 1)]
    const cp1x = p1.x + (p2.x - p0.x) / 6
    const cp1y = p1.y + (p2.y - p0.y) / 6
    const cp2x = p2.x - (p3.x - p1.x) / 6
    const cp2y = p2.y - (p3.y - p1.y) / 6
    return `${acc} C${cp1x.toFixed(1)},${cp1y.toFixed(1)} ${cp2x.toFixed(1)},${cp2y.toFixed(1)} ${p2.x.toFixed(1)},${p2.y.toFixed(1)}`
  }, '')

  const lastCoord = coords[coords.length - 1]
  const firstY = coords[0].y
  const lastY = lastCoord.y

  // Closed area path for gradient fill
  const areaPath = `${path} L${width},${height} L0,${height} Z`

  return { path, areaPath, lastY, firstY, lastX: lastCoord.x }
}

export default function MiniChart({
  marketId,
  probability,
  yesPool,
  noPool,
  width = 88,
  height = 36,
  color: forceColor,
}) {
  const prob = parseFloat(probability) || 50
  const poolBias = (parseFloat(noPool) - parseFloat(yesPool)) / 10000

  const c = forceColor || (
    prob >= 65 ? C.yes :
    prob <= 35 ? C.no  :
    C.accent
  )

  const { path, areaPath, lastY, firstY, lastX } = generateSparkline(marketId, prob, poolBias, width, height)
  const uid = `mc-${String(marketId).replace(/[^a-z0-9]/gi, '')}`
  const trending = lastY < firstY // lower y-coord = visually higher = going up

  return (
    <svg
      width={width}
      height={height}
      viewBox={`0 0 ${width} ${height}`}
      style={{ display: 'block', overflow: 'visible', flexShrink: 0 }}
      aria-hidden="true">
      <defs>
        <linearGradient id={`${uid}-g`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%"   stopColor={c} stopOpacity="0.18" />
          <stop offset="100%" stopColor={c} stopOpacity="0.01" />
        </linearGradient>
        <clipPath id={`${uid}-clip`}>
          <rect x="0" y="0" width={width} height={height} />
        </clipPath>
      </defs>
      <g clipPath={`url(#${uid}-clip)`}>
        <path d={areaPath} fill={`url(#${uid}-g)`} />
        <path
          d={path}
          fill="none"
          stroke={c}
          strokeWidth="1.5"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </g>
      {/* Current price dot */}
      <circle cx={lastX} cy={lastY} r="2.5" fill={c} />
    </svg>
  )
}
