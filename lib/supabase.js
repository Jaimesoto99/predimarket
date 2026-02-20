import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

if (!supabaseUrl || !supabaseKey) {
  console.error(
    'FALTAN VARIABLES DE ENTORNO.\n' +
    'Crea un archivo .env.local con:\n' +
    '  NEXT_PUBLIC_SUPABASE_URL=https://tu-proyecto.supabase.co\n' +
    '  NEXT_PUBLIC_SUPABASE_ANON_KEY=tu-anon-key\n'
  )
}

export const supabase = createClient(supabaseUrl || '', supabaseKey || '')

export async function getActiveMarkets() {
  const { data, error } = await supabase
    .from('markets')
    .select('*')
    .eq('status', 'ACTIVE')
    .order('close_date', { ascending: true })

  if (error) {
    console.error('Error cargando mercados:', error.message)
    return []
  }

  return data || []
}

export async function getUserTrades(email, includeAll = false) {
  let query = supabase
    .from('trades')
    .select('*, markets(*)')
    .eq('user_email', email.toLowerCase().trim())
    .order('created_at', { ascending: false })

  if (!includeAll) {
    query = query.eq('status', 'OPEN')
  }

  const { data, error } = await query

  if (error) {
    console.error('Error cargando trades:', error.message)
    return []
  }

  return data || []
}

export async function getPriceHistory(marketId, hours = 168) {
  const since = new Date(Date.now() - hours * 3600000).toISOString()

  const { data, error } = await supabase
    .from('price_history')
    .select('*')
    .eq('market_id', marketId)
    .gte('created_at', since)
    .order('created_at', { ascending: true })

  if (error) {
    console.error('Error cargando historial:', error.message)
    return []
  }

  return data || []
}

export async function getOrCreateUser(email) {
  if (!email || typeof email !== 'string' || !email.includes('@')) {
    return { success: false, error: 'Email inválido' }
  }

  const { data, error } = await supabase
    .rpc('get_or_create_user', {
      p_email: email.toLowerCase().trim()
    })

  if (error) {
    console.error('Error en getOrCreateUser:', error.message)
    return { success: false, error: error.message }
  }

  return data
}

export async function createTrade(userEmail, marketId, side, amount) {
  if (!userEmail || !marketId || !side || !amount) {
    return { success: false, error: 'Faltan parámetros' }
  }

  const numAmount = parseFloat(amount)
  if (isNaN(numAmount) || numAmount <= 0) {
    return { success: false, error: 'Cantidad inválida' }
  }
  if (numAmount > 500) {
    return { success: false, error: 'Máximo €500 por trade' }
  }

  try {
    const { data, error } = await supabase
      .rpc('execute_trade', {
        p_email: userEmail.toLowerCase().trim(),
        p_market_id: marketId,
        p_side: side.toUpperCase(),
        p_amount: numAmount
      })

    if (error) {
      console.error('Error en createTrade RPC:', error.message)
      return { success: false, error: error.message }
    }

    return data

  } catch (err) {
    console.error('Error inesperado en createTrade:', err)
    return { success: false, error: 'Error de conexión' }
  }
}

export async function sellPosition(tradeId, userEmail) {
  if (!tradeId || !userEmail) {
    return { success: false, error: 'Faltan parámetros' }
  }

  try {
    const { data, error } = await supabase
      .rpc('execute_sell', {
        p_trade_id: tradeId,
        p_email: userEmail.toLowerCase().trim()
      })

    if (error) {
      console.error('Error en sellPosition RPC:', error.message)
      return { success: false, error: error.message }
    }

    return data

  } catch (err) {
    console.error('Error inesperado en sellPosition:', err)
    return { success: false, error: 'Error de conexión' }
  }
}