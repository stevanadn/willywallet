import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { supabase } from '../lib/supabase'
import { ensureProfileExists } from '../lib/utils'

const selectFields = '*, wallet:wallets(name), category:categories(name, icon, type)'

export function useTransactions(userId, filters = {}) {
  return useQuery({
    queryKey: ['transactions', userId, filters],
    queryFn: async () => {
      let query = supabase.from('transactions').select(selectFields).eq('user_id', userId).order('date', { ascending: false }).order('created_at', { ascending: false })
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
      const startDate = `${year}-${String(month).padStart(2, '0')}-01`
      // Get the last day of the month
      const lastDay = new Date(year, month, 0).getDate()
      const endDate = `${year}-${String(month).padStart(2, '0')}-${String(lastDay).padStart(2, '0')}`
      const { data, error } = await supabase.from('transactions').select(selectFields).eq('user_id', userId).gte('date', startDate).lte('date', endDate).order('date', { ascending: true })
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
      queryClient.invalidateQueries(['transactions', variables.user_id])
      queryClient.invalidateQueries(['wallets', variables.user_id])
      queryClient.invalidateQueries({ queryKey: ['monthly-transactions'] })
      // Invalidate and refetch all budget spending queries when expense transaction is created
      // Budgets are only tracked for expense transactions
      if (variables.type === 'expense') {
        // Extract month and year from transaction date (ensure they are numbers)
        const transactionDate = new Date(variables.date)
        const month = Number(transactionDate.getMonth() + 1)
        const year = Number(transactionDate.getFullYear())
        
        console.log('Transaction created - updating budget spending:', {
          userId: variables.user_id,
          categoryId: variables.category_id,
          month,
          year,
          amount: variables.amount
        })
        
        // Recalculate and update the specific budget-spending query
        const startDate = `${year}-${String(month).padStart(2, '0')}-01`
        // Get the last day of the month correctly
        const lastDay = new Date(year, month, 0).getDate()
        const endDate = `${year}-${String(month).padStart(2, '0')}-${String(lastDay).padStart(2, '0')}`
        
        try {
          const { data: transactions, error } = await supabase
            .from('transactions')
            .select('amount')
            .eq('user_id', variables.user_id)
            .eq('category_id', variables.category_id)
            .eq('type', 'expense')
            .gte('date', startDate)
            .lte('date', endDate)
          
          if (!error && transactions) {
            const totalSpent = transactions.reduce((sum, t) => sum + parseFloat(t.amount || 0), 0)
            // Directly update the cache with number types
            queryClient.setQueryData(
              ['budget-spending', variables.user_id, variables.category_id, month, year],
              totalSpent
            )
            console.log('Updated budget spending cache:', {
              key: ['budget-spending', variables.user_id, variables.category_id, month, year],
              totalSpent,
              transactionCount: transactions.length
            })
          } else {
            console.error('Error fetching transactions for budget:', error)
          }
        } catch (err) {
          console.error('Error updating budget spending:', err)
        }
        
        // Invalidate all budget-spending queries for this user to force refetch
        queryClient.invalidateQueries({ 
          predicate: (query) => {
            const isMatch = Array.isArray(query.queryKey) &&
              query.queryKey[0] === 'budget-spending' && 
              query.queryKey[1] === variables.user_id
            if (isMatch) {
              console.log('Invalidating budget spending query:', query.queryKey)
            }
            return isMatch
          }
        })
        
        // Force refetch all budget-spending queries (including inactive ones)
        await queryClient.refetchQueries({ 
          predicate: (query) => 
            Array.isArray(query.queryKey) &&
            query.queryKey[0] === 'budget-spending' && 
            query.queryKey[1] === variables.user_id,
          type: 'all' // Refetch all queries, not just active ones
        })
        
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
      queryClient.invalidateQueries(['transactions', variables.user_id])
      queryClient.invalidateQueries(['wallets', variables.user_id])
      queryClient.invalidateQueries({ queryKey: ['monthly-transactions'] })
      // Update budget spending queries when transaction is updated
      // Only update if the transaction type is or was 'expense'
      const oldType = variables.oldTransaction?.type
      const newType = variables.updates.type || oldType
      
      if (oldType === 'expense' || newType === 'expense') {
        // Update old transaction's budget spending if it was an expense
        if (variables.oldTransaction && oldType === 'expense') {
          const oldDate = new Date(variables.oldTransaction.date)
          const oldMonth = oldDate.getMonth() + 1
          const oldYear = oldDate.getFullYear()
          
          try {
            const startDate = `${oldYear}-${String(oldMonth).padStart(2, '0')}-01`
            const lastDay = new Date(oldYear, oldMonth, 0).getDate()
            const endDate = `${oldYear}-${String(oldMonth).padStart(2, '0')}-${String(lastDay).padStart(2, '0')}`
            const { data: transactions, error } = await supabase
              .from('transactions')
              .select('amount')
              .eq('user_id', variables.user_id)
              .eq('category_id', variables.oldTransaction.category_id)
              .eq('type', 'expense')
              .gte('date', startDate)
              .lte('date', endDate)
            
            if (!error && transactions) {
              const totalSpent = transactions.reduce((sum, t) => sum + parseFloat(t.amount || 0), 0)
              queryClient.setQueryData(
                ['budget-spending', variables.user_id, variables.oldTransaction.category_id, oldMonth, oldYear],
                totalSpent
              )
            }
          } catch (err) {
            console.error('Error updating old budget spending:', err)
          }
        }
        
        // Update new transaction's budget spending if it's an expense
        if (newType === 'expense') {
          const newDate = new Date(variables.updates.date || variables.oldTransaction?.date)
          const newMonth = newDate.getMonth() + 1
          const newYear = newDate.getFullYear()
          const newCategoryId = variables.updates.category_id || variables.oldTransaction?.category_id
          
          try {
            const startDate = `${newYear}-${String(newMonth).padStart(2, '0')}-01`
            const lastDay = new Date(newYear, newMonth, 0).getDate()
            const endDate = `${newYear}-${String(newMonth).padStart(2, '0')}-${String(lastDay).padStart(2, '0')}`
            const { data: transactions, error } = await supabase
              .from('transactions')
              .select('amount')
              .eq('user_id', variables.user_id)
              .eq('category_id', newCategoryId)
              .eq('type', 'expense')
              .gte('date', startDate)
              .lte('date', endDate)
            
            if (!error && transactions) {
              const totalSpent = transactions.reduce((sum, t) => sum + parseFloat(t.amount || 0), 0)
              queryClient.setQueryData(
                ['budget-spending', variables.user_id, newCategoryId, newMonth, newYear],
                totalSpent
              )
            }
          } catch (err) {
            console.error('Error updating new budget spending:', err)
          }
        }
        
        // Also invalidate all budget-spending queries for this user
        queryClient.invalidateQueries({ 
          predicate: (query) => 
            Array.isArray(query.queryKey) &&
            query.queryKey[0] === 'budget-spending' && 
            query.queryKey[1] === variables.user_id
        })
        
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
      queryClient.invalidateQueries(['transactions', variables.user_id])
      queryClient.invalidateQueries(['wallets', variables.user_id])
      queryClient.invalidateQueries({ queryKey: ['monthly-transactions'] })
      // Update budget spending queries when expense transaction is deleted
      // Budgets are only tracked for expense transactions
      if (variables.transaction && variables.transaction.type === 'expense') {
        const transactionDate = new Date(variables.transaction.date)
        const month = transactionDate.getMonth() + 1
        const year = transactionDate.getFullYear()
        
        // Recalculate and update the budget-spending query
        try {
          const startDate = `${year}-${String(month).padStart(2, '0')}-01`
          const lastDay = new Date(year, month, 0).getDate()
          const endDate = `${year}-${String(month).padStart(2, '0')}-${String(lastDay).padStart(2, '0')}`
          const { data: transactions, error } = await supabase
            .from('transactions')
            .select('amount')
            .eq('user_id', variables.user_id)
            .eq('category_id', variables.transaction.category_id)
            .eq('type', 'expense')
            .gte('date', startDate)
            .lte('date', endDate)
          
          if (!error && transactions) {
            const totalSpent = transactions.reduce((sum, t) => sum + parseFloat(t.amount || 0), 0)
            // Directly update the cache
            queryClient.setQueryData(
              ['budget-spending', variables.user_id, variables.transaction.category_id, month, year],
              totalSpent
            )
          }
        } catch (err) {
          console.error('Error updating budget spending:', err)
        }
        
        // Also invalidate all budget-spending queries for this user
        queryClient.invalidateQueries({ 
          predicate: (query) => 
            Array.isArray(query.queryKey) &&
            query.queryKey[0] === 'budget-spending' && 
            query.queryKey[1] === variables.user_id
        })
        
        queryClient.invalidateQueries(['budgets', variables.user_id])
      }
    },
  })
}

