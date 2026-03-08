import { C } from '../lib/theme'

export default function WatchButton({ marketId, isWatching, onToggle, size = 'sm' }) {
  const dim    = size === 'lg' ? 32 : 26
  const fSize  = size === 'lg' ? 15 : 12

  function handleClick(e) {
    e.stopPropagation()
    onToggle?.(marketId)
  }

  return (
    <button
      onClick={handleClick}
      aria-label={isWatching ? 'Dejar de seguir' : 'Seguir mercado'}
      title={isWatching ? 'Dejar de seguir' : 'Seguir mercado'}
      style={{
        width: dim, height: dim, borderRadius: dim / 2,
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        background: isWatching ? `${C.no}10` : 'transparent',
        border: `1px solid ${isWatching ? `${C.no}30` : C.cardBorder}`,
        cursor: 'pointer', flexShrink: 0,
        transition: 'all 0.15s ease',
        fontSize: fSize,
        color: isWatching ? C.no : C.textDim,
      }}
    >
      {isWatching ? '♥' : '♡'}
    </button>
  )
}
