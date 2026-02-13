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