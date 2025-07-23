'use client'

import { memo, useMemo } from 'react'
import { useSandboxContext } from '../context'
import type { ResourceUsageProps } from '@/features/dashboard/common/resource-usage'
import ResourceUsage from '@/features/dashboard/common/resource-usage'

interface ResourceUsageClientProps extends ResourceUsageProps {}

export const ResourceUsageClient = memo(
  function ResourceUsageClient({ ...props }: ResourceUsageClientProps) {
    const { lastMetrics } = useSandboxContext()

    const metrics = useMemo(
      () =>
        props.type === 'cpu' ? lastMetrics?.cpuUsedPct : lastMetrics?.memUsedMb,
      [props.type, lastMetrics]
    )

    return (
      <ResourceUsage
        {...props}
        classNames={{
          wrapper: 'font-sans text-md',
          ...props.classNames,
        }}
        metrics={metrics}
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
