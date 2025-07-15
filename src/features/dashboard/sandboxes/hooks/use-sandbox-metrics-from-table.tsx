import { Table } from '@tanstack/react-table'
import { Sandbox } from '@/types/api'
import { useMemo } from 'react'
import { ClientSandboxesMetrics } from '@/types/sandboxes.types'

declare module '@tanstack/react-table' {
  interface TableState {
    metrics: ClientSandboxesMetrics | null
  }
}

export function useSandboxMetricsFromTable(
  table: Table<Sandbox>,
  fullSandboxId: string
) {
  const metrics = useMemo(() => {
    const tableMetrics = table.getState()
      ?.metrics as ClientSandboxesMetrics | null

    if (!tableMetrics) return null

    const [sandboxId, clientId] = fullSandboxId.split('-')
    if (!sandboxId || !clientId) return null

    return tableMetrics[sandboxId + '-' + clientId] ?? null
  }, [fullSandboxId, table])

  return {
    metrics,
  }
}
