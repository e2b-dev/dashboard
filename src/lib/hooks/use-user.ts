'use client'

import { User } from '@supabase/supabase-js'
import useSWR from 'swr'
import { supabase } from '../clients/supabase/client'

interface UseUserProps {
  initialData?: User
}

export const useUser = (
  { initialData }: UseUserProps = { initialData: undefined }
) => {
  const swr = useSWR<User>(
    'user',
    async () => {
      const { data, error } = await supabase.auth.getUser()

      if (error) {
        throw error
      }

      return data.user
    },
    {
      fallbackData: initialData,
      keepPreviousData: true,
    }
  )

  return {
    ...swr,
    user: swr.data,
  }
}
