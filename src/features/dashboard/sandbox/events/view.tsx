'use client'

import Link from 'next/link'
import { HELP_URLS } from '@/configs/urls'
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

  return (
    <div className="flex min-h-0 flex-1 flex-col gap-3 overflow-hidden p-3 md:gap-6 md:p-6">
      <div className="flex w-full min-h-0 items-center justify-between gap-3">
        <Badge variant="code" size="sm">
          {events.length} total
        </Badge>
        <LifecycleEventsDocsLink />
      </div>

      <SandboxEventsTable events={events} />
    </div>
  )
}
