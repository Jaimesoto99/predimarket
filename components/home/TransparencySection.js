import Link from 'next/link'
import { C } from '../../lib/theme'

const links = [
  {
    href: '/metodologia',
    label: 'Metodología',
    desc: 'Cómo se forma el precio mediante el libro de órdenes P2P y los oráculos de resolución.',
  },
  {
    href: '/reglas',
    label: 'Reglas',
    desc: 'Cómo se resuelven los mercados y qué pasa en casos límite.',
  },
  {
    href: '/disclaimer',
    label: 'Aviso legal',
    desc: 'Condiciones de uso. Créditos virtuales. Sin dinero real.',
  },
]

export default function TransparencySection() {
  return (
    <section style={{
      marginTop: 48, paddingTop: 32,
      borderTop: `1px solid ${C.divider}`,
    }}>
      <div style={{ marginBottom: 16 }}>
        <h2 style={{
          fontSize: 13, fontWeight: 700, letterSpacing: '0.06em',
          textTransform: 'uppercase', color: C.textDim, marginBottom: 0,
        }}>
          Transparencia
        </h2>
      </div>

      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))',
        gap: 10,
      }}>
        {links.map(({ href, label, desc }) => (
          <Link key={href} href={href} style={{
            display: 'block', textDecoration: 'none',
            padding: '14px 16px',
            background: C.surface,
            border: `1px solid ${C.cardBorder}`,
            borderRadius: 10,
            transition: 'border-color 0.12s',
          }}>
            <div style={{
              fontSize: 13, fontWeight: 600, color: C.text, marginBottom: 5,
            }}>
              {label} →
            </div>
            <p style={{ fontSize: 12, color: C.textDim, lineHeight: 1.55, margin: 0 }}>
              {desc}
            </p>
          </Link>
        ))}
      </div>
    </section>
  )
}
