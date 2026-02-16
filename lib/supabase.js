import { createClient } from '@supabase/supabase-js'

const supabaseUrl = 'https://mrdkhfbwesehffbystto.supabase.co'
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im1yZGtoZmJ3ZXNlaGZmYnlzdHRvIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzA2Njk5NTMsImV4cCI6MjA4NjI0NTk1M30.hOmipILj2vFgVaRu2v6LuPAIYtRcqYH9TbXgAA7VDo0'

export const supabase = createClient(supabaseUrl, supabaseKey)

export async function getActiveMarkets() {
  const { data, error } = await supabase
    .from('markets')
    .select('*')
    .eq('status', 'ACTIVE')
  
  if (error) {
    console.error('Error:', error)
    return []
  }
  
  return data
}

export async function getOrCreateUser(email) {
  const { data: existing } = await supabase
    .from('users')
    .select('*')
    .eq('email', email)
    .single()
  
  if (existing) return existing
  
  const { data: newUser } = await supabase
    .from('users')
    .insert({ email, balance: 1000 })
    .select()
    .single()
  
  return newUser
}

export async function createTrade(userEmail, marketId, side, shares, price, amount, newYesPool, newNoPool) {
  console.log('📊 Creating trade:', { userEmail, marketId, side, shares, price, amount, newYesPool, newNoPool })
  
  // 1. Verificar balance
  const { data: user, error: userError } = await supabase
    .from('users')
    .select('balance')
    .eq('email', userEmail)
    .single()
  
  if (userError || !user) {
    console.error('User error:', userError)
    return { success: false, error: 'Usuario no encontrado' }
  }
  
  const userBalance = parseFloat(user.balance)
  const tradeAmount = parseFloat(amount)
  
  if (userBalance < tradeAmount) {
    console.error('Insufficient balance:', { userBalance, tradeAmount })
    return { success: false, error: 'Saldo insuficiente' }
  }
  
  // 2. Actualizar balance del usuario
  const { error: balanceError } = await supabase
    .from('users')
    .update({ balance: userBalance - tradeAmount })
    .eq('email', userEmail)
  
  if (balanceError) {
    console.error('Balance update error:', balanceError)
    return { success: false, error: balanceError.message }
  }
  
  // 3. Actualizar pools del mercado (AMM)
  const { error: poolError } = await supabase
    .from('markets')
    .update({ 
      yes_pool: newYesPool,
      no_pool: newNoPool,
      total_volume: supabase.raw('total_volume + ?', [tradeAmount])
    })
    .eq('id', marketId)
  
  if (poolError) {
    console.error('Pool update error:', poolError)
    // Revertir balance
    await supabase
      .from('users')
      .update({ balance: userBalance })
      .eq('email', userEmail)
    return { success: false, error: 'Error actualizando mercado' }
  }
  
  // 4. Crear registro del trade
  const { data: trade, error: tradeError } = await supabase
    .from('trades')
    .insert({ 
      user_email: userEmail, 
      market_id: marketId, 
      side, 
      shares: parseFloat(shares), 
      price: parseFloat(price), 
      amount: tradeAmount 
    })
    .select()
    .single()
  
  if (tradeError) {
    console.error('Trade insert error:', tradeError)
    return { success: false, error: tradeError.message }
  }
  
  // 5. Guardar snapshot de precio para el gráfico
  await supabase
    .from('price_history')
    .insert({
      market_id: marketId,
      yes_price: (newYesPool / (newYesPool + newNoPool)) * 100,
      no_price: (newNoPool / (newYesPool + newNoPool)) * 100,
      yes_pool: newYesPool,
      no_pool: newNoPool
    })
  
  console.log('✅ Trade successful')
  
  return { 
    success: true, 
    trade, 
    newBalance: userBalance - tradeAmount 
  }
}

export async function getPriceHistory(marketId, hours = 24) {
  const since = new Date(Date.now() - hours * 3600000).toISOString()
  
  const { data } = await supabase
    .from('price_history')
    .select('*')
    .eq('market_id', marketId)
    .gte('created_at', since)
    .order('created_at', { ascending: true })
  
  return data || []
}