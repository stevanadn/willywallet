import { supabase } from './supabase'

export async function ensureProfileExists(userId) {
  if (!userId) return
  const { data } = await supabase.from('profiles').select('id').eq('id', userId).maybeSingle()
  if (!data) {
    const { data: { user } } = await supabase.auth.getUser()
    if (user) {
      await supabase.from('profiles').insert({
        id: userId,
        email: user.email,
        full_name: user.user_metadata?.full_name || user.email?.split('@')[0] || 'User',
      }).select().single()
    }
  }
}

export function formatCurrency(amount) {
  if (!amount && amount !== 0) return 'Rp 0'
  return new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', minimumFractionDigits: 0, maximumFractionDigits: 0 }).format(amount)
}

export function formatDate(date) {
  if (!date) return ''
  return new Intl.DateTimeFormat('id-ID', { day: 'numeric', month: 'long', year: 'numeric' }).format(new Date(date))
}

export function groupTransactionsByDate(transactions) {
  return transactions.reduce((acc, t) => {
    if (!acc[t.date]) acc[t.date] = []
    acc[t.date].push(t)
    return acc
  }, {})
}

export function calculatePercentage(spent, limit) {
  return limit ? Math.min((spent / limit) * 100, 100) : 0
}

