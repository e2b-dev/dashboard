'use client'

import { useSuspenseQuery } from '@tanstack/react-query'
import { PROTECTED_URLS } from '@/configs/urls'
import type { BuildStatus } from '@/core/modules/builds/models'
import { useNow } from '@/lib/hooks/use-now'
import { formatTimeAgoCompact } from '@/lib/utils/formatting'
import { cn } from '@/lib/utils/ui'
import { useTRPC } from '@/trpc/client'
import { HoverPrefetchLink } from '@/ui/hover-prefetch-link'
import { Badge } from '@/ui/primitives/badge'
import { CheckIcon, ChevronRightIcon, CloseIcon } from '@/ui/primitives/icons'
import { NULL_BUILD_ID } from '../../tags/constants'
import { OverviewSection } from './section'
import { TemplateSpecs } from './template-specs'

interface LatestBuildSectionProps {
  templateId: string
  teamSlug: string
}

export function LatestBuildSection({
  templateId,
  teamSlug,
}: LatestBuildSectionProps) {
  const trpc = useTRPC()

  const { data } = useSuspenseQuery(
    trpc.templates.getTemplate.queryOptions({ teamSlug, templateId })
  )

  const template = data.template

  if (template.buildID === NULL_BUILD_ID) {
    return (
      <OverviewSection label="Latest build">
        <p className="text-fg-tertiary prose-body">
          No build tagged{' '}
          <code className="text-fg-secondary font-mono">default</code> yet.
          Build the template and tag it{' '}
          <code className="text-fg-secondary font-mono">default</code> to
          populate this section.
        </p>
      </OverviewSection>
    )
  }

  return (
    <OverviewSection label="Latest build">
      <div className="flex flex-wrap items-center justify-between gap-x-6 gap-y-3">
        <div className="flex items-center gap-3 min-w-0">
          <BuildAgo timestamp={new Date(template.updatedAt).getTime()} />
          <BuildStatusBadge status="success" />
        </div>
        <BuildIdLink
          teamSlug={teamSlug}
          templateId={templateId}
          buildId={template.buildID}
        />
      </div>
      <TemplateSpecs build={template} className="mt-2" />
    </OverviewSection>
  )
}

function BuildAgo({ timestamp }: { timestamp: number }) {
  const now = useNow(30_000)

  return (
    <span className="prose-value-big font-mono uppercase text-fg whitespace-nowrap">
      {formatTimeAgoCompact(now - timestamp).toUpperCase()}
    </span>
  )
}

function BuildStatusBadge({ status }: { status: BuildStatus }) {
  const config: Record<
    BuildStatus,
    {
      label: string
      variant: 'default' | 'positive' | 'error'
      icon: React.ReactNode
    }
  > = {
    building: {
      label: 'Building',
      variant: 'default',
      icon: null,
    },
    success: {
      label: 'Success',
      variant: 'positive',
      icon: <CheckIcon className="size-3 scale-125" />,
    },
    failed: {
      label: 'Failed',
      variant: 'error',
      icon: <CloseIcon className="size-3" />,
    },
  }

  const { label, icon, variant } = config[status]
  return (
    <Badge
      variant={variant}
      size="md"
      className={cn(
        'w-fit uppercase',
        variant === 'default' && 'bg-bg-inverted/10'
      )}
    >
      {icon}
      {label}
    </Badge>
  )
}

function BuildIdLink({
  teamSlug,
  templateId,
  buildId,
}: {
  teamSlug: string
  templateId: string
  buildId: string
}) {
  const truncated = `${buildId.slice(0, 7)}...${buildId.slice(-5)}`

  return (
    <HoverPrefetchLink
      href={PROTECTED_URLS.TEMPLATE_BUILD(teamSlug, templateId, buildId)}
      aria-label="Open build"
      className="group/build inline-flex items-center gap-1 text-fg-secondary font-mono prose-body-numeric hover:text-fg transition-colors"
    >
      <span className="truncate">{truncated}</span>
      <ChevronRightIcon className="size-4 text-fg-tertiary group-hover/build:text-fg transition-colors" />
    </HoverPrefetchLink>
  )
}
