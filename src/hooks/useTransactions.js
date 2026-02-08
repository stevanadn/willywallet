import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { supabase } from '../lib/supabase'
import { ensureProfileExists } from '../lib/utils'

// Common selection string to join Wallet and Category data automatically
const selectFields = '*, wallet:wallets(name), category:categories(name, icon, type)'

// ==========================================
// HELPER FUNCTIONS
// ==========================================

// 1. Calculate the Start and End date of a specific month
function getMonthDateRange(month, year) {
  const startDate = `${year}-${String(month).padStart(2, '0')}-01`
  const lastDay = new Date(year, month, 0).getDate()
  const endDate = `${year}-${String(month).padStart(2, '0')}-${String(lastDay).padStart(2, '0')}`
  return { startDate, endDate }
}

// 2. Re-fetch and update the Budget Cache for a specific Category/Month
// This ensures the Budget Bar matches the Database exactly.
async function updateBudgetSpendingCache(queryClient, userId, categoryId, month, year) {
  const { startDate, endDate } = getMonthDateRange(month, year)
  
  // Fetch fresh total from database
  const { data: transactions, error } = await supabase
    .from('transactions')
    .select('amount')
    .eq('user_id', userId)
    .eq('category_id', categoryId)
    .eq('type', 'expense')
    .gte('date', startDate)
    .lte('date', endDate)
  
  if (!error && transactions) {
    const totalSpent = transactions.reduce((sum, t) => sum + parseFloat(t.amount || 0), 0)
    
    // Inject the new number directly into the cache (Instant UI update)
    queryClient.setQueryData(
      ['budget-spending', userId, categoryId, month, year],
      totalSpent
    )
  }
}

// 3. Safety Net: Mark all budget queries as "Old" to force a background refresh
function invalidateBudgetSpending(queryClient, userId) {
  queryClient.invalidateQueries({
    predicate: (query) =>
      Array.isArray(query.queryKey) &&
      query.queryKey[0] === 'budget-spending' &&
      query.queryKey[1] === userId
  })
}

// ==========================================
// THE HOOKS
// ==========================================

export function useTransactions(userId, filters = {}) {
  return useQuery({
    queryKey: ['transactions', userId, filters],
    queryFn: async () => {
      let query = supabase.from('transactions').select(selectFields).eq('user_id', userId).order('date', { ascending: false }).order('created_at', { ascending: false })
      
      // Apply Dynamic Filters
      if (filters.startDate) query = query.gte('date', filters.startDate)
      if (filters.endDate) query = query.lte('date', filters.endDate)
      if (filters.type) query = query.eq('type', filters.type)
      
      const { data, error } = await query
      if (error) throw error
      return data
    },
    enabled: !!userId,
  })
}

export function useMonthlyTransactions(userId, month, year) {
  return useQuery({
    queryKey: ['monthly-transactions', userId, month, year],
    queryFn: async () => {
      const { startDate, endDate } = getMonthDateRange(month, year)
      const { data, error } = await supabase
        .from('transactions')
        .select(selectFields)
        .eq('user_id', userId)
        .gte('date', startDate)
        .lte('date', endDate)
        .order('date', { ascending: true })
      
      if (error) throw error
      return data || []
    },
    enabled: !!userId && !!month && !!year,
  })
}

export function useCreateTransaction() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async (transaction) => {
      await ensureProfileExists(transaction.user_id)
      const { data, error } = await supabase.from('transactions').insert(transaction).select(selectFields).single()
      if (error) throw error
      return data
    },
    onSuccess: async (_, variables) => {
      // Refresh Lists
      queryClient.invalidateQueries(['transactions', variables.user_id])
      queryClient.invalidateQueries(['wallets', variables.user_id])
      queryClient.invalidateQueries({ queryKey: ['monthly-transactions'] })
      
      // Update Budget if it was an Expense
      if (variables.type === 'expense') {
        const transactionDate = new Date(variables.date)
        const month = Number(transactionDate.getMonth() + 1)
        const year = Number(transactionDate.getFullYear())
        
        try {
          await updateBudgetSpendingCache(queryClient, variables.user_id, variables.category_id, month, year)
        } catch (err) {
          console.error('Optimistic budget update failed', err)
        }
        
        invalidateBudgetSpending(queryClient, variables.user_id)
        queryClient.invalidateQueries(['budgets', variables.user_id])
      }
    },
  })
}

export function useUpdateTransaction() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async ({ id, updates, user_id }) => {
      const { data, error } = await supabase.from('transactions').update(updates).eq('id', id).select(selectFields).single()
      if (error) throw error
      return data
    },
    onSuccess: async (_, variables) => {
      // Refresh Lists
      queryClient.invalidateQueries(['transactions', variables.user_id])
      queryClient.invalidateQueries(['wallets', variables.user_id])
      queryClient.invalidateQueries({ queryKey: ['monthly-transactions'] })
      
      // Budget Logic: Handle Type changes, Date changes, or Amount changes
      const oldType = variables.oldTransaction?.type
      const newType = variables.updates.type || oldType
      
      if (oldType === 'expense' || newType === 'expense') {
        
        // 1. If it WAS an expense, update the OLD budget (remove/change the amount)
        if (variables.oldTransaction && oldType === 'expense') {
          const oldDate = new Date(variables.oldTransaction.date)
          const oldMonth = Number(oldDate.getMonth() + 1)
          const oldYear = Number(oldDate.getFullYear())
          
          try {
            await updateBudgetSpendingCache(queryClient, variables.user_id, variables.oldTransaction.category_id, oldMonth, oldYear)
          } catch (err) { /* silent fail */ }
        }
        
        // 2. If it IS NOW an expense, update the NEW budget (add/change the amount)
        if (newType === 'expense') {
          const newDate = new Date(variables.updates.date || variables.oldTransaction?.date)
          const newMonth = Number(newDate.getMonth() + 1)
          const newYear = Number(newDate.getFullYear())
          const newCategoryId = variables.updates.category_id || variables.oldTransaction?.category_id
          
          try {
            await updateBudgetSpendingCache(queryClient, variables.user_id, newCategoryId, newMonth, newYear)
          } catch (err) { /* silent fail */ }
        }
        
        // 3. Safety Refresh
        invalidateBudgetSpending(queryClient, variables.user_id)
        queryClient.invalidateQueries(['budgets', variables.user_id])
      }
    },
  })
}

export function useDeleteTransaction() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async ({ id, user_id }) => {
      const { error } = await supabase.from('transactions').delete().eq('id', id)
      if (error) throw error
    },
    onSuccess: async (_, variables) => {
      // Refresh Lists
      queryClient.invalidateQueries(['transactions', variables.user_id])
      queryClient.invalidateQueries(['wallets', variables.user_id])
      queryClient.invalidateQueries({ queryKey: ['monthly-transactions'] })
      
      // Update Budget if we deleted an Expense
      if (variables.transaction && variables.transaction.type === 'expense') {
        const transactionDate = new Date(variables.transaction.date)
        const month = Number(transactionDate.getMonth() + 1)
        const year = Number(transactionDate.getFullYear())
        
        try {
          await updateBudgetSpendingCache(queryClient, variables.user_id, variables.transaction.category_id, month, year)
        } catch (err) { /* silent fail */ }
        
        invalidateBudgetSpending(queryClient, variables.user_id)
        queryClient.invalidateQueries(['budgets', variables.user_id])
      }
    },
  })
}