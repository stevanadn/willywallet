import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { supabase } from '../lib/supabase'

export function useChatHistory(userId) {
  return useQuery({
    queryKey: ['chat-history', userId],
    queryFn: async () => {
      const { data, error } = await supabase.from('chat_history').select('*').eq('user_id', userId).order('created_at', { ascending: true })
      if (error) throw error
      return data || []
    },
    enabled: !!userId,
  })
}

export function useSaveChatMessage() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async ({ user_id, role, content }) => {
      const { data, error } = await supabase.from('chat_history').insert({ user_id, role, content }).select().single()
      if (error) throw error
      return data
    },
    onSuccess: (_, variables) => queryClient.invalidateQueries(['chat-history', variables.user_id]),
  })
}

export function useClearChatHistory() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async ({ user_id }) => {
      const { error } = await supabase.from('chat_history').delete().eq('user_id', user_id)
      if (error) throw error
    },
    onSuccess: (_, variables) => queryClient.invalidateQueries(['chat-history', variables.user_id]),
  })
}

