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
  // Try the materialized view first
  const { data, error } = await supabase
    .from('leaderboard_current')
    .select('*')
    .limit(limit)

  if (!error && data && data.length > 0) return data

  // Fallback: compute from trades table directly
  console.warn('leaderboard_current unavailable, computing from trades:', error?.message)
  const { data: trades, error: tradesError } = await supabase
    .from('trades')
    .select('user_email, status, pnl')
    .in('status', ['WON', 'LOST', 'SOLD'])

  if (tradesError || !trades) return []

  const agg = {}
  trades.forEach(t => {
    const k = t.user_email
    if (!agg[k]) agg[k] = { user_email: k, pnl: 0, trades: 0, won: 0 }
    agg[k].pnl += parseFloat(t.pnl || 0)
    agg[k].trades++
    if (t.status === 'WON') agg[k].won++
  })

  return Object.values(agg)
    .map(u => ({
      user_email:   u.user_email,
      display_name: null,
      emoji:        null,
      realized_pnl: u.pnl,
      total_trades: u.trades,
      win_rate:     u.trades > 0 ? (u.won / u.trades * 100) : 0,
    }))
    .sort((a, b) => b.realized_pnl - a.realized_pnl)
    .slice(0, limit)
    .map((u, i) => ({ ...u, rank_position: i + 1 }))
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