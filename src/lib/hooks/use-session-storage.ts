'use client'

import { useCallback, useMemo } from 'react'

const useSessionStorage = (key: string | null) => {
  const getValue = useCallback(() => {
    if (!key || typeof window === 'undefined') return null

    return window.sessionStorage.getItem(key)
  }, [key])

  const setValue = useCallback(
    (value: string) => {
      if (!key || typeof window === 'undefined') return

      window.sessionStorage.setItem(key, value)
    },
    [key]
  )

  const removeValue = useCallback(() => {
    if (!key || typeof window === 'undefined') return

    window.sessionStorage.removeItem(key)
  }, [key])

  return useMemo(
    () => ({ getValue, setValue, removeValue }),
    [getValue, setValue, removeValue]
  )
}

export { useSessionStorage }
