import { useEffect, useState } from 'react'
import { C } from '../../lib/theme'
import { fs, fw, sp, r } from '../../lib/ds'
import ActivityItem from './ActivityItem'

async function loadGlobalActivity() {
  try {
    const res = await fetch('/api/activity?limit=25&sinceHours=24')
    if (!res.ok) throw new Error(`HTTP ${res.status}`)
    const json = await res.json()
    return json.activity || []
  } catch {
    return []
  }
}

export default function ActivityFeed({ style }) {
  const [activities, setActivities] = useState([])
  const [loading, setLoading] = useState(true)
  const [pulse, setPulse] = useState(false)

  async function refresh() {
    const data = await loadGlobalActivity()
    setActivities(data)
    setLoading(false)
    setPulse(true)
    setTimeout(() => setPulse(false), 800)
  }

  useEffect(() => {
    refresh()
    const interval = setInterval(refresh, 30000)
    return () => clearInterval(interval)
  }, [])

  return (
    <div style={{
      background: C.card,
      border: `1px solid ${C.cardBorder}`,
      borderRadius: r['2xl'],
      overflow: 'hidden',
      ...style,
    }}>
      {/* Header */}
      <div style={{
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        padding: `${sp.md}px ${sp.lg}px`,
        borderBottom: `1px solid ${C.divider}`,
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: sp.sm }}>
          <div style={{
            width: 7, height: 7, borderRadius: r.full,
            background: C.yes,
            boxShadow: `0 0 6px ${C.yes}`,
            animation: pulse ? 'none' : 'pulse-dot 2s ease-in-out infinite',
          }} />
          <span style={{ fontSize: fs.lg, fontWeight: fw.semibold, color: C.text }}>
            Actividad en vivo
          </span>
        </div>
        <span style={{ fontSize: fs.xs, color: C.textDim }}>
          {activities.length > 0 ? `${activities.length} recientes` : ''}
        </span>
      </div>

      {/* Feed list */}
      <div style={{
        padding: `0 ${sp.lg}px`,
        maxHeight: 480,
        overflowY: 'auto',
      }}>
        {loading ? (
          Array.from({ length: 6 }).map((_, i) => (
            <div key={i} style={{
              display: 'flex', alignItems: 'center', gap: sp.sm,
              padding: `${sp.sm}px 0`,
              borderBottom: `1px solid ${C.divider}`,
            }}>
              <div className="skeleton" style={{ width: 28, height: 28, borderRadius: r.full }} />
              <div style={{ flex: 1 }}>
                <div className="skeleton" style={{ height: 10, width: '60%', borderRadius: r.sm, marginBottom: 5 }} />
                <div className="skeleton" style={{ height: 9, width: '80%', borderRadius: r.sm }} />
              </div>
              <div className="skeleton" style={{ height: 10, width: 32, borderRadius: r.sm }} />
            </div>
          ))
        ) : activities.length === 0 ? (
          <div style={{
            padding: `${sp['3xl']}px 0`,
            textAlign: 'center',
            color: C.textDim,
            fontSize: fs.sm,
          }}>
            Sin actividad reciente
          </div>
        ) : (
          activities.map((a, i) => <ActivityItem key={a.id || i} activity={a} />)
        )}
      </div>

      {/* Footer */}
      {!loading && activities.length > 0 && (
        <div style={{
          padding: `${sp.sm}px ${sp.lg}px`,
          borderTop: `1px solid ${C.divider}`,
          textAlign: 'center',
        }}>
          <span style={{ fontSize: fs.xs, color: C.textDim }}>
            Actualiza cada 30s
          </span>
        </div>
      )}

      <style>{`
        @keyframes pulse-dot {
          0%, 100% { opacity: 1; transform: scale(1); }
          50% { opacity: 0.5; transform: scale(0.85); }
        }
      `}</style>
    </div>
  )
}
