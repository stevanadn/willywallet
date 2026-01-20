import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { supabase } from '../lib/supabase'
import { ensureProfileExists } from '../lib/utils'

export function useWallets(userId) {
  return useQuery({
    queryKey: ['wallets', userId],
    queryFn: async () => {
      const { data, error } = await supabase.from('wallets').select('*').eq('user_id', userId).order('created_at', { ascending: false })
      if (error) throw error
      return data
    },
    enabled: !!userId,
  })
}

export function useCreateWallet() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async (wallet) => {
      await ensureProfileExists(wallet.user_id)
      const { data, error } = await supabase.from('wallets').insert(wallet).select().single()
      if (error) throw error
      return data
    },
    onSuccess: (_, variables) => queryClient.invalidateQueries(['wallets', variables.user_id]),
  })
}

export function useUpdateWallet() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async ({ id, updates, user_id }) => {
      const { data, error } = await supabase.from('wallets').update(updates).eq('id', id).select().single()
      if (error) throw error
      return data
    },
    onSuccess: (_, variables) => queryClient.invalidateQueries(['wallets', variables.user_id]),
  })
}

export function useDeleteWallet() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async ({ id, user_id }) => {
      const { error } = await supabase.from('wallets').delete().eq('id', id)
      if (error) throw error
    },
    onSuccess: (_, variables) => queryClient.invalidateQueries(['wallets', variables.user_id]),
  })
}

