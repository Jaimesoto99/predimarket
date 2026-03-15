import { C, modalStyle, panelStyle, closeBtnStyle, badge } from '../../lib/theme'

function rankColor(rank) {
  if (rank === 1) return '#f59e0b'
  if (rank === 2) return '#9ca3af'
  if (rank === 3) return '#cd7f32'
  return C.textDim
}

export default function LeaderboardModal({ showLeaderboard, setShowLeaderboard, leaderboard, loading, user }) {
  if (!showLeaderboard) return null

  return (
    <div style={modalStyle}>
      <div style={{ minHeight: '100%', padding: '24px 16px' }}>
        <div style={{ ...panelStyle, maxWidth: 540, margin: '0 auto' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 24 }}>
            <div>
              <h2 style={{ fontSize: 17, fontWeight: 700, letterSpacing: '-0.025em', marginBottom: 4 }}>Ranking</h2>
              <div style={{ fontSize: 11, color: C.textDim }}>P/L realizado · Trades cerrados (WON / LOST / SOLD)</div>
            </div>
            <button onClick={() => setShowLeaderboard(false)} style={closeBtnStyle}>✕</button>
          </div>

          {loading ? (
            <div style={{ textAlign: 'center', padding: '48px 0', color: C.textDim, fontSize: 13 }}>
              Cargando ranking...
            </div>
          ) : leaderboard.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '48px 0', color: C.textDim, fontSize: 13 }}>
              Sin datos de ranking todavía.
            </div>
          ) : (
            <div>
              <div style={{ display: 'grid', gridTemplateColumns: '28px 1fr 80px 56px 44px', gap: 8, padding: '0 8px 10px', borderBottom: `1px solid ${C.cardBorder}` }}>
                {[['#', 'left'], ['Trader', 'left'], ['P/L', 'right'], ['WR', 'right'], ['Trades', 'right']].map(([h, align]) => (
                  <div key={h} style={{ fontSize: 9, fontWeight: 600, letterSpacing: '0.08em', textTransform: 'uppercase', color: C.textDim, textAlign: align }}>
                    {h}
                  </div>
                ))}
              </div>
              {leaderboard.map((entry, i) => {
                const pnl    = parseFloat(entry.realized_pnl ?? entry.pnl ?? 0)
                const wr     = parseFloat(entry.win_rate ?? 0)
                const trades = entry.total_trades ?? entry.closed_trades ?? 0
                const name   = entry.display_name || entry.user_email?.split('@')[0] || `Trader ${i + 1}`
                const rank   = entry.rank_position ?? i + 1
                const isMe   = user && entry.user_email === user.email
                return (
                  <div key={entry.user_email || i} style={{
                    display: 'grid', gridTemplateColumns: '28px 1fr 80px 56px 44px', gap: 8,
                    padding: '10px 8px', borderBottom: `1px solid ${C.divider}`, alignItems: 'center',
                    background: isMe ? `${C.accent}05` : 'transparent',
                  }}>
                    <div style={{ fontSize: 12, fontWeight: 700, color: rankColor(rank), fontFamily: 'ui-monospace, monospace' }}>
                      {rank}
                    </div>
                    <div style={{ overflow: 'hidden', display: 'flex', alignItems: 'center', gap: 6 }}>
                      {entry.emoji && <span style={{ fontSize: 14, flexShrink: 0 }}>{entry.emoji}</span>}
                      <div style={{ overflow: 'hidden' }}>
                        <div style={{ fontSize: 13, fontWeight: 500, color: C.text, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                          {name}
                        </div>
                        {isMe && <span style={badge(C.accent)}>tú</span>}
                      </div>
                    </div>
                    <div style={{ textAlign: 'right', fontFamily: 'ui-monospace, monospace', fontSize: 13, fontWeight: 700, color: pnl >= 0 ? C.yes : C.no }}>
                      {pnl >= 0 ? '+' : ''}€{pnl.toFixed(0)}
                    </div>
                    <div style={{ textAlign: 'right', fontFamily: 'ui-monospace, monospace', fontSize: 12, color: C.textMuted }}>
                      {wr.toFixed(0)}%
                    </div>
                    <div style={{ textAlign: 'right', fontFamily: 'ui-monospace, monospace', fontSize: 12, color: C.textDim }}>
                      {trades}
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
