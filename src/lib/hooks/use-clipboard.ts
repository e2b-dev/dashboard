import { useCallback, useState } from 'react'

/**
 * Hook for copying text to clipboard with temporary success state
 * @param duration - Duration in ms for how long the success state should persist (default: 3000ms)
 * @returns [boolean, (text: string) => Promise<void>] - [wasCopied, copy] tuple
 */
export const useClipboard = (
  duration: number = 3000
): [boolean, (text: string) => Promise<void>] => {
  const [wasCopied, setWasCopied] = useState(false)

  const copy = useCallback(
    async (text: string) => {
      try {
        await navigator.clipboard.writeText(text)
        setWasCopied(true)

        // Reset wasCopied after duration
        setTimeout(() => {
          setWasCopied(false)
        }, duration)
      } catch (err) {
        console.error('Failed to copy text:', err)
        setWasCopied(false)
      }
    },
    [duration]
  )

  return [wasCopied, copy]
}
