import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

if (!supabaseUrl || !supabaseKey) {
  console.error('FALTAN VARIABLES DE ENTORNO. Crea .env.local con NEXT_PUBLIC_SUPABASE_URL y NEXT_PUBLIC_SUPABASE_ANON_KEY')
}

export const supabase = createClient(supabaseUrl || '', supabaseKey || '')

export async function getActiveMarkets() {
  const { data, error } = await supabase
    .from('markets')
    .select('id,title,category,super_category,market_type,status,yes_pool,no_pool,close_date,resolution_time,resolution_source,oracle_type,total_volume,active_traders,total_traders,market_score,cluster_id,created_at')
    .in('status', ['ACTIVE', 'CLOSED'])
    .order('close_date', { ascending: true })
  if (error) { console.error('Error mercados:', error.message); return [] }
  return data || []
}

export async function getUserTrades(email, includeAll = false) {
  let query = supabase
    .from('trades')
    .select('id,market_id,side,amount,shares,status,pnl,created_at,markets(id,title,category,yes_pool,no_pool,status)')
    .eq('user_email', email.toLowerCase().trim())
    .order('created_at', { ascending: false })
  if (!includeAll) query = query.eq('status', 'OPEN')
  const { data, error } = await query
  if (error) { console.error('Error trades:', error.message); return [] }
  return data || []
}

export async function getPriceHistory(marketId, hours = 720) {
  const since = new Date(Date.now() - hours * 3600000).toISOString()
  const { data, error } = await supabase
    .from('price_history')
    .select('*')
    .eq('market_id', marketId)
    .gte('created_at', since)
    .order('created_at', { ascending: true })
  if (error) { console.error('Error historial:', error.message); return [] }
  return data || []
}

export async function getOrCreateUser(email) {
  if (!email || typeof email !== 'string' || !email.includes('@')) return { success: false, error: 'Email inválido' }
  const { data, error } = await supabase.rpc('get_or_create_user', { p_email: email.toLowerCase().trim() })
  if (error) { console.error('Error usuario:', error.message); return { success: false, error: error.message } }
  return data
}

export async function createTrade(userEmail, marketId, side, amount, market) {
  if (!userEmail || !marketId || !side || !amount) return { success: false, error: 'Faltan parámetros' }
  const numAmount = parseFloat(amount)
  if (isNaN(numAmount) || numAmount <= 0) return { success: false, error: 'Cantidad inválida' }
  if (numAmount > 200) return { success: false, error: 'Máximo €200 por operación' }

  // Anti-manipulation: validate pools and price impact
  if (market) {
    const yp = parseFloat(market.yes_pool)
    const np = parseFloat(market.no_pool)
    if (yp <= 100 || np <= 100) return { success: false, error: 'Liquidez insuficiente en este mercado' }

    // Check price impact: if trade would move price >15%, reject
    const k = yp * np
    let newYp, newNp
    if (side.toUpperCase() === 'YES') {
      newNp = np + numAmount
      newYp = k / newNp
    } else {
      newYp = yp + numAmount
      newNp = k / newYp
    }
    const priceBefore = np / (yp + np)
    const priceAfter  = newNp / (newYp + newNp)
    const impact = Math.abs(priceAfter - priceBefore) * 100
    if (impact > 15) return { success: false, error: `Impacto en precio demasiado alto (${impact.toFixed(1)}%). Reduce el importe.` }
  }

  try {
    const { data, error } = await supabase.rpc('execute_trade', {
      p_email: userEmail.toLowerCase().trim(), p_market_id: marketId, p_side: side.toUpperCase(), p_amount: numAmount
    })
    if (error) return { success: false, error: error.message }
    return data
  } catch (err) { return { success: false, error: 'Error de conexión' } }
}

export async function getResolvedMarkets(limit = 10) {
  const { data, error } = await supabase
    .from('markets')
    .select('*')
    .eq('status', 'RESOLVED')
    .order('close_date', { ascending: false })
    .limit(limit)
  if (error) { console.error('Error mercados resueltos:', error.message); return [] }
  return data || []
}

export async function sellPosition(tradeId, userEmail) {
  if (!tradeId || !userEmail) return { success: false, error: 'Faltan parámetros' }
  try {
    const { data, error } = await supabase.rpc('execute_sell', {
      p_trade_id: tradeId, p_email: userEmail.toLowerCase().trim()
    })
    if (error) return { success: false, error: error.message }
    return data
  } catch (err) { return { success: false, error: 'Error de conexión' } }
}

// ─── Auth real (Supabase Auth) ────────────────────────────────────────────

export async function signUp(email, password) {
  const { data, error } = await supabase.auth.signUp({
    email: email.toLowerCase().trim(),
    password,
  })
  if (error) return { success: false, error: error.message }
  return { success: true, user: data.user, session: data.session }
}

export async function signIn(email, password) {
  const { data, error } = await supabase.auth.signInWithPassword({
    email: email.toLowerCase().trim(),
    password,
  })
  if (error) return { success: false, error: error.message }
  return { success: true, user: data.user, session: data.session }
}

export async function signOut() {
  const { error } = await supabase.auth.signOut()
  if (error) return { success: false, error: error.message }
  return { success: true }
}

export async function getUser() {
  const { data, error } = await supabase.auth.getUser()
  if (error || !data.user) return null
  return data.user
}

export function onAuthStateChange(callback) {
  const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
    callback(session?.user ?? null)
  })
  return subscription
}