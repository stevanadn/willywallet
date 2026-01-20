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
      const endDate = `${year}-${String(month).padStart(2, '0')}-31`
      const { data, error } = await supabase.from('transactions').select('*').eq('user_id', userId).gte('date', startDate).lte('date', endDate)
      if (error) throw error
      return data
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
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries(['transactions', variables.user_id])
      queryClient.invalidateQueries(['wallets', variables.user_id])
      queryClient.invalidateQueries(['monthly-transactions'])
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
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries(['transactions', variables.user_id])
      queryClient.invalidateQueries(['wallets', variables.user_id])
      queryClient.invalidateQueries(['monthly-transactions'])
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
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries(['transactions', variables.user_id])
      queryClient.invalidateQueries(['wallets', variables.user_id])
      queryClient.invalidateQueries(['monthly-transactions'])
    },
  })
}

