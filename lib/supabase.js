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
// Crear o login usuario
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

// Crear trade
export async function createTrade(userEmail, marketId, side, shares, price, amount) {
  const { data: user } = await supabase
    .from('users')
    .select('balance')
    .eq('email', userEmail)
    .single()
  
  if (!user || user.balance < amount) {
    return { success: false, error: 'Saldo insuficiente' }
  }
  
  await supabase
    .from('users')
    .update({ balance: user.balance - amount })
    .eq('email', userEmail)
  
  const { data: trade, error } = await supabase
    .from('trades')
    .insert({ user_email: userEmail, market_id: marketId, side, shares, price, amount })
    .select()
    .single()
  
  if (error) return { success: false, error: error.message }
  
  return { success: true, trade, newBalance: user.balance - amount }
}