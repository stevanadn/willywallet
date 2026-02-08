import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { supabase } from '../lib/supabase'
import { ensureProfileExists } from '../lib/utils'

export function useCategories(userId, type = null) {
  return useQuery({
    queryKey: ['categories', userId, type],
    queryFn: async () => {
      let query = supabase
        .from('categories')
        .select('*')
        .or(`user_id.eq.${userId},user_id.is.null`)
        .order('name', { ascending: true })

      if (type) query = query.eq('type', type)

      const { data, error } = await query
      if (error) throw error
      return data
    },
    enabled: !!userId,
  })
}

export function useCreateCategory() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async (category) => {
      if (category.user_id) await ensureProfileExists(category.user_id)
      const { data, error } = await supabase.from('categories').insert(category).select().single()
      if (error) throw error
      return data
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries(['categories', variables.user_id])
    },
  })
}

