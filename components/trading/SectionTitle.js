export default function SectionTitle({ children }) {
  return (
    <div style={{
      fontSize: 10, fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase',
      color: 'var(--text-dim)', marginBottom: 12,
    }}>
      {children}
    </div>
  )
}
