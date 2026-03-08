import { useEffect, useState } from 'react'
import Link from 'next/link'
import { supabase } from '../lib/supabase'
import { C } from '../lib/theme'
import AppLayout from '@/components/layout/AppLayout'

function StrengthBar({ value }) {
  const pct   = Math.round(value * 100)
  const color = value >= 0.6 ? C.yes : value >= 0.3 ? C.warning : C.textDim
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
      <div style={{ flex: 1, height: 5, borderRadius: 3, background: C.cardBorder, overflow: 'hidden' }}>
        <div style={{ width: `${pct}%`, height: '100%', background: color, borderRadius: 3 }} />
      </div>
      <span style={{
        fontSize: 11, fontWeight: 700, color, minWidth: 32,
        fontVariantNumeric: 'tabular-nums',
      }}>
        {pct}%
      </span>
    </div>
  )
}

function TopicCard({ topic }) {
  const marketCount = Array.isArray(topic.related_market_ids) ? topic.related_market_ids.length : 0

  return (
    <div style={{
      padding: '18px 20px',
      background: C.card, border: `1px solid ${C.cardBorder}`,
      borderRadius: 12,
    }}>
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 12, gap: 12 }}>
        <div>
          <div style={{
            fontSize: 12, fontWeight: 700, color: C.text, marginBottom: 3,
            letterSpacing: '-0.01em',
          }}>
            {topic.label || topic.topic}
          </div>
          {topic.category && (
            <span style={{
              fontSize: 9, fontWeight: 600, letterSpacing: '0.07em',
              textTransform: 'uppercase', color: C.textDim,
            }}>
              {topic.category}
            </span>
          )}
        </div>
        <span style={{
          flexShrink: 0, fontSize: 11, color: C.textMuted, fontWeight: 500,
          background: C.surface, border: `1px solid ${C.cardBorder}`,
          padding: '2px 8px', borderRadius: 6,
        }}>
          {marketCount} mercados
        </span>
      </div>

      <StrengthBar value={topic.signal_strength} />

      {/* Sample headlines */}
      {Array.isArray(topic.sample_headlines) && topic.sample_headlines.length > 0 && (
        <div style={{ marginTop: 12 }}>
          {topic.sample_headlines.slice(0, 2).map((h, i) => (
            <div key={i} style={{
              fontSize: 11, color: C.textDim, lineHeight: 1.5,
              padding: '3px 0', borderTop: i > 0 ? `1px solid ${C.divider}` : 'none',
            }}>
              {h}
            </div>
          ))}
        </div>
      )}

      {marketCount > 0 && (
        <Link href={`/clusters?topic=${topic.topic}`} style={{
          display: 'inline-block', marginTop: 12,
          fontSize: 11, color: C.accentLight, textDecoration: 'none',
        }}>
          Ver mercados relacionados →
        </Link>
      )}
    </div>
  )
}

export default function TopicsPage() {
  const [topics, setTopics] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function load() {
      setLoading(true)
      const { data, error } = await supabase
        .from('topic_signals')
        .select('*')
        .order('signal_strength', { ascending: false })
        .limit(20)

      if (!error && data) setTopics(data)
      setLoading(false)
    }
    load()
  }, [])

  return (
    <AppLayout>
      <div style={{ marginBottom: 28 }}>
        <h1 style={{ fontSize: 20, fontWeight: 800, letterSpacing: '-0.04em', color: C.text, marginBottom: 4 }}>
          Temas del momento
        </h1>
        <p style={{ fontSize: 13, color: C.textMuted }}>
          Tópicos dominantes detectados en fuentes de noticias en las últimas 6 horas.
        </p>
      </div>

      {loading ? (
        <div style={{ color: C.textDim, fontSize: 13, padding: '40px 0', textAlign: 'center' }}>
          Analizando fuentes...
        </div>
      ) : topics.length === 0 ? (
        <div style={{ color: C.textDim, fontSize: 13, padding: '60px 0', textAlign: 'center' }}>
          <div style={{ fontSize: 24, marginBottom: 12, opacity: 0.4 }}>📡</div>
          <div>No hay señales de temas activos.</div>
          <div style={{ marginTop: 6, fontSize: 12 }}>El analizador se ejecuta cada 30 minutos con artículos de RSS.</div>
        </div>
      ) : (
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))',
          gap: 12,
        }}>
          {topics.map(topic => (
            <TopicCard key={topic.topic} topic={topic} />
          ))}
        </div>
      )}
    </AppLayout>
  )
}
