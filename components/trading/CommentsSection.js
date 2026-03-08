import { C, inputStyle } from '../../lib/theme'
import SectionTitle from './SectionTitle'

export default function CommentsSection({ user, comments, newComment, setNewComment, onPostComment, onLikeComment }) {
  return (
    <div>
      <SectionTitle>Debate</SectionTitle>
      {user && (
        <div style={{ display: 'flex', gap: 8, marginBottom: 14 }}>
          <input
            value={newComment}
            onChange={e => setNewComment(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && onPostComment()}
            placeholder="Añade un comentario..."
            style={{ ...inputStyle, flex: 1 }}
          />
          <button onClick={onPostComment} style={{
            padding: '0 16px', background: C.accent, color: '#fff',
            border: 'none', borderRadius: 10, fontSize: 13, fontWeight: 600,
            cursor: 'pointer', flexShrink: 0, height: 42,
          }}>
            Enviar
          </button>
        </div>
      )}
      {comments.length === 0 ? (
        <div style={{ fontSize: 13, color: C.textDim, padding: '16px 0' }}>Sin comentarios aún.</div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          {comments.map(c => {
            const diffMs = Date.now() - new Date(c.created_at)
            const h = Math.floor(diffMs / 3600000)
            const age = h < 1 ? `${Math.floor(diffMs / 60000)}m` : h < 24 ? `${h}h` : `${Math.floor(h / 24)}d`
            return (
              <div key={c.id} style={{ display: 'flex', gap: 10, alignItems: 'flex-start' }}>
                <div style={{
                  width: 30, height: 30, borderRadius: 8, flexShrink: 0,
                  background: `${C.accent}12`,
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  fontSize: 12, fontWeight: 700, color: C.accent,
                }}>
                  {c.user_email[0].toUpperCase()}
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ display: 'flex', gap: 8, alignItems: 'baseline', marginBottom: 4 }}>
                    <span style={{ fontSize: 12, fontWeight: 600, color: C.text }}>{c.user_email.split('@')[0]}</span>
                    <span style={{ fontSize: 10, color: C.textDim }}>hace {age}</span>
                  </div>
                  <p style={{ fontSize: 13, color: C.textMuted, lineHeight: 1.55, wordBreak: 'break-word' }}>{c.text}</p>
                  <button onClick={() => onLikeComment(c.id)} style={{
                    marginTop: 4, fontSize: 11, color: C.textDim,
                    background: 'none', border: 'none', cursor: 'pointer', padding: 0,
                  }}>
                    ♡ {c.likes || 0}
                  </button>
                </div>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
