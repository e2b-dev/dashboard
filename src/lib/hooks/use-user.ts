'use client'

import { useServerContext } from '../../features/dashboard/server-context'

export const useUser = () => {
  const { user } = useServerContext()

  return { user }
}
