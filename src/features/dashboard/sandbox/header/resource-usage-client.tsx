'use client'

import type { ResourceUsageProps } from '@/features/dashboard/common/resource-usage'
import ResourceUsage from '@/features/dashboard/common/resource-usage'
import { memo, useMemo } from 'react'
import { useSandboxContext } from '../context'

interface ResourceUsageClientProps extends ResourceUsageProps {}

export const ResourceUsageClient = memo(
  function ResourceUsageClient({ ...props }: ResourceUsageClientProps) {
    const { lastMetrics, sandboxInfo } = useSandboxContext()

    const metrics = useMemo(
      () =>
        props.type === 'cpu'
          ? lastMetrics?.cpuUsedPct
          : props.type === 'mem'
            ? lastMetrics?.memUsedMb
            : lastMetrics?.diskUsedGb,
      [props.type, lastMetrics]
    )

    const total = useMemo(() => {
      if (props.type === 'cpu') {
        return sandboxInfo?.cpuCount
      }
      if (props.type === 'mem') {
        return sandboxInfo?.memoryMB
      }
      return lastMetrics?.diskTotalGb
    }, [props.type, sandboxInfo])

    return (
      <ResourceUsage
        {...props}
        classNames={{
          wrapper: 'font-sans text-md',
          ...props.classNames,
        }}
        metrics={metrics}
        total={total}
      />
    )
  },
  (prevProps, nextProps) => {
    return (
      prevProps.type === nextProps.type &&
      prevProps.total === nextProps.total &&
      prevProps.mode === nextProps.mode
    )
  }
)
