import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { supabase } from '../lib/supabase'
import { ensureProfileExists } from '../lib/utils'

export function useGoals(userId) {
  return useQuery({
    queryKey: ['goals', userId],
    queryFn: async () => {
      const { data, error } = await supabase.from('goals').select('*').eq('user_id', userId).order('created_at', { ascending: false })
      if (error) throw error
      return data
    },
    enabled: !!userId,
  })
}

export function useCreateGoal() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async (goal) => {
      await ensureProfileExists(goal.user_id)
      const { data, error } = await supabase.from('goals').insert(goal).select().single()
      if (error) throw error
      return data
    },
    onSuccess: (_, variables) => queryClient.invalidateQueries(['goals', variables.user_id]),
  })
}

export function useUpdateGoal() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async ({ id, updates, user_id }) => {
      const { data, error } = await supabase.from('goals').update(updates).eq('id', id).select().single()
      if (error) throw error
      return data
    },
    onSuccess: (_, variables) => queryClient.invalidateQueries(['goals', variables.user_id]),
  })
}

export function useDeleteGoal() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async ({ id, user_id }) => {
      const { error } = await supabase.from('goals').delete().eq('id', id)
      if (error) throw error
    },
    onSuccess: (_, variables) => queryClient.invalidateQueries(['goals', variables.user_id]),
  })
}

