// ============================================================
// LEADERBOARD - QUERIES PARA SUPABASE
// ============================================================
// Añadir estas funciones a lib/supabase.js
// (o crear lib/leaderboard.js e importar supabase)
// ============================================================

import { supabase } from './supabase'

/**
 * Obtener leaderboard actual (top N)
 * Usa la vista SQL leaderboard_current que calcula rankings en tiempo real
 */
export async function getLeaderboard(limit = 20) {
  const { data, error } = await supabase
    .from('leaderboard_current')
    .select('*')
    .limit(limit)

  if (error) {
    console.error('Error cargando leaderboard:', error.message)
    return []
  }

  return data || []
}

/**
 * Obtener posición de un usuario específico en el ranking
 */
export async function getUserRank(email) {
  const { data, error } = await supabase
    .from('leaderboard_current')
    .select('*')
    .eq('user_email', email.toLowerCase().trim())
    .single()

  if (error) {
    // No está en el ranking (0 trades esta semana)
    return null
  }

  return data
}

/**
 * Obtener histórico de rankings semanales
 */
export async function getWeeklyHistory(weekStart) {
  let query = supabase
    .from('weekly_rankings')
    .select('*')
    .order('rank_position', { ascending: true })
    .limit(20)

  if (weekStart) {
    query = query.eq('week_start', weekStart)
  }

  const { data, error } = await query

  if (error) {
    console.error('Error cargando histórico:', error.message)
    return []
  }

  return data || []
}

/**
 * Establecer nombre visible para el leaderboard
 */
export async function setDisplayName(email, name, emoji = '🎯') {
  const { data, error } = await supabase
    .rpc('set_display_name', {
      p_email: email.toLowerCase().trim(),
      p_name: name.trim(),
      p_emoji: emoji
    })

  if (error) {
    console.error('Error en setDisplayName:', error.message)
    return { success: false, error: error.message }
  }

  return data
}

/**
 * Obtener perfil del usuario
 */
export async function getUserProfile(email) {
  const { data, error } = await supabase
    .from('user_profiles')
    .select('*')
    .eq('user_email', email.toLowerCase().trim())
    .single()

  if (error) return null
  return data
}

/**
 * Emojis disponibles para avatar
 */
export const AVATAR_EMOJIS = [
  '🎯', '🔥', '🧠', '💎', '🦁', '🐺',
  '🎰', '📊', '⚡', '🏆', '🎲', '🃏',
  '🦅', '🐉', '🌟', '💰', '🎪', '🧊'
]