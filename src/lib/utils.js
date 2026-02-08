import { supabase } from './supabase'

/**
 * Ensures a user profile exists in the database
 * @param {string} userId - The user ID to check/create
 */
export async function ensureProfileExists(userId) {
  if (!userId) return

  const { data } = await supabase.from('profiles').select('id').eq('id', userId).maybeSingle()

  if (!data) {
    const {
      data: { user },
    } = await supabase.auth.getUser()

    if (user) {
      await supabase
        .from('profiles')
        .insert({
          id: userId,
          email: user.email,
          full_name: user.user_metadata?.full_name || user.email?.split('@')[0] || 'User',
        })
        .select()
        .single()
    }
  }
}

/**
 * Formats a number as Indonesian Rupiah currency
 * @param {number} amount - The amount to format
 * @returns {string} Formatted currency string
 */
export function formatCurrency(amount) {
  if (!amount && amount !== 0) return 'Rp 0'
  return new Intl.NumberFormat('id-ID', {
    style: 'currency',
    currency: 'IDR',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(amount)
}

/**
 * Formats a date as Indonesian locale string
 * @param {string|Date} date - The date to format
 * @returns {string} Formatted date string
 */
export function formatDate(date) {
  if (!date) return ''
  return new Intl.DateTimeFormat('id-ID', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  }).format(new Date(date))
}

/**
 * Groups transactions by date
 * @param {Array} transactions - Array of transaction objects
 * @returns {Object} Object with dates as keys and transaction arrays as values
 */
export function groupTransactionsByDate(transactions) {
  return transactions.reduce((acc, t) => {
    if (!acc[t.date]) acc[t.date] = []
    acc[t.date].push(t)
    return acc
  }, {})
}

/**
 * Calculates percentage of spent amount relative to limit
 * @param {number} spent - Amount spent
 * @param {number} limit - Budget limit
 * @returns {number} Percentage (capped at 100)
 */
export function calculatePercentage(spent, limit) {
  return limit ? Math.min((spent / limit) * 100, 100) : 0
}

