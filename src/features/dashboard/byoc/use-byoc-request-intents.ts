'use client'

import { useCallback, useRef } from 'react'

type ConnectionIntent = {
  requestId: string
  expectedCloudConnectionId: string | undefined
}

export function useByocRequestIntents() {
  const connection = useRef<ConnectionIntent>(undefined)
  const createDeployment = useRef<string>(undefined)
  const deploy = useRef<string>(undefined)
  const destroy = useRef<string>(undefined)

  const getRequestId = useCallback(
    (reference: { current: string | undefined }) => {
      if (!reference.current) reference.current = crypto.randomUUID()
      return reference.current
    },
    []
  )

  return {
    connection: {
      get: useCallback((expectedCloudConnectionId: string | undefined) => {
        if (!connection.current) {
          connection.current = {
            requestId: crypto.randomUUID(),
            expectedCloudConnectionId,
          }
        }
        return connection.current
      }, []),
      clear: useCallback(() => {
        connection.current = undefined
      }, []),
      acknowledge: useCallback((clientRequestId: string | undefined) => {
        if (connection.current?.requestId === clientRequestId) {
          connection.current = undefined
        }
      }, []),
    },
    createDeployment: {
      get: useCallback(() => getRequestId(createDeployment), [getRequestId]),
      clear: useCallback(() => {
        createDeployment.current = undefined
      }, []),
      acknowledge: useCallback((clientRequestId: string | undefined) => {
        if (createDeployment.current === clientRequestId) {
          createDeployment.current = undefined
        }
      }, []),
    },
    deploy: {
      get: useCallback(() => getRequestId(deploy), [getRequestId]),
      clear: useCallback(() => {
        deploy.current = undefined
      }, []),
    },
    destroy: {
      get: useCallback(() => getRequestId(destroy), [getRequestId]),
      clear: useCallback(() => {
        destroy.current = undefined
      }, []),
    },
  }
}
