import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { supabase } from '../lib/supabase'
import { ensureProfileExists } from '../lib/utils'

const selectFields = '*, category:categories(name, icon, type)'

export function useBudgets(userId, month, year) {
  return useQuery({
    queryKey: ['budgets', userId, month, year],
    queryFn: async () => {
      const { data, error } = await supabase.from('budgets').select(selectFields).eq('user_id', userId).eq('period_month', month).eq('period_year', year)
      if (error) throw error
      return data
    },
    enabled: !!userId && !!month && !!year,
  })
}

export function useBudgetSpending(userId, categoryId, month, year) {
  return useQuery({
    queryKey: ['budget-spending', userId, categoryId, month, year],
    queryFn: async () => {
      const startDate = `${year}-${String(month).padStart(2, '0')}-01`
      const endDate = `${year}-${String(month).padStart(2, '0')}-31`
      const { data, error } = await supabase.from('transactions').select('amount').eq('user_id', userId).eq('category_id', categoryId).eq('type', 'expense').gte('date', startDate).lte('date', endDate)
      if (error) throw error
      return data.reduce((sum, t) => sum + parseFloat(t.amount), 0)
    },
    enabled: !!userId && !!categoryId && !!month && !!year,
  })
}

export function useCreateBudget() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async (budget) => {
      await ensureProfileExists(budget.user_id)
      const { data, error } = await supabase.from('budgets').insert(budget).select(selectFields).single()
      if (error) throw error
      return data
    },
    onSuccess: (_, variables) => queryClient.invalidateQueries(['budgets', variables.user_id]),
  })
}

export function useUpdateBudget() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async ({ id, updates, user_id }) => {
      const { data, error } = await supabase.from('budgets').update(updates).eq('id', id).select().single()
      if (error) throw error
      return data
    },
    onSuccess: (_, variables) => queryClient.invalidateQueries(['budgets', variables.user_id]),
  })
}

export function useDeleteBudget() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async ({ id, user_id }) => {
      const { error } = await supabase.from('budgets').delete().eq('id', id)
      if (error) throw error
    },
    onSuccess: (_, variables) => queryClient.invalidateQueries(['budgets', variables.user_id]),
  })
}

