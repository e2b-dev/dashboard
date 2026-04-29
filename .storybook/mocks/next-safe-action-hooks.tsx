import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useState,
} from 'react'

export type MockActionMode =
  | 'success'
  | 'pending'
  | 'server-error'
  | 'idle'

export const MockActionContext = createContext<MockActionMode>('success')

interface MockHookOpts {
  onSuccess?: (args: { data: unknown; input: unknown }) => void
  onError?: (args: { error: { serverError?: string } }) => void
}

export function useAction(_action: unknown, opts: MockHookOpts = {}) {
  const mode = useContext(MockActionContext)
  const [isPending, setIsPending] = useState(false)

  useEffect(() => {
    setIsPending(false)
  }, [mode])

  const execute = useCallback(
    (input: { name?: string; teamSlug?: string }) => {
      if (mode === 'pending') {
        setIsPending(true)
        return
      }

      setIsPending(true)
      window.setTimeout(() => {
        setIsPending(false)
        if (mode === 'server-error') {
          opts.onError?.({
            error: { serverError: 'Failed to create API key (story mock).' },
          })
          return
        }

        const safeName = (input?.name ?? 'demo')
          .toLowerCase()
          .replace(/[^a-z0-9]/g, '_')
        opts.onSuccess?.({
          data: {
            createdApiKey: { key: `sb_${safeName}_demo123abc456def789ghi` },
          },
          input,
        })
      }, 600)
    },
    [mode, opts]
  )

  return {
    execute,
    executeAsync: execute,
    isPending,
    isExecuting: isPending,
    status: isPending ? ('executing' as const) : ('idle' as const),
    result: undefined,
    reset: () => {},
    hasSucceeded: false,
    hasErrored: false,
  }
}

export const useOptimisticAction = useAction
export const useStateAction = useAction
