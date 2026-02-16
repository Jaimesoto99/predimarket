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

export async function createTrade(userEmail, marketId, side, shares, price, amount) {
  // 1. Verificar balance
  const { data: user, error: userError } = await supabase
    .from('users')
    .select('balance')
    .eq('email', userEmail)
    .single()
  
  console.log('User balance:', user?.balance, 'Amount:', amount)
  
  if (userError || !user) {
    console.error('User error:', userError)
    return { success: false, error: 'Usuario no encontrado' }
  }
  
  if (parseFloat(user.balance) < parseFloat(amount)) {
    return { success: false, error: 'Saldo insuficiente' }
  }
  
  // 2. Restar balance
  const { error: updateError } = await supabase
    .from('users')
    .update({ balance: user.balance - amount })
    .eq('email', userEmail)
  
  if (updateError) {
    console.error('Update error:', updateError)
    return { success: false, error: updateError.message }
  }
  
  // 3. Crear trade
  const { data: trade, error: tradeError } = await supabase
    .from('trades')
    .insert({ 
      user_email: userEmail, 
      market_id: marketId, 
      side, 
      shares, 
      price, 
      amount 
    })
    .select()
    .single()
  
  if (tradeError) {
    console.error('Trade error:', tradeError)
    return { success: false, error: tradeError.message }
  }
  
  return { success: true, trade, newBalance: user.balance - amount }
}