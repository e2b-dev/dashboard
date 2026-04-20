'use client'

import Link from 'next/link'
import { HELP_URLS } from '@/configs/urls'
import DashboardEmptyFrame from '@/features/dashboard/common/empty-frame'
import LoadingLayout from '@/features/dashboard/loading-layout'
import { useSandboxContext } from '@/features/dashboard/sandbox/context'
import { Badge } from '@/ui/primitives/badge'
import { Button } from '@/ui/primitives/button'
import { ExternalLinkIcon } from '@/ui/primitives/icons'
import { SandboxEventsTable } from './table'

const LifecycleEventsDocsLink = () => {
  return (
    <Button asChild size="sm" variant="outline" className="shrink-0">
      <Link href={HELP_URLS.SANDBOX_LIFECYCLE_EVENTS} target="_blank">
        API docs
        <ExternalLinkIcon className="size-3.5" />
      </Link>
    </Button>
  )
}

export const SandboxEventsView = () => {
  const { isSandboxInfoLoading, sandboxInfo, sandboxLifecycle } =
    useSandboxContext()

  if (isSandboxInfoLoading && !sandboxInfo) {
    return <LoadingLayout />
  }

  const events = sandboxLifecycle?.events ?? []

  if (events.length === 0) {
    return (
      <DashboardEmptyFrame
        title="No lifecycle events yet"
        description="Lifecycle events for this sandbox will appear here once the sandbox is created, updated, paused, resumed, or killed."
        actions={<LifecycleEventsDocsLink />}
        className="flex-1"
      />
    )
  }

  return (
    <div className="flex min-h-0 flex-1 flex-col overflow-hidden">
      <div className="bg-bg flex flex-col gap-3 border-b px-3 py-3 md:flex-row md:items-start md:justify-between md:px-6">
        <div className="flex min-w-0 flex-col gap-2">
          <div className="flex flex-wrap items-center gap-2">
            <h2 className="font-sans text-sm text-fg">Lifecycle events</h2>
            <Badge variant="code" size="sm">
              {events.length} total
            </Badge>
          </div>
          <p className="max-w-3xl text-sm text-fg-secondary">
            This table mirrors the sandbox lifecycle events API for the current
            sandbox and shows the exact event type, timestamp, and attached
            event data when available.
          </p>
        </div>

        <LifecycleEventsDocsLink />
      </div>

      <SandboxEventsTable events={events} />
    </div>
  )
}
