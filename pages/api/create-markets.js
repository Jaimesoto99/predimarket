import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
)

// ============================================================
// AUTO-GENERADOR DE MERCADOS TRENDING
// Llama a: /api/create-markets?mode=trending
// O crea manual: /api/create-markets?mode=manual&title=...
// ============================================================

async function fetchSpanishTrending() {
  const topics = []

  // 1. Google News España — principales titulares
  try {
    const res = await fetch('https://news.google.com/rss?hl=es&gl=ES&ceid=ES:es', { headers: { 'User-Agent': 'Mozilla/5.0' } })
    const text = await res.text()
    const titles = [...text.matchAll(/<title><!\[CDATA\[(.*?)\]\]><\/title>/g)].map(m => m[1]).slice(1, 20)
    titles.forEach(t => topics.push({ title: t, source: 'Google News ES' }))
  } catch (e) { console.error('Google News error:', e) }

  // 2. Google Trends España (RSS)
  try {
    const res = await fetch('https://trends.google.com/trending/rss?geo=ES', { headers: { 'User-Agent': 'Mozilla/5.0' } })
    const text = await res.text()
    const titles = [...text.matchAll(/<title><!\[CDATA\[(.*?)\]\]><\/title>/g)].map(m => m[1]).slice(1, 10)
    titles.forEach(t => topics.push({ title: t, source: 'Google Trends ES' }))
  } catch (e) { console.error('Google Trends error:', e) }

  return topics
}

function generateMarketFromTopic(topic) {
  const t = topic.title.toLowerCase()
  const templates = []

  // Politica
  if (t.includes('sánchez') || t.includes('sanchez') || t.includes('gobierno') || t.includes('moncloa')) {
    templates.push({
      title: `¿"${topic.title.split(' ').slice(0, 4).join(' ')}" será trending en España esta semana?`,
      category: 'POLITICA', type: 'SEMANAL', hours: 168,
      description: `Basado en cobertura mediática de: ${topic.title}. Fuente: ${topic.source}. Se resuelve SÍ si el tema acumula 5+ noticias en Google News ES.`,
    })
  }

  // Economia
  if (t.includes('ibex') || t.includes('bolsa') || t.includes('inflación') || t.includes('euribor') || t.includes('hipoteca') || t.includes('vivienda') || t.includes('pib')) {
    templates.push({
      title: `¿${topic.title.split(' ').slice(0, 6).join(' ')}?`,
      category: 'ECONOMIA', type: 'SEMANAL', hours: 168,
      description: `Mercado generado por tendencia: ${topic.title}. Fuente: ${topic.source}.`,
    })
  }

  // Deportes
  if (t.includes('madrid') || t.includes('barça') || t.includes('barcelona') || t.includes('atlético') || t.includes('selección') || t.includes('liga') || t.includes('champions')) {
    templates.push({
      title: `¿${topic.title.split(' ').slice(0, 6).join(' ')}?`,
      category: 'DEPORTES', type: 'SEMANAL', hours: 168,
      description: `Mercado generado por tendencia deportiva: ${topic.title}. Fuente: ${topic.source}.`,
    })
  }

  // General — si no matchea nada específico, crear como trending genérico
  if (templates.length === 0 && topic.title.length > 10) {
    templates.push({
      title: `¿"${topic.title.split(' ').slice(0, 5).join(' ')}" será noticia destacada esta semana?`,
      category: 'ACTUALIDAD', type: 'SEMANAL', hours: 168,
      description: `Tema detectado en tendencias: ${topic.title}. Fuente: ${topic.source}. Se resuelve SÍ si acumula cobertura significativa en medios españoles.`,
    })
  }

  return templates
}

async function createTrendingMarkets() {
  const topics = await fetchSpanishTrending()
  if (topics.length === 0) return { created: 0, reason: 'No se encontraron tendencias' }

  // Obtener mercados existentes para no duplicar
  const { data: existing } = await supabase.from('markets').select('title').in('status', ['ACTIVE', 'CLOSED'])
  const existingTitles = (existing || []).map(m => m.title.toLowerCase())

  const created = []
  let count = 0
  const MAX_NEW = 3 // Crear máximo 3 mercados nuevos por ejecución

  for (const topic of topics) {
    if (count >= MAX_NEW) break
    const markets = generateMarketFromTopic(topic)

    for (const m of markets) {
      if (count >= MAX_NEW) break
      // Check duplicado
      const isDuplicate = existingTitles.some(et => {
        const words = m.title.toLowerCase().split(' ').filter(w => w.length > 3)
        return words.filter(w => et.includes(w)).length >= 3
      })
      if (isDuplicate) continue

      const { data, error } = await supabase.rpc('create_market', {
        p_title: m.title,
        p_description: m.description,
        p_category: m.category,
        p_market_type: m.type,
        p_duration_hours: m.hours,
        p_initial_pool: 5000
      })

      if (!error) {
        created.push({ title: m.title, category: m.category })
        existingTitles.push(m.title.toLowerCase())
        count++
      } else {
        console.error('Error creating market:', m.title, error.message)
      }
    }
  }

  return { created: created.length, markets: created, topics_found: topics.length }
}

async function createManualMarket(params) {
  const { title, description, category, type, hours, pool } = params

  if (!title) return { error: 'Falta título' }

  const { data, error } = await supabase.rpc('create_market', {
    p_title: title,
    p_description: description || `Mercado creado manualmente. Resolución verificable.`,
    p_category: category || 'ACTUALIDAD',
    p_market_type: type || 'SEMANAL',
    p_duration_hours: parseInt(hours) || 168,
    p_initial_pool: parseInt(pool) || 5000
  })

  if (error) return { error: error.message }
  return { success: true, data }
}

export default async function handler(req, res) {
  // Seguridad básica — requiere key
  const authKey = req.headers['x-admin-key'] || req.query.key
  if (authKey !== process.env.ADMIN_API_KEY && authKey !== process.env.SUPABASE_SERVICE_ROLE_KEY?.slice(0, 20)) {
    return res.status(401).json({ error: 'No autorizado. Añade ?key=TU_KEY o header x-admin-key' })
  }

  const mode = req.query.mode || 'trending'

  if (mode === 'trending') {
    const result = await createTrendingMarkets()
    return res.status(200).json({ mode: 'trending', ...result })
  }

  if (mode === 'manual') {
    const result = await createManualMarket({
      title: req.query.title || req.body?.title,
      description: req.query.description || req.body?.description,
      category: req.query.category || req.body?.category,
      type: req.query.type || req.body?.type,
      hours: req.query.hours || req.body?.hours,
      pool: req.query.pool || req.body?.pool,
    })
    return res.status(result.error ? 400 : 200).json({ mode: 'manual', ...result })
  }

  if (mode === 'list-trending') {
    const topics = await fetchSpanishTrending()
    return res.status(200).json({ topics })
  }

  return res.status(400).json({ error: 'Modo no válido. Usa: trending, manual, list-trending' })
}