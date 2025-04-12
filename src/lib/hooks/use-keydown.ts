import { useEffect } from 'react'

export default function useKeydown(callback: (event: KeyboardEvent) => void) {
  useEffect(() => {
    const abortController = new AbortController()

    document.addEventListener('keydown', callback, {
      signal: abortController.signal,
    })

    return () => {
      abortController.abort()
    }
  }, [callback])
}
